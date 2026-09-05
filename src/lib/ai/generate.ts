import {
  AiError,
  type AiConfig,
  type AiUsage,
  type ChatMessage,
  type GenerateResult,
} from './types'
import { HANDOFF_SENTINEL, aiRequestTimeoutMs } from './defaults'
import { generateOpenAi } from './providers/openai'
import { generateAnthropic } from './providers/anthropic'

export interface GenerateArgs {
  config: AiConfig
  /** Fully-built system prompt (see `buildSystemPrompt`). */
  systemPrompt: string
  /** Recent conversation turns, oldest first. */
  messages: ChatMessage[]
}

async function callProvider(
  target: {
    provider: AiConfig['provider']
    model: string
    apiKey: string
    endpoint?: string | null
  },
  systemPrompt: string,
  messages: ChatMessage[],
  timeoutMs: number,
): Promise<{ text: string; usage: AiUsage | null }> {
  const providerArgs = {
    apiKey: target.apiKey,
    model: target.model,
    systemPrompt,
    messages,
    timeoutMs,
  }

  switch (target.provider) {
    case 'openai':
      return await generateOpenAi(providerArgs)
    case 'custom':
      return await generateOpenAi({ ...providerArgs, endpoint: target.endpoint })
    case 'anthropic':
      return await generateAnthropic(providerArgs)
    default:
      throw new AiError(`Unsupported AI provider: ${target.provider}`, {
        code: 'unsupported_provider',
        status: 400,
      })
  }
}

/**
 * Generate the next reply from the account's configured provider.
 * Automatically fails over to the fallback provider if configured and
 * the primary provider fails. Dispatches to the right adapter, then
 * parses the handoff sentinel out of the raw text. Throws `AiError` on
 * any provider/network failure.
 */
export async function generateReply(args: GenerateArgs): Promise<GenerateResult> {
  const { config, systemPrompt, messages } = args
  const timeoutMs = aiRequestTimeoutMs()

  let result: { text: string; usage: AiUsage | null }
  try {
    result = await callProvider(
      {
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        endpoint: config.endpoint,
      },
      systemPrompt,
      messages,
      timeoutMs,
    )
  } catch (primaryErr) {
    if (config.fallback && config.fallback.apiKey && config.fallback.model) {
      console.warn(
        `[ai/generate] Primary provider (${config.provider}/${config.model}) failed: ${
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
        }. Failing over to fallback provider (${config.fallback.provider}/${config.fallback.model})...`,
      )
      try {
        result = await callProvider(
          {
            provider: config.fallback.provider,
            model: config.fallback.model,
            apiKey: config.fallback.apiKey,
            endpoint: config.fallback.endpoint,
          },
          systemPrompt,
          messages,
          timeoutMs,
        )
      } catch (fallbackErr) {
        const primaryMsg =
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
        const fallbackMsg =
          fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        throw new AiError(
          `Primary provider failed (${primaryMsg}) and fallback provider failed (${fallbackMsg}).`,
          {
            code:
              fallbackErr instanceof AiError ? fallbackErr.code : 'fallback_failed',
            status: fallbackErr instanceof AiError ? fallbackErr.status : 502,
          },
        )
      }
    } else {
      throw primaryErr
    }
  }

  return parseGeneration(result.text, result.usage)
}

/**
 * Split the raw model output into `{ text, handoff, usage }`. The
 * sentinel can appear alone or trailing a partial reply; either way we
 * treat the turn as a handoff and strip the marker from any remaining
 * text. `usage` is passed straight through (null when the provider
 * didn't report it).
 */
export function parseGeneration(
  raw: string,
  usage: AiUsage | null = null,
): GenerateResult {
  const handoff = raw.includes(HANDOFF_SENTINEL)
  const text = raw.split(HANDOFF_SENTINEL).join('').trim()
  return { text, handoff, usage }
}
