'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import type { LiveClass, CreateLiveClassPayload } from '@/types/live-class';

/**
 * Ensures an ISO timestamp is offset-aware (ends with `Z` or `±HH:MM`).
 * Floating strings (e.g. the raw value of `<input type="datetime-local">`)
 * are interpreted in the server's local timezone and converted to UTC,
 * so Postgres and the Google Calendar API agree on the exact instant.
 */
function toOffsetAwareISO(iso: string): string {
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(iso)) return iso;
  const asDate = new Date(iso);
  if (Number.isNaN(asDate.getTime())) {
    throw new Error(`Invalid date string: "${iso}"`);
  }
  return asDate.toISOString();
}

/**
 * Creates a scheduled live class in the database.
 *
 * DB-ONLY BY CONTRACT: this action never calls the Google API.
 * The Google Meet link is generated asynchronously by the cron route
 * (`/api/cron/live-classes`) — triggered by Hostinger cron in production
 * or `scripts/dev-cron.mjs` in development.
 */
export async function createLiveClass(payload: CreateLiveClassPayload) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('live_classes')
      .insert({
        course_id: payload.course_id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        teacher_id: payload.teacher_id,
        student_ids: payload.student_ids,
        start_time: toOffsetAwareISO(payload.start_time),
        end_time: toOffsetAwareISO(payload.end_time),
        recurrence: payload.recurrence ?? 'NONE',
        recurrence_days: payload.recurrence_days ?? [],
        status: 'SCHEDULED',
      })
      .select('*')
      .single()
      .returns<LiveClass>();

    if (error) {
      console.error('createLiveClass error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/live-classes');
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create live class';
    console.error('createLiveClass exception:', err);
    return { success: false, error: message };
  }
}

/**
 * Fetches every live class, ordered by start time ascending.
 */
export async function getAdminLiveClasses() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('live_classes')
      .select('*')
      .order('start_time', { ascending: true })
      .returns<LiveClass[]>();

    if (error) {
      console.error('getAdminLiveClasses error:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch live classes';
    console.error('getAdminLiveClasses exception:', err);
    return { success: false, error: message, data: [] };
  }
}
