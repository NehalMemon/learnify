/**
 * Boneyard — Student Dashboard route-level skeleton.
 *
 * Next.js App Router renders this component instantly when navigating
 * to /dashboard, eliminating navigation lag while user enrollments,
 * quiz attempts, and course recommendations load.
 */

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-100" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-blue-50" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div className="h-6 w-12 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 animate-pulse">
        {/* Left 8 Cols — Continue Learning */}
        <div className="lg:col-span-8 space-y-4">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-lg bg-blue-50" />
                  <div className="h-4 w-12 rounded bg-gray-200" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Right 4 Cols — Recommendations */}
        <div className="lg:col-span-4 space-y-4">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-9 w-9 rounded-lg bg-purple-50" />
                  <div className="h-5 w-14 rounded-full bg-purple-100" />
                </div>
                <div className="h-4 w-5/6 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
