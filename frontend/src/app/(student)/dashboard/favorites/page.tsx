'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, HeartCrack, Loader2 } from 'lucide-react'
import apiClient from '@/lib/api'
import { CourseCard } from '@/components/course'
import { ModuleCard } from '@/components/quiz/ModuleCard'

type FavoriteCourse = {
  id: string
  title: string
  description?: string | null
  instructor?: string | null
  category?: string | null
  courseType?: string | null
  isPublished?: boolean
  division?: {
    name?: string
    slug?: string
  } | null
}

type FavoriteQuiz = {
  id: string
  title: string
  subject?: string | null
  year?: number | null
  durationSec?: number | null
  isPublished?: boolean
  category?: {
    name?: string
  } | null
}

type FavoritesResponse = {
  data?: {
    courses?: FavoriteCourse[]
    quizzes?: FavoriteQuiz[]
  }
}

type TabKey = 'courses' | 'quizzes'

type QuizCardModule = {
  id: string
  title: string
  subtitle: string
  averageScore: number
  attempts: number
  totalQuestions: number
  hasResume: boolean
  attemptId: string
  icon: typeof BookOpen
  isFavorited: boolean
}

const makeScoreSeed = (value: string) => {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0)
}

export default function FavoritesPage() {
  const [courses, setCourses] = useState<FavoriteCourse[]>([])
  const [quizzes, setQuizzes] = useState<FavoriteQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('courses')

  useEffect(() => {
    let cancelled = false

    const fetchFavorites = async () => {
      try {
        const response = await apiClient.get<FavoritesResponse>('/favorites')
        if (cancelled) return

        const payload = response.data?.data ?? {}
        const nextCourses = payload.courses ?? []
        const nextQuizzes = payload.quizzes ?? []

        setCourses(nextCourses)
        setQuizzes(nextQuizzes)

        if (nextCourses.length === 0 && nextQuizzes.length > 0) {
          setActiveTab('quizzes')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchFavorites()

    return () => {
      cancelled = true
    }
  }, [])

  const quizModules = useMemo<QuizCardModule[]>(() => {
    return quizzes.map((quiz, index) => {
      const seed = makeScoreSeed(`${quiz.id}-${quiz.title}`)
      const averageScore = 42 + (seed % 51)
      const attempts = 1 + (seed % 9)
      const totalQuestions = quiz.durationSec ? Math.max(20, Math.round(quiz.durationSec / 40)) : 60 + (seed % 30)
      const hasResume = index === 0 && attempts % 2 === 0

      return {
        id: quiz.id,
        title: quiz.title,
        subtitle: quiz.subject ?? quiz.category?.name ?? `Year ${quiz.year ?? 1}`,
        averageScore,
        attempts,
        totalQuestions,
        hasResume,
        attemptId: quiz.id,
        icon: BookOpen,
        isFavorited: true,
      }
    })
  }, [quizzes])

  const activeCount = activeTab === 'courses' ? courses.length : quizzes.length
  const activeEmpty = activeCount === 0
  const emptyCtaHref = activeTab === 'courses' ? '/dashboard/courses' : '/quiz/catalog'
  const emptyCtaLabel = activeTab === 'courses' ? 'Browse Courses' : 'Browse Quiz'

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Favorites</h1>
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading favorites...</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Favorites</h1>

      <div className="mb-6 flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'courses'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Courses
          <span className="ml-2 text-xs font-medium opacity-70">{courses.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'quizzes'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Quizzes
          <span className="ml-2 text-xs font-medium opacity-70">{quizzes.length}</span>
        </button>
      </div>

      {activeEmpty ? (
        <div className="flex min-h-[56vh] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <div className="max-w-md">
            <HeartCrack className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-gray-900">No favorites saved yet</p>
            <p className="mt-2 text-sm text-gray-500">
              {activeTab === 'courses'
                ? 'Save courses from the catalogue to build your quick-access library here.'
                : 'Save quizzes from the catalogue to build your quick-access library here.'}
            </p>
            <Link
              href={emptyCtaHref}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              {emptyCtaLabel}
            </Link>
          </div>
        </div>
      ) : activeTab === 'courses' ? (
        (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={{
                  id: course.id,
                  title: course.title,
                  description: course.description ?? 'Saved course',
                  instructor: course.instructor ?? 'Learnify',
                  division: course.division
                    ? {
                        name: course.division.name ?? 'Division',
                        slug: course.division.slug ?? 'all',
                      }
                    : undefined,
                  category: course.category ?? undefined,
                  type: course.courseType ?? undefined,
                  thumbnailUrl: undefined,
                  isPublished: Boolean(course.isPublished),
                }}
                isFavorited
              />
            ))}
          </div>
        )
      ) : (
        (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {quizModules.map((module, index) => (
              <ModuleCard key={module.id} module={module} index={index} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
