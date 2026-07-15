'use client';

/**
 * Student CourseCard
 *
 * A self-contained, fully-interactive course card designed for the student
 * catalog. The *entire card* is a Next.js <Link> so the tap target fills the
 * whole surface — critical for mobile usability.
 *
 * Visual contract:
 *   bg-white rounded-xl border border-gray-200 shadow-sm
 *   hover:shadow-md hover:-translate-y-1 transition-all duration-200
 *
 * Differences from components/course/CourseCard (kept for admin/shared use):
 *  - No favorites toggle (student catalog is read-only)
 *  - Whole card is the Link, not just the CTA button
 *  - Instructor initials avatar generated from name
 *  - courseType badge (FULL_COURSE → "Full Course")
 *  - Module count rendered from _count.modules when present
 */

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Users } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface StudentCourse {
  id: string;
  title: string;
  description: string;
  instructor: string;
  courseType?: string;
  category?: string;
  thumbnailUrl?: string;
  price?: number;
  division?: { name: string; slug: string };
  _count?: { modules?: number; enrollments?: number };
}

interface StudentCourseCardProps {
  course: StudentCourse;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts a courseType enum value to a display-friendly label.
 * e.g. "FULL_COURSE" → "Full Course"
 */
function formatCourseType(raw?: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns up to 2 initials from an instructor name for the avatar fallback.
 * e.g. "Dr. Ahsan Khan" → "AK"
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * StudentCourseCard
 *
 * Renders a polished course card for the student catalog. The full card
 * surface is wrapped in a <Link> so the entire area is keyboard-navigable
 * and has a single accessible click target.
 *
 * @param course - The published course data returned by the catalog API.
 */
export function StudentCourseCard({ course }: StudentCourseCardProps) {
  const moduleCount = course._count?.modules ?? 0;
  const enrollmentCount = course._count?.enrollments ?? 0;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded-xl"
      aria-label={`View course: ${course.title}`}
    >
      <article
        className={[
          'flex h-full flex-col overflow-hidden',
          'rounded-xl border border-gray-200 bg-white shadow-sm',
          'transition-all duration-200',
          'group-hover:border-purple-200 group-hover:shadow-md group-hover:-translate-y-1',
        ].join(' ')}
      >
        {/* ── Thumbnail / Cover ─────────────────────────────── */}
        {course.thumbnailUrl ? (
          <div className="relative h-44 w-full shrink-0 bg-gray-100">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="relative flex h-44 w-full shrink-0 items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-100">
            <BookOpen
              className="h-14 w-14 text-purple-200"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            {/* Division badge overlay */}
            {course.division && (
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-700 shadow-sm">
                {course.division.name}
              </span>
            )}
          </div>
        )}

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="flex flex-grow flex-col p-5">

          {/* Division + course type tags */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {course.division && !course.thumbnailUrl && null /* shown as overlay above */}
            {course.division && course.thumbnailUrl && (
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-700">
                {course.division.name}
              </span>
            )}
            {course.courseType && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-600">
                {formatCourseType(course.courseType)}
              </span>
            )}
            {course.category && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-600">
                {course.category}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-gray-900 group-hover:text-purple-700 transition-colors duration-200">
            {course.title}
          </h3>

          {/* Description */}
          <p className="mb-4 line-clamp-2 flex-grow text-sm leading-relaxed text-gray-500">
            {course.description}
          </p>

          {/* Stats row */}
          {(moduleCount > 0 || enrollmentCount > 0) && (
            <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
              {moduleCount > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                </span>
              )}
              {enrollmentCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {enrollmentCount.toLocaleString()} enrolled
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="mt-auto border-t border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Instructor avatar + name */}
            <div className="flex min-w-0 items-center gap-2">
              <div
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700"
              >
                {getInitials(course.instructor)}
              </div>
              <span className="truncate text-xs font-medium text-gray-600">
                {course.instructor}
              </span>
            </div>

            {/* Price or CTA */}
            {course.price !== undefined && course.price > 0 ? (
              <span className="shrink-0 text-sm font-bold text-gray-900">
                PKR {course.price.toLocaleString()}
              </span>
            ) : (
              <span className="shrink-0 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors duration-200 group-hover:bg-purple-600 group-hover:text-white">
                View Course →
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
