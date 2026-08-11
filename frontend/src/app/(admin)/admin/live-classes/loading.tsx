/**
 * Loading skeleton for /admin/live-classes.
 *
 * Rendered by the App Router during first navigation so the admin sees a
 * placeholder instead of a blank content area while the four parallel
 * Supabase queries resolve.
 */
export default function AdminLiveClassesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-xl bg-gray-200" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
              <div className="h-5 w-5 animate-pulse rounded-lg bg-gray-100" />
            </div>
            <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="space-y-2 pt-1">
              <div className="h-3.5 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-3.5 w-5/6 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="mt-auto h-9 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
