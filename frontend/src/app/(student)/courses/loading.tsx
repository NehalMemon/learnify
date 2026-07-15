/**
 * Boneyard — Course Catalog skeleton loader.
 *
 * Next.js App Router automatically renders this component during navigation
 * and initial page load (via React Suspense). The instant the student clicks
 * "Course Catalog", the URL changes and these skeletons appear — eliminating
 * the frozen-navigation feeling while the server fetches course data.
 *
 * Skeleton count (9) intentionally matches the default page limit so the
 * layout shift when real cards arrive is imperceptible.
 */

// ── Skeleton card (mirrors CourseCard grid layout) ──────────────────────────

function SkeletonCourseCard() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse"
    >
      {/* Thumbnail placeholder */}
      <div className="h-40 w-full bg-gray-200" />

      {/* Content */}
      <div className="flex flex-grow flex-col p-5 gap-3">
        {/* Division badge */}
        <div className="h-3 w-20 rounded bg-purple-100" />
        {/* Title — two lines */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
        {/* Description — two lines */}
        <div className="space-y-2 mt-1">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
        </div>
        {/* Tags */}
        <div className="flex gap-2 mt-3">
          <div className="h-5 w-16 rounded-md bg-gray-100" />
          <div className="h-5 w-20 rounded-md bg-gray-100" />
        </div>
      </div>

      {/* CTA button */}
      <div className="mt-auto border-t border-gray-100 px-5 pb-5 pt-4">
        <div className="h-9 w-full rounded-lg bg-purple-50" />
      </div>
    </div>
  );
}

// ── Filter bar skeleton ──────────────────────────────────────────────────────

function SkeletonFilterBar() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
      <div className="md:col-span-2 h-10 rounded-lg bg-gray-200" />
      <div className="h-10 rounded-lg bg-gray-200" />
      <div className="h-10 rounded-lg bg-gray-200" />
    </div>
  );
}

// ── Page export ──────────────────────────────────────────────────────────────

export default function CoursesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-gray-200" />
      </div>

      {/* Filter bar */}
      <SkeletonFilterBar />

      {/* Course grid — 9 cards (3×3 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCourseCard key={i} />
        ))}
      </div>
    </div>
  );
}
