'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, ArrowRight, Hash } from 'lucide-react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminQuiz {
  id: string;
  title: string;
  isPublished: boolean;
  category?: { name: string } | null;
  _count?: { questions?: number };
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * QuizCatalog — sidebar panel showing the 4 most recently created quizzes.
 * Mirrors the structure of TopCourses for visual consistency.
 * Fetches from GET /api/v1/admin/quizzes with limit=4.
 */
export function QuizCatalog() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.listQuizzes({ limit: 4 } as Record<string, unknown>)
      .then((res) => {
        if (cancelled) return;
        // Handles both { data: Quiz[] } and { data: { quizzes: Quiz[], ... } } shapes
        const raw = res.data?.data;
        const list: AdminQuiz[] = Array.isArray(raw) ? raw : (raw?.quizzes ?? []);
        setQuizzes(list.slice(0, 4));
      })
      .catch(() => {/* graceful degradation — empty state shown */})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-base font-bold text-gray-900">Quiz Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">Recent named exams</p>
        </div>
        <Link
          href="/admin/quizzes"
          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 transition-colors font-medium"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Quiz list */}
      <ul className="divide-y divide-gray-100">
        {loading && (
          <li className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">
            Loading quizzes…
          </li>
        )}
        {!loading && quizzes.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-gray-400">
            No quizzes found.
          </li>
        )}
        {quizzes.map((quiz, idx) => {
          const questionCount = quiz._count?.questions ?? 0;

          return (
            <li
              key={quiz.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 group"
            >
              <div className="flex items-start gap-3">
                {/* Rank pill */}
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {String(idx + 1).padStart(2, '0')}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {quiz.title}
                  </p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {quiz.category && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {quiz.category.name}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                      <Hash className="w-2.5 h-2.5" />
                      {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                    </span>
                    {quiz.isPublished ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full ml-auto">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full ml-auto">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer CTA */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/admin/quizzes"
          className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-600 transition-colors py-1"
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          Manage all quizzes
        </Link>
      </div>
    </div>
  );
}
