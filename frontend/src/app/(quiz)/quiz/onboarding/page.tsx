'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PROGRAMS = ['MBBS', 'BDS', 'Pharmacy', 'Other'] as const
const YEARS = [
  { label: '1st Year', value: 1 },
  { label: '2nd Year', value: 2 },
  { label: '3rd Year', value: 3 },
  { label: '4th Year', value: 4 },
  { label: '5th Year', value: 5 },
] as const

export default function QuizOnboardingPage() {
  const router = useRouter()
  const { refreshAuth } = useAuthContext()
  const [step, setStep] = useState<1 | 2>(1)
  const [program, setProgram] = useState('')
  const [studyYear, setStudyYear] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const goToCatalog = async () => {
    if (!program || !studyYear) {
      setError('Please select your program and year.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await authApi.updateQuizOnboarding({
        hasSeenQuizDisclaimer: true,
        universityProgram: program,
        studyYear: Number(studyYear),
      })
      await refreshAuth()
      router.replace('/quiz/catalog')
    } catch {
      setError('We could not save your quiz onboarding details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_45%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-10 text-slate-950 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full">
          <Card className="border-slate-200/80 bg-white/90 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShieldCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight md:text-3xl">
                {step === 1 ? 'Quiz Section Access Gate' : 'Tell us about your program'}
              </CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                {step === 1
                  ? 'Welcome to the Learnify Exam Arena. This section is strictly for university students preparing for professional exams (MBBS, BDS, etc.).'
                  : 'Choose your study program and year so we can personalize the quiz catalog for you.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6 md:p-8">
              {step === 1 ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button variant="outline" size="lg" className="gap-2" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Go Back to Courses
                  </Button>
                  <Button size="lg" className="gap-2" onClick={() => setStep(2)}>
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void goToCatalog(); }}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Select Program</span>
                      <Select value={program} onValueChange={setProgram}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-left">
                          <SelectValue placeholder="Choose your program" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRAMS.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Select Year</span>
                      <Select value={studyYear} onValueChange={setStudyYear}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-left">
                          <SelectValue placeholder="Choose your year" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((item) => (
                            <SelectItem key={item.value} value={String(item.value)}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  {error ? <p className="text-sm font-medium text-red-600" role="alert">{error}</p> : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" size="lg" className="gap-2" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back
                    </Button>
                    <Button type="submit" size="lg" className="gap-2" isLoading={submitting} disabled={!program || !studyYear || submitting}>
                      Enter Quiz Catalog
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}