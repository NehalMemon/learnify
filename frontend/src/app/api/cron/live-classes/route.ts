import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { createGoogleMeetEvent } from '@/lib/services/google-calendar';
import type { LiveClass } from '@/types/live-class';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/live-classes
 *
 * Generates Google Meet links for live classes that:
 *  - have status = 'SCHEDULED'
 *  - don't have a meet_link yet
 *  - start within the next 24 hours
 *
 * Each meeting is created on the **assigned teacher's** Google Calendar
 * (so they own the Meet as host) by exchanging the teacher's personal
 * refresh token (`public.users.google_refresh_token`). If the teacher
 * hasn't connected their Google account yet, the system-wide
 * `GOOGLE_REFRESH_TOKEN` from `.env` is used as a fallback; when neither
 * is available the class is skipped with an error. Enrolled students'
 * emails (plus the teacher's) are whitelisted as attendees to bypass the
 * Meet waiting room.
 *
 * Triggered by Hostinger cron in production and by `scripts/dev-cron.mjs`
 * in development. Protected by a Bearer token (CRON_SECRET).
 */
export async function GET(req: NextRequest) {
  // ─── Security: Bearer token check ────────────────────────────
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ─── Admin client (bypasses RLS) ─────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[cron/live-classes] Supabase service-role credentials missing.');
    return NextResponse.json(
      { processedCount: 0, successes: [], errors: ['Supabase service-role credentials missing'] },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const successes: string[] = [];
  const errors: string[] = [];

  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // ─── Fetch pending classes ─────────────────────────────────
    const { data: pending, error: fetchError } = await supabase
      .from('live_classes')
      .select('*')
      .eq('status', 'SCHEDULED')
      .is('meet_link', null)
      .gte('start_time', now.toISOString())
      .lte('start_time', horizon.toISOString())
      .returns<LiveClass[]>();

    if (fetchError) {
      console.error('[cron/live-classes] fetch pending error:', fetchError);
      return NextResponse.json(
        { processedCount: 0, successes: [], errors: [fetchError.message] },
        { status: 500 }
      );
    }

    // ─── Generate a Google Meet event per pending class ────────
    for (const liveClass of pending ?? []) {
      try {
        // a) Teacher + student emails (and the teacher's personal Google
        //    refresh token) from public.users
        const userIds = [liveClass.teacher_id, ...(liveClass.student_ids ?? [])].filter(
          (id): id is string => Boolean(id)
        );

        // A class with no teacher and no students is malformed — don't mint
        // an orphan meeting for it (previously this failed on `.in('id', [])`).
        if (userIds.length === 0) {
          const message = 'class has no assigned teacher and no enrolled students';
          console.error(`[cron/live-classes] skipping class ${liveClass.id}: ${message}`);
          errors.push(`${liveClass.id}: ${message}`);
          continue;
        }

        const usersById = new Map<
          string,
          { id: string; email: string | null; google_refresh_token: string | null }
        >();
        const emails: string[] = [];

        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, google_refresh_token')
          .in('id', userIds);

        if (usersError) throw usersError;

        for (const u of users ?? []) usersById.set(u.id, u);

        // Attendees = enrolled students + the teacher. Whitelisting them
        // on the event lets them bypass the Meet waiting room.
        for (const u of users ?? []) {
          if (u.email) emails.push(u.email);
        }

        // b) Resolve the calendar-owner refresh token: prefer the assigned
        //    teacher's personal token so the event lands on their calendar;
        //    fall back to the system-wide .env token; skip otherwise.
        const teacher = liveClass.teacher_id
          ? usersById.get(liveClass.teacher_id)
          : undefined;
        const teacherRefreshToken =
          teacher?.google_refresh_token ?? process.env.GOOGLE_REFRESH_TOKEN;

        if (!teacherRefreshToken) {
          const message =
            `teacher ${liveClass.teacher_id ?? '(unassigned)'} has no connected Google ` +
            'account and no system-wide GOOGLE_REFRESH_TOKEN is configured';
          console.error(`[cron/live-classes] skipping class ${liveClass.id}: ${message}`);
          errors.push(`${liveClass.id}: ${message}`);
          continue;
        }

        // c) Create the Google Meet event on the teacher's calendar
        const meet = await createGoogleMeetEvent({
          title: liveClass.title,
          description: liveClass.description,
          startTime: liveClass.start_time,
          endTime: liveClass.end_time,
          attendeeEmails: emails,
          teacherRefreshToken,
        });

        // d) Persist the generated links back to the live class.
        //    The `.is('meet_link', null)` guard makes the claim conditional,
        //    so overlapping cron pings can't create duplicate events.
        const { error: updateError } = await supabase
          .from('live_classes')
          .update({
            meet_link: meet.hangoutLink,
            google_event_id: meet.eventId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', liveClass.id)
          .is('meet_link', null);

        if (updateError) throw updateError;

        successes.push(liveClass.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(
          `[cron/live-classes] generation failed for class ${liveClass.id}:`,
          err
        );
        errors.push(`${liveClass.id}: ${message}`);
      }
    }

    // Refresh any statically-cached admin pages so generated links appear promptly.
    revalidatePath('/admin/live-classes');

    return NextResponse.json({
      processedCount: pending?.length ?? 0,
      successes,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron job failed';
    console.error('[cron/live-classes] unexpected error:', err);
    return NextResponse.json(
      { processedCount: 0, successes: [], errors: [message] },
      { status: 500 }
    );
  }
}
