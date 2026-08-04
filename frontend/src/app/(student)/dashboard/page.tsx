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
import { createClient } from '@/utils/supabase/client'
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
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-150 bg-slate-100">
      <div
        className="h-full rounded-full bg-slate-900 transition-all duration-500 ease-out"
        style={{ width: `${clampProgress(value)}%` }}
      />
    </div>
  )
}

function ContinueLearningCard({ item }: { item: ContinueItem }) {
  const Icon = item.icon

  return (
    <article className="group relative flex min-w-[280px] flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md md:min-w-0">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {item.eyebrow}
              </span>
              <h3 className="mt-0.5 line-clamp-2 text-base font-bold text-slate-900 group-hover:text-slate-950">
                {item.title}
              </h3>
            </div>
          </div>
          <span className="shrink-0 text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
            {item.progress}%
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <ProgressBar value={item.progress} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs font-medium text-slate-500">In progress</span>
          <Link
            href={item.href}
            className="inline-flex h-8.5 items-center justify-center rounded-lg bg-slate-900 px-3.5 text-xs font-bold text-white transition-all duration-150 hover:bg-slate-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
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
      className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <Badge className="bg-slate-100 text-slate-800 border border-slate-200/80 text-[11px] font-semibold tracking-wide hover:bg-slate-200">
            {item.type}
          </Badge>
        </div>

        <div className="mt-4">
          <h3 className="line-clamp-2 text-base font-bold text-slate-900 group-hover:text-slate-950">
            {item.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 line-clamp-1">{item.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {isCourse ? (
            <Star className="h-3.5 w-3.5 fill-slate-900 text-slate-900" />
          ) : (
            <Clock3 className="h-3.5 w-3.5 text-slate-700" />
          )}
          {item.metric}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:translate-x-0.5 transition-transform">
          Explore
          <ChevronRight className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:border-slate-300">
      <CardContent className="flex items-center gap-3.5 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-900">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-xl font-extrabold tracking-tight text-slate-950">{value}</p>
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
  const [displayName, setDisplayName] = useState<string>('Student')

  // Resolve the user's display name from the best available source
  useEffect(() => {
    if (user?.fullName) {
      setDisplayName(user.fullName)
      return
    }
    const resolveDisplayName = async () => {
      try {
        const supabase = createClient()
        const { data: { user: sbUser } } = await supabase.auth.getUser()
        const name =
          sbUser?.user_metadata?.full_name ??
          sbUser?.user_metadata?.name ??
          null
        if (name) {
          setDisplayName(name)
          return
        }
        if (sbUser?.id) {
          const { data } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', sbUser.id)
            .single()
          if (data?.full_name) {
            setDisplayName(data.full_name)
          }
        }
      } catch {
        // Fallback to 'Student' on any error
      }
    }
    resolveDisplayName()
  }, [user])

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

  const u = user as (typeof user & { learnifyEnabled?: boolean; doctorsQuizzEnabled?: boolean }) | null
  const isPendingApproval = user?.role === 'STUDENT' && !u?.learnifyEnabled && !u?.doctorsQuizzEnabled

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
    <main className="space-y-8 font-sans text-slate-900 antialiased">
      <Toaster position="top-center" toastOptions={{ style: { background: '#0f172a', color: '#fff' } }} />

      {isPendingApproval && (
        <div className="flex items-start gap-3.5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm transition-all">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-sm text-amber-950">Account Pending Admin Approval</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              Your dashboard is ready. Full access to courses and quizzes unlocks once an administrator approves your account.
            </p>
          </div>
        </div>
      )}

      {/* Hero Welcome Section */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Student Portal
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-xl leading-relaxed">
            Resume your learning path, track topic progress, or explore recommended academic modules.
          </p>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
          <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarFallback className="bg-slate-900 text-xs font-bold text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-bold text-slate-950">{displayName}</p>
            <p className="text-[11px] font-medium text-slate-500">{user?.email ?? 'Active Student'}</p>
          </div>
        </div>
      </section>

      {/* Continue Learning */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 tracking-tight">Continue Learning</h2>
            <p className="text-xs text-slate-500">Your highest-priority active modules.</p>
          </div>
          <Link href="/my-courses" className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-slate-700 transition-colors">
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
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

      {/* Recommendations & Side Metrics */}
      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 tracking-tight">Recommended for You</h2>
              <p className="text-xs text-slate-500">Curated academic modules and practice exams.</p>
            </div>
            <Link href="/dashboard/courses" className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-slate-700 transition-colors">
              Browse catalog
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-48 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
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

        <aside className="space-y-5">
          <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
                <Sparkles className="h-4 w-4 text-slate-900" aria-hidden="true" />
                Today&apos;s Focus
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Quick actions to maintain daily learning momentum.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5">
              <Link
                href="/dashboard/quizzes"
                className="flex items-center justify-between rounded-lg border border-slate-200/80 p-3 text-xs font-bold text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Start a timed quiz
                <PlayCircle className="h-4 w-4 text-slate-900" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/courses"
                className="flex items-center justify-between rounded-lg border border-slate-200/80 p-3 text-xs font-bold text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Find next lesson
                <ChevronRight className="h-4 w-4 text-slate-900" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard label="Avg. Progress" value={`${averageProgress}%`} icon={Target} />
            <MetricCard label="Quiz Score" value={`${averageScore}%`} icon={BarChart3} />
            <MetricCard label="Attempts" value={state.attempts.length} icon={ClipboardList} />
          </div>

          <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-900" aria-hidden="true" />
              <p className="text-xs leading-relaxed font-medium text-slate-600">
                Recommended step: finish one course lesson, then complete a practice quiz to reinforce key concepts.
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  )
}
