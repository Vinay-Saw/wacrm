import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  let next = searchParams.get('next') ?? '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard';
  }

  // Derive the public base URL, respecting reverse proxy headers (Vercel, Cloudflare, etc.)
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? origin
      : forwardedHost
        ? `${forwardedProto || 'https'}://${forwardedHost}`
        : process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ||
          origin;

  const targetUrl = new URL(next, baseUrl);
  const response = NextResponse.redirect(targetUrl);

  const cookieStore = await cookies();

  // Create a Supabase server client that writes cookies to BOTH:
  // 1. Next.js internal cookieStore (via cookies())
  // 2. The NextResponse redirect headers directly (via response.cookies.set)
  //
  // This dual-write ensures the session cookies are never lost across the redirect,
  // preventing proxy.ts / middleware from kicking authenticated users back to /login.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Ignore if called in an environment where cookieStore cannot be mutated
            }
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error(
      '[auth/callback] exchangeCodeForSession failed:',
      error.message
    );
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]['type'],
    });
    if (!error) {
      return response;
    }
    console.error('[auth/callback] verifyOtp failed:', error.message);
  }

  // If code exchange failed or no code was provided, redirect to login with error
  const errorDescription =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    'auth_callback_failed';

  const errorRedirect = new URL('/login', baseUrl);
  errorRedirect.searchParams.set('error', errorDescription);
  return NextResponse.redirect(errorRedirect);
}
