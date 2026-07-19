import { createLogger } from '@sim/logger'
import { safeCompare } from '@sim/security/compare'
import { getErrorMessage } from '@sim/utils/errors'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  nativeMothershipAbortBodySchema,
  nativeMothershipChatBodySchema,
  nativeMothershipResumeBodySchema,
  nativeMothershipTitleBodySchema,
} from '@/lib/api/contracts/native-mothership'
import {
  applyResumeResults,
  createNativeSessionFromPayload,
  getSessionForResume,
  type NativeChatPayload,
  type NativeResumePayload,
  runNativeLeg,
} from '@/lib/copilot/native-mothership/engine'
import { listNativeModels, resolveNativeModel } from '@/lib/copilot/native-mothership/models'
import {
  abortNativeStream,
  registerLegAbort,
  unregisterLegAbort,
} from '@/lib/copilot/native-mothership/session-store'
import { env } from '@/lib/core/config/env'
import { withRouteHandler } from '@/lib/core/utils/with-route-handler'

const logger = createLogger('NativeMothershipAPI')

export const maxDuration = 800
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ path: string[] }> }

/**
 * In-process replacement for the external Go mothership service. Sim's copilot
 * orchestrator (lib/copilot/request) talks to `SIM_AGENT_API_URL` over
 * HTTP+SSE using the MothershipStreamV1 protocol; pointing that env var at
 * `http(s)://<self>/api/native-mothership` routes those calls here instead.
 *
 * Implemented endpoints (paths mirror the Go service exactly):
 *   POST api/copilot              — initial interactive chat leg (SSE)
 *   POST api/mothership/execute   — headless execute leg (SSE)
 *   POST api/tools/resume         — checkpoint resume leg (SSE)
 *   POST api/generate-chat-title  — one-shot title generation (JSON)
 *   POST api/streams/explicit-abort — abort marker (JSON)
 *   GET  api/get-available-models — models list (JSON)
 */
function checkAuth(request: NextRequest): NextResponse | null {
  const configured = env.COPILOT_API_KEY
  if (!configured) {
    return NextResponse.json(
      { error: 'Native mothership disabled: COPILOT_API_KEY is not set' },
      { status: 503 }
    )
  }
  const provided = request.headers.get('x-api-key') ?? ''
  if (!safeCompare(provided, configured)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function handleChatLeg(request: NextRequest): Promise<Response> {
  // boundary-raw-json: body is the Go mothership protocol envelope owned by the
  // copilot orchestrator, not a public HTTP boundary (loopback service mimic)
  const raw = await request.json().catch(() => ({}))
  const parsed = nativeMothershipChatBodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid mothership chat payload' }, { status: 400 })
  }
  // double-cast-allowed: tolerant loose Go-protocol envelope narrowed by the engine
  const payload = parsed.data as unknown as NativeChatPayload
  const session = await createNativeSessionFromPayload(payload)
  if ('error' in session) {
    return NextResponse.json({ error: session.error }, { status: 503 })
  }

  const controller = new AbortController()
  const requestSignal = request.signal
  if (requestSignal.aborted) controller.abort()
  else requestSignal.addEventListener('abort', () => controller.abort(), { once: true })
  registerLegAbort(session.streamId, controller)

  logger.info('Native mothership chat leg', {
    streamId: session.streamId,
    model: session.model,
    provider: session.resolvedProvider,
    toolCount: session.tools.length,
  })

  const stream = runNativeLeg({
    session,
    isInitial: true,
    isResume: false,
    abortSignal: controller.signal,
  })
  controller.signal.addEventListener(
    'abort',
    () => unregisterLegAbort(session.streamId, controller),
    { once: true }
  )
  return sseResponse(stream)
}

async function handleResumeLeg(request: NextRequest): Promise<Response> {
  // boundary-raw-json: body is the Go mothership resume envelope owned by the
  // copilot orchestrator, not a public HTTP boundary (loopback service mimic)
  const raw = await request.json().catch(() => ({}))
  const parsedResume = nativeMothershipResumeBodySchema.safeParse(raw)
  if (!parsedResume.success) {
    return NextResponse.json({ error: 'Invalid mothership resume payload' }, { status: 400 })
  }
  // double-cast-allowed: tolerant loose Go-protocol resume envelope narrowed by the engine
  const payload = parsedResume.data as unknown as NativeResumePayload
  const session = getSessionForResume(payload)
  if (!session || !payload.checkpointId) {
    logger.warn('Native resume for unknown session', {
      streamId: payload.streamId,
      checkpointId: payload.checkpointId,
    })
    return NextResponse.json(
      { error: 'Unknown stream or checkpoint (native session expired or instance restarted)' },
      { status: 410 }
    )
  }

  applyResumeResults(session, payload.checkpointId, payload.results)

  const controller = new AbortController()
  if (request.signal.aborted) controller.abort()
  else request.signal.addEventListener('abort', () => controller.abort(), { once: true })
  registerLegAbort(session.streamId, controller)

  const stream = runNativeLeg({
    session,
    isInitial: false,
    isResume: true,
    abortSignal: controller.signal,
  })
  return sseResponse(stream)
}

async function handleTitle(request: NextRequest): Promise<Response> {
  // boundary-raw-json: body is the Go mothership title envelope owned by the
  // copilot orchestrator, not a public HTTP boundary (loopback service mimic)
  const rawTitle = await request.json().catch(() => ({}))
  const parsedTitle = nativeMothershipTitleBodySchema.safeParse(rawTitle)
  const body = (parsedTitle.success ? parsedTitle.data : {}) as {
    message?: string | null
    model?: string | null
  }
  const resolved = resolveNativeModel(body.model ?? undefined)
  if (!resolved || !body.message) {
    return NextResponse.json({ title: 'New chat' })
  }
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({
      apiKey: resolved.apiKey,
      ...(resolved.baseURL ? { baseURL: resolved.baseURL } : {}),
    })
    const completion = await client.chat.completions.create({
      model: resolved.model,
      max_tokens: 30,
      messages: [
        {
          role: 'system',
          content:
            'You are a chat title generator. Do NOT answer or respond to the message — output only a short topic title (max 6 words) describing what the message is about. No quotes, no trailing punctuation. Use the same language as the message.',
        },
        { role: 'user', content: body.message.slice(0, 2000) },
      ],
    })
    const title = completion.choices[0]?.message?.content?.trim().replace(/^["«]|["»]$/g, '')
    return NextResponse.json({ title: title || 'New chat' })
  } catch (error) {
    logger.warn('Native title generation failed', { error: getErrorMessage(error) })
    return NextResponse.json({ title: 'New chat' })
  }
}

async function handleExplicitAbort(request: NextRequest): Promise<Response> {
  // boundary-raw-json: body is the Go mothership abort envelope owned by the
  // copilot orchestrator, not a public HTTP boundary (loopback service mimic)
  const rawAbort = await request.json().catch(() => ({}))
  const parsedAbort = nativeMothershipAbortBodySchema.safeParse(rawAbort)
  const body = (parsedAbort.success ? parsedAbort.data : {}) as { messageId?: string | null }
  const aborted = body.messageId ? abortNativeStream(body.messageId) : false
  return NextResponse.json({ success: true, aborted })
}

export const POST = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const authError = checkAuth(request)
  if (authError) return authError

  const { path } = await context.params
  const route = (path ?? []).join('/')

  switch (route) {
    case 'api/copilot':
    case 'api/mothership':
    case 'api/mothership/execute':
      return handleChatLeg(request)
    case 'api/tools/resume':
      return handleResumeLeg(request)
    case 'api/generate-chat-title':
      return handleTitle(request)
    case 'api/streams/explicit-abort':
      return handleExplicitAbort(request)
    default:
      return NextResponse.json({ error: `Unknown mothership route: ${route}` }, { status: 404 })
  }
})

export const GET = withRouteHandler(async (request: NextRequest, context: RouteContext) => {
  const authError = checkAuth(request)
  if (authError) return authError

  const { path } = await context.params
  const route = (path ?? []).join('/')

  if (route === 'api/get-available-models') {
    return NextResponse.json({ models: listNativeModels() })
  }
  return NextResponse.json({ error: `Unknown mothership route: ${route}` }, { status: 404 })
})
