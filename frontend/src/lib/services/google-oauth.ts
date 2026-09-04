/**
 * Learnify - Google OAuth Service
 *
 * Dedicated service handling Google OAuth 2.0 authorization URL construction
 * and code-to-token exchanges for instructor Google Calendar / Meet integration.
 * Follows Clean Code Architecture (Controller -> Service -> Repository).
 */

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export interface ExchangeTokenSuccess {
  success: true;
  refreshToken: string;
  accessToken: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}

export interface ExchangeTokenFailure {
  success: false;
  error: string;
}

export type ExchangeTokenResult = ExchangeTokenSuccess | ExchangeTokenFailure;

interface GoogleTokenApiResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

/**
 * Retrieves the Google OAuth client credentials from environment variables.
 */
export function getGoogleOAuthCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    throw new Error('[google-oauth] Missing GOOGLE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_CLIENT_ID in environment.');
  }

  if (!clientSecret) {
    throw new Error('[google-oauth] Missing GOOGLE_CLIENT_SECRET in environment.');
  }

  return { clientId, clientSecret };
}

/**
 * Builds the Google OAuth2 consent URL.
 *
 * Requirements:
 * - client_id
 * - redirect_uri
 * - response_type=code
 * - scope=https://www.googleapis.com/auth/calendar.events
 * - access_type=offline
 * - prompt=consent
 * - state for CSRF defense
 */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getGoogleOAuthCredentials();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CALENDAR_EVENTS_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges an authorization code received from Google for tokens.
 *
 * @param code The authorization code from the callback
 * @param redirectUri The exact redirect URI used during initiation
 * @returns Result object containing refreshToken and accessToken, or an error
 */
export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string
): Promise<ExchangeTokenResult> {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[google-oauth] Network error during token exchange:', err);
    return { success: false, error: `Network error: ${message}` };
  }

  let data: GoogleTokenApiResponse;
  try {
    data = (await response.json()) as GoogleTokenApiResponse;
  } catch (err) {
    console.error('[google-oauth] Failed to parse token response JSON:', err);
    return { success: false, error: 'Google returned invalid JSON response.' };
  }

  if (!response.ok) {
    const errorMsg = data.error_description || data.error || `HTTP ${response.status} ${response.statusText}`;
    console.error('[google-oauth] Google token exchange rejected:', errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!data.access_token) {
    return { success: false, error: 'Token response missing access_token.' };
  }

  if (!data.refresh_token) {
    // Note: prompt=consent ensures Google sends refresh_token. If missing, user may have pre-authorized.
    return {
      success: false,
      error: 'Google did not return a refresh token. Please revoke access in your Google Account security settings and re-connect.',
    };
  }

  return {
    success: true,
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
}
