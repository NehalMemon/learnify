/**
 * Learnify - Headless Google Calendar Service
 *
 * Server-side Google Calendar API v3 client built on native `fetch`.
 * Deliberately avoids the `googleapis` npm package to keep the server
 * bundle small. Authentication uses the OAuth 2.0 refresh-token flow
 * with long-lived credentials from `.env`:
 *
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN
 *
 * SERVER-ONLY BY CONTRACT: this module must never be imported from a
 * Client Component. It is consumed exclusively by Server Actions
 * (`actions/live-class.ts`).
 */

// ─── Endpoints ─────────────────────────────────────────────────

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_ENDPOINT =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// ─── Types ─────────────────────────────────────────────────────

export interface CreateMeetParams {
  title: string;
  description?: string;
  /** ISO string */
  startTime: string;
  /** ISO string */
  endTime: string;
  attendeeEmails: string[];
}

export interface GoogleMeetEventResult {
  /** Google Calendar event ID (persisted as `google_event_id`) */
  eventId: string;
  /** Google Meet join link (persisted as `meet_link`) */
  hangoutLink: string;
  /** Full Calendar UI link, useful for admin management */
  htmlLink?: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleCalendarEventResponse {
  id?: string;
  hangoutLink?: string;
  htmlLink?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Converts an ISO timestamp into Google's `dateTime` shape.
 * - Offset-aware strings (`Z` or `+05:30`) are passed through as-is.
 * - Floating strings (datetime-local output, no offset) get the server's
 *   timezone attached so Google interprets them correctly.
 */
function toGoogleDateTime(iso: string): { dateTime: string; timeZone?: string } {
  const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  if (hasOffset) return { dateTime: iso };
  return {
    dateTime: iso,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/** Extracts a human-readable reason from a failed Google API response. */
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string | { message?: string };
      error_description?: string;
    };
    if (body?.error_description) return body.error_description;
    if (typeof body?.error === 'string') return body.error;
    if (body?.error?.message) return body.error.message;
  } catch {
    // Non-JSON body — fall through to status text
  }
  return response.statusText || `HTTP ${response.status}`;
}

// ─── Token Cache ─────────────────────────────────────────────────
// Google access tokens are valid for ~1 hour. Cache them module-wide
// with a conservative TTL so bulk operations (e.g. creating many live
// classes at once) exchange the refresh token once per burst instead
// of once per event.

const ACCESS_TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

// ─── Auth ──────────────────────────────────────────────────────

/**
 * Silently exchanges the OAuth 2.0 refresh token for a fresh access token.
 *
 * @returns A valid `access_token` string
 * @throws  If credentials are missing from `.env` or Google rejects the grant
 */
export async function getAccessToken(): Promise<string> {
  // Fast path: reuse a still-valid cached token.
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [
      !clientId && 'GOOGLE_CLIENT_ID',
      !clientSecret && 'GOOGLE_CLIENT_SECRET',
      !refreshToken && 'GOOGLE_REFRESH_TOKEN',
    ]
      .filter(Boolean)
      .join(', ');
    throw new Error(
      `[google-calendar] Missing Google OAuth credentials in .env: ${missing}`
    );
  }

  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[google-calendar] Token request network failure:', err);
    throw new Error(
      `[google-calendar] Network error while fetching access token: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    console.error(
      `[google-calendar] Token endpoint rejected the refresh grant (HTTP ${response.status}): ${detail}`
    );
    throw new Error(
      `[google-calendar] Google rejected the refresh token (HTTP ${response.status}): ${detail}`
    );
  }

  let data: GoogleTokenResponse;
  try {
    data = (await response.json()) as GoogleTokenResponse;
  } catch (err) {
    console.error('[google-calendar] Token response was not valid JSON:', err);
    throw new Error('[google-calendar] Google returned a malformed token response.');
  }

  if (!data.access_token) {
    throw new Error(
      `[google-calendar] Token response missing access_token: ${data.error ?? 'unknown error'} ${data.error_description ?? ''}`.trim()
    );
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS;

  return data.access_token;
}

// ─── Events ────────────────────────────────────────────────────

/**
 * Creates a Google Calendar event with an auto-generated Google Meet
 * conference link via the Calendar API v3 `conferenceData` payload.
 *
 * @param params.title          - Event summary shown in Google Calendar
 * @param params.description    - Optional event description
 * @param params.startTime      - Start time (ISO 8601)
 * @param params.endTime        - End time (ISO 8601)
 * @param params.attendeeEmails - Invitees; the meeting owner is added by Google
 * @returns                     - Google event ID + Meet join link
 * @throws                      - If the event cannot be created or Meet data is missing
 */
export async function createGoogleMeetEvent(
  params: CreateMeetParams
): Promise<GoogleMeetEventResult> {
  const { title, description, startTime, endTime, attendeeEmails } = params;

  const accessToken = await getAccessToken();

  const requestBody = {
    summary: title,
    description: description ?? '',
    start: toGoogleDateTime(startTime),
    end: toGoogleDateTime(endTime),
    attendees: attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(CALENDAR_EVENTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[google-calendar] Event creation network failure:', err);
    throw new Error(
      `[google-calendar] Network error while creating Google Calendar event: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    console.error(
      `[google-calendar] Event creation failed (HTTP ${response.status}): ${detail}`
    );
    throw new Error(
      `[google-calendar] Failed to create Google Meet event (HTTP ${response.status}): ${detail}`
    );
  }

  let event: GoogleCalendarEventResponse;
  try {
    event = (await response.json()) as GoogleCalendarEventResponse;
  } catch (err) {
    console.error('[google-calendar] Event response was not valid JSON:', err);
    throw new Error('[google-calendar] Google returned a malformed event response.');
  }

  if (!event.id || !event.hangoutLink) {
    throw new Error(
      '[google-calendar] Event created but missing id/hangoutLink (conference data was not applied).'
    );
  }

  return {
    eventId: event.id,
    hangoutLink: event.hangoutLink,
    htmlLink: event.htmlLink,
  };
}
