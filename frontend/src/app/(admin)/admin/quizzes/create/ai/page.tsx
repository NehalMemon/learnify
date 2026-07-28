'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  BookOpen,
  FileText,
  Sliders,
  Stethoscope,
  ChevronRight,
  Brain,
  PlusCircle,
} from 'lucide-react';

export default function AICreateQuizPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 lg:p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#696778] mb-6">
          <Link href="/admin/quizzes" className="hover:text-[#3525cd] transition">
            Quizzes
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#191c1e]">AI Generator</span>
        </div>

        {/* Hero Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#e4e6ef] bg-white p-8 lg:p-12 shadow-sm text-center">
          {/* Subtle Background Glow Accent */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#3525cd]/5 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl" />

          {/* Badge & Icon */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#3525cd]/20 bg-[#f1f0ff] px-4 py-1.5 text-xs font-bold text-[#3525cd] mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#3525cd]" />
            <span>AI Quiz Generator</span>
            <span className="h-1 w-1 rounded-full bg-[#3525cd]" />
            <span className="rounded-full bg-[#3525cd] px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
              Coming Soon
            </span>
          </div>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#3525cd] to-purple-600 text-white shadow-xl shadow-[#3525cd]/20 mb-6">
            <Brain className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl">
            Next-Gen Medical AI Quiz Agent
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#5b5a68]">
            Our dedicated medical AI agent is currently being trained to generate high-yield,
            structured quizzes automatically from your uploaded lecture notes, textbooks, and syllabus topics.
          </p>

          {/* 2x2 Upcoming Feature Grid */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
            {/* Feature 1: Smart Curriculum Mapping */}
            <div className="group rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-5 transition hover:border-[#3525cd]/30 hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3525cd]/10 text-[#3525cd] transition group-hover:bg-[#3525cd] group-hover:text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191c1e]">Smart Curriculum Mapping</h3>
                  <p className="mt-0.5 text-xs text-[#696778]">
                    Generates subtopics automatically from raw content.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2: Document Parsing */}
            <div className="group rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-5 transition hover:border-[#3525cd]/30 hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 transition group-hover:bg-purple-600 group-hover:text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191c1e]">Document Parsing</h3>
                  <p className="mt-0.5 text-xs text-[#696778]">
                    Upload PDFs or copy-paste lecture notes.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Custom Distribution */}
            <div className="group rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-5 transition hover:border-[#3525cd]/30 hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191c1e]">Custom Distribution</h3>
                  <p className="mt-0.5 text-xs text-[#696778]">
                    Specify single-choice, true/false, etc.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4: Clinical Scenarios */}
            <div className="group rounded-2xl border border-[#e4e6ef] bg-[#fbfbfd] p-5 transition hover:border-[#3525cd]/30 hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition group-hover:bg-amber-600 group-hover:text-white">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#191c1e]">Clinical Scenarios</h3>
                  <p className="mt-0.5 text-xs text-[#696778]">
                    Generates USMLE-style case questions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/admin/quizzes/create"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3525cd] px-6 text-sm font-bold text-white shadow-lg shadow-[#3525cd]/25 transition hover:bg-[#2f20b8] w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4" />
              Return to Manual Builder
            </Link>
            <Link
              href="/admin/quizzes"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dadce5] bg-white px-6 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Quizzes Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
