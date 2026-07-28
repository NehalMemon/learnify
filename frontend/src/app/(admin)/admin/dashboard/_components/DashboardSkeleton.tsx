/**
 * Boneyard — Admin Dashboard structural skeletons.
 *
 * Extracted from page.tsx so both the inline loading state AND
 * the App Router loading.tsx can share the same Boneyard skeleton,
 * guaranteeing zero visual discrepancy between the two loading paths.
 */

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-200 animate-pulse ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-36" />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-52" />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <SkeletonCard className="h-[26rem]" />
        </div>
      </div>
    </div>
  );
}
