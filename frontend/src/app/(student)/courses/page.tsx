'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { StudentCourseCard } from '@/components/student/CourseCard';
import type { StudentCourse } from '@/components/student/CourseCard';
import { coursesApi, divisionsApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/hooks';

// ── Types ──────────────────────────────────────────────────────────────────
// Re-export StudentCourse from the card so the page stays in sync with the
// contract the API actually returns.
type Course = StudentCourse;

interface Division {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// ── Inline skeleton (shown during filter / search changes) ─────────────────
// The App Router loading.tsx handles first-navigation skeletons.
// This one handles subsequent filter changes without unmounting the page.

function InlineSkeletonCard() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
      <div className="h-40 w-full bg-gray-200" />
      <div className="flex flex-grow flex-col p-5 gap-3">
        <div className="h-3 w-20 rounded bg-purple-100" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
        <div className="space-y-2 mt-1">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
        </div>
        <div className="flex gap-2 mt-3">
          <div className="h-5 w-16 rounded-md bg-gray-100" />
          <div className="h-5 w-20 rounded-md bg-gray-100" />
        </div>
      </div>
      <div className="mt-auto border-t border-gray-100 px-5 pb-5 pt-4">
        <div className="h-9 w-full rounded-lg bg-purple-50" />
      </div>
    </div>
  );
}

function InlineSkeletonRow() {
  return (
    <div aria-hidden="true" className="flex flex-row items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
      <div className="h-28 w-36 shrink-0 bg-gray-200 sm:w-44" />
      <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-purple-100" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-100" />
        </div>
        <div className="shrink-0 h-9 w-24 rounded-lg bg-purple-50" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useViewMode('learnify:student-courses:viewMode');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [coursesRes, divisionsRes] = await Promise.all([
          coursesApi.listCourses({
            division: selectedDivision || undefined,
            category: selectedCategory || undefined,
            search: searchQuery || undefined,
            page,
            limit: 9,
          }),
          divisionsApi.listDivisions(),
        ]);

        setCourses(coursesRes.data.data?.courses || []);
        // Support both pagination envelope shapes
        setTotalPages(
          coursesRes.data.data?.pagination?.pages ||
          coursesRes.data.data?.totalPages ||
          1
        );
        setDivisions(divisionsRes.data.data || []);
      } catch {
        // why: structured error logging is handled at the API interceptor layer
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, selectedDivision, selectedCategory, page]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDivision('');
    setSelectedCategory('');
    setPage(1);
  };

  const hasActiveFilters = searchQuery || selectedDivision || selectedCategory;

  // Static categories kept client-side to avoid an extra network call.
  // When the backend exposes a /categories endpoint, swap this out.
  const categories = [
    'Biology',
    'Chemistry',
    'Physics',
    'English',
    'Mathematics',
    'Programming',
    'Web Development',
    'Data Science',
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 min-h-screen">

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title mb-1">Course Catalog</h1>
          <p className="text-gray-500 text-sm md:text-base">
            Browse our complete collection of published courses.
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <Input
            id="course-search"
            placeholder="Search courses by title, description…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          id="division-filter"
          value={selectedDivision}
          onChange={(e) => { setSelectedDivision(e.target.value); setPage(1); }}
          aria-label="Filter by division"
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
        >
          <option value="">All Divisions</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.slug}>{d.name}</option>
          ))}
        </select>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          aria-label="Filter by category"
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* ── Inline loading skeletons (filter / search changes) ─── */}
      {isLoading && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch'
            : 'grid grid-cols-1 gap-4'
        }>
          {Array.from({ length: 9 }).map((_, i) =>
            viewMode === 'grid'
              ? <InlineSkeletonCard key={i} />
              : <InlineSkeletonRow key={i} />
          )}
        </div>
      )}

      {/* ── Course Grid / List ──────────────────────────────────── */}
      {!isLoading && courses.length > 0 && (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch'
              : 'grid grid-cols-1 gap-4'
          }>
            {courses.map((course) => (
              <StudentCourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Empty State ─────────────────────────────────────────── */}
      {!isLoading && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-200 rounded-2xl shadow-sm">
          {/* Book illustration */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 border border-gray-200 mb-5">
            <BookOpen
              className="h-10 w-10 text-gray-300"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          {hasActiveFilters ? (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                No courses match your filters
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Try adjusting your search term or removing a filter to see more results.
              </p>
              <button
                onClick={clearFilters}
                className="mt-5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                No courses available yet
              </h3>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                No courses have been published for your division right now.
                Check back soon — new content is added regularly!
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
