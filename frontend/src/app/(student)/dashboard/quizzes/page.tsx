'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ChevronRight,
  Clock,
  Filter,
  FlaskConical,
  PlayCircle,
  Search,
  SlidersHorizontal,
  Trophy,
} from 'lucide-react'
import { coursesApi, quizApi } from '@/lib/api'
import { useAuth, useViewMode } from '@/hooks'
import type { ViewMode } from '@/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { Skeleton } from 'boneyard-js/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ─────────────────────────────────────────────────────────────────────

type CourseMeta = { id: string }
type Category = { id: string; name: string }
type Quiz = {
  id: string
  title: string
  subject?: string
  year?: number
  durationSec?: number
  category?: { name?: string }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const unwrap = <T,>(payload: unknown): T => {
  if (typeof payload === 'object' && payload !== null && 'data' in payload)
    return (payload as { data: T }).data
  return payload as T
}

const formatDuration = (secs?: number): string => {
  if (!secs) return 'Timed Exam'
  const mins = Math.round(secs / 60)
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}


// ─── Quiz Card ─────────────────────────────────────────────────────────────────

interface QuizCardProps {
  quiz: Quiz
  index: number
  viewMode?: ViewMode
}

function QuizCard({ quiz, index, viewMode = 'grid' }: QuizCardProps) {
  const subject = quiz.subject ?? quiz.category?.name ?? 'General'

  // ── List layout ────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.22, delay: index * 0.03 }}
        className="w-full"
      >
        <Card className="group relative flex w-full flex-row items-center overflow-hidden p-0">
          {/* Compact left banner */}
          <div className="flex h-24 w-36 shrink-0 items-center justify-center border-r border-gray-200 bg-gray-100 text-gray-500 transition-colors group-hover:bg-purple-50 sm:w-44">
            <FlaskConical className="size-8 opacity-40 transition-transform group-hover:scale-110 group-hover:text-primary" />
          </div>

          {/* Content row */}
          <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-1 text-base font-bold leading-snug text-gray-900">
                {quiz.title}
              </CardTitle>
              <CardDescription className="mt-0.5 truncate text-sm text-gray-500" title={subject}>
                {subject}
              </CardDescription>
              <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden mt-1.5">
                <span className="inline-flex min-w-0 shrink items-center gap-1 overflow-hidden rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  <span className="truncate">{subject}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  <Clock className="size-3" />
                  {formatDuration(quiz.durationSec)}
                </span>
              </div>
            </div>

            {/* CTA — pinned right */}
            <Link
              href={`/dashboard/quiz/${quiz.id}`}
              className="btn-primary shrink-0 flex h-10 items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm"
            >
              <PlayCircle className="size-4" />
              Start Exam
            </Link>
          </div>
        </Card>
      </motion.div>
    )
  }

  // ── Grid layout (default) ─────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.91 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      className="w-full flex flex-col"
    >
      <Card className="group relative flex h-full w-full flex-col overflow-hidden p-0">
        {/* Top Area placeholder banner */}
        <div className="flex h-28 w-full items-center justify-center border-b border-gray-200 bg-gray-100 text-gray-500 transition-colors group-hover:bg-purple-50">
          <FlaskConical className="size-10 opacity-40 transition-transform group-hover:scale-110 group-hover:text-primary" />
        </div>

        <CardHeader className="min-w-0 pb-2 pt-4">
          <CardTitle className="line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug text-gray-900">
            {quiz.title}
          </CardTitle>
          <CardDescription className="truncate text-sm text-gray-500" title={subject}>
            {subject}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex min-w-0 flex-1 flex-col gap-4 pb-4">
          {/* Meta row */}
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
            <span
              className="inline-flex min-w-0 shrink items-center gap-1 overflow-hidden rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
              title={subject}
            >
              <span className="truncate">{subject}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-600">
              <Clock className="size-3" />
              {formatDuration(quiz.durationSec)}
            </span>
          </div>

          {/* CTA */}
          <Link
            href={`/dashboard/quiz/${quiz.id}`}
            className="btn-primary mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm"
          >
            <PlayCircle className="size-4" />
            Start Exam
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardQuizzesPage() {
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courseCount, setCourseCount] = useState(0)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [viewMode, setViewMode] = useViewMode('learnify:student-quizzes:viewMode')

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      try {
        const [coursesResult, quizzesResult, categoriesResult] = await Promise.allSettled([
          coursesApi.listCourses({ page: 1, limit: 100 }),
          quizApi.listQuizzes({ page: 1, limit: 100 }),
          quizApi.getCategories(),
        ])

        if (cancelled) return

        const coursePayload =
          coursesResult.status === 'fulfilled'
            ? unwrap<{ courses?: CourseMeta[] } | CourseMeta[]>(coursesResult.value.data)
            : []
        const courses = Array.isArray(coursePayload) ? coursePayload : (coursePayload.courses ?? [])
        setCourseCount(courses.length)

        const quizPayload =
          quizzesResult.status === 'fulfilled'
            ? unwrap<{ quizzes?: Quiz[] } | Quiz[]>(quizzesResult.value.data)
            : []
        setQuizzes(Array.isArray(quizPayload) ? quizPayload : (quizPayload.quizzes ?? []))

        const categoryPayload =
          categoriesResult.status === 'fulfilled'
            ? unwrap<Category[]>(categoriesResult.value.data)
            : []
        setCategories(Array.isArray(categoryPayload) ? categoryPayload : [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchAll()
    return () => { cancelled = true }
  }, [])

  const subjects = useMemo(() => {
    const values = new Set(categories.map((category) => category.name))
    if (values.size === 0) {
      quizzes.forEach((q) => values.add(q.subject ?? q.category?.name ?? 'General'))
    }
    return ['all', ...Array.from(values)]
  }, [categories, quizzes])

  const filtered = useMemo(() => {
    return quizzes.filter((quiz) => {
      const subject = quiz.subject ?? quiz.category?.name ?? 'General'
      const bySearch = quiz.title.toLowerCase().includes(search.toLowerCase())
      const bySubject = subjectFilter === 'all' || subject === subjectFilter
      return bySearch && bySubject
    })
  }, [quizzes, search, subjectFilter])

  const quizzesToRender = loading
    ? Array.from({ length: 6 }).map((_, idx) => ({
        id: `placeholder-${idx}`,
        title: 'Loading quiz',
        subject: 'General',
        durationSec: 1800,
      }))
    : filtered

  return (
    <main className="space-y-6">

      {/* ── Header ── */}
      <Skeleton name="dashboard-quizzes-header" loading={loading}>
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface mb-6 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Quiz Arena
              </p>
              <h1 className="page-title mt-1">
                Available Quizzes for Year {user?.studyYear ?? 1}
              </h1>
              <p className="page-subtitle mt-1 text-sm">
                {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available · {courseCount} supporting courses
              </p>
            </div>
            <div className="hidden items-center gap-4 md:flex">
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              <Trophy className="size-10 text-primary opacity-20" />
            </div>
          </div>
        </motion.section>
      </Skeleton>

      {/* ── Search & Filter Bar ── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="quiz-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quiz title…"
            className="h-12 pl-10"
          />
        </div>
        <div className="relative min-w-52">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-gray-400" />
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger
              id="subject-filter"
              className="h-12 pl-10"
            >
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-foreground">
              {subjects.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub === 'all' ? 'All Subjects' : sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.section>

      {/* ── Active Filter Chips ── */}
      {(search || subjectFilter !== 'all') && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="size-4" /> Filtering:
          </span>
          {search && (
            <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
              &ldquo;{search}&rdquo;
              <button onClick={() => setSearch('')} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
            </span>
          )}
          {subjectFilter !== 'all' && (
            <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
              {subjectFilter}
              <button onClick={() => setSubjectFilter('all')} className="ml-1 text-muted-foreground hover:text-foreground">×</button>
            </span>
          )}
          <span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Subject Quick Tabs ── */}
      {subjects.length > 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              title={sub === 'all' ? 'All' : sub}
              className={`min-h-[44px] max-w-48 shrink-0 truncate rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                subjectFilter === sub
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {sub === 'all' ? 'All' : sub}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Quiz Grid ── */}
      <section>
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/50 p-16 text-center">
            <BookOpen className="mx-auto mb-3 size-10 text-muted-foreground opacity-50" />
            <p className="text-base font-semibold text-foreground">No quizzes found</p>
            <p className="mt-1 text-sm text-muted-foreground">No quizzes available for your year.</p>
            <button
              onClick={() => { setSearch(''); setSubjectFilter('all') }}
              className="mt-4 text-sm font-semibold text-primary hover:text-primary/80"
            >
              Clear filters <ChevronRight className="inline size-4" />
            </button>
          </div>
        ) : (
          <motion.div className={viewMode === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,15.5rem),1fr))] gap-6' : 'grid grid-cols-1 gap-6'}>
            <AnimatePresence mode="popLayout">
              {quizzesToRender.map((quiz, idx) => (
                <Skeleton key={quiz.id} name="dashboard-quiz-card" loading={loading}>
                  <QuizCard quiz={quiz} index={idx} viewMode={viewMode} />
                </Skeleton>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </main>
  )
}
