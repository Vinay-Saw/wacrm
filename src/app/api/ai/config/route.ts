import { NextResponse } from 'next/server'
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'
import { validateAiCredentials } from '@/lib/ai/validate'
import { embedTexts } from '@/lib/ai/embeddings'
import { AiError, type AiProvider } from '@/lib/ai/types'

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * GET /api/ai/config
 *
 * Any member may read the config so the inbox/settings can reflect
 * whether AI is set up. The encrypted key is NEVER returned — only a
 * `has_key` flag; the settings form shows a masked placeholder.
 */
export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()

    const { data, error } = await supabase
      .from('ai_configs')
      // `api_key` is selected only to derive `has_key` — it is stripped
      // out below and never returned to the client.
      .select(
        'provider, model, system_prompt, is_active, auto_reply_enabled, auto_reply_max_per_conversation, handoff_agent_id, api_key, embeddings_api_key',
      )
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) {
      console.error('[ai/config GET] fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to load AI configuration' },
        { status: 500 },
      )
    }

    if (!data) return NextResponse.json({ configured: false })
    // The keys are selected only to derive the has_* flags; neither is
    // returned to the client.
    const { api_key, embeddings_api_key, ...safe } = data

    let provider = safe.provider as AiProvider
    let model = safe.model
    let endpoint: string | null = null
    let fallback: {
      enabled: boolean
      provider: AiProvider
      model: string
      endpoint: string | null
      has_key: boolean
    } | null = null

    let hasFallbackKey = false
    if (api_key) {
      try {
        const decrypted = decrypt(api_key)
        if (decrypted.startsWith('{') && decrypted.endsWith('}')) {
          const parsed = JSON.parse(decrypted)
          hasFallbackKey = Boolean(parsed?.fallback)
        }
      } catch {
        // Ignore decrypt error
      }
    }

    if (safe.model && safe.model.startsWith('chain|')) {
      try {
        const chain = JSON.parse(safe.model.slice(6))
        if (chain?.primary) {
          provider = chain.primary.provider || 'openai'
          model = chain.primary.model || ''
          endpoint = chain.primary.endpoint || null
        }
        if (chain?.fallback) {
          fallback = {
            enabled: true,
            provider: chain.fallback.provider || 'openai',
            model: chain.fallback.model || '',
            endpoint: chain.fallback.endpoint || null,
            has_key: hasFallbackKey,
          }
        }
      } catch (err) {
        console.error('[ai/config GET] error parsing chain model:', err)
      }
    } else if (safe.model && safe.model.startsWith('custom|')) {
      const parts = safe.model.split('|')
      provider = 'custom'
      endpoint = parts[1] || null
      model = parts.slice(2).join('|') || ''
    }

    return NextResponse.json({
      configured: true,
      has_key: !!api_key,
      has_embeddings_key: !!embeddings_api_key,
      ...safe,
      provider,
      model,
      endpoint,
      fallback,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/ai/config  (admin+)
 *
 * Upsert the account's AI config. Validates the key with the provider
 * before persisting (mirrors the WhatsApp config verifying with Meta
 * first), then stores the key AES-256-GCM-encrypted. When `api_key` is
 * omitted the existing stored key is reused (the form sends it only
 * when the user re-enters it).
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin')

    const limit = checkRateLimit(`ai-config:${userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return bad('Invalid request body')

    const provider = body.provider as AiProvider
    if (provider !== 'openai' && provider !== 'anthropic' && provider !== 'custom') {
      return bad('provider must be "openai", "anthropic", or "custom"')
    }
    const model = typeof body.model === 'string' ? body.model.trim() : ''
    if (!model) return bad('model is required')

    let endpoint: string | null = null
    if (provider === 'custom') {
      const rawEndpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
      if (!rawEndpoint) {
        return bad('endpoint URL is required for custom AI provider')
      }
      try {
        const parsed = new URL(rawEndpoint)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return bad('endpoint URL must start with http:// or https://')
        }
        endpoint = rawEndpoint
      } catch {
        return bad('Invalid endpoint URL')
      }
    }

    // Fallback provider configuration (optional secondary AI provider)
    let fallbackConfig: {
      provider: AiProvider
      model: string
      endpoint?: string | null
      apiKey: string
    } | null = null

    const rawFallback = body.fallback
    const fallbackEnabled = rawFallback && rawFallback.enabled === true

    // Reuse existing keys
    const { data: existing } = await supabase
      .from('ai_configs')
      .select('id, provider, model, api_key')
      .eq('account_id', accountId)
      .maybeSingle()

    let storedPrimaryKey: string | null = null
    let storedFallbackKey: string | null = null
    let storedPrimaryModel: string | null = null
    let storedPrimaryProvider: string | null = null
    let storedPrimaryEndpoint: string | null = null
    let storedFallbackModel: string | null = null
    let storedFallbackProvider: string | null = null
    let storedFallbackEndpoint: string | null = null

    if (existing?.api_key) {
      try {
        const decrypted = decrypt(existing.api_key)
        if (decrypted.startsWith('{') && decrypted.endsWith('}')) {
          const parsed = JSON.parse(decrypted)
          storedPrimaryKey = parsed.primary || null
          storedFallbackKey = parsed.fallback || null
        } else {
          storedPrimaryKey = decrypted
        }
      } catch {
        return bad('Stored API key could not be decrypted — re-enter your key.')
      }
    }

    if (existing?.model) {
      if (existing.model.startsWith('chain|')) {
        try {
          const parsedChain = JSON.parse(existing.model.slice(6))
          storedPrimaryProvider = parsedChain?.primary?.provider || null
          storedPrimaryModel = parsedChain?.primary?.model || null
          storedPrimaryEndpoint = parsedChain?.primary?.endpoint || null
          storedFallbackProvider = parsedChain?.fallback?.provider || null
          storedFallbackModel = parsedChain?.fallback?.model || null
          storedFallbackEndpoint = parsedChain?.fallback?.endpoint || null
        } catch {}
      } else if (existing.model.startsWith('custom|')) {
        const parts = existing.model.split('|')
        storedPrimaryProvider = 'custom'
        storedPrimaryEndpoint = parts[1] || null
        storedPrimaryModel = parts.slice(2).join('|') || null
      } else {
        storedPrimaryProvider = existing.provider
        storedPrimaryModel = existing.model
      }
    }

    const rawKey = typeof body.api_key === 'string' ? body.api_key.trim() : ''
    let apiKeyPlain: string
    if (rawKey) {
      apiKeyPlain = rawKey
    } else if (storedPrimaryKey) {
      apiKeyPlain = storedPrimaryKey
    } else {
      return bad('api_key is required')
    }

    if (fallbackEnabled) {
      const fbProvider = rawFallback.provider as AiProvider
      if (fbProvider !== 'openai' && fbProvider !== 'anthropic' && fbProvider !== 'custom') {
        return bad('fallback provider must be "openai", "anthropic", or "custom"')
      }
      const fbModel = typeof rawFallback.model === 'string' ? rawFallback.model.trim() : ''
      if (!fbModel) return bad('fallback model is required when fallback is enabled')

      let fbEndpoint: string | null = null
      if (fbProvider === 'custom') {
        const rawFbEndpoint = typeof rawFallback.endpoint === 'string' ? rawFallback.endpoint.trim() : ''
        if (!rawFbEndpoint) {
          return bad('fallback endpoint URL is required for custom fallback provider')
        }
        try {
          const parsed = new URL(rawFbEndpoint)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return bad('fallback endpoint URL must start with http:// or https://')
          }
          fbEndpoint = rawFbEndpoint
        } catch {
          return bad('Invalid fallback endpoint URL')
        }
      }

      const rawFbKey = typeof rawFallback.api_key === 'string' ? rawFallback.api_key.trim() : ''
      let fbKeyPlain: string
      if (rawFbKey) {
        fbKeyPlain = rawFbKey
      } else if (storedFallbackKey) {
        fbKeyPlain = storedFallbackKey
      } else {
        return bad('fallback api_key is required when fallback is enabled')
      }

      fallbackConfig = {
        provider: fbProvider,
        model: fbModel,
        endpoint: fbEndpoint,
        apiKey: fbKeyPlain,
      }
    }

    const systemPrompt =
      typeof body.system_prompt === 'string' && body.system_prompt.trim()
        ? body.system_prompt.trim()
        : null
    const isActive = body.is_active === true
    const autoReplyEnabled = body.auto_reply_enabled === true

    let maxPer = Number(body.auto_reply_max_per_conversation)
    if (!Number.isFinite(maxPer)) maxPer = 3
    maxPer = Math.min(20, Math.max(1, Math.floor(maxPer)))

    const rawHandoff =
      typeof body.handoff_agent_id === 'string' ? body.handoff_agent_id.trim() : ''
    const handoffProvided = 'handoff_agent_id' in body
    let handoffAgentId: string | null = null
    if (rawHandoff) {
      const { data: member } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('user_id', rawHandoff)
        .maybeSingle()
      if (!member) return bad('handoff_agent_id must be a member of this account')
      handoffAgentId = rawHandoff
    }

    const rawEmbeddingsKey =
      typeof body.embeddings_api_key === 'string'
        ? body.embeddings_api_key.trim()
        : ''
    const clearEmbeddingsKey = body.embeddings_api_key === null

    // Validate primary credentials if changed
    const primaryChanged =
      !existing ||
      rawKey !== '' ||
      provider !== storedPrimaryProvider ||
      model !== storedPrimaryModel ||
      endpoint !== storedPrimaryEndpoint

    if (primaryChanged) {
      try {
        await validateAiCredentials({
          provider,
          model,
          apiKey: apiKeyPlain,
          endpoint,
          systemPrompt,
          isActive,
          autoReplyEnabled,
          autoReplyMaxPerConversation: maxPer,
          handoffAgentId: null,
          embeddingsApiKey: null,
        })
      } catch (err) {
        if (err instanceof AiError) {
          return NextResponse.json(
            { error: `Primary provider: ${err.message}`, code: err.code },
            { status: 400 },
          )
        }
        console.error('[ai/config POST] primary validation error:', err)
        return bad('Could not validate the primary API key with the provider.')
      }
    }

    // Validate fallback credentials if changed
    if (fallbackConfig) {
      const rawFbKey = typeof rawFallback.api_key === 'string' ? rawFallback.api_key.trim() : ''
      const fallbackChanged =
        !storedFallbackKey ||
        rawFbKey !== '' ||
        fallbackConfig.provider !== storedFallbackProvider ||
        fallbackConfig.model !== storedFallbackModel ||
        fallbackConfig.endpoint !== storedFallbackEndpoint

      if (fallbackChanged) {
        try {
          await validateAiCredentials({
            provider: fallbackConfig.provider,
            model: fallbackConfig.model,
            apiKey: fallbackConfig.apiKey,
            endpoint: fallbackConfig.endpoint,
            systemPrompt,
            isActive,
            autoReplyEnabled,
            autoReplyMaxPerConversation: maxPer,
            handoffAgentId: null,
            embeddingsApiKey: null,
          })
        } catch (err) {
          if (err instanceof AiError) {
            return NextResponse.json(
              { error: `Fallback provider: ${err.message}`, code: err.code },
              { status: 400 },
            )
          }
          console.error('[ai/config POST] fallback validation error:', err)
          return bad('Could not validate the fallback API key with the provider.')
        }
      }
    }

    // Validate a new embeddings key before storing
    if (rawEmbeddingsKey) {
      try {
        await embedTexts(rawEmbeddingsKey, ['ping'])
      } catch (err) {
        if (err instanceof AiError) {
          return NextResponse.json(
            { error: `Embeddings key: ${err.message}`, code: err.code },
            { status: 400 },
          )
        }
        console.error('[ai/config POST] embeddings validation error:', err)
        return bad('Could not validate the embeddings key.')
      }
    }

    // Prepare encrypted keys payload
    let combinedKeysPlain: string
    if (fallbackConfig) {
      combinedKeysPlain = JSON.stringify({
        primary: apiKeyPlain,
        fallback: fallbackConfig.apiKey,
      })
    } else {
      combinedKeysPlain = apiKeyPlain
    }
    const encryptedKey = encrypt(combinedKeysPlain)

    // Prepare model payload
    let dbModel: string
    if (fallbackConfig) {
      dbModel = `chain|${JSON.stringify({
        primary: { provider, model, endpoint },
        fallback: {
          provider: fallbackConfig.provider,
          model: fallbackConfig.model,
          endpoint: fallbackConfig.endpoint,
        },
      })}`
    } else if (provider === 'custom') {
      dbModel = `custom|${endpoint}|${model}`
    } else {
      dbModel = model
    }

    const dbProvider = provider === 'anthropic' ? 'anthropic' : 'openai'

    const shared: Record<string, unknown> = {
      provider: dbProvider,
      model: dbModel,
      api_key: encryptedKey,
      system_prompt: systemPrompt,
      is_active: isActive,
      auto_reply_enabled: autoReplyEnabled,
      auto_reply_max_per_conversation: maxPer,
    }
    // Only touch the handoff target when the form actually sent the field,
    // so a partial save (e.g. flipping a toggle) doesn't wipe it.
    if (handoffProvided) shared.handoff_agent_id = handoffAgentId
    if (rawEmbeddingsKey) {
      shared.embeddings_api_key = encrypt(rawEmbeddingsKey)
    } else if (clearEmbeddingsKey) {
      shared.embeddings_api_key = null
    }

    if (existing) {
      const { error: upErr } = await supabase
        .from('ai_configs')
        .update(encryptedKey ? { ...shared, api_key: encryptedKey } : shared)
        .eq('account_id', accountId)
      if (upErr) {
        console.error('[ai/config POST] update error:', upErr)
        return NextResponse.json(
          { error: 'Failed to save AI configuration' },
          { status: 500 },
        )
      }
    } else {
      const { error: insErr } = await supabase.from('ai_configs').insert({
        account_id: accountId,
        created_by: userId,
        api_key: encryptedKey, // guaranteed non-null: rawKey required when no existing row
        ...shared,
      })
      if (insErr) {
        console.error('[ai/config POST] insert error:', insErr)
        return NextResponse.json(
          { error: 'Failed to save AI configuration' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/ai/config  (admin+)
 *
 * Removes the account's AI config (turns everything off and forgets the
 * key). Also used to recover from a corrupted encrypted key.
 */
export async function DELETE() {
  try {
    const { supabase, accountId } = await requireRole('admin')
    const { error } = await supabase
      .from('ai_configs')
      .delete()
      .eq('account_id', accountId)
    if (error) {
      console.error('[ai/config DELETE] error:', error)
      return NextResponse.json(
        { error: 'Failed to delete AI configuration' },
        { status: 500 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
