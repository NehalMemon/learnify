'use server';

import { createClient } from '@/utils/supabase/server';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface DashboardStats {
  totalStudents: number;
  totalQuizzes: number;
  activeAttempts: number;
  totalCourses: number;
}

// Safe defaults returned when Supabase is unavailable or a query fails. This
// keeps /admin/dashboard renderable instead of falling into an error boundary.
const SAFE_DEFAULTS: DashboardStats = {
  totalStudents: 0,
  totalQuizzes: 0,
  activeAttempts: 0,
  totalCourses: 0,
};


// -----------------------------------------------------------------------------
// getDashboardStats
// -----------------------------------------------------------------------------
/**
 * Fetches aggregate counts for the admin dashboard KPI cards.
 *
 * Each counter query uses `{ count: 'exact', head: true }` so Supabase returns
 * only the count header. Every query is isolated with its own try/catch so one
 * missing table, policy issue, or network failure cannot crash the dashboard.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const supabase = await createClient();

    if (!supabase) {
      console.error('ADMIN PAGE FETCH ERROR:', new Error('Supabase client failed to initialize'));
      return SAFE_DEFAULTS;
    }

    const safeFetchCount = async (
      queryFn: () => PromiseLike<{ count: number | null; error: unknown }>
    ): Promise<number> => {
      try {
        const { count, error } = await queryFn();

        if (error) {
          console.error('ADMIN PAGE FETCH ERROR:', error);
          return 0;
        }

        return count ?? 0;
      } catch (err) {
        console.error('ADMIN PAGE FETCH ERROR:', err);
        return 0;
      }
    };

    const [totalStudents, totalQuizzes, activeAttempts, totalCourses] = await Promise.all([
      safeFetchCount(() =>
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'STUDENT')
          .eq('status', 'ACTIVE')
      ),
      safeFetchCount(() =>
        supabase
          .from('quizzes')
          .select('*', { count: 'exact', head: true })
      ),
      safeFetchCount(() =>
        supabase
          .from('quiz_attempts')
          .select('*', { count: 'exact', head: true })
          .is('finished_at', null)
      ),
      safeFetchCount(async () =>
        await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
      ),
    ]);

    return {
      totalStudents,
      totalQuizzes,
      activeAttempts,
      totalCourses,
    };
  } catch (error) {
    console.error('ADMIN PAGE FETCH ERROR:', error);
    return SAFE_DEFAULTS;
  }
}

export interface DashboardCourseItem {
  id: string;
  title: string;
  courseType?: string;
  category?: string;
  isPublished?: boolean;
  createdAt?: string;
}

export async function getRecentDashboardCourses(limit = 5): Promise<{ courses: DashboardCourseItem[]; total: number }> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { courses: [], total: 0 };
    }

    const { data, count, error } = await supabase
      .from('courses')
      .select('id, title, course_type, category, is_published, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getRecentDashboardCourses query error:', error);
      return { courses: [], total: 0 };
    }

    const courses: DashboardCourseItem[] = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      courseType: c.course_type || c.courseType || 'FULL_COURSE',
      category: c.category || 'General',
      isPublished: Boolean(c.is_published),
      createdAt: c.created_at,
    }));

    return { courses, total: count ?? courses.length };
  } catch (error) {
    console.error('getRecentDashboardCourses error:', error);
    return { courses: [], total: 0 };
  }
}
