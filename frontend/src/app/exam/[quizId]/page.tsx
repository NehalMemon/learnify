'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Flag, X } from 'lucide-react';

const questionOptions = [
  'They generate ATP through oxidative phosphorylation.',
  'They store genetic information for the cell.',
  'They package proteins for secretion.',
  'They synthesize lipids for the membrane.',
];

const navigatorStates = [
  'answered', 'answered', 'marked', 'unanswered', 'unanswered',
  'answered', 'unanswered', 'unanswered', 'answered', 'unanswered',
  'unanswered', 'marked', 'answered', 'unanswered', 'answered',
  'unanswered', 'unanswered', 'answered', 'unanswered', 'unanswered',
];

const stateClasses: Record<string, string> = {
  unanswered: 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
  answered: 'border border-violet-600 bg-violet-600 text-white shadow-sm hover:bg-violet-700',
  marked: 'border border-amber-400 bg-amber-400 text-white shadow-sm hover:bg-amber-500',
};

export default function ExamPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex h-20 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Exit Exam</span>
            </Link>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight sm:text-lg">Anatomy Midterm</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Exam Sandbox</p>
            </div>
          </div>

          <div className="hidden rounded-full bg-slate-100 px-4 py-2 text-center font-mono text-lg font-semibold tracking-[0.18em] text-slate-700 md:block">
            01:29:59
          </div>

          <button className="inline-flex h-11 items-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2">
            Submit Exam
          </button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1800px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
          <section className="flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Question 1 of 50</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Which of the following is the primary function of the mitochondria?
                </h1>
              </div>

              <button className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700">
                <Flag className="h-4 w-4" />
                Mark for Review
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {questionOptions.map((option, index) => (
                <button
                  key={option}
                  className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left transition duration-150 hover:-translate-y-px hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-500">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-base leading-7 text-slate-800 sm:text-lg">{option}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-violet-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <aside className="flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Question Navigator</h2>
              <p className="mt-1 text-sm text-slate-500">Jump between questions quickly.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-5 gap-3 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                {navigatorStates.map((state, index) => (
                  <button
                    key={`${state}-${index}`}
                    className={`aspect-square rounded-xl text-sm font-semibold transition ${stateClasses[state]}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full border border-slate-300 bg-slate-50" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-violet-600" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span>Marked for review</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}