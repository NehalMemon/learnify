'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, FlaskConical, Microscope, Radar, Target, Trophy } from 'lucide-react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ModuleCard } from '@/components/quiz/ModuleCard'

const QUIZZES = [
  { id: '1', title: 'Anatomy Mock Exam', subtitle: 'Foundational systems review', icon: BookOpen },
  { id: '2', title: 'Pathology Basics', subtitle: 'Core pathology recall', icon: Microscope },
  { id: '3', title: 'Pharmacology Sprint', subtitle: 'Quick exam-prep revision', icon: FlaskConical },
] as const

const WEAK_SUBJECTS = ['Pathology', 'Anatomy', 'Pharmacology', 'Physiology', 'Biochemistry'] as const
const HUD_METRICS = [
  { label: 'Global Accuracy', value: '68%' },
  { label: 'Questions Solved', value: '450' },
  { label: 'Cohort Rank', value: 'Top 15%' },
] as const

type Module = {
  id: string
  title: string
  subtitle: string
  averageScore: number
  attempts: number
  totalQuestions: number
  hasResume: boolean
  attemptId: string
  icon: (typeof QUIZZES)[number]['icon']
}

export default function QuizCatalogPage() {
  const { user } = useAuthContext()

  const weakestSubject = useMemo(() => {
    if (!user?.id) return WEAK_SUBJECTS[0]
    const seed = [...user.id].reduce((total, char) => total + char.charCodeAt(0), 0)
    return WEAK_SUBJECTS[seed % WEAK_SUBJECTS.length]
  }, [user?.id])

  const modules = useMemo<Module[]>(() => {
    const seed = user?.id ? [...user.id].reduce((total, char) => total + char.charCodeAt(0), 0) : 97

    return QUIZZES.map((quiz, index) => {
      const averageScore = 42 + ((seed + index * 17) % 51)
      const attempts = 1 + ((seed + index * 5) % 9)
      const totalQuestions = 60 + ((seed + index * 11) % 91)
      const hasResume = index === 0 && attempts % 2 === 0

      return {
        ...quiz,
        averageScore,
        attempts,
        totalQuestions,
        hasResume,
        attemptId: String(index + 1),
      }
    })
  }, [user?.id])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_45%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-4 py-10 text-slate-950 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-3xl border border-slate-200/80 bg-slate-950 px-5 py-5 text-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.65)] md:px-7 md:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.3em] text-sky-200">
                <Radar className="h-3.5 w-3.5" aria-hidden="true" />
                Exam Arena
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Recommended Focus</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                  Recommended Focus: <span className="text-sky-300">{weakestSubject}</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Build momentum with a targeted 20-question sprint tuned to the area that needs the most work.
                </p>
              </div>
            </div>

            <Button asChild size="lg" className="h-12 gap-2 rounded-2xl bg-sky-500 px-6 font-bold text-slate-950 hover:bg-sky-400">
              <Link href="/quiz/attempt/1">
                Quick Start 20 Questions
                <Target className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8 grid gap-3 md:grid-cols-3">
          {HUD_METRICS.map((metric) => (
            <Card key={metric.label} className="border-slate-200/80 bg-white/90 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.24)] backdrop-blur-sm">
              <CardContent className="flex items-center justify-between gap-4 p-4 md:p-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{metric.value}</p>
                </div>
                <Trophy className="h-8 w-8 text-sky-500/70" aria-hidden="true" />
              </CardContent>
            </Card>
          ))}
        </motion.section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {modules.map((module, index) => (
            <ModuleCard key={module.id} module={module} index={index} />
          ))}
        </section>
      </div>
    </main>
  )
}