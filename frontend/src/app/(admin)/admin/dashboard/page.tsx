'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Brain, Trophy } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getDashboardStats, getRecentDashboardCourses } from '@/app/actions/dashboardActions';
import { HeroStats } from '@/components/admin/dashboard/HeroStats';
import { RecentRegistrations, type ActivityItem } from '@/components/admin/dashboard/RecentRegistrations';
import { TopCourses, type AdminCourse } from '@/components/admin/dashboard/TopCourses';
import { QuizCatalog } from '@/components/admin/dashboard/QuizCatalog';
import { DashboardSkeleton } from './_components/DashboardSkeleton';


// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardState {
  activity: ActivityItem[];
  courses: AdminCourse[];
  totalStudents: number;
  totalQuizzes: number;
  activeAttempts: number;
  totalCourses: number;
  isLoading: boolean;
  error: string | null;
}

// ─── Quiz Analytics Placeholder ──────────────────────────────────────────────

function QuizAnalyticsPlaceholder() {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50/50 p-6 text-center">
      <Brain className="mb-2 h-8 w-8 text-gray-400" />
      <p className="text-sm font-medium text-gray-600">Quiz Analytics Dashboard</p>
      <p className="mt-1 text-xs text-gray-400">
        Detailed breakdown by category, average scores, and completion rates.
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [state, setState] = useState<DashboardState>({
    activity: [],
    courses: [],
    totalStudents: 0,
    totalQuizzes: 0,
    activeAttempts: 0,
    totalCourses: 0,
    isLoading: true,
    error: null,
  });

  const fetchDashboardData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch stats and recent courses from Supabase via server actions
      const [statsData, recentCoursesResult] = await Promise.all([
        getDashboardStats(),
        getRecentDashboardCourses(5),
      ]);

      let courses: AdminCourse[] = recentCoursesResult.courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: '',
        instructor: 'Faculty',
        courseType: (c.courseType as 'RECORDED' | 'LIVE' | 'HYBRID') || 'LIVE',
        category: c.category || 'General',
        isPublished: Boolean(c.isPublished),
        createdAt: c.createdAt || new Date().toISOString(),
      }));

      let totalCourses = recentCoursesResult.total || statsData.totalCourses;
      let activity: ActivityItem[] = [];

      // Try legacy API if available, gracefully degrading on Network Error
      if (courses.length === 0) {
        try {
          const coursesRes = await adminApi.listCourses({ limit: 5 });
          const rawCourses = coursesRes.data?.data;
          const fetched = Array.isArray(rawCourses) ? rawCourses : rawCourses?.courses ?? [];
          if (fetched.length > 0) {
            courses = fetched;
            totalCourses = rawCourses?.pagination?.total ?? totalCourses;
          }
        } catch {
          // Graceful degradation when legacy backend is offline
        }
      }

      // Fetch recent admin activity (with graceful degradation if legacy API is offline)
      try {
        const activityRes = await adminApi.getSystemActivity();
        const rawActivity = activityRes.data?.data;
        activity = Array.isArray(rawActivity) ? rawActivity : [];
      } catch {
        // Graceful degradation on network error
        activity = [];
      }

      setState({
        activity,
        courses,
        totalStudents: statsData.totalStudents,
        totalQuizzes: statsData.totalQuizzes,
        activeAttempts: statsData.activeAttempts,
        totalCourses,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('ADMIN PAGE FETCH ERROR:', error);
      setState({
        activity: [],
        courses: [],
        totalStudents: 0,
        totalQuizzes: 0,
        activeAttempts: 0,
        totalCourses: 0,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Render ───────────────────────────────────────────────────

  if (state.isLoading) return <DashboardSkeleton />;

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-200">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">Dashboard load failed</p>
          <p className="text-sm text-gray-500 mt-1">{state.error}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm text-purple-700 font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page title ─────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">
          Control Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform overview — real-time metrics across all divisions
        </p>
      </div>

      {/* ── KPI Hero Stats ─────────────────────────────────────── */}
      <HeroStats
        totalStudents={state.totalStudents}
        activeExamAttempts={state.activeAttempts}
        totalQuizzes={state.totalQuizzes}
        totalEnrollments={state.totalCourses}
      />

      {/* ── Main Content Grid (12 col) ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column — 8 cols: live activity feed */}
        <div className="col-span-12 lg:col-span-8">
          <RecentRegistrations items={state.activity} />
        </div>

        {/* Right column — 4 cols: Course Catalog + Quiz Catalog stacked */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <TopCourses courses={state.courses} />
          <QuizCatalog />
        </div>
      </div>
    </div>
  );
}
