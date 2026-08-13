import Link from 'next/link';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { CreateClassForm } from '@/components/live-classes/CreateClassForm';

export const dynamic = 'force-dynamic';

/**
 * Schedule New Live Class — dedicated creation page.
 *
 * Server Component: fetches the courses, teachers (instructors + admins) and
 * students that power the scheduling form. All queries run in parallel and
 * each one degrades gracefully — a failing query logs a banner but never
 * crashes the page. On success the form redirects back to the class library
 * (`/admin/live-classes`) with a toast.
 */
export default async function CreateLiveClassPage() {
  const supabase = await createClient();

  const [courses, teachers, students] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title')
      .order('title', { ascending: true }),
    // Teachers = instructors (+ admins who also teach)
    supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['INSTRUCTOR', 'ADMIN'])
      .order('full_name', { ascending: true }),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'STUDENT')
      .order('full_name', { ascending: true }),
  ]);

  const errors: string[] = [];
  if (courses.error) errors.push(`courses: ${courses.error.message}`);
  if (teachers.error) errors.push(`teachers: ${teachers.error.message}`);
  if (students.error) errors.push(`students: ${students.error.message}`);

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/admin/live-classes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 transition hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Library
        </Link>
      </nav>

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="mb-8 flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-600/25">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Schedule a New Live Class
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            A Google Meet link is generated automatically before the session starts.
          </p>
        </div>
      </div>

      {/* ── Non-fatal data warning banner ──────────────────────── */}
      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some data failed to load: {errors.join('; ')} — you can still fill the form, but some
          options may be missing.
        </div>
      )}

      {/* ── Form card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <CreateClassForm
          courses={(courses.data ?? []).map((c) => ({ id: c.id, title: c.title }))}
          availableTeachers={(teachers.data ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
          availableStudents={(students.data ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
        />
      </div>
    </div>
  );
}
