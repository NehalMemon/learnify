'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock3,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Tag,
  FolderOpen,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { getPublishedQuizzes, type PublishedQuiz } from '@/app/actions/studentActions';

function formatDuration(durationSec: number): string {
  if (!durationSec || durationSec <= 0) return 'Untimed';
  const mins = Math.floor(durationSec / 60);
  if (mins < 60) {
    return `${mins} mins`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export default function StudentQuizDashboardPage() {
  const [quizzes, setQuizzes] = useState<PublishedQuiz[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  useEffect(() => {
    async function fetchQuizzes() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPublishedQuizzes();
        setQuizzes(data);
      } catch (err) {
        console.error('Error loading published quizzes:', err);
        setError('Failed to load published quizzes.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  // Unique Categories & Subjects list for filter options
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.category_name) set.add(q.category_name);
    });
    return Array.from(set).sort();
  }, [quizzes]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (selectedCategory !== 'ALL' && q.category_name !== selectedCategory) return;
      if (q.subject_name) set.add(q.subject_name);
    });
    return Array.from(set).sort();
  }, [quizzes, selectedCategory]);

  // Filtered Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      // Category filter
      if (selectedCategory !== 'ALL' && q.category_name !== selectedCategory) {
        return false;
      }
      // Subject filter
      if (selectedSubject !== 'ALL' && q.subject_name !== selectedSubject) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = q.title.toLowerCase().includes(query);
        const matchDesc = q.description?.toLowerCase().includes(query);
        const matchCat = q.category_name?.toLowerCase().includes(query);
        const matchSubj = q.subject_name?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchCat && !matchSubj) return false;
      }
      return true;
    });
  }, [quizzes, selectedCategory, selectedSubject, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedSubject('ALL');
  };

  return (
    <div className="space-y-8 py-2">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e4e6ef] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3525cd] text-white shadow-md shadow-[#3525cd]/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">Available Quizzes</h1>
              <p className="text-sm text-[#696778]">
                Browse and test your knowledge with high-yield medical assessments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#e4e6ef] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#4b4a58] shadow-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#3525cd]" />
            <span>{quizzes.length} Total Quizzes</span>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="rounded-2xl border border-[#e4e6ef] bg-white p-4 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d8b99]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quizzes by title or keyword..."
            className="w-full rounded-xl border border-[#dadce5] bg-[#fbfbfd] pl-10 pr-4 py-2 text-xs text-[#191c1e] outline-none transition placeholder:text-[#8d8b99] focus:border-[#3525cd] focus:bg-white focus:ring-2 focus:ring-[#3525cd]/10"
          />
        </div>

        {/* Dropdown Filters & Reset */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#696778]" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubject('ALL'); // Reset subject filter when category changes
              }}
              className="rounded-xl border border-[#dadce5] bg-white px-3 py-2 text-xs font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/10"
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-xl border border-[#dadce5] bg-white px-3 py-2 text-xs font-semibold text-[#191c1e] outline-none transition focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/10"
            >
              <option value="ALL">All Subjects</option>
              {subjectOptions.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {(searchQuery || selectedCategory !== 'ALL' || selectedSubject !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-[#dadce5] bg-white px-3 py-2 text-xs font-semibold text-[#696778] transition hover:bg-[#f7f7fb]"
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content / Quiz Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-52 rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-sm animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-6 w-3/4 rounded bg-gray-200" />
              </div>
              <div className="h-10 w-full rounded-xl bg-gray-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dadce5] bg-white p-12 text-center shadow-sm">
          <FolderOpen className="mx-auto h-12 w-12 text-[#8d8b99]" />
          <h3 className="mt-4 text-base font-bold text-[#191c1e]">No published quizzes found</h3>
          <p className="mt-1 text-xs text-[#696778] max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'ALL' || selectedSubject !== 'ALL'
              ? 'No quizzes match your selected filter criteria. Try clearing search or category filters.'
              : 'There are currently no published quizzes available. Check back soon!'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL' || selectedSubject !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#3525cd] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2f20b8]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Quiz Card Component
 */
function QuizCard({ quiz }: { quiz: PublishedQuiz }) {
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-[#e4e6ef] bg-white p-6 shadow-sm transition hover:border-[#3525cd]/40 hover:shadow-md">
      <div>
        {/* Category & Subject Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f0ff] px-2.5 py-1 text-[11px] font-bold text-[#3525cd]">
            <FolderOpen className="h-3 w-3" />
            {quiz.category_name || 'General Category'}
          </span>
          {quiz.subject_name && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-[#4b4a58]">
              <Tag className="h-3 w-3 text-[#696778]" />
              {quiz.subject_name}
              {quiz.subject_code ? ` (${quiz.subject_code})` : ''}
            </span>
          )}
        </div>

        {/* Quiz Title */}
        <h3 className="text-base font-bold tracking-tight text-[#191c1e] group-hover:text-[#3525cd] transition line-clamp-2">
          {quiz.title}
        </h3>

        {/* Description (if provided) */}
        {quiz.description ? (
          <p className="mt-2 text-xs text-[#696778] line-clamp-2 leading-relaxed">
            {quiz.description}
          </p>
        ) : null}
      </div>

      <div className="mt-6 pt-4 border-t border-[#eceef5] flex items-center justify-between">
        {/* Duration */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#696778]">
          <Clock3 className="h-4 w-4 text-[#3525cd]" />
          <span>{formatDuration(quiz.duration_sec)}</span>
        </div>

        {/* Start Quiz Button */}
        <Link
          href={`/student/quiz/${quiz.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#3525cd] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#3525cd]/20 transition hover:bg-[#2f20b8]"
        >
          <span>Start Quiz</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
