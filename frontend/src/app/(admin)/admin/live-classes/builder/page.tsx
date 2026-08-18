import { createClient } from '@/utils/supabase/server';
import { getLiveClassById } from '@/actions/live-class';
import { TabbedLiveClassBuilder } from '@/components/live-classes/builder/TabbedLiveClassBuilder';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function AdminLiveClassBuilderPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const supabase = await createClient();

  const [coursesRes, teachersRes, studentsRes] = await Promise.all([
    supabase.from('courses').select('id, title').order('title', { ascending: true }),
    supabase.from('users').select('id, full_name').in('role', ['INSTRUCTOR', 'ADMIN']).order('full_name', { ascending: true }),
    supabase.from('users').select('id, full_name').eq('role', 'STUDENT').order('full_name', { ascending: true }),
  ]);

  const courses = (coursesRes.data ?? []).map((c) => ({ id: c.id, title: c.title }));
  const availableTeachers = (teachersRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name || 'Unnamed Teacher',
  }));
  const availableStudents = (studentsRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name || 'Unnamed Student',
  }));

  let initialData = null;
  if (id) {
    const classRes = await getLiveClassById(id);
    if (classRes.success) {
      initialData = classRes.data;
    }
  }

  return (
    <TabbedLiveClassBuilder
      courses={courses}
      availableTeachers={availableTeachers}
      availableStudents={availableStudents}
      initialData={initialData}
    />
  );
}
