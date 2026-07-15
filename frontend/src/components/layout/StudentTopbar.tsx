'use client';

import { ArrowUpRight, Sparkles } from 'lucide-react';

interface StudentTopbarProps {
  breadcrumbLabel: string;
  mode: 'learnify' | 'doctorsquizz';
  onModeChange: (mode: 'learnify' | 'doctorsquizz') => void;
}

export function StudentTopbar({ breadcrumbLabel, mode, onModeChange }: StudentTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-[#242a39]/70 px-6 py-4 backdrop-blur-2xl shadow-[0_40px_80px_-60px_rgba(176,200,234,0.55)] md:px-10">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-gradient-to-br from-[#b0c8ea]/40 via-[#7b93b2]/30 to-[#0d1321]/40 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#f0ebd8]/70">
          {breadcrumbLabel || 'Dashboard'}
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full bg-[#0d1321]/70 px-3 py-2 text-[0.75rem] text-[#f0ebd8]/60">
          <span className="size-1.5 rounded-full bg-[#b0c8ea]/80" />
          <span>Submerged workspace active</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex items-center rounded-full bg-[#0d1321]/70 p-1 text-sm shadow-[0_20px_60px_-50px_rgba(176,200,234,0.55)]">
          <button
            type="button"
            onClick={() => onModeChange('learnify')}
            className={`rounded-full px-4 py-2 font-medium transition-all ${
              mode === 'learnify'
                ? 'bg-gradient-to-br from-[#b0c8ea] to-[#7b93b2] text-[#001d36] shadow-[0_20px_50px_-35px_rgba(176,200,234,0.65)]'
                : 'text-[#f0ebd8]/75 hover:text-[#f0ebd8]'
            }`}
          >
            Learnify
          </button>
          <button
            type="button"
            onClick={() => onModeChange('doctorsquizz')}
            className={`rounded-full px-4 py-2 font-medium transition-all ${
              mode === 'doctorsquizz'
                ? 'bg-gradient-to-br from-[#b0c8ea] to-[#7b93b2] text-[#001d36] shadow-[0_20px_50px_-35px_rgba(176,200,234,0.65)]'
                : 'text-[#f0ebd8]/75 hover:text-[#f0ebd8]'
            }`}
          >
            DoctorsQuizz
          </button>
        </div>

        <button
          type="button"
          className="hidden md:inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#b0c8ea] to-[#7b93b2] px-4 py-2 text-sm font-semibold text-[#001d36] shadow-[0_24px_70px_-45px_rgba(176,200,234,0.75)] transition-transform hover:-translate-y-0.5"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          Resume Focus
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}