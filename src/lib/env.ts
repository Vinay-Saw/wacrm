/**
 * Startup Environment Variable Validation.
 *
 * Validates required server-side and client-side environment variables at boot time,
 * providing clear diagnostic error messages instead of failing deep in request handlers.
 */

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
}

const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/

/**
 * Checks all required environment variables against validation rules.
 */
export function checkEnv(
  env: Record<string, string | undefined> = process.env,
): EnvValidationResult {
  const errors: string[] = []

  // 1. NEXT_PUBLIC_SUPABASE_URL
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!supabaseUrl) {
    errors.push(
      'NEXT_PUBLIC_SUPABASE_URL is missing. Expected Supabase project URL (e.g. https://your-project.supabase.co).',
    )
  }

  // 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseAnonKey) {
    errors.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Expected Supabase public anon key.',
    )
  }

  // 3. SUPABASE_SERVICE_ROLE_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceRoleKey) {
    errors.push(
      'SUPABASE_SERVICE_ROLE_KEY is missing. Expected Supabase service_role secret key.',
    )
  }

  // 4. ENCRYPTION_KEY (must be 64-char hex string = 32 bytes)
  const encKey = env.ENCRYPTION_KEY?.trim()
  if (!encKey) {
    errors.push(
      'ENCRYPTION_KEY is missing. Expected 64-character hex string (32 bytes AES-256 key).',
    )
  } else if (!HEX_64_REGEX.test(encKey)) {
    errors.push(
      `ENCRYPTION_KEY is invalid. Expected exactly 64 hexadecimal characters (32 bytes), received ${encKey.length} chars.`,
    )
  }

  // 5. META_APP_SECRET
  const metaSecret = env.META_APP_SECRET?.trim()
  if (!metaSecret) {
    errors.push(
      'META_APP_SECRET is missing. Expected Meta App Secret (from Meta Developers -> App Settings -> Basic).',
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

let _validated = false

/**
 * Validates environment variables on server boot.
 * Throws a formatted Error if any required variable is missing or invalid.
 */
export function validateEnv(options?: {
  force?: boolean
  env?: Record<string, string | undefined>
  isServer?: boolean
}): void {
  // Only execute validation on server runtime
  const isServer = options?.isServer ?? (typeof window === 'undefined')
  if (!isServer) {
    return
  }

  // Respect standard skip flag for CI / Docker asset build stages
  const activeEnv = options?.env ?? process.env
  if (
    activeEnv.SKIP_ENV_VALIDATION === '1' ||
    activeEnv.SKIP_ENV_VALIDATION === 'true'
  ) {
    return
  }

  if (_validated && !options?.force) {
    return
  }

  const result = checkEnv(activeEnv)

  if (!result.valid) {
    const header =
      '================================================================================'
    const errorLines = [
      header,
      '[env] ❌ MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES:',
      ...result.errors.map((err) => `  - ${err}`),
      '',
      'Please check your .env.local file or deployment environment variables.',
      header,
    ]

    console.error(errorLines.join('\n'))
    throw new Error(
      `Environment validation failed:\n${result.errors.join('\n')}`,
    )
  }

  _validated = true
  console.log('[env] ✓ All required environment variables present')
}

/**
 * Test helper to reset the validation cached flag.
 */
export function __resetEnvValidationForTests(): void {
  _validated = false
}
