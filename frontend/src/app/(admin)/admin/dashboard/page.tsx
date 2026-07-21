'use client';

import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { AlertCircle, RefreshCw, Brain, Trophy } from 'lucide-react';
import apiClient, { adminApi } from '@/lib/api';
import { HeroStats } from '@/components/admin/dashboard/HeroStats';
import { RecentRegistrations, type ActivityItem, type AdminUser } from '@/components/admin/dashboard/RecentRegistrations';
import { TopCourses, type AdminCourse } from '@/components/admin/dashboard/TopCourses';
import { QuizCatalog } from '@/components/admin/dashboard/QuizCatalog';


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

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-200 animate-pulse ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-36" />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-52" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <SkeletonCard className="h-[26rem]" />
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Analytics Placeholder ──────────────────────────────────────────────

function QuizAnalyticsPlaceholder() {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 border-dashed p-6 flex flex-col items-center justify-center gap-3 min-h-[13rem]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-600" />
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900">DoctorsQuizz Analytics</p>
      <p className="text-xs text-gray-500 text-center max-w-xs">
        Quiz attempt heatmaps, leaderboard stats, and per-category pass rates will appear here.
      </p>
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200 tracking-wider">
        COMING SOON
      </span>
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

    // Initialize fallback data
    let statsData: Record<string, any> = {};
    let users: AdminUser[] = [];
    let courses: AdminCourse[] = [];
    let totalCourses = 0;
    let quizzes: { id: string; title: string }[] = [];
    let recentAttempts: any[] = [];

    // Fetch stats
    try {
      const statsRes = await adminApi.getStats();
      statsData = statsRes.data?.data ?? {};
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }

    // Fetch recent users
    try {
      const usersRes = await adminApi.listUsers({ limit: 5 });
      users = usersRes.data?.data?.users ?? [];
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }

    // Fetch courses
    try {
      const coursesRes = await adminApi.listCourses({ limit: 5 });
      courses = coursesRes.data?.data?.courses ?? [];
      totalCourses = coursesRes.data?.data?.pagination?.total ?? courses.length;
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }

    // Fetch quizzes
    try {
      const quizzesRes = await adminApi.listQuizzes();
      quizzes = Array.isArray(quizzesRes.data?.data) ? quizzesRes.data?.data : [];
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    }

    // Fetch recent attempts
    try {
      const attemptsRes = await apiClient.get('/quiz/attempts/my', { params: { limit: 5 } });
      recentAttempts = attemptsRes.data?.data?.attempts ?? [];
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    }

    // Build activity list
    const quizTitleById = new Map<string, string>(
      quizzes.map((quiz) => [quiz.id, quiz.title])
    );

    const activity: ActivityItem[] = recentAttempts.map((attempt) => ({
      id: attempt.id,
      userName: attempt.user?.fullName || 'Learner',
      quizTitle: attempt.quizId ? quizTitleById.get(attempt.quizId) ?? 'an exam' : 'an exam',
      startedAt: attempt.startedAt,
    }));

    // If no recent attempts, synthesize placeholder activity from users
    if (!activity.length) {
      for (const user of users) {
        activity.push({
          id: user.id,
          userName: user.fullName || user.email,
          quizTitle: 'the platform',
          startedAt: new Date().toISOString(),
        });
      }
      const axiosErr = err as AxiosError<{ message?: string }>;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          axiosErr.response?.data?.message ??
          'Failed to load dashboard data. Please try again.',
      }));
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
