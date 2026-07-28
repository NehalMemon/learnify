/**
 * Boneyard — Admin Quizzes route-level skeleton.
 *
 * Next.js App Router renders this component instantly when navigating
 * to /admin/quizzes, eliminating navigation lag while quiz data loads.
 */

export default function AdminQuizzesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-lg bg-gray-200" />
          <div className="h-9 w-32 rounded-lg bg-purple-100" />
        </div>
      </div>

      {/* Filter & Search Bar Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center animate-pulse">
        <div className="h-10 w-full md:w-80 rounded-xl bg-gray-200" />
        <div className="flex gap-2 w-full md:w-auto">
          <div className="h-10 w-24 rounded-lg bg-gray-100" />
          <div className="h-10 w-24 rounded-lg bg-gray-100" />
        </div>
      </div>

      {/* Table / List Skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm animate-pulse">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gray-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/4 rounded bg-gray-100" />
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-6 w-16 rounded-full bg-purple-50" />
                <div className="h-8 w-8 rounded-lg bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
