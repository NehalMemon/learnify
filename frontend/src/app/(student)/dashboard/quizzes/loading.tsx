/**
 * Boneyard — Student Quiz Catalog route-level skeleton.
 *
 * Next.js App Router renders this component instantly when navigating
 * to /dashboard/quizzes, eliminating navigation lag.
 */

export default function StudentQuizzesLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-72 rounded bg-gray-100" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-gray-200" />
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between animate-pulse">
        <div className="h-10 w-full md:w-80 rounded-xl bg-gray-200" />
        <div className="flex gap-3 w-full md:w-auto">
          <div className="h-10 w-32 rounded-lg bg-gray-100" />
          <div className="h-10 w-32 rounded-lg bg-gray-100" />
        </div>
      </div>

      {/* Quiz Cards Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 flex flex-col justify-between h-56">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 rounded bg-purple-100" />
                <div className="h-4 w-12 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-4/5 rounded bg-gray-200" />
              <div className="h-4 w-3/5 rounded bg-gray-100" />
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <div className="h-4 w-24 rounded bg-gray-100" />
              <div className="h-9 w-24 rounded-lg bg-blue-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
