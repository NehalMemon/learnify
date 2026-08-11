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
        // a) Teacher + student emails from public.users
        const userIds = [liveClass.teacher_id, ...(liveClass.student_ids ?? [])].filter(
          (id): id is string => Boolean(id)
        );

        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds);

        if (usersError) throw usersError;

        const emails = (users ?? [])
          .map((u) => u.email)
          .filter((email): email is string => Boolean(email));

        // b) Create the Google Meet event
        const meet = await createGoogleMeetEvent({
          title: liveClass.title,
          description: liveClass.description,
          startTime: liveClass.start_time,
          endTime: liveClass.end_time,
          attendeeEmails: emails,
        });

        // c) Persist the generated links back to the live class.
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
