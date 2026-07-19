import { createLogger } from '@sim/logger'
import { type Api, Client, ContentType } from 'lago-javascript-client'
import { env } from '@/lib/core/config/env'

const logger = createLogger('LagoClient')

export class LagoApiError extends Error {
  readonly status: number
  readonly body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'LagoApiError'
    this.status = status
    this.body = body
  }
}

export function hasValidLagoCredentials(): boolean {
  return Boolean(env.LAGO_API_URL?.trim() && env.LAGO_API_KEY?.trim())
}

function getLagoBaseUrl(): string {
  const base = env.LAGO_API_URL?.trim()
  if (!base) {
    throw new Error('LAGO_API_URL is not configured')
  }
  return base.replace(/\/$/, '')
}

function getLagoApiKey(): string {
  const key = env.LAGO_API_KEY?.trim()
  if (!key) {
    throw new Error('LAGO_API_KEY is not configured')
  }
  return key
}

/** The official Lago SDK client type (`lago-javascript-client`). */
export type LagoClient = Api<unknown>

let cachedClient: LagoClient | null = null
let cachedConfigKey = ''

/**
 * Returns the official Lago SDK client, lazily constructed and cached until
 * the configured credentials change. The SDK's base URL convention includes
 * the `/api/v1` prefix.
 */
export function getLagoClient(): LagoClient {
  const apiKey = getLagoApiKey()
  const baseUrl = `${getLagoBaseUrl()}/api/v1`
  const configKey = `${baseUrl}|${apiKey}`
  if (!cachedClient || cachedConfigKey !== configKey) {
    cachedClient = Client(apiKey, { baseUrl })
    cachedConfigKey = configKey
  }
  return cachedClient
}

interface SdkErrorResponse {
  status: number
  error?: unknown
}

function isSdkErrorResponse(value: unknown): value is SdkErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as { status: unknown }).status === 'number'
  )
}

function toLagoApiError(error: unknown): LagoApiError | null {
  if (!isSdkErrorResponse(error)) return null
  let body = ''
  try {
    body = error.error !== undefined ? JSON.stringify(error.error) : ''
  } catch {
    body = ''
  }
  return new LagoApiError(`Lago API error: ${error.status}`, error.status, body)
}

/**
 * Runs a typed Lago SDK call, normalizing SDK rejections (the generated client
 * rejects with the raw `HttpResponse`) into {@link LagoApiError} so existing
 * status-based error handling keeps working.
 */
export async function callLago<T>(fn: (client: LagoClient) => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await fn(getLagoClient())
    return response.data
  } catch (error) {
    const apiError = toLagoApiError(error)
    if (apiError) {
      logger.warn('Lago API request failed', { status: apiError.status, body: apiError.body })
      throw apiError
    }
    throw error
  }
}

/**
 * Low-level escape hatch for Lago endpoints without a typed SDK method,
 * routed through the SDK's HTTP transport (auth, base URL, fetch config).
 * Paths are relative to `/api/v1`.
 */
export async function lagoRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  return callLago<T>((client) =>
    client.request<T, unknown>({
      path,
      method,
      secure: true,
      format: 'json',
      ...(body !== undefined ? { body, type: ContentType.Json } : {}),
    })
  )
}
