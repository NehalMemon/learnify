'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileQuestion,
  Info,
  PlayCircle,
  Sparkles,
  Star,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { coursesApi, enrollmentsApi, quizApi } from '@/lib/api'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

type Course = {
  id: string
  title: string
  subject?: string | null
  courseType?: string
  isPublished?: boolean
}

type Enrollment = {
  id: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  progressPercentage?: number
  progressPercent?: number
  course: Course
}

type Quiz = {
  id: string
  title: string
  subject?: string | null
  category?: { name?: string | null }
}

type QuizAttempt = {
  id: string
  quizId?: string
  score: number
  totalQs: number
  startedAt: string
  finishedAt?: string | null
}

type DashboardData = {
  enrollments: Enrollment[]
  attempts: QuizAttempt[]
  catalogCourses: Course[]
  quizzes: Quiz[]
}

type ContinueItem = {
  id: string
  title: string
  eyebrow: string
  progress: number
  href: string
  icon: LucideIcon
}

type RecommendationItem = {
  id: string
  type: 'Course' | 'Quiz'
  title: string
  subtitle: string
  href: string
  metric: string
  icon: LucideIcon
}

const unwrap = <T,>(payload: unknown): T => {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const clampProgress = (value?: number) => Math.max(0, Math.min(100, Math.round(value ?? 0)))

const fallbackRecommendations: RecommendationItem[] = [
  {
    id: 'quiz-anatomy-starter',
    type: 'Quiz',
    title: 'Anatomy Sprint Quiz',
    subtitle: '25 high-yield questions',
    href: '/dashboard/quizzes',
    metric: '12 min',
    icon: FileQuestion,
  },
  {
    id: 'course-physiology-core',
    type: 'Course',
    title: 'Physiology Core Review',
    subtitle: 'Recommended foundation module',
    href: '/dashboard/courses',
    metric: '4.8',
    icon: BookOpen,
  },
]

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${clampProgress(value)}%` }} />
    </div>
  )
}

function ContinueLearningCard({ item }: { item: ContinueItem }) {
  const Icon = item.icon

  return (
    <article className="min-w-[280px] rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm md:min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.eyebrow}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-bold leading-6 text-slate-950">{item.title}</h3>
          </div>
        </div>
        <span className="shrink-0 text-sm font-bold text-blue-700">{item.progress}%</span>
      </div>

      <div className="mt-5 space-y-3">
        <ProgressBar value={item.progress} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Keep the streak moving</p>
          <Link
            href={item.href}
            className="inline-flex h-9 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Resume
          </Link>
        </div>
      </div>
    </article>
  )
}

function RecommendationCard({ item }: { item: RecommendationItem }) {
  const Icon = item.icon
  const isCourse = item.type === 'Course'

  return (
    <Link
      href={item.href}
      className="group block rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${isCourse ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <Badge className={isCourse ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
          {item.type}
        </Badge>
      </div>

      <div className="mt-5">
        <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-950">{item.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
          {isCourse ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <Clock3 className="h-4 w-4 text-emerald-600" />}
          {item.metric}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-700">
          Open
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <Card className="rounded-md border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-xl font-black text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StudentDashboardPage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const [state, setState] = useState<DashboardData>({
    enrollments: [],
    attempts: [],
    catalogCourses: [],
    quizzes: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const alertValue = new URLSearchParams(window.location.search).get('alert')

    if (alertValue === 'already_logged_in') {
      toast('You are already logged in. Please logout first to switch accounts.', {
        icon: '!',
        duration: 5000,
      })
      router.replace('/dashboard')
      return
    }

    if (alertValue === 'access_restricted') {
      toast.error('Access Restricted: Your account is pending approval.', {
        duration: 5000,
      })
      router.replace('/dashboard')
    }
  }, [router])

  useEffect(() => {
    let cancelled = false

    const fetchAll = async () => {
      try {
        const [enrollmentsRes, attemptsRes, catalogRes, quizzesRes] = await Promise.allSettled([
          enrollmentsApi.getMyEnrollments(),
          quizApi.getMyAttempts(),
          coursesApi.listCourses({ page: 1, limit: 8 }),
          quizApi.listQuizzes({ page: 1, limit: 8 }),
        ])

        if (cancelled) return

        const enrollments =
          enrollmentsRes.status === 'fulfilled'
            ? (unwrap<Enrollment[]>(enrollmentsRes.value.data) ?? [])
            : []

        const attemptsPayload =
          attemptsRes.status === 'fulfilled'
            ? unwrap<{ attempts?: QuizAttempt[] } | QuizAttempt[]>(attemptsRes.value.data)
            : []
        const attempts = Array.isArray(attemptsPayload)
          ? attemptsPayload
          : (attemptsPayload.attempts ?? [])

        const catalogPayload =
          catalogRes.status === 'fulfilled'
            ? unwrap<{ courses?: Course[] } | Course[]>(catalogRes.value.data)
            : []
        const catalogCourses = Array.isArray(catalogPayload)
          ? catalogPayload
          : (catalogPayload.courses ?? [])

        const quizPayload =
          quizzesRes.status === 'fulfilled'
            ? unwrap<{ quizzes?: Quiz[] } | Quiz[]>(quizzesRes.value.data)
            : []
        const quizzes = Array.isArray(quizPayload) ? quizPayload : (quizPayload.quizzes ?? [])

        setState({ enrollments, attempts, catalogCourses, quizzes })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchAll()

    return () => {
      cancelled = true
    }
  }, [])

  const isPendingApproval = user?.role === 'STUDENT' && !user?.learnifyEnabled && !user?.doctorsQuizzEnabled

  const continueItems = useMemo<ContinueItem[]>(() => {
    const activeEnrollments = state.enrollments
      .filter((item) => item.status !== 'COMPLETED')
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.course.title,
        eyebrow: item.course.courseType?.replace(/_/g, ' ') ?? 'Course',
        progress: clampProgress(item.progressPercentage ?? item.progressPercent ?? 0),
        href: `/courses/${item.course.id}/learn`,
        icon: BookOpen,
      }))

    if (activeEnrollments.length > 0) return activeEnrollments

    return [
      {
        id: 'browse-courses',
        title: 'Pick your first course from the catalog',
        eyebrow: 'Getting started',
        progress: 15,
        href: '/dashboard/courses',
        icon: BookOpen,
      },
      {
        id: 'start-quiz',
        title: 'Try a quick diagnostic quiz',
        eyebrow: 'Recommended next',
        progress: 35,
        href: '/dashboard/quizzes',
        icon: FileQuestion,
      },
    ]
  }, [state.enrollments])

  const recommendations = useMemo<RecommendationItem[]>(() => {
    const courseItems = state.catalogCourses.slice(0, 4).map((course, index) => ({
      id: `course-${course.id}`,
      type: 'Course' as const,
      title: course.title,
      subtitle: course.subject ?? course.courseType?.replace(/_/g, ' ') ?? 'Expert-led module',
      href: `/courses/${course.id}`,
      metric: `${(4.9 - index * 0.1).toFixed(1)}`,
      icon: BookOpen,
    }))

    const quizItems = state.quizzes.slice(0, 4).map((quiz) => ({
      id: `quiz-${quiz.id}`,
      type: 'Quiz' as const,
      title: quiz.title,
      subtitle: quiz.subject ?? quiz.category?.name ?? 'Practice exam',
      href: `/dashboard/quiz/${quiz.id}`,
      metric: 'Timed',
      icon: FileQuestion,
    }))

    const mixed = [courseItems[0], quizItems[0], courseItems[1], quizItems[1], courseItems[2], quizItems[2]]
      .filter(Boolean) as RecommendationItem[]

    return mixed.length > 0 ? mixed : fallbackRecommendations
  }, [state.catalogCourses, state.quizzes])

  const averageProgress = useMemo(() => {
    if (!state.enrollments.length) return 0

    const total = state.enrollments.reduce(
      (sum, item) => sum + clampProgress(item.progressPercentage ?? item.progressPercent ?? 0),
      0,
    )

    return Math.round(total / state.enrollments.length)
  }, [state.enrollments])

  const averageScore = useMemo(() => {
    const scored = state.attempts.filter((attempt) => attempt.totalQs > 0)
    if (!scored.length) return 0

    return Math.round(
      scored.reduce((sum, attempt) => sum + Math.round((attempt.score / attempt.totalQs) * 100), 0) /
        scored.length,
    )
  }, [state.attempts])

  return (
    <main className="space-y-6 text-gray-900">
      <Toaster position="top-center" toastOptions={{ style: { background: '#0f172a', color: '#fff' } }} />

      {isPendingApproval && (
        <div className="mb-5 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-bold">Account pending admin approval</h2>
            <p className="mt-1 text-sm text-amber-800">
              Your dashboard is ready. Full access to courses and quizzes unlocks once an administrator approves your account.
            </p>
          </div>
        </div>
      )}

      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">Learning hub</p>
          <h1 className="page-title mt-1">
            Welcome back, {user?.fullName || 'Student'}
          </h1>
          <p className="page-subtitle mt-2 text-sm">
            Resume your current work, jump into practice, or pick the next recommended module.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-blue-100 font-bold text-blue-700">
              {user?.fullName?.slice(0, 2).toUpperCase() ?? 'ST'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-bold text-slate-950">{user?.fullName || 'Student'}</p>
            <p className="text-xs text-slate-500">{user?.email ?? 'Ready to learn'}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Continue Learning</h2>
            <p className="text-sm text-slate-600">Your highest-priority items in progress.</p>
          </div>
          <Link href="/my-courses" className="hidden items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900 sm:inline-flex">
            View all
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-md border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
            {continueItems.map((item) => (
              <ContinueLearningCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Recommended for you</h2>
              <p className="text-sm text-slate-600">A mix of courses and quizzes based on your available catalog.</p>
            </div>
            <Link href="/dashboard/courses" className="hidden items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900 sm:inline-flex">
              Browse catalog
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-48 animate-pulse rounded-md border border-slate-200 bg-white" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {recommendations.map((item) => (
                <RecommendationCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="rounded-md border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-blue-700" aria-hidden="true" />
                Today&apos;s Focus
              </CardTitle>
              <CardDescription>Small actions that keep momentum visible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/quizzes"
                className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-bold transition hover:border-blue-200 hover:bg-blue-50"
              >
                Start a timed quiz
                <PlayCircle className="h-4 w-4 text-blue-700" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/courses"
                className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-bold transition hover:border-blue-200 hover:bg-blue-50"
              >
                Find next lesson
                <ChevronRight className="h-4 w-4 text-blue-700" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard label="Avg. progress" value={`${averageProgress}%`} icon={Target} />
            <MetricCard label="Quiz average" value={`${averageScore}%`} icon={BarChart3} />
            <MetricCard label="Attempts" value={state.attempts.length} icon={ClipboardList} />
          </div>

          <Card className="rounded-md border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-600">
                Best next step: finish one lesson, then take one short quiz while the concept is fresh.
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  )
}
