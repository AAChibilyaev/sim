import { db } from '@sim/db'
import { copilotMessages } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { and, asc, eq, isNull } from 'drizzle-orm'
import {
  DEEPSEEK_OPENAI_BASE_URL,
  OPENROUTER_BASE_URL,
  resolveNativeModel,
} from '@/lib/copilot/native-mothership/models'
import {
  getNativeSession,
  type NativeChatMessage,
  type NativePendingToolCall,
  type NativeSession,
  type NativeToolDef,
  putNativeSession,
} from '@/lib/copilot/native-mothership/session-store'
import { generateRequestId } from '@/lib/core/utils/request'

const logger = createLogger('NativeMothershipEngine')

const KEEPALIVE_INTERVAL_MS = 15_000
const HISTORY_MESSAGE_LIMIT = 40
const MAX_COMPLETION_TOKENS = 8192

/** Generic per-token pricing used for cost reporting (USD per 1M tokens). */
const INPUT_COST_PER_1M = 0.3
const OUTPUT_COST_PER_1M = 1.2

interface IncomingToolDef {
  name?: unknown
  description?: unknown
  input_schema?: unknown
  executeLocally?: unknown
}

/** Subset of the Sim → mothership chat payload the native engine consumes. */
export interface NativeChatPayload {
  message?: string
  messages?: Array<{ role?: unknown; content?: unknown }>
  model?: string
  provider?: string
  mode?: string
  messageId?: string
  chatId?: string
  userId?: string
  workspaceId?: string
  workflowId?: string
  workflowName?: string
  context?: Array<{ type?: unknown; content?: unknown }>
  integrationTools?: IncomingToolDef[]
  workspaceContext?: string
  userTimezone?: string
  userMetadata?: { name?: string; email?: string; timezone?: string }
  userPermission?: string
}

export interface NativeResumePayload {
  streamId?: string
  checkpointId?: string
  userId?: string
  results?: Array<{ callId?: unknown; name?: unknown; data?: unknown; success?: unknown }>
}

interface PersistedMessageRow {
  role?: unknown
  content?: unknown
}

function buildSystemPrompt(payload: NativeChatPayload): string {
  const parts: string[] = [
    'You are AACFlow, the AI agent inside the AACFlow.io AI workspace. You help teams build, run, and manage AI agents and workflows.',
    'Be direct and concrete. When the user asks you to act, use the available tools rather than describing what could be done. Only call tools that are provided to you.',
  ]
  if (payload.mode === 'ask') {
    parts.push('Mode: ask — answer questions; prefer explanation over tool use.')
  } else if (payload.mode === 'plan') {
    parts.push('Mode: plan — produce a plan; do not execute mutating tools.')
  }
  if (payload.workflowName) {
    parts.push(`Current workflow: ${payload.workflowName}`)
  }
  if (payload.workspaceContext) {
    parts.push(`Workspace context:\n${payload.workspaceContext}`)
  }
  const timezone = payload.userTimezone || payload.userMetadata?.timezone
  if (timezone) {
    parts.push(`User timezone: ${timezone}`)
  }
  if (payload.userMetadata?.name) {
    parts.push(
      `User: ${payload.userMetadata.name}${payload.userMetadata.email ? ` <${payload.userMetadata.email}>` : ''}`
    )
  }
  return parts.join('\n\n')
}

function buildUserMessage(payload: NativeChatPayload): string {
  const contextParts = (payload.context ?? [])
    .filter((c) => typeof c?.content === 'string' && (c.content as string).length > 0)
    .map((c) => `[${typeof c.type === 'string' ? c.type : 'context'}]\n${c.content}`)
  const message = payload.message ?? ''
  if (contextParts.length === 0) return message
  return `${contextParts.join('\n\n')}\n\n${message}`
}

/**
 * OpenAI's function-calling API rejects a request outright if `tools` exceeds
 * 128 entries ("Invalid 'tools': array too long"). AACFlow.io's full
 * integration catalog is far larger than that, so without this cap every
 * native-mothership chat turn failed the underlying completion call.
 */
const MAX_NATIVE_TOOLS = 128

function toNativeTools(payload: NativeChatPayload): NativeToolDef[] {
  const tools: NativeToolDef[] = []
  for (const t of payload.integrationTools ?? []) {
    if (tools.length >= MAX_NATIVE_TOOLS) break
    if (typeof t?.name !== 'string' || t.name.length === 0) continue
    tools.push({
      name: t.name,
      description: typeof t.description === 'string' ? t.description : '',
      input_schema:
        t.input_schema && typeof t.input_schema === 'object'
          ? (t.input_schema as Record<string, unknown>)
          : { type: 'object', properties: {} },
      clientExecutable: t.executeLocally !== true,
    })
  }
  return tools
}

async function loadChatHistory(chatId: string): Promise<NativeChatMessage[]> {
  try {
    const rows = await db
      .select({ content: copilotMessages.content })
      .from(copilotMessages)
      .where(and(eq(copilotMessages.chatId, chatId), isNull(copilotMessages.deletedAt)))
      .orderBy(asc(copilotMessages.seq), asc(copilotMessages.createdAt))
    const history: NativeChatMessage[] = []
    for (const row of rows.slice(-HISTORY_MESSAGE_LIMIT)) {
      const persisted = row.content as PersistedMessageRow | null
      if (!persisted || typeof persisted !== 'object') continue
      const role = persisted.role
      const content = persisted.content
      if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content) {
        history.push({ role, content } as NativeChatMessage)
      }
    }
    return history
  } catch (error) {
    logger.warn('Failed to load chat history for native session', {
      chatId,
      error: getErrorMessage(error),
    })
    return []
  }
}

/**
 * Create (or replace) the native session for an initial chat/execute leg.
 * Loads prior transcript turns from copilot_messages when a chatId is present.
 */
export async function createNativeSessionFromPayload(
  payload: NativeChatPayload
): Promise<NativeSession | { error: string }> {
  const resolved = resolveNativeModel(payload.model, payload.provider)
  if (!resolved) {
    return { error: 'No LLM provider key configured for the native copilot backend' }
  }

  const streamId = payload.messageId || generateId()
  const messages: NativeChatMessage[] = [{ role: 'system', content: buildSystemPrompt(payload) }]

  if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    for (const m of payload.messages) {
      const role = m?.role
      const content = m?.content
      if ((role === 'user' || role === 'assistant') && typeof content === 'string') {
        messages.push({ role, content } as NativeChatMessage)
      }
    }
  } else if (payload.chatId) {
    messages.push(...(await loadChatHistory(payload.chatId)))
  }

  messages.push({ role: 'user', content: buildUserMessage(payload) })

  const session: NativeSession = {
    streamId,
    chatId: payload.chatId,
    userId: payload.userId ?? '',
    model: resolved.model,
    apiKey: resolved.apiKey,
    baseURL: resolved.baseURL,
    resolvedProvider: resolved.provider,
    seq: 0,
    messages,
    tools: toNativeTools(payload),
    pendingByCheckpoint: new Map(),
    lastAccessAt: Date.now(),
  }
  putNativeSession(session)
  return session
}

/** Apply resume tool results to a session's conversation. */
export function applyResumeResults(
  session: NativeSession,
  checkpointId: string,
  results: NativeResumePayload['results']
): void {
  const pending = session.pendingByCheckpoint.get(checkpointId) ?? []
  const byCallId = new Map((results ?? []).map((r) => [String(r?.callId ?? ''), r]))
  for (const call of pending) {
    const result = byCallId.get(call.id)
    const body = result
      ? JSON.stringify({ success: result.success !== false, data: result.data ?? null })
      : JSON.stringify({ success: false, error: 'No result reported' })
    session.messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: truncateToolResult(body),
    })
  }
  session.pendingByCheckpoint.delete(checkpointId)
}

const TOOL_RESULT_CHAR_LIMIT = 60_000

function truncateToolResult(body: string): string {
  if (body.length <= TOOL_RESULT_CHAR_LIMIT) return body
  return `${body.slice(0, TOOL_RESULT_CHAR_LIMIT)}…[truncated]`
}

interface LegOptions {
  session: NativeSession
  /** True when this leg is a resume continuation (emits run.resumed first). */
  isResume: boolean
  /** True on the very first leg of a stream (emits session start/chat). */
  isInitial: boolean
  abortSignal: AbortSignal
}

/**
 * Run one mothership leg: a single LLM streaming call emitted as
 * MothershipStreamV1 SSE frames. Ends with either `run.checkpoint_pause`
 * (model called tools; Sim executes them and resumes) or `complete`.
 */
export function runNativeLeg({
  session,
  isResume,
  isInitial,
  abortSignal,
}: LegOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const requestId = generateRequestId()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const emit = (envelope: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(envelope)}\n\n`))
      }
      const keepalive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': keepalive\n\n'))
      }, KEEPALIVE_INTERVAL_MS)

      const nextEvent = (
        type: 'session' | 'text' | 'tool' | 'run' | 'complete' | 'error',
        payload: Record<string, unknown>
      ) => {
        session.seq += 1
        return {
          v: 1 as const,
          type,
          seq: session.seq,
          ts: new Date().toISOString(),
          stream: {
            streamId: session.streamId,
            ...(session.chatId ? { chatId: session.chatId } : {}),
            cursor: String(session.seq),
          },
          trace: { requestId },
          payload,
        }
      }

      try {
        if (isInitial) {
          emit(nextEvent('session', { kind: 'start' }))
          if (session.chatId) {
            emit(nextEvent('session', { kind: 'chat', chatId: session.chatId }))
          }
        }
        if (isResume) {
          emit(nextEvent('run', { kind: 'resumed' }))
        }

        const { default: OpenAI } = await import('openai')
        const client = new OpenAI({
          apiKey: session.apiKey,
          ...(session.baseURL ? { baseURL: session.baseURL } : {}),
        })

        const openaiTools = session.tools.map((t) => ({
          type: 'function' as const,
          function: { name: t.name, description: t.description, parameters: t.input_schema },
        }))

        const stream = await client.chat.completions.create(
          {
            model: session.model,
            max_tokens: MAX_COMPLETION_TOKENS,
            messages: session.messages as Parameters<
              typeof client.chat.completions.create
            >[0]['messages'],
            ...(openaiTools.length > 0 ? { tools: openaiTools, tool_choice: 'auto' as const } : {}),
            stream: true,
            stream_options: { include_usage: true },
          },
          { signal: abortSignal }
        )

        let accumulated = ''
        let inputTokens = 0
        let outputTokens = 0
        const partialCalls = new Map<number, { id: string; name: string; argsJson: string }>()

        for await (const chunk of stream) {
          if (abortSignal.aborted) break
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0
            outputTokens = chunk.usage.completion_tokens ?? 0
          }
          const choice = chunk.choices?.[0]
          if (!choice) continue
          if (choice.delta?.content) {
            accumulated += choice.delta.content
            emit(nextEvent('text', { channel: 'assistant', text: accumulated }))
          }
          for (const tc of choice.delta?.tool_calls ?? []) {
            const existing = partialCalls.get(tc.index)
            if (!existing) {
              partialCalls.set(tc.index, {
                id: tc.id || `tc_${session.streamId}_${tc.index}`,
                name: tc.function?.name || '',
                argsJson: tc.function?.arguments || '',
              })
            } else if (tc.function?.arguments) {
              existing.argsJson += tc.function.arguments
            }
          }
        }

        if (abortSignal.aborted) {
          emit(nextEvent('complete', { status: 'cancelled', reason: 'aborted' }))
          return
        }

        const usage = { input_tokens: inputTokens, output_tokens: outputTokens }
        const cost = {
          input: (inputTokens / 1_000_000) * INPUT_COST_PER_1M,
          output: (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M,
          total:
            (inputTokens / 1_000_000) * INPUT_COST_PER_1M +
            (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M,
        }

        if (partialCalls.size > 0) {
          const toolByName = new Map(session.tools.map((t) => [t.name, t]))
          const pending: NativePendingToolCall[] = []
          const assistantToolCalls: Array<{
            id: string
            type: 'function'
            function: { name: string; arguments: string }
          }> = []

          for (const call of partialCalls.values()) {
            let args: Record<string, unknown> = {}
            try {
              args = JSON.parse(call.argsJson || '{}') as Record<string, unknown>
            } catch {
              args = {}
            }
            const def = toolByName.get(call.name)
            const clientExecutable = def ? def.clientExecutable : true
            emit(
              nextEvent('tool', {
                phase: 'call',
                toolCallId: call.id,
                toolName: call.name,
                executor: clientExecutable ? 'client' : 'sim',
                mode: 'sync',
                arguments: args,
                partial: false,
                ui: { clientExecutable, hidden: false, internal: false },
              })
            )
            pending.push({ id: call.id, name: call.name })
            assistantToolCalls.push({
              id: call.id,
              type: 'function',
              function: { name: call.name, arguments: call.argsJson || '{}' },
            })
          }

          session.messages.push({
            role: 'assistant',
            content: accumulated || null,
            tool_calls: assistantToolCalls,
          })

          const checkpointId = generateId()
          session.pendingByCheckpoint.set(checkpointId, pending)
          putNativeSession(session)

          emit(
            nextEvent('run', {
              kind: 'checkpoint_pause',
              checkpointId,
              executionId: generateId(),
              runId: session.streamId,
              pendingToolCallIds: pending.map((p) => p.id),
            })
          )
          return
        }

        session.messages.push({ role: 'assistant', content: accumulated })
        putNativeSession(session)
        emit(
          nextEvent('complete', {
            status: 'complete',
            response: { content: accumulated },
            usage,
            cost,
          })
        )
      } catch (error) {
        const message = getErrorMessage(error, 'Native copilot stream failed')
        logger.error('Native mothership leg failed', { streamId: session.streamId, error: message })
        try {
          emit(nextEvent('error', { message, code: 'native_stream_error' }))
          emit(nextEvent('complete', { status: 'error', reason: message }))
        } catch {
          // Controller already closed — nothing to report.
        }
      } finally {
        closed = true
        clearInterval(keepalive)
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      }
    },
  })
}

/** Resolve a resume request against the in-memory session store. */
export function getSessionForResume(payload: NativeResumePayload): NativeSession | undefined {
  if (!payload.streamId) return undefined
  return getNativeSession(payload.streamId)
}

export { DEEPSEEK_OPENAI_BASE_URL, OPENROUTER_BASE_URL }
