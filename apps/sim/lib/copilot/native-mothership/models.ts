import { env as _env } from '@/lib/core/config/env'

/** DeepSeek's OpenAI-compatible API base. */
export const DEEPSEEK_OPENAI_BASE_URL = 'https://api.deepseek.com'
/** OpenRouter's OpenAI-compatible API base. */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// double-cast-allowed: env is validated by t3-env; reading arbitrary provider keys by name
const E = _env as unknown as Record<string, string | undefined>

export interface ResolvedNativeModel {
  model: string
  provider: 'deepseek' | 'openai' | 'openrouter'
  apiKey: string
  baseURL?: string
}

export interface NativeModelInfo {
  id: string
  displayName: string
  provider: string
}

/** Models advertised to the UI, based on which provider keys are configured. */
export function listNativeModels(): NativeModelInfo[] {
  const models: NativeModelInfo[] = []
  if (E.DEEPSEEK_API_KEY) {
    models.push(
      { id: 'deepseek-chat', displayName: 'DeepSeek Chat', provider: 'deepseek' },
      { id: 'deepseek-reasoner', displayName: 'DeepSeek Reasoner', provider: 'deepseek' }
    )
  }
  if (E.OPENAI_API_KEY) {
    models.push(
      { id: 'gpt-5.1', displayName: 'GPT-5.1', provider: 'openai' },
      { id: 'gpt-4.1', displayName: 'GPT-4.1', provider: 'openai' },
      { id: 'gpt-4o-mini', displayName: 'GPT-4o mini', provider: 'openai' }
    )
  }
  if (E.OPENROUTER_API_KEY) {
    models.push({
      id: 'anthropic/claude-sonnet-4.5',
      displayName: 'Claude Sonnet 4.5 (OpenRouter)',
      provider: 'openrouter',
    })
  }
  return models
}

function providerFromModel(model: string): string {
  const m = model.toLowerCase()
  if (m.includes('deepseek')) return 'deepseek'
  if (m.startsWith('gpt') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')) {
    return 'openai'
  }
  if (m.includes('/')) return 'openrouter'
  if (m.includes('claude')) return 'anthropic'
  return 'unknown'
}

/**
 * Resolve the concrete model + credentials for a native leg. Unknown or
 * unavailable provider/model combinations fall back to the first configured
 * provider with a sensible default model.
 */
export function resolveNativeModel(
  requestedModel?: string,
  requestedProvider?: string
): ResolvedNativeModel | null {
  const model = requestedModel || ''
  const provider = requestedProvider || providerFromModel(model)

  if (provider === 'deepseek' && E.DEEPSEEK_API_KEY) {
    return {
      model: model.toLowerCase().includes('deepseek') ? model : 'deepseek-chat',
      provider: 'deepseek',
      apiKey: E.DEEPSEEK_API_KEY,
      baseURL: DEEPSEEK_OPENAI_BASE_URL,
    }
  }
  if (provider === 'openai' && E.OPENAI_API_KEY) {
    return {
      model: providerFromModel(model) === 'openai' ? model : 'gpt-4o-mini',
      provider: 'openai',
      apiKey: E.OPENAI_API_KEY,
    }
  }
  if (provider === 'openrouter' && E.OPENROUTER_API_KEY) {
    return {
      model: model.includes('/') ? model : 'openai/gpt-4o-mini',
      provider: 'openrouter',
      apiKey: E.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
    }
  }

  // Fallback chain for anthropic/unknown providers: DeepSeek → OpenAI → OpenRouter.
  if (E.DEEPSEEK_API_KEY) {
    return {
      model: 'deepseek-chat',
      provider: 'deepseek',
      apiKey: E.DEEPSEEK_API_KEY,
      baseURL: DEEPSEEK_OPENAI_BASE_URL,
    }
  }
  if (E.OPENAI_API_KEY) {
    return { model: 'gpt-4o-mini', provider: 'openai', apiKey: E.OPENAI_API_KEY }
  }
  if (E.OPENROUTER_API_KEY) {
    return {
      model: 'openai/gpt-4o-mini',
      provider: 'openrouter',
      apiKey: E.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
    }
  }
  return null
}
