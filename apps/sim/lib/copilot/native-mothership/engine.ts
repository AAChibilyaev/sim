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
  service?: unknown
  operation?: unknown
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
    'Keep replies concise: answer the actual question and stop. Do not enumerate the available connectors or tools, do not restate your capabilities, and do not pad the response — surface only what the user needs.',
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
 * Upper bound on the integration tools handed to the model per turn — OpenAI's
 * function-calling API hard-rejects a `tools` array over 128 entries. The
 * catalog is ranked by relevance to the current message so the most useful
 * tools sort first, but the cap stays at the API maximum: a smaller cap proved
 * lossy — non-English prompts score every tool 0, and a tighter cut silently
 * dropped the workspace tools (tables, workflows) the user was asking for.
 * Because each user message opens a fresh session, ranking re-runs per message.
 */
const MAX_NATIVE_TOOLS = 128

/**
 * Tokens ignored when scoring tool relevance — generic verbs and function words
 * that appear in most prompts and carry no signal about which connector to use.
 */
const QUERY_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'please',
  'can',
  'how',
  'this',
  'that',
  'are',
  'use',
  'get',
  'set',
  'add',
  'make',
  'create',
  'into',
  'from',
  'need',
  'want',
  'help',
  'about',
  'have',
  'has',
  'not',
  'all',
  'any',
  'new',
])

/** Extracts lowercase content terms (≥3 chars, non-stopword) from the prompt. */
function extractQueryTerms(text: string): Set<string> {
  const terms = new Set<string>()
  for (const token of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length < 3 || QUERY_STOPWORDS.has(token)) continue
    terms.add(token)
  }
  return terms
}

/** Counts how many distinct query terms appear in a tool's searchable text. */
function scoreToolRelevance(tool: IncomingToolDef, terms: Set<string>): number {
  if (terms.size === 0) return 0
  const haystack = [tool.name, tool.service, tool.operation, tool.description]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase()
  let score = 0
  for (const term of terms) {
    if (haystack.includes(term)) score += 1
  }
  return score
}

/**
 * Workspace-native tool prefixes that must always be available to the model —
 * tables, files, knowledge, memory, and workflow management are what users ask
 * the chat to do most, and under a capped catalog they'd otherwise lose their
 * slots to whichever integrations happen to sit first (e.g. a Russian prompt
 * scores every tool 0, so the cut used to keep the head of the catalog and the
 * model answered "I cannot create a table").
 */
const PLATFORM_TOOL_PREFIXES = ['table_', 'file_', 'knowledge_', 'memory_', 'workflow_'] as const

function isPlatformTool(name: unknown): boolean {
  return typeof name === 'string' && PLATFORM_TOOL_PREFIXES.some((p) => name.startsWith(p))
}

/**
 * Order the incoming integration tools for the model: workspace-native tools
 * first (always retained), then the rest ranked by relevance to the current
 * message, truncated to {@link MAX_NATIVE_TOOLS}. When the message has no
 * distinctive terms (e.g. a greeting or a non-English prompt) every score is 0
 * and catalog order is preserved within each group.
 */
function toNativeTools(payload: NativeChatPayload): NativeToolDef[] {
  const incoming = payload.integrationTools ?? []
  const terms = extractQueryTerms(buildUserMessage(payload))
  const ranked = incoming
    .map((tool, index) => ({ tool, index, score: scoreToolRelevance(tool, terms) }))
    .sort(
      (a, b) =>
        Number(isPlatformTool(b.tool.name)) - Number(isPlatformTool(a.tool.name)) ||
        b.score - a.score ||
        a.index - b.index
    )

  const tools: NativeToolDef[] = []
  for (const { tool } of ranked) {
    if (tools.length >= MAX_NATIVE_TOOLS) break
    if (typeof tool?.name !== 'string' || tool.name.length === 0) continue
    tools.push({
      name: tool.name,
      description: typeof tool.description === 'string' ? tool.description : '',
      input_schema:
        tool.input_schema && typeof tool.input_schema === 'object'
          ? (tool.input_schema as Record<string, unknown>)
          : { type: 'object', properties: {} },
      clientExecutable: tool.executeLocally !== true,
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
            // The client's text handler appends each frame (`accumulatedContent
            // += chunk`), so frames must carry the DELTA only — emitting the
            // accumulated text here duplicates every prefix ("II cannotI cannot
            // directly…" stutter).
            emit(nextEvent('text', { channel: 'assistant', text: choice.delta.content }))
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
