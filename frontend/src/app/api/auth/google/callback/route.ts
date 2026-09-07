import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { exchangeGoogleAuthCode } from '@/lib/services/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/callback
 *
 * Handles the Google OAuth 2.0 authorization code exchange:
 * 1. Validates CSRF state token against the session cookie.
 * 2. Handles user denial or Google OAuth errors gracefully.
 * 3. Verifies the authenticated teacher session in Supabase.
 * 4. Exchanges the code for Google tokens (access token and refresh token).
 * 5. Saves the `google_refresh_token` in `public.users` for the teacher.
 * 6. Redirects back to `/instructor/settings` with a success or error query parameter.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const settingsUrl = new URL('/instructor/settings', baseUrl);

  // Helper to build redirect and clear CSRF state cookie
  const createCleanRedirect = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete('google_oauth_state');
    return response;
  };

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const returnedState = searchParams.get('state');

  // 1. Handle error or access cancellation from Google
  if (errorParam) {
    console.warn('[api/auth/google/callback] Google returned error:', errorParam);
    settingsUrl.searchParams.set('error', errorParam === 'access_denied' ? 'oauth_denied' : 'oauth_failed');
    return createCleanRedirect(settingsUrl);
  }

  // 2. Validate authorization code existence
  if (!code) {
    settingsUrl.searchParams.set('error', 'missing_code');
    return createCleanRedirect(settingsUrl);
  }

  // 3. CSRF State validation
  const savedState = request.cookies.get('google_oauth_state')?.value;
  if (savedState && returnedState && savedState !== returnedState) {
    console.error('[api/auth/google/callback] State mismatch - potential CSRF attack');
    settingsUrl.searchParams.set('error', 'invalid_state');
    return createCleanRedirect(settingsUrl);
  }

  // 4. Authenticate current session
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('error', 'session_expired');
    return createCleanRedirect(loginUrl);
  }

  // 5. Exchange code for tokens
  const redirectUri = new URL('/api/auth/google/callback', baseUrl).toString();
  const exchangeResult = await exchangeGoogleAuthCode(code, redirectUri);

  if (!exchangeResult.success) {
    console.error('[api/auth/google/callback] Token exchange error:', exchangeResult.error);
    settingsUrl.searchParams.set('error', 'token_exchange_failed');
    return createCleanRedirect(settingsUrl);
  }

  // 6. Update instructor record in public.users
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbClient = serviceRoleKey
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
    : sessionClient;

  const { error: updateError } = await dbClient
    .from('users')
    .update({
      google_refresh_token: exchangeResult.refreshToken,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[api/auth/google/callback] Database update failed:', updateError);
    settingsUrl.searchParams.set('error', 'db_save_failed');
    return createCleanRedirect(settingsUrl);
  }

  // 7. Success redirect back to instructor settings
  settingsUrl.searchParams.set('success', 'google_connected');
  return createCleanRedirect(settingsUrl);
}
