'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'

type QuizGuardProps = {
  children: React.ReactNode
  requireApproval?: boolean
}

const isApprovedUser = (user: ReturnType<typeof useAuthContext>['user']) => {
  return Boolean(user && (user.role === 'ADMIN' || user.learnifyEnabled))
}

export function QuizGuard({ children, requireApproval = true }: QuizGuardProps) {
  const router = useRouter()
  const { user, loading } = useAuthContext()

  useEffect(() => {
    if (loading || !user) return

    if (!user.hasSeenQuizDisclaimer) {
      router.replace('/quiz/onboarding')
      return
    }

    if (requireApproval && !isApprovedUser(user)) {
      router.replace('/quiz/locked')
    }
  }, [loading, requireApproval, router, user])

  if (loading || !user) return null

  if (!user.hasSeenQuizDisclaimer) return null
  if (requireApproval && !isApprovedUser(user)) return null

  return <>{children}</>
}

export default QuizGuard