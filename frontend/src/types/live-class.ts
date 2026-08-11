/**
 * Learnify - Live Class Types
 *
 * Strict TypeScript definitions for the Live Class module.
 * Field names mirror the Supabase `live_classes` table (snake_case)
 * so rows can be mapped 1:1 without transformation.
 *
 * Google Meet links are created automatically via the Google Calendar
 * API v3 service (see `lib/services/google-calendar.ts`).
 */

// ─── Enums ─────────────────────────────────────────────────────

export type ClassStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export type RecurrenceType = 'NONE' | 'WEEKLY';

// ─── DB Row ────────────────────────────────────────────────────

export interface LiveClass {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  /** Assigned teacher (users.id) */
  teacher_id?: string;
  /** Assigned students (users.id[]) */
  student_ids: string[];
  /** ISO 8601 timestamp */
  start_time: string;
  /** ISO 8601 timestamp */
  end_time: string;
  recurrence: RecurrenceType;
  /** 1=Mon, 2=Tue, ..., 7=Sun */
  recurrence_days: number[];
  /** Google Meet conference link (auto-generated via Calendar API) */
  meet_link?: string;
  /** ID of the corresponding Google Calendar event */
  google_event_id?: string;
  status: ClassStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Live class enriched with joined display fields (course title + teacher
 * name) for the admin Class Library dashboard.
 */
export interface LiveClassRow extends LiveClass {
  course_title: string | null;
  teacher_name: string | null;
}

// ─── Payloads ──────────────────────────────────────────────────

export interface CreateLiveClassPayload {
  course_id: string;
  title: string;
  description?: string;
  teacher_id: string;
  student_ids: string[];
  /** ISO string */
  start_time: string;
  /** ISO string */
  end_time: string;
  recurrence?: RecurrenceType;
  recurrence_days?: number[];
}
