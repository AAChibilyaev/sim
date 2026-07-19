import { z } from 'zod'

/**
 * Boundary schemas for the native mothership routes
 * (`/api/native-mothership/[...path]`). These bodies are the Go mothership
 * wire protocol emitted by the copilot orchestrator — an internal loopback
 * boundary, not a public API. Envelopes are intentionally fully tolerant
 * (fields arrive as null/undefined/varying shapes across orchestrator legs);
 * the engine defensively narrows every field it reads. Only the resume leg
 * validates its two required correlation ids.
 */

export const nativeMothershipChatBodySchema = z.looseObject({})

export type NativeMothershipChatBody = z.input<typeof nativeMothershipChatBodySchema>

export const nativeMothershipResumeBodySchema = z.looseObject({
  streamId: z.string().min(1, 'streamId is required').max(200),
  checkpointId: z.string().min(1, 'checkpointId is required').max(200),
})

export type NativeMothershipResumeBody = z.input<typeof nativeMothershipResumeBodySchema>

export const nativeMothershipTitleBodySchema = z.looseObject({})

export type NativeMothershipTitleBody = z.input<typeof nativeMothershipTitleBodySchema>

export const nativeMothershipAbortBodySchema = z.looseObject({})

export type NativeMothershipAbortBody = z.input<typeof nativeMothershipAbortBodySchema>
