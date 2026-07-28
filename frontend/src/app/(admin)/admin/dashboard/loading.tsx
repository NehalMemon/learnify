/**
 * Boneyard — Admin Dashboard route-level skeleton.
 *
 * Next.js App Router renders this component instantly when navigating
 * to /admin/dashboard, eliminating the frozen-navigation lag while
 * Supabase data fetches resolve on the server.
 */

import { DashboardSkeleton } from './_components/DashboardSkeleton';

export default function AdminDashboardLoading() {
  return <DashboardSkeleton />;
}
