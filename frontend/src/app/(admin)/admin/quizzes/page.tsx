'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock3,
  FileEdit,
  FolderPlus,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Upload,
} from 'lucide-react';
import { getAdminQuizzes } from '@/app/actions/quizAdminActions';
import { TaxonomyManager } from '@/components/admin/dashboard/TaxonomyManager';
import { Spinner } from '@/components/ui/Spinner';

interface AdminQuiz {
  id: string;
  title: string;
  is_published?: boolean | null;
  duration_sec?: number | null;
}

export default function QuizBuilderHubPage() {
  const [allQuizzes, setAllQuizzes] = useState<AdminQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);

  const fetchQuizzesStats = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);
    try {
      const quizzes = await getAdminQuizzes();
      setAllQuizzes(Array.isArray(quizzes) ? (quizzes as AdminQuiz[]) : []);
    } catch {
      setError('Failed to load quiz statistics');
      setAllQuizzes([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuizzesStats();
  }, []);

  const totalQuizzes = allQuizzes.length;
  const publishedCount = allQuizzes.filter((quiz) => Boolean(quiz.is_published)).length;
  const draftCount = totalQuizzes - publishedCount;
  const timedCount = allQuizzes.filter((quiz) => Boolean(quiz.duration_sec && quiz.duration_sec > 0)).length;

  return (
    <div className="mx-auto w-full max-w-7xl pb-10 font-sans text-[#191c1e] antialiased">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4f46e5]">
            Admin Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#191c1e] md:text-4xl">
            Quiz Builder
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b5a68]">
            Creation Hub — Design, generate, import, and structure assessments for your platform.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setIsTaxonomyOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
          >
            <FolderPlus className="h-4 w-4 text-[#3525cd]" />
            Manage Categories
          </button>
          <button
            type="button"
            onClick={() => fetchQuizzesStats({ silent: true })}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/quizzes/library"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
          >
            <BookOpen className="h-4 w-4 text-[#3525cd]" />
            Quiz Library
          </Link>
          <Link
            href="/admin/quizzes/create/ai"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd]/10 px-4 text-sm font-semibold text-[#3525cd] border border-[#3525cd]/20 transition hover:bg-[#3525cd]/20"
          >
            <Sparkles className="h-4 w-4" />
            Create with AI
          </Link>
          <Link
            href="/admin/quizzes/create"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white shadow-sm shadow-[#3525cd]/25 transition hover:bg-[#2f20b8]"
          >
            <Plus className="h-4 w-4" />
            Create Quiz
          </Link>
        </div>
      </div>

      {/* ── 4 Stats Cards ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="mb-8 flex min-h-32 items-center justify-center rounded-xl border border-[#e4e6ef] bg-white">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#777586]">Total</span>
              <BookOpen className="h-4.5 w-4.5 text-[#4f46e5]" />
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight text-[#191c1e]">{totalQuizzes}</div>
            <p className="mt-1 text-xs text-[#777586]">Total quizzes in catalog</p>
          </div>

          <div className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#777586]">Published</span>
              <ToggleRight className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight text-[#191c1e]">{publishedCount}</div>
            <p className="mt-1 text-xs text-[#777586]">Visible to students</p>
          </div>

          <div className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#777586]">Drafts</span>
              <ToggleLeft className="h-4.5 w-4.5 text-[#777586]" />
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight text-[#191c1e]">{draftCount}</div>
            <p className="mt-1 text-xs text-[#777586]">Awaiting publication</p>
          </div>

          <div className="rounded-2xl border border-[#e4e6ef] bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#777586]">Timed</span>
              <Clock3 className="h-4.5 w-4.5 text-[#4f46e5]" />
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight text-[#191c1e]">{timedCount}</div>
            <p className="mt-1 text-xs text-[#777586]">With strict duration</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ── Creation Hub Action Cards ────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-[#191c1e]">
          Creation Tools & Workflows
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. Manual Quiz Creator */}
          <Link
            href="/admin/quizzes/create"
            className="group flex flex-col justify-between rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3525cd]/40 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3525cd]/10 text-[#3525cd] transition group-hover:bg-[#3525cd] group-hover:text-white">
                <FileEdit className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#191c1e]">Create Manual Quiz</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#696778]">
                Build custom assessments question-by-question with single choice, true/false, or matching options.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-[#3525cd]">
              <span>Start Builder</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>

          {/* 2. Generate Quiz with AI */}
          <Link
            href="/admin/quizzes/create/ai"
            className="group flex flex-col justify-between rounded-2xl border border-[#3525cd]/20 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] p-6 text-white shadow-sm shadow-[#3525cd]/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">Generate Quiz with AI</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/80">
                Generate high-quality medical and foundation quizzes automatically from prompt topics or materials.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-white">
              <span>Generate with AI</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>

          {/* 3. Import Questions */}
          <Link
            href="/admin/quizzes/import"
            className="group flex flex-col justify-between rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3525cd]/40 hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                <Upload className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#191c1e]">Import Questions</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#696778]">
                Bulk upload questions and answers via structured CSV, JSON, or Excel templates.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-emerald-600">
              <span>Import Files</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>

          {/* 4. Quiz Taxonomy */}
          <button
            type="button"
            onClick={() => setIsTaxonomyOpen(true)}
            className="group flex flex-col justify-between text-left rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3525cd]/40 hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <Settings2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#191c1e]">Quiz Taxonomy</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#696778]">
                Organize categories, subjects, programs, and study years across the entire quiz platform.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-indigo-600">
              <span>Configure Taxonomy</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* 5. Browse Quiz Library */}
          <Link
            href="/admin/quizzes/library"
            className="group flex flex-col justify-between rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3525cd]/40 hover:shadow-md md:col-span-2 lg:col-span-2"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition group-hover:bg-purple-600 group-hover:text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#191c1e]">Quiz Library Ledger</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#696778]">
                Browse, search, filter, publish, draft, edit, or delete existing assessments from the main catalog.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-purple-600">
              <span>Open Quiz Library</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Slide-over Modal for Taxonomy Management */}
      <TaxonomyManager
        isOpen={isTaxonomyOpen}
        onClose={() => setIsTaxonomyOpen(false)}
        onTaxonomyChange={fetchQuizzesStats}
      />
    </div>
  );
}
