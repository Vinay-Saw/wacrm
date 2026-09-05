import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

interface OpenAiPart {
  type?: string
  text?: string
}

interface OpenAiMessage {
  role?: string
  content?: string | OpenAiPart[] | null
  reasoning?: string | null
  reasoning_content?: string | null
}

interface OpenAiChoice {
  message?: OpenAiMessage
  text?: string
  delta?: {
    content?: string | OpenAiPart[] | null
    reasoning?: string | null
    reasoning_content?: string | null
  }
}

interface OpenAiResponse {
  choices?: OpenAiChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: { message?: string; code?: string | number } | string
}

function extractChoiceText(choice?: OpenAiChoice): string {
  if (!choice) return ''
  const msg = choice.message
  if (msg) {
    if (typeof msg.content === 'string' && msg.content.trim()) {
      return msg.content.trim()
    }
    if (Array.isArray(msg.content)) {
      const combined = msg.content
        .map((part) => (typeof part === 'string' ? part : part?.text || ''))
        .filter(Boolean)
        .join('\n')
        .trim()
      if (combined) return combined
    }
    // Reasoning models (Nemotron, DeepSeek R1, QwQ, etc.) on OpenRouter
    // store their thought/output in `reasoning_content` or `reasoning`.
    if (typeof msg.reasoning_content === 'string' && msg.reasoning_content.trim()) {
      return msg.reasoning_content.trim()
    }
    if (typeof msg.reasoning === 'string' && msg.reasoning.trim()) {
      return msg.reasoning.trim()
    }
  }
  if (typeof choice.text === 'string' && choice.text.trim()) {
    return choice.text.trim()
  }
  if (choice.delta) {
    if (typeof choice.delta.content === 'string' && choice.delta.content.trim()) {
      return choice.delta.content.trim()
    }
    if (typeof choice.delta.reasoning_content === 'string' && choice.delta.reasoning_content.trim()) {
      return choice.delta.reasoning_content.trim()
    }
    if (typeof choice.delta.reasoning === 'string' && choice.delta.reasoning.trim()) {
      return choice.delta.reasoning.trim()
    }
  }
  return ''
}

export interface OpenAiProviderArgs extends ProviderArgs {
  endpoint?: string | null
}

/**
 * Call OpenAI's Chat Completions endpoint (or custom OpenAI-compatible endpoint)
 * with the caller's own key. Returns the raw assistant text + token usage
 * (handoff parsing happens in `generateReply`).
 */
export async function generateOpenAi(args: OpenAiProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs, endpoint } = args

  let url = OPENAI_URL
  if (endpoint && endpoint.trim()) {
    const raw = endpoint.trim()
    if (raw.endsWith('/chat/completions')) {
      url = raw
    } else {
      url = `${raw.replace(/\/+$/, '')}/chat/completions`
    }
  }

  const providerName = endpoint ? 'Custom AI endpoint' : 'OpenAI'

  // OpenRouter and standard OpenAI-compatible endpoints require `max_tokens`.
  // Native OpenAI o-series models require `max_completion_tokens`.
  const isNativeOModel = !endpoint && (model.startsWith('o1') || model.startsWith('o3'))
  const requestPayload: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...mergeConsecutive(messages),
    ],
    ...(isNativeOModel
      ? { max_completion_tokens: MAX_OUTPUT_TOKENS }
      : { max_tokens: MAX_OUTPUT_TOKENS }),
  }

  const cleanKey = (apiKey || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^Bearer\s+/i, '')
    .trim()

  if (!cleanKey) {
    throw new AiError('API key is missing. Please enter your API key.', {
      code: 'missing_key',
      status: 400,
    })
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://automacrm.vercel.app',
        'X-Title': 'Automa CRM',
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError(providerName, res)
  }

  const data = (await res.json().catch(() => null)) as OpenAiResponse | null

  if (data?.error) {
    const errorMsg =
      typeof data.error === 'string'
        ? data.error
        : data.error.message || JSON.stringify(data.error)
    throw new AiError(`${providerName} error: ${errorMsg}`, {
      code: 'provider_error',
    })
  }

  const text = extractChoiceText(data?.choices?.[0])
  if (!text) {
    const preview = data ? JSON.stringify(data).slice(0, 300) : 'null'
    console.warn(`[${providerName}] empty response. Raw payload:`, preview)
    throw new AiError(`${providerName} returned an empty response.`, {
      code: 'empty_response',
    })
  }

  const usage = normalizeUsage({
    prompt: data?.usage?.prompt_tokens,
    completion: data?.usage?.completion_tokens,
    total: data?.usage?.total_tokens,
  })
  return { text, usage }
}
