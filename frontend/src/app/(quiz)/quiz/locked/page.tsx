'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LockKeyhole, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export default function QuizLockedPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.10),_transparent_45%),linear-gradient(180deg,#fff8f8_0%,#fff1f2_100%)] px-4 py-10 text-slate-950 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full">
          <Card className="border-red-200/70 bg-white/95 shadow-[0_30px_80px_-40px_rgba(127,29,29,0.35)] backdrop-blur-sm">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                <ShieldAlert className="h-8 w-8" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight md:text-3xl">Account Verification Pending.</CardTitle>
              <CardDescription className="mx-auto max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Your university credentials are being reviewed. To unlock full access to mock exams and detailed analytics, your account must be verified by an administrator, or an active subscription is required.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:justify-center md:p-8">
              <Button asChild size="lg" className="gap-2 rounded-xl bg-slate-950 hover:bg-slate-800">
                <Link href="/checkout">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Proceed to Payment
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-slate-200 gap-2">
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}