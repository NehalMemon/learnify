import { createClient } from '@/utils/supabase/server';
import { LiveClassesDashboard } from '@/components/live-classes/LiveClassesDashboard';
import type { LiveClass, LiveClassRow } from '@/types/live-class';

export const dynamic = 'force-dynamic';

/**
 * Admin Class Library — central management dashboard for all live classes.
 *
 * Server Component: fetches every live class (with the joined course title
 * and assigned teacher name) plus the course / teacher / student lists that
 * power the "Schedule Class" modal. All queries run in parallel and each one
 * degrades gracefully — a failing query logs a banner but never crashes the
 * page. Mutations happen through Server Actions (`createLiveClass` /
 * `deleteLiveClass`) and are reflected via `router.refresh()`.
 */
export default async function AdminLiveClassesPage() {
  const supabase = await createClient();

  const [liveClasses, courses, teachers, students] = await Promise.all([
    supabase
      .from('live_classes')
      .select('*')
      .order('start_time', { ascending: false })
      .returns<LiveClass[]>(),
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
  if (liveClasses.error) errors.push(`live classes: ${liveClasses.error.message}`);
  if (courses.error) errors.push(`courses: ${courses.error.message}`);
  if (teachers.error) errors.push(`teachers: ${teachers.error.message}`);
  if (students.error) errors.push(`students: ${students.error.message}`);

  const courseTitles = new Map((courses.data ?? []).map((c) => [c.id, c.title]));
  const teacherNames = new Map((teachers.data ?? []).map((u) => [u.id, u.full_name]));

  const rows: LiveClassRow[] = (liveClasses.data ?? []).map((liveClass) => ({
    ...liveClass,
    course_title: courseTitles.get(liveClass.course_id) ?? null,
    teacher_name: liveClass.teacher_id
      ? (teacherNames.get(liveClass.teacher_id) ?? null)
      : null,
  }));

  return (
    <LiveClassesDashboard
      liveClasses={rows}
      courses={(courses.data ?? []).map((c) => ({ id: c.id, title: c.title }))}
      teachers={(teachers.data ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
      students={(students.data ?? []).map((u) => ({ id: u.id, name: u.full_name }))}
      error={errors.length > 0 ? errors.join('; ') : null}
    />
  );
}
