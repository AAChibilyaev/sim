import { createLogger } from '@sim/logger'

const logger = createLogger('NativeMothershipSessionStore')

/** OpenAI-compatible chat message kept in the native conversation state. */
export type NativeChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Tool definition exposed to the model for a native session. */
export interface NativeToolDef {
  name: string
  description: string
  input_schema: Record<string, unknown>
  clientExecutable: boolean
}

/** A tool call the model issued that Sim is executing across a checkpoint pause. */
export interface NativePendingToolCall {
  id: string
  name: string
}

/** Conversation state for one native mothership stream, keyed by streamId. */
export interface NativeSession {
  streamId: string
  chatId?: string
  userId: string
  model: string
  apiKey: string
  baseURL?: string
  resolvedProvider: string
  seq: number
  messages: NativeChatMessage[]
  tools: NativeToolDef[]
  pendingByCheckpoint: Map<string, NativePendingToolCall[]>
  lastAccessAt: number
}

const SESSION_TTL_MS = 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

const sessions = new Map<string, NativeSession>()
let lastSweepAt = 0

function sweep(): void {
  const now = Date.now()
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return
  lastSweepAt = now
  for (const [streamId, session] of sessions) {
    if (now - session.lastAccessAt > SESSION_TTL_MS) {
      sessions.delete(streamId)
      logger.info('Expired native mothership session', { streamId })
    }
  }
}

export function putNativeSession(session: NativeSession): void {
  sweep()
  session.lastAccessAt = Date.now()
  sessions.set(session.streamId, session)
}

export function getNativeSession(streamId: string): NativeSession | undefined {
  sweep()
  const session = sessions.get(streamId)
  if (session) session.lastAccessAt = Date.now()
  return session
}

export function deleteNativeSession(streamId: string): void {
  sessions.delete(streamId)
}

const abortControllers = new Map<string, AbortController>()

/** Track the AbortController for an in-flight leg so explicit-abort can cancel it. */
export function registerLegAbort(streamId: string, controller: AbortController): void {
  abortControllers.set(streamId, controller)
}

export function unregisterLegAbort(streamId: string, controller: AbortController): void {
  if (abortControllers.get(streamId) === controller) {
    abortControllers.delete(streamId)
  }
}

/** Abort the in-flight leg for a stream, if any. Returns whether one was found. */
export function abortNativeStream(streamId: string): boolean {
  const controller = abortControllers.get(streamId)
  if (!controller) return false
  controller.abort()
  abortControllers.delete(streamId)
  return true
}
