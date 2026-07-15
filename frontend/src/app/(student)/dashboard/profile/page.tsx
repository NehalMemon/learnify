'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  ChevronRight,
  FileText,
  History,
  Mail,
  Shield,
  Star,
  User,
} from 'lucide-react'
import { authApi, quizApi } from '@/lib/api'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Profile = { fullName: string; email: string }
type Quiz = { id: string; title: string }
type Attempt = {
  id: string
  quizId?: string
  score: number
  totalQs: number
  startedAt: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const unwrap = <T,>(payload: unknown): T => {
  if (typeof payload === 'object' && payload !== null && 'data' in payload)
    return (payload as { data: T }).data
  return payload as T
}

const getDaysRemaining = (expiresAt?: string | Date | null): number | null => {
  if (!expiresAt) return null
  const diffTime = new Date(expiresAt).getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

/** Returns a semantic Tailwind text colour that works on both light and dark themes */
const scoreColor = (pct: number): string => {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

/** Returns a badge-style class set that works on a light card background */
const scoreBg = (pct: number): string => {
  if (pct >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { user: profile } = useAuthContext()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      try {
        const [attemptsRes, quizzesRes] = await Promise.all([
          quizApi.getMyAttempts(),
          quizApi.listQuizzes({ page: 1, limit: 100 }),
        ])

        if (cancelled) return

        const attemptsPayload = unwrap<{ attempts?: Attempt[] } | Attempt[]>(attemptsRes.data)
        setAttempts(Array.isArray(attemptsPayload) ? attemptsPayload : (attemptsPayload.attempts ?? []))

        const quizzesPayload = unwrap<{ quizzes?: Quiz[] } | Quiz[]>(quizzesRes.data)
        const quizzes = Array.isArray(quizzesPayload) ? quizzesPayload : (quizzesPayload.quizzes ?? [])
        setTitles(quizzes.reduce<Record<string, string>>((acc, q) => ({ ...acc, [q.id]: q.title }), {}))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchAll()
    return () => { cancelled = true }
  }, [])

  const initials = useMemo(() => {
    const name = profile?.fullName ?? 'Student'
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  }, [profile])

  const avgScore = useMemo(() => {
    const finished = attempts.filter((a) => a.totalQs > 0)
    if (!finished.length) return 0
    return Math.round(
      finished.reduce((sum, a) => sum + Math.round((a.score / a.totalQs) * 100), 0) / finished.length,
    )
  }, [attempts])

  if (loading) return <ProfileLoading />

  return (
    <main className="min-h-screen bg-gray-50/30">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ── Profile Hero (Full Width) ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48 }}
          className="w-full"
        >
          <Card className="overflow-hidden border-gray-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-[#A435F0]" />
            <CardContent className="p-6 md:p-8">
              <div className="w-full flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                <div className="flex items-center gap-6">
                  <Avatar className="size-20 border-2 border-gray-100 shadow-sm md:size-24">
                    <AvatarFallback className="bg-purple-50 text-2xl font-bold text-[#A435F0]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                      {profile?.fullName ?? 'Student'}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                        <Mail className="size-4" />
                        {profile?.email ?? 'N/A'}
                      </p>
                      {(() => {
                        const daysRemaining = getDaysRemaining(profile?.accessExpiresAt)
                        
                        if (daysRemaining === null) {
                          return null
                        }
                        
                        if (daysRemaining > 5) {
                          return (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              Active: {daysRemaining} days remaining
                            </span>
                          )
                        }
                        
                        if (daysRemaining > 0) {
                          return (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                              Expiring Soon: {daysRemaining} days left
                            </span>
                          )
                        }
                        
                        return (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                            Access Expired
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-gray-100 pt-6 md:border-t-0 md:pt-0">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Avg. Score</p>
                    <p className={`text-2xl font-black ${scoreColor(avgScore)}`}>{avgScore}%</p>
                  </div>
                  <div className="h-10 w-px bg-gray-100 mx-2" />
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Attempts</p>
                    <p className={`text-2xl font-black text-gray-900`}>{attempts.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Main Layout Grid ── */}
        <Tabs defaultValue="history" className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mt-6">
            
            {/* Sidebar (col-span-1) */}
            <aside className="lg:col-span-3 lg:block w-full">
              <Card className="border-gray-200 bg-white p-2 shadow-sm">
                <TabsList className="flex overflow-x-auto whitespace-nowrap lg:flex-col gap-2 pb-2 h-auto w-full bg-transparent p-0">
                  <TabsTrigger
                    value="personal"
                    className="flex shrink-0 lg:w-full items-center justify-start gap-3 px-4 py-3 text-sm font-bold text-gray-500 transition-all data-[state=active]:bg-purple-50 data-[state=active]:text-[#A435F0]"
                  >
                    <User className="size-4" />
                    Personal Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex shrink-0 lg:w-full items-center justify-start gap-3 px-4 py-3 text-sm font-bold text-gray-500 transition-all data-[state=active]:bg-purple-50 data-[state=active]:text-[#A435F0]"
                  >
                    <History className="size-4" />
                    Exam History
                  </TabsTrigger>
                  <TabsTrigger
                    value="certificates"
                    className="flex shrink-0 lg:w-full items-center justify-start gap-3 px-4 py-3 text-sm font-bold text-gray-500 transition-all data-[state=active]:bg-purple-50 data-[state=active]:text-[#A435F0]"
                  >
                    <Award className="size-4" />
                    Certificates
                  </TabsTrigger>
                </TabsList>
              </Card>

              <div className="mt-6 hidden lg:block">
                <Card className="border-purple-100 bg-purple-50/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-700">Study Goal</p>
                  <p className="mt-2 text-sm font-medium text-purple-900 leading-relaxed">
                    Keep practicing to maintain your {avgScore}% average and unlock new certificates.
                  </p>
                </Card>
              </div>
            </aside>

            {/* Content (md:col-span-3) */}
            <div className="lg:col-span-9 w-full overflow-hidden">
              <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle className="text-lg font-black text-gray-900">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-gray-100 p-0">
                    {[
                      { icon: <User className="size-4" />, label: 'Full Name', value: profile?.fullName ?? 'Student' },
                      { icon: <Mail className="size-4" />, label: 'Email Address', value: profile?.email ?? 'N/A' },
                      { icon: <Shield className="size-4" />, label: 'Account Status', value: 'Active' },
                      { icon: <Star className="size-4" />, label: 'Access Level', value: 'Standard Student' },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-5 px-6 py-5">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                          <p className="truncate text-base font-bold text-gray-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg font-black text-gray-900">
                        <FileText className="size-5 text-gray-400" />
                        Exam History
                      </CardTitle>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                        {attempts.length} Attempts
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {attempts.length === 0 ? (
                      <div className="py-20 text-center">
                        <History className="mx-auto mb-4 size-12 text-gray-200" />
                        <p className="text-sm font-bold text-gray-500">No exam attempts found.</p>
                        <Link href="/dashboard/quizzes" className="mt-4 inline-block font-bold text-[#A435F0] hover:underline">
                          Browse Quizzes →
                        </Link>
                      </div>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-100 hover:bg-transparent">
                              <TableHead className="h-12 text-[10px] font-bold uppercase tracking-widest text-gray-400">Exam</TableHead>
                              <TableHead className="h-12 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</TableHead>
                              <TableHead className="h-12 text-[10px] font-bold uppercase tracking-widest text-gray-400">Score</TableHead>
                              <TableHead className="h-12 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Report</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attempts.map((item, idx) => {
                              const pct = item.totalQs ? Math.round((item.score / item.totalQs) * 100) : 0
                              return (
                                <TableRow key={item.id} className="border-gray-50 transition-colors hover:bg-gray-50/50">
                                  <TableCell className="max-w-[200px] truncate py-4 font-bold text-gray-900">
                                    {(item.quizId && titles[item.quizId]) || 'General Assessment'}
                                  </TableCell>
                                  <TableCell className="py-4 text-sm font-medium text-gray-500">
                                    {new Date(item.startedAt).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric', year: 'numeric',
                                    })}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-black ${scoreColor(pct)}`}>
                                        {pct}%
                                      </span>
                                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                                        <div 
                                          className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 text-right">
                                    <Link
                                      href={`/dashboard/quiz/results/${item.id}`}
                                      className="inline-flex h-8 items-center rounded-lg bg-gray-100 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-600 transition-all hover:bg-[#A435F0] hover:text-white"
                                    >
                                      Details
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certificates" className="mt-0 focus-visible:outline-none">
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-20 text-center">
                    <Award className="mx-auto mb-4 size-16 text-gray-100" />
                    <h3 className="text-lg font-black text-gray-900">Achievements Unlocked</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-gray-500 leading-relaxed">
                      Complete course modules or achieve 80%+ on major exams to earn verified certificates.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
        </Tabs>
      </div>
    </main>
  )
}

// ─── Loading State ─────────────────────────────────────────────────────────────

function ProfileLoading() {
  return (
    <main className="min-h-screen bg-gray-50/30">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mt-6">
          <Skeleton className="h-64 lg:col-span-3 rounded-2xl" />
          <Skeleton className="h-96 lg:col-span-9 rounded-2xl" />
        </div>
      </div>
    </main>
  )
}
