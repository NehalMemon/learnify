'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import { ArrowRight, RotateCcw, Heart, BookOpen, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

type ModuleCardProps = {
  module: {
    id: string
    title: string
    subtitle: string
    averageScore: number
    attempts: number
    totalQuestions: number
    hasResume: boolean
    attemptId: string
    icon: LucideIcon
    isFavorited?: boolean
  }
  index: number
}

const scoreTone = (score: number) => {
  if (score >= 80) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (score >= 50) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

export function ModuleCard({ module, index }: ModuleCardProps) {
  const [isFavoritedState, setIsFavoritedState] = useState<boolean>(Boolean(module.isFavorited));

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const previousState = isFavoritedState
    setIsFavoritedState(!previousState)

    try {
      const res = await fetch('/api/v1/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: module.id, itemType: 'QUIZ' }),
      })

      if (!res.ok) {
        setIsFavoritedState(previousState)
      }
    } catch (err) {
      setIsFavoritedState(previousState)
    }
  }
  const Icon = module.icon
  const ctaLabel = module.hasResume ? 'Resume' : 'Start Exam'
  const CtaIcon = module.hasResume ? RotateCcw : ArrowRight

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="block h-full"
    >
      <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-colors duration-200 hover:border-purple-200">
        {/* Cover Image */}
        <div className="relative flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
          <BookOpen className="h-12 w-12 text-purple-200" />
          <button
            onClick={handleToggleFavorite}
            aria-pressed={isFavoritedState}
            aria-label="Toggle Favorite"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition-colors hover:bg-white"
          >
            {isFavoritedState ? (
              <Heart className="h-4 w-4 fill-current text-red-500" />
            ) : (
              <Heart className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Content Wrapper - flex-grow ensures it expands */}
        <div className="flex flex-grow flex-col p-5">
          {/* Category & Score */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Quiz
            </span>
            <div className={`rounded-full border px-3 py-1 text-xs font-bold tabular-nums ${scoreTone(module.averageScore)}`}>
              {module.averageScore}%
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-2 text-lg font-bold leading-tight text-gray-900 line-clamp-2">
            {module.title}
          </h3>

          {/* Subtitle/Description */}
          <p className="mb-4 line-clamp-2 flex-grow text-sm text-gray-600">
            {module.subtitle}
          </p>

          {/* --- TAG CONTAINER --- */}
          {/* The parent MUST be flex-row with NO flex-wrap */}
          <div className="flex flex-row items-center gap-2 mt-3 w-full">
            
            {/* 1. THE CATEGORY TAG */}
            {/* flex-1 and min-w-0 tell it to shrink and add '...' on small screens */}
            <span className="flex-1 min-w-0 truncate px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              Quiz
            </span>

            {/* 2. THE TIME TAG */}
            {/* flex-shrink-0 protects this tag so it NEVER shrinks or gets hidden */}
            <span className="flex-shrink-0 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              {module.attempts} attempts
            </span>

          </div>
          {/* --------------------- */}
        </div>

        {/* Action Area - LOCKED: mt-auto anchors to bottom */}
        <div className="mt-auto pt-4 border-t border-gray-100 w-full px-5 pb-5">
          <Link
            href={`/quiz/attempt/${module.attemptId}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-50 py-2.5 text-sm font-semibold text-purple-700 transition-colors duration-300 group-hover:bg-purple-600 group-hover:text-white"
          >
            {ctaLabel}
            <CtaIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}