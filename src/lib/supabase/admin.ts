import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazy-initialized singleton Supabase client authenticated with the SERVICE ROLE key.
 *
 * ⚠️ CAUTION: This client BYPASSES Row Level Security (RLS) entirely!
 * - Every database query performed with this client MUST be explicitly scoped
 *   by `account_id` (or appropriate tenant isolation column) to avoid cross-tenant
 *   data exposure.
 * - Do NOT pass this client to browser or client components.
 */
let _adminClient: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.'
      )
    }

    _adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _adminClient
}
