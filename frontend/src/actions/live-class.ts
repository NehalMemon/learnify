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
 *
 * Meetings are created on the **assigned teacher's** calendar using their
 * personal `google_refresh_token`. When the teacher hasn't connected their
 * Google account yet, the class is still scheduled but a `warning` is
 * returned so the admin knows the Meet link will be skipped until the
 * teacher connects their account.
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

    // Teacher-owned Meet generation: warn when the assigned teacher hasn't
    // connected their Google account, so the admin can fix it before the
    // cron run. Failures reading the token are deliberately swallowed —
    // the cron route enforces the actual skip/fallback at generation time.
    let warning: string | undefined;
    if (payload.teacher_id) {
      const { data: teacher, error: teacherError } = await supabase
        .from('users')
        .select('google_refresh_token')
        .eq('id', payload.teacher_id)
        .maybeSingle();

      if (!teacherError && !teacher?.google_refresh_token) {
        warning =
          'The assigned teacher has not connected their Google account, so the ' +
          'meeting will not be created on their calendar (it may fall back to the ' +
          'system calendar or be skipped) until they connect it.';
      }
    }

    revalidatePath('/admin/live-classes');
    return warning ? { success: true, data, warning } : { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create live class';
    console.error('createLiveClass exception:', err);
    return { success: false, error: message };
  }
}

/**
 * Deletes a live class from the database.
 *
 * NOTE: only the DB row is removed — the corresponding Google Calendar
 * event (if already generated) is left intact. Deleting the calendar
 * event from the teacher's calendar is intentionally out of scope.
 */
export async function deleteLiveClass(id: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('live_classes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteLiveClass error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/live-classes');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete live class';
    console.error('deleteLiveClass exception:', err);
    return { success: false, error: message };
  }
}

/**
 * Fetches every live class, ordered by start time ascending.
 */
export async function getLiveClassById(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .returns<LiveClass>();

    if (error) {
      return { success: false, error: error.message, data: null };
    }
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch live class';
    return { success: false, error: message, data: null };
  }
}

export async function updateLiveClass(id: string, payload: Partial<CreateLiveClassPayload> & { status?: LiveClass['status'] }) {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (payload.course_id !== undefined) updateData.course_id = payload.course_id;
    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.description !== undefined) updateData.description = payload.description.trim() || null;
    if (payload.teacher_id !== undefined) updateData.teacher_id = payload.teacher_id;
    if (payload.student_ids !== undefined) updateData.student_ids = payload.student_ids;
    if (payload.start_time !== undefined) updateData.start_time = toOffsetAwareISO(payload.start_time);
    if (payload.end_time !== undefined) updateData.end_time = toOffsetAwareISO(payload.end_time);
    if (payload.recurrence !== undefined) updateData.recurrence = payload.recurrence;
    if (payload.recurrence_days !== undefined) updateData.recurrence_days = payload.recurrence_days;
    if (payload.status !== undefined) updateData.status = payload.status;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('live_classes')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
      .returns<LiveClass>();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/live-classes');
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update live class';
    return { success: false, error: message };
  }
}

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

export async function duplicateLiveClass(id: string) {
  try {
    const supabase = await createClient();
    const { data: original, error: fetchErr } = await supabase
      .from('live_classes')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .returns<LiveClass>();

    if (fetchErr || !original) {
      return { success: false, error: fetchErr?.message || 'Original class not found' };
    }

    const { data, error } = await supabase
      .from('live_classes')
      .insert({
        course_id: original.course_id,
        title: `${original.title} (Copy)`,
        description: original.description,
        teacher_id: original.teacher_id,
        student_ids: original.student_ids,
        start_time: original.start_time,
        end_time: original.end_time,
        recurrence: original.recurrence,
        recurrence_days: original.recurrence_days,
        status: 'SCHEDULED',
      })
      .select('*')
      .single()
      .returns<LiveClass>();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/live-classes');
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to duplicate live class';
    return { success: false, error: message };
  }
}

