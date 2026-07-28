/**
 * Boneyard — Admin Courses structural skeletons.
 *
 * Extracted from page.tsx so both the inline loading state AND
 * the App Router loading.tsx share the same skeleton layout.
 */

export function SkeletonRow() {
  return (
    <div className="flex flex-row items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex min-w-0 flex-1 items-center gap-4 px-6 py-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="flex gap-3">
            <div className="h-3 bg-gray-200 rounded-full w-16" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="h-7 w-20 bg-gray-200 rounded-lg" />
          <div className="h-7 w-14 bg-gray-200 rounded-lg" />
          <div className="h-7 w-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded-full w-16" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-7 w-20 bg-gray-200 rounded-lg" />
        <div className="h-7 w-16 bg-gray-200 rounded-lg" />
        <div className="h-7 w-14 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

export function CoursesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>

      {/* Grid skeleton — default to card view (6 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
