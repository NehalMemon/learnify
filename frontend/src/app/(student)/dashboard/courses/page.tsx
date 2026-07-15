'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronRight, ExternalLink, Filter, Search, SlidersHorizontal } from 'lucide-react'
import { authApi, coursesApi, quizApi } from '@/lib/api'
import { useAuth } from '@/hooks'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Profile = { fullName: string }
type Course = {
  id: string
  title: string
  category?: string
  courseType?: string
  isPublished?: boolean
  division?: { slug?: string; name?: string }
}
type QuizMeta = { id: string }

type DivisionFilter = 'all' | 'FOUNDATION' | 'MEDED'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const unwrap = <T,>(payload: unknown): T => {
  if (typeof payload === 'object' && payload !== null && 'data' in payload)
    return (payload as { data: T }).data
  return payload as T
}

const COURSE_GRADIENTS = [
  'from-gray-50 via-gray-50 to-white',
  'from-gray-50 via-white to-gray-50',
  'from-white via-gray-50 to-white',
  'from-gray-50 via-white to-gray-50',
  'from-white via-gray-50 to-white',
  'from-gray-50 via-white to-gray-50',
]

const DIVISION_LABELS: Record<string, string> = {
  FOUNDATION: 'Foundation',
  MEDED: 'MedEd',
  all: 'All Divisions',
}

// ─── Course Card ───────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: Course
  index: number
}

function CourseCard({ course, index }: CourseCardProps) {
  const gradient = COURSE_GRADIENTS[index % COURSE_GRADIENTS.length]
  const initials = course.title.slice(0, 2).toUpperCase()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card
        className={`group relative h-full overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm bg-gradient-to-br ${gradient}`}
      >
        <CardHeader className="pb-2">
          <div className="mb-3 flex items-start justify-between">
            <Avatar className="size-11 border border-gray-200">
              <AvatarFallback className="bg-gray-100 text-sm font-bold text-gray-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            {course.division?.name && (
              <Badge className="border border-gray-200 bg-gray-50 text-[10px] text-gray-600">
                {course.division.name}
              </Badge>
            )}
          </div>
          <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
            {course.title}
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            {course.category ?? 'General Curriculum'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-2.5 pb-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
              {course.courseType ?? 'Full Course'}
            </Badge>
            {course.isPublished && (
              <Badge className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                Published
              </Badge>
            )}
          </div>
          <Link
            href={`/courses/${course.id}`}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 transition-all hover:bg-gray-50 hover:shadow-sm"
          >
            Open Course <ExternalLink className="size-3" />
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardCoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [quizCount, setQuizCount] = useState(0)
  const [search, setSearch] = useState('')
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      try {
        const [coursesRes, quizzesRes] = await Promise.all([
          coursesApi.listCourses({ page: 1, limit: 100 }),
          quizApi.listQuizzes({ page: 1, limit: 100 }),
        ])

        if (cancelled) return

        const coursePayload = unwrap<{ courses?: Course[] } | Course[]>(coursesRes.data)
        setCourses(Array.isArray(coursePayload) ? coursePayload : (coursePayload.courses ?? []))

        const quizPayload = unwrap<{ quizzes?: QuizMeta[] } | QuizMeta[]>(quizzesRes.data)
        const quizzes = Array.isArray(quizPayload) ? quizPayload : (quizPayload.quizzes ?? [])
        setQuizCount(quizzes.length)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchAll()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const bySearch = course.title.toLowerCase().includes(search.toLowerCase())
      const byDivision =
        divisionFilter === 'all' || course.division?.slug === divisionFilter
      return bySearch && byDivision
    })
  }, [courses, divisionFilter, search])

  if (loading) return <CoursesLoading />

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 lg:p-8">

      {/* ── Header ── */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Course Catalog
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              {user?.fullName ?? 'Student'}&apos;s Library
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              {courses.length} course{courses.length !== 1 ? 's' : ''} · {quizCount} quiz modules available
            </p>
          </div>
          <BookOpen className="hidden size-10 text-gray-300 md:block" />
        </div>
      </motion.section>

      {/* ── Search & Filter Bar ── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="course-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course title…"
            className="border-gray-200 bg-gray-50 pl-9 text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:ring-gray-200"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <select
            id="division-filter"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value as DivisionFilter)}
            className="h-10 appearance-none rounded-md border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-900 outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
          >
            <option value="all">All Divisions</option>
            <option value="FOUNDATION">Foundation</option>
            <option value="MEDED">MedEd</option>
          </select>
        </div>
      </motion.section>

      {/* ── Active Filter Chip ── */}
      {(search || divisionFilter !== 'all') && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Filter className="size-3" /> Filtering:
          </span>
          {search && (
            <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-700 shadow-sm">
              &ldquo;{search}&rdquo;
              <button onClick={() => setSearch('')} className="ml-1 text-gray-500 hover:text-gray-700">×</button>
            </span>
          )}
          {divisionFilter !== 'all' && (
            <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-700 shadow-sm">
              {DIVISION_LABELS[divisionFilter]}
              <button onClick={() => setDivisionFilter('all')} className="ml-1 text-gray-500 hover:text-gray-700">×</button>
            </span>
          )}
          <span className="text-xs text-gray-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── Course Grid ── */}
      <section>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <BookOpen className="mx-auto mb-3 size-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">No courses found</p>
            <p className="mt-1 text-xs text-gray-500">Try adjusting your search or filters.</p>
            <button
              onClick={() => { setSearch(''); setDivisionFilter('all') }}
              className="mt-3 text-xs text-gray-700 hover:text-gray-900"
            >
              Clear filters <ChevronRight className="inline size-3" />
            </button>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((course, idx) => (
                <CourseCard key={course.id} course={course} index={idx} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </main>
  )
}

// ─── Loading State ─────────────────────────────────────────────────────────────

function CoursesLoading() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl bg-gray-200" />
        <Skeleton className="h-9 rounded-lg bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    </main>
  )
}
