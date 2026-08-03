'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  Sparkles,
  Search,
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-purple-50/30 to-slate-50 px-4 py-12 text-center font-sans antialiased">
      {/* CSS Keyframe Animations for Floating & Shadow Effects */}
      <style jsx global>{`
        @keyframes floatBook {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-16px) rotate(1.5deg);
          }
        }
        @keyframes shadowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            transform: scale(0.75);
            opacity: 0.1;
          }
        }
        @keyframes floatSparkle {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-10px) scale(1.2);
            opacity: 1;
          }
        }
        .animate-float-book {
          animation: floatBook 3.5s ease-in-out infinite;
        }
        .animate-shadow-pulse {
          animation: shadowPulse 3.5s ease-in-out infinite;
        }
        .animate-sparkle-1 {
          animation: floatSparkle 2.8s ease-in-out infinite 0.2s;
        }
        .animate-sparkle-2 {
          animation: floatSparkle 3.2s ease-in-out infinite 0.8s;
        }
      `}</style>

      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-purple-400/20 via-indigo-400/15 to-purple-600/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        {/* ── 1. Floating Visual Hook (Animated Book & Cap SVG) ──────────── */}
        <div className="relative mb-6 flex flex-col items-center">
          {/* Sparkles floating around the book */}
          <div className="animate-sparkle-1 absolute -left-8 top-2 text-purple-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="animate-sparkle-2 absolute -right-6 top-8 text-indigo-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="animate-sparkle-1 absolute right-12 -top-4 text-purple-400">
            <Sparkles className="h-4 w-4" />
          </div>

          {/* Floating Illustration */}
          <div className="animate-float-book relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white shadow-xl shadow-purple-500/25 sm:h-44 sm:w-44">
            {/* Inner Glowing Ring */}
            <div className="absolute inset-1.5 rounded-[22px] border border-white/20 bg-white/5 backdrop-blur-xs" />

            {/* Glowing Open Book & Cap Icon */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <GraduationCap className="h-12 w-12 text-purple-200 sm:h-16 sm:w-16" />
              <div className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-purple-100">
                <BookOpen className="h-4 w-4" />
                <span>Learnify</span>
              </div>
            </div>
          </div>

          {/* Pulsing Floor Shadow underneath the hovering book */}
          <div className="animate-shadow-pulse mt-6 h-3.5 w-28 rounded-[100%] bg-purple-950/40 blur-xs sm:w-36" />
        </div>

        {/* ── 2. Pill Badge & Clever Copywriting ──────────────────────── */}
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-purple-100/60 px-4 py-1.5 text-xs font-bold text-purple-700 backdrop-blur-xs">
          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
          <span>404 • Knowledge Not Found</span>
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          You've Wandered Off{' '}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
            the Syllabus!
          </span>
        </h1>

        <p className="mt-4 max-w-lg text-sm text-gray-600 leading-relaxed sm:text-base md:text-lg">
          It looks like this page was left out of the curriculum. But don't worry,
          every great scholar gets a little lost sometimes. Let's get you back to your studies!
        </p>

        {/* ── 3. Interactive Call to Action (CTA Buttons) ───────────────── */}
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          {/* Button 1: Return to Dashboard */}
          <Link
            href="/dashboard"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 text-sm font-semibold text-white shadow-md shadow-purple-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-600/30 active:scale-95 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Return to Dashboard</span>
          </Link>

          {/* Button 2: View Quiz Library */}
          <Link
            href="/dashboard/quizzes"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-800 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-700 hover:shadow-md active:scale-95 sm:w-auto"
          >
            <BrainCircuit className="h-4 w-4 text-purple-600" />
            <span>Browse Quizzes</span>
          </Link>

          {/* Button 3: Course Catalog */}
          <Link
            href="/my-courses"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-800 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-700 hover:shadow-md active:scale-95 sm:w-auto"
          >
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Course Catalog</span>
          </Link>
        </div>

        {/* ── 4. Helpful Quick Links Footer ────────────────────────────── */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
          <span className="font-medium text-gray-400">Need help?</span>
          <Link href="/admin/dashboard" className="transition hover:text-purple-600 hover:underline">
            Admin Console
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/dashboard/credits" className="transition hover:text-purple-600 hover:underline">
            Credit Ledger
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/settings" className="transition hover:text-purple-600 hover:underline">
            Account Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
