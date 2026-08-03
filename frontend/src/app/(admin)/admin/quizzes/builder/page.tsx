'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileEdit,
  FolderTree,
  ArrowRight,
  Plus,
  BookOpen,
  Layers,
} from 'lucide-react';
import { TaxonomyManager } from '@/components/admin/dashboard/TaxonomyManager';
import { getCategoriesWithSubjects } from '@/app/actions/taxonomyActions';

export default function QuizBuilderHubPage() {
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl pb-12 font-sans text-slate-900 antialiased space-y-8">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-purple-700">
            <Sparkles className="h-3.5 w-3.5" />
            Admin Workspace
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Quiz Builder Workspace
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600 max-w-2xl leading-relaxed">
            Select a creation flow to draft, generate, or manage quizzes for your students.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/quizzes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
          >
            <BookOpen className="h-4 w-4 text-purple-600" />
            View Quiz Library
          </Link>
        </div>
      </div>

      {/* ── 3 Action Cards Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1: Generate with AI */}
        <Link
          href="/admin/quizzes/ai-generator"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 p-7 text-white shadow-xl shadow-purple-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/20"
        >
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-purple-300 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-white/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-300/80">
                Automated Generation
              </span>
              <h3 className="mt-1 text-2xl font-extrabold text-white">
                Generate with AI
              </h3>
            </div>
            <p className="text-xs leading-relaxed font-medium text-purple-100/80">
              Create intelligent medical assessments from topics, clinical scenarios, or uploaded documents in seconds.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-bold text-purple-200 transition group-hover:text-white">
            <span>Start AI Generator</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Card 2: Create Manually */}
        <Link
          href="/admin/quizzes/builder/new"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 text-slate-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl"
        >
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white">
              <FileEdit className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Step-by-Step Builder
              </span>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                Create Manually
              </h3>
            </div>
            <p className="text-xs leading-relaxed font-medium text-slate-500">
              Build a custom quiz step-by-step with single choice, true/false, multiple select, and matching pairs.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-purple-600 transition group-hover:text-purple-700">
            <span>Open Quiz Builder</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Card 3: Manage Taxonomy */}
        <button
          type="button"
          onClick={() => setIsTaxonomyOpen(true)}
          className="group relative flex flex-col justify-between text-left overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 text-slate-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl cursor-pointer"
        >
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Curriculum Structure
              </span>
              <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                Manage Taxonomy
              </h3>
            </div>
            <p className="text-xs leading-relaxed font-medium text-slate-500">
              Organize medical categories, subjects, and curriculum taxonomy for quiz classification.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-indigo-600 transition group-hover:text-indigo-700 w-full">
            <span>Manage Categories &amp; Subjects</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>

      {/* ── Taxonomy Slide-over ───────────────────────────────────── */}
      <TaxonomyManager
        isOpen={isTaxonomyOpen}
        onClose={() => setIsTaxonomyOpen(false)}
      />
    </div>
  );
}
