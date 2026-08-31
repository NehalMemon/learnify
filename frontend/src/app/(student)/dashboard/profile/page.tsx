'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import {
  Award,
  BookOpen,
  FileText,
  GraduationCap,
  History,
  Mail,
  Shield,
  Star,
  User,
} from 'lucide-react'
import { quizApi } from '@/lib/api'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { createClient } from '@/utils/supabase/client'
import { CloudinaryUploader } from '@/components/ui/CloudinaryUploader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
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

type Quiz = { id: string; title: string }
type Attempt = {
  id: string
  quizId?: string
  score: number
  totalQs: number
  startedAt: string
}

const BOARD_OPTIONS = [
  'FBISE (Federal Board)',
  'BISE Punjab (Lahore/Rawalpindi/Multan)',
  'BISE Sindh (Karachi/Hyderabad)',
  'BISE KPK (Peshawar)',
  'Cambridge (O/A Levels)',
  'Edexcel / Oxford AQA',
  'Aga Khan Board (AKU-EB)',
  'Other',
]

const GRADE_OPTIONS = [
  'Grade 9 (9th / Matric 1 / O1)',
  'Grade 10 (10th / Matric 2 / O2)',
  'Grade 11 (FSc 1 / AS Level)',
  'Grade 12 (FSc 2 / A2 Level)',
  'MDCAT / Medical Prep',
  'ECAT / Engineering Prep',
  'Undergraduate / University',
  'Other',
]

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

const scoreColor = (pct: number): string => {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StudentProfilePage() {
  const { user: authProfile } = useAuthContext()

  // State for user profile fields
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [educationBoard, setEducationBoard] = useState<string>('')
  const [classGrade, setClassGrade] = useState<string>('')

  // Exam history state
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 1. Fetch user data from Supabase public.users table on mount
  useEffect(() => {
    let cancelled = false

    const fetchProfileAndAttempts = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (currentUser) {
          setUserId(currentUser.id)
          setEmail(currentUser.email ?? '')

          // Fetch fields from public.users table
          const { data: dbUser } = await supabase
            .from('users')
            .select('full_name, avatar_url, education_board, class_grade')
            .eq('id', currentUser.id)
            .single()

          if (!cancelled && dbUser) {
            setFullName(dbUser.full_name || currentUser.user_metadata?.full_name || '')
            setAvatarUrl(dbUser.avatar_url || null)
            setEducationBoard(dbUser.education_board || '')
            setClassGrade(dbUser.class_grade || '')
          }
        }

        // Fetch Exam History
        const [attemptsRes, quizzesRes] = await Promise.allSettled([
          quizApi.getMyAttempts(),
          quizApi.listQuizzes({ page: 1, limit: 100 }),
        ])

        if (cancelled) return

        if (attemptsRes.status === 'fulfilled') {
          const attemptsPayload = unwrap<{ attempts?: Attempt[] } | Attempt[]>(attemptsRes.value.data)
          setAttempts(Array.isArray(attemptsPayload) ? attemptsPayload : (attemptsPayload.attempts ?? []))
        }

        if (quizzesRes.status === 'fulfilled') {
          const quizzesPayload = unwrap<{ quizzes?: Quiz[] } | Quiz[]>(quizzesRes.value.data)
          const quizzes = Array.isArray(quizzesPayload) ? quizzesPayload : (quizzesPayload.quizzes ?? [])
          setTitles(quizzes.reduce<Record<string, string>>((acc, q) => ({ ...acc, [q.id]: q.title }), {}))
        }
      } catch (err) {
        console.error('Error fetching profile data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchProfileAndAttempts()
    return () => {
      cancelled = true
    }
  }, [])

  // 2. Avatar Uploader callback: instantly update Supabase & local state
  const handleAvatarSuccess = async (url: string) => {
    setAvatarUrl(url)
    toast.success('Avatar updated!')

    try {
      const supabase = createClient()
      const currentId = userId || (await supabase.auth.getUser()).data.user?.id

      if (currentId) {
        const { error } = await supabase
          .from('users')
          .update({
            avatar_url: url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentId)

        if (error) {
          console.error('Error saving avatar to database:', error)
          toast.error('Avatar saved locally, but database update failed: ' + error.message)
        }
      }
    } catch (err) {
      console.error('Unexpected error updating avatar:', err)
    }
  }

  // 4. Submission logic for Personal Info form
  const handleSavePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()
      const currentId = userId || (await supabase.auth.getUser()).data.user?.id

      if (!currentId) {
        toast.error('User session not found.')
        return
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          education_board: educationBoard.trim() || null,
          class_grade: classGrade.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentId)

      if (error) {
        console.error('Error saving profile changes:', error)
        toast.error('Failed to update profile: ' + error.message)
      } else {
        toast.success('Profile changes saved successfully!')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const initials = useMemo(() => {
    const name = fullName || authProfile?.fullName || 'Student'
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [fullName, authProfile])

  const avgScore = useMemo(() => {
    const finished = attempts.filter((a) => a.totalQs > 0)
    if (!finished.length) return 0
    return Math.round(
      finished.reduce((sum, a) => sum + Math.round((a.score / a.totalQs) * 100), 0) / finished.length,
    )
  }, [attempts])

  if (loading) return <ProfileLoading />

  const avatarPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_AVATARS

  return (
    <main className="min-h-screen bg-gray-50/30 font-sans antialiased text-slate-900">
      <Toaster position="top-center" toastOptions={{ style: { background: '#0f172a', color: '#fff' } }} />

      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── Profile Hero (Full Width with Avatar Uploader) ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48 }}
          className="w-full"
        >
          <Card className="overflow-hidden border-gray-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-[#A435F0]" />
            <CardContent className="p-6 md:p-8">
              <div className="w-full flex flex-col sm:flex-row items-center gap-6 sm:justify-between">
                <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                  {/* Dynamic Avatar */}
                  <div className="relative group flex flex-col items-center gap-2">
                    <Avatar className="size-20 border-2 border-purple-100 shadow-sm md:size-24 overflow-hidden relative">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={fullName || 'Student Avatar'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <AvatarFallback className="bg-purple-50 text-2xl font-bold text-[#A435F0]">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <CloudinaryUploader
                      preset={avatarPreset}
                      onSuccess={handleAvatarSuccess}
                      buttonText={avatarUrl ? 'Change Avatar' : 'Upload Photo'}
                      className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1 px-3 shadow-xs font-medium"
                    />
                  </div>

                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                      {fullName || authProfile?.fullName || 'Student'}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                        <Mail className="size-4" />
                        {email || authProfile?.email || 'N/A'}
                      </p>
                      {(() => {
                        const daysRemaining = getDaysRemaining(authProfile?.accessExpiresAt)

                        if (daysRemaining === null) return null

                        if (daysRemaining > 5) {
                          return (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                              Active: {daysRemaining} days remaining
                            </span>
                          )
                        }

                        if (daysRemaining > 0) {
                          return (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                              Expiring Soon: {daysRemaining} days left
                            </span>
                          )
                        }

                        return (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
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
                    <p className="text-2xl font-black text-gray-900">{attempts.length}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Main Layout Grid & Tabs ── */}
        <Tabs defaultValue="personal" className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full mt-6">
          {/* Sidebar */}
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

          {/* Content Area */}
          <div className="lg:col-span-9 w-full overflow-hidden">
            {/* 3. Personal Info Tab Form */}
            <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <User className="size-5 text-[#A435F0]" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSavePersonalDetails} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Full Name */}
                      <div className="space-y-2">
                        <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Full Name
                        </label>
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          required
                          className="text-sm font-medium"
                        />
                      </div>

                      {/* Email (Read Only) */}
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Email Address
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="bg-gray-50 text-sm font-medium text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      {/* Education Board */}
                      <div className="space-y-2">
                        <label htmlFor="educationBoard" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                          <BookOpen className="size-3.5 text-gray-400" />
                          Education Board
                        </label>
                        <select
                          id="educationBoard"
                          value={educationBoard}
                          onChange={(e) => setEducationBoard(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-xs outline-none transition-colors focus:border-[#A435F0] focus:ring-2 focus:ring-[#A435F0]/20"
                        >
                          <option value="">-- Select Education Board (Optional) --</option>
                          {BOARD_OPTIONS.map((board) => (
                            <option key={board} value={board}>
                              {board}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Class / Grade */}
                      <div className="space-y-2">
                        <label htmlFor="classGrade" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                          <GraduationCap className="size-3.5 text-gray-400" />
                          Class / Grade Level
                        </label>
                        <select
                          id="classGrade"
                          value={classGrade}
                          onChange={(e) => setClassGrade(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-xs outline-none transition-colors focus:border-[#A435F0] focus:ring-2 focus:ring-[#A435F0]/20"
                        >
                          <option value="">-- Select Class / Grade (Optional) --</option>
                          {GRADE_OPTIONS.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-gray-100 pt-6">
                      <Button
                        type="submit"
                        isLoading={saving}
                        disabled={saving}
                        className="bg-[#A435F0] hover:bg-[#8e24d4] text-white font-bold px-6 text-sm"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exam History Tab */}
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
                          {attempts.map((item) => {
                            const pct = item.totalQs ? Math.round((item.score / item.totalQs) * 100) : 0
                            return (
                              <TableRow key={item.id} className="border-gray-50 transition-colors hover:bg-gray-50/50">
                                <TableCell className="max-w-[200px] truncate py-4 font-bold text-gray-900">
                                  {(item.quizId && titles[item.quizId]) || 'General Assessment'}
                                </TableCell>
                                <TableCell className="py-4 text-sm font-medium text-gray-500">
                                  {new Date(item.startedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
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

            {/* Certificates Tab */}
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
