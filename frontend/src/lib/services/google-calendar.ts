/**
 * Learnify - Headless Google Calendar Service
 *
 * Server-side Google Calendar API v3 client built on native `fetch`.
 * Deliberately avoids the `googleapis` npm package to keep the server
 * bundle small.
 *
 * Authentication uses the OAuth 2.0 refresh-token flow. Meetings are
 * created on the *assigned teacher's* calendar (giving them full host
 * authority), so each call exchanges that teacher's personal refresh
 * token — stored on `public.users.google_refresh_token` — for a fresh
 * access token. The global client credentials (`GOOGLE_CLIENT_ID` /
 * `GOOGLE_CLIENT_SECRET`) still come from `.env`, and the legacy
 * system-wide `GOOGLE_REFRESH_TOKEN` remains available as a fallback
 * for teachers who haven't connected their own account yet.
 *
 * SERVER-ONLY BY CONTRACT: this module must never be imported from a
 * Client Component. It is consumed exclusively by Server Actions
 * (`actions/live-class.ts`) and the cron route
 * (`app/api/cron/live-classes/route.ts`).
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
  /** Invitees (enrolled students + the teacher) — whitelisted to bypass the Meet waiting room */
  attendeeEmails: string[];
  /**
   * OAuth refresh token of the calendar owner — the assigned teacher's
   * personal token from `public.users.google_refresh_token`. The event
   * is created on this account's calendar, making the teacher the Meet host.
   */
  teacherRefreshToken: string;
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
// Google access tokens are valid for ~1 hour. Cache them keyed by the
// refresh token they were minted from (a teacher's personal token, or
// the system-wide `.env` token) with a conservative TTL, so a cron run
// that processes several classes for the same teacher exchanges that
// teacher's refresh token once per burst instead of once per event —
// and access tokens minted for different teachers never collide.

const ACCESS_TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes

const accessTokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>();

// ─── Auth ──────────────────────────────────────────────────────

/**
 * Core OAuth 2.0 refresh-token grant shared by all token helpers.
 * Exchanges a refresh token for a short-lived access token using the
 * global `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from `.env`.
 *
 * Results are cached per refresh token (see Token Cache above).
 */
async function exchangeRefreshToken(refreshToken: string): Promise<string> {
  // Fast path: reuse a still-valid cached token minted from this refresh token.
  const cached = accessTokenCache.get(refreshToken);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const missing = [
      !clientId && 'GOOGLE_CLIENT_ID',
      !clientSecret && 'GOOGLE_CLIENT_SECRET',
    ]
      .filter(Boolean)
      .join(', ');
    throw new Error(
      `[google-calendar] Missing Google OAuth client credentials in .env: ${missing}`
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

  accessTokenCache.set(refreshToken, {
    token: data.access_token,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
  });

  return data.access_token;
}

/**
 * Exchanges a *specific* OAuth 2.0 refresh token — usually the assigned
 * teacher's personal token from `public.users.google_refresh_token` —
 * for a fresh access token, so the Google Calendar event is created on
 * that teacher's calendar and they own the Meet as host.
 *
 * Uses the global `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from `.env`;
 * it never reads the system-wide `GOOGLE_REFRESH_TOKEN`.
 *
 * @param refreshToken The refresh token to exchange (must be non-empty)
 * @returns            A valid `access_token` string
 * @throws             If client credentials are missing or Google rejects the grant
 */
export async function getTeacherAccessToken(
  refreshToken: string
): Promise<string> {
  if (!refreshToken) {
    throw new Error(
      '[google-calendar] getTeacherAccessToken requires a refresh token.'
    );
  }
  return exchangeRefreshToken(refreshToken);
}

/**
 * Backwards-compatible, env-based helper. Exchanges the system-wide
 * `GOOGLE_REFRESH_TOKEN` from `.env` for an access token. Used as a
 * fallback by the cron route when the assigned teacher has not yet
 * connected their own Google account.
 *
 * @returns A valid `access_token` string
 * @throws  If credentials are missing from `.env` or Google rejects the grant
 */
export async function getAccessToken(): Promise<string> {
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

  return exchangeRefreshToken(refreshToken);
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
 * @param params.attendeeEmails - Invitees (students + teacher), whitelisted to
 *                               bypass the Meet waiting room
 * @param params.teacherRefreshToken - Personal OAuth refresh token of the
 *                               calendar owner (teacher), whose calendar the
 *                               event is created on
 * @returns                     - Google event ID + Meet join link
 * @throws                      - If the event cannot be created or Meet data is missing
 */
export async function createGoogleMeetEvent(
  params: CreateMeetParams
): Promise<GoogleMeetEventResult> {
  const {
    title,
    description,
    startTime,
    endTime,
    attendeeEmails,
    teacherRefreshToken,
  } = params;

  // Exchange the calendar owner's (teacher's) refresh token so the event
  // lands on their calendar with them as the Meet host.
  const accessToken = await getTeacherAccessToken(teacherRefreshToken);

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
