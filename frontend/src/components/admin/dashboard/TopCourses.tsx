'use client';

import { BookOpen, Star, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminCourse {
  id: string;
  title: string;
  courseType: 'RECORDED' | 'LIVE' | 'HYBRID';
  isPublished: boolean;
  division?: { name: string; slug: string } | null;
  _count?: { enrollments?: number; modules?: number };
}

interface TopCoursesProps {
  courses: AdminCourse[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COURSE_TYPE_STYLES: Record<AdminCourse['courseType'], string> = {
  RECORDED: 'bg-blue-50 text-blue-600 border-blue-200',
  LIVE:     'bg-rose-50 text-rose-600 border-rose-200',
  HYBRID:   'bg-amber-50 text-amber-600 border-amber-200',
};

/** Mock star rating 4.2–4.9 seeded from course ID so it's stable across renders */
const mockRating = (id: string): string => {
  const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return (4.2 + ((seed % 8) / 10)).toFixed(1);
};

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * TopCourses — sidebar panel showing the first 4 courses from the admin catalog.
 * Student count and rating are pulled from API data where available and mocked otherwise.
 */
export function TopCourses({ courses }: TopCoursesProps) {
  const top = courses.slice(0, 4);

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-base font-bold text-gray-900">Course Catalog</h2>
          <p className="text-xs text-gray-500 mt-0.5">Top active courses</p>
        </div>
        <Link
          href="/admin/courses"
          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-500 transition-colors font-medium"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Course list */}
      <ul className="divide-y divide-gray-100">
        {top.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-gray-400">
            No courses found
          </li>
        )}
        {top.map((course, idx) => {
          const enrollments = course._count?.enrollments ?? 0;
          const rating = mockRating(course.id);

          return (
            <li
              key={course.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 group"
            >
              {/* Top row */}
              <div className="flex items-start gap-3">
                {/* Rank pill */}
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {String(idx + 1).padStart(2, '0')}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {course.title}
                  </p>

                  {/* Division + type badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {course.division && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {course.division.name}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        COURSE_TYPE_STYLES[course.courseType]
                      }`}
                    >
                      {course.courseType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 ml-10">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{enrollments.toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="font-semibold">{rating}</span>
                </div>
                {course.isPublished ? (
                  <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    Published
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
                    Draft
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer CTA */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/admin/courses"
          className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-600 transition-colors py-1"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Manage all courses
        </Link>
      </div>
    </div>
  );
}
