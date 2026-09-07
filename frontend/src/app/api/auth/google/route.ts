import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildGoogleAuthUrl } from '@/lib/services/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth 2.0 flow for instructors:
 * 1. Verifies the user is authenticated in Learnify.
 * 2. Generates a secure CSRF state token and stores it in an HttpOnly cookie.
 * 3. Constructs the Google consent URL with calendar.events scope, offline access, and consent prompt.
 * 4. Redirects the instructor to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate instructor session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    // 2. Generate secure CSRF state
    const state = crypto.randomUUID();

    // 3. Resolve redirect URI (origin from request or NEXT_PUBLIC_SITE_URL)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const redirectUri = new URL('/api/auth/google/callback', baseUrl).toString();

    // 4. Construct Google consent URL
    const googleAuthUrl = buildGoogleAuthUrl(redirectUri, state);

    // 5. Build redirect response and attach state cookie
    const response = NextResponse.redirect(googleAuthUrl);

    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    });

    return response;
  } catch (err) {
    console.error('[api/auth/google] Failed to initiate Google OAuth:', err);
    const settingsUrl = new URL('/instructor/settings', request.url);
    settingsUrl.searchParams.set('error', 'initiation_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
