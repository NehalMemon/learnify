import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Quiz } from '@/types';
import type { ViewMode } from '@/hooks/useViewMode';

interface QuizCardProps {
  quiz: Quiz;
  viewMode?: ViewMode;
}

export default function QuizCard({ quiz, viewMode = 'grid' }: QuizCardProps) {
  const formatCategory = (text: string, maxLength = 12) => {
    if (!text) return "Category";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // ── List layout ──────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      /* The Link MUST be block for full-row click */
      <Link href={`/quiz/${quiz?.id || '#'}`} className="block">
        <div className="flex flex-row items-center bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden hover:border-purple-200 transition-colors duration-200 group">
          {/* Compact thumbnail */}
          <div className="h-24 w-36 shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center sm:w-44">
            <div className="w-10 h-10 text-purple-200 bg-white/50 rounded-full flex items-center justify-center text-lg shadow-sm">
              🔬
            </div>
          </div>

          {/* Content — stretches horizontally */}
          <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                {quiz?.subject || 'Subject'}
              </span>
              <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-1">
                {quiz?.title || 'Untitled Quiz'}
              </h3>

              {/* Meta tags */}
              <div className="flex flex-row items-center gap-2 mt-1.5 overflow-hidden whitespace-nowrap">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  {formatCategory(quiz?.category)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  <Clock className="h-3 w-3" />
                  {quiz?.duration || "5 min"}
                </span>
              </div>
            </div>

            {/* CTA button — pinned right */}
            <div className="shrink-0">
              <button className="py-2.5 px-5 rounded-lg text-sm font-semibold text-purple-700 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                Start Exam
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Grid layout (default) ────────────────────────────────────
  return (
    /* The Link MUST be block and h-full for CSS Grid to stretch it */
    <Link href={`/quiz/${quiz?.id || '#'}`} className="block h-full">
      <div className="h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden hover:border-purple-200 transition-colors duration-200 group">
        
        {/* 1. Cover Image Header */}
        <div className="h-40 w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center relative">
           <div className="w-12 h-12 text-purple-200 bg-white/50 rounded-full flex items-center justify-center text-xl shadow-sm">
             🔬
           </div>
        </div>

        {/* 2. Content Area (flex-grow expands this to fill empty space) */}
        <div className="flex flex-col flex-grow p-5">
          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            {quiz?.subject || 'Subject'}
          </span>
          
          {/* line-clamp-2 prevents extremely long titles from breaking the height */}
          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 line-clamp-2">
            {quiz?.title || 'Untitled Quiz'}
          </h3>

          {/* 3. Strict Single-Line Tag Container */}
          <div className="flex flex-row items-center gap-2 mt-3 w-full overflow-hidden whitespace-nowrap">
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              {formatCategory(quiz?.category)}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              ⏱ {quiz?.duration || "5 min"}
            </span>
          </div>

          {/* 4. Anchored Button (mt-auto forces this to the absolute bottom) */}
          <div className="mt-auto pt-4 border-t border-gray-100 w-full">
            <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-purple-700 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              Start Exam
            </button>
          </div>
        </div>

      </div>
    </Link>
  );
}
