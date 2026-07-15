'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { AxiosError } from 'axios';
import { authApi, getUser } from '@/lib/api';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminTopNav } from '@/components/layout/AdminTopNav';
import { AdminUser } from '@/components/admin/dashboard/RecentRegistrations';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Keep first server/client render identical to avoid hydration mismatches.
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      const cachedUser = getUser();
      const isKnownAdmin = cachedUser?.role === 'ADMIN';

      if (isKnownAdmin) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        /**
         * The /auth/me endpoint returns: { success, data: { user: {...} } }
         * Destructure defensively to handle any response shape variation.
         */
        const userData: AdminUser =
          res.data?.data?.user ?? res.data?.data ?? res.data;

        if (userData?.role !== 'ADMIN') {
          // Server confirmed this is not an admin — hard redirect is correct here.
          router.replace('/dashboard');
          return;
        }

      } catch (err) {
        const status = (err as AxiosError)?.response?.status;

        if (status === 401 || status === 403) {
          /**
           * Explicit auth rejection: the token is invalid or expired.
           * The Axios interceptor in api.ts will attempt a refresh first,
           * so if we land here, the session is truly dead — send to login.
           */
          router.replace('/login');
          return;
        }

        /**
         * Any other failure (network timeout, 500, CORS, etc.) must NOT
         * trigger a redirect. The original bug was an unconditional
         * router.replace('/dashboard') in this catch block, which fired on
         * transient failures and force-ejected valid admins mid-session.
         */
        setNetworkError(true);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdmin();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Security Policies...</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-lg font-medium">
            Could not reach the server. Your session may still be active.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm text-white hover:bg-purple-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar - Fixed on the left */}
      <AdminSidebar className="hidden lg:flex" />

      {/* Mobile Sidebar Drawer */}
      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin sidebar overlay"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[85vw] max-w-xs border-r border-gray-200 bg-white shadow-sm">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                aria-label="Close admin menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AdminSidebar className="!static !h-[calc(100%-56px)] !w-full !border-r-0" onMobileClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Main Content Area - Offset by sidebar width */}
      <div className="lg:ml-64">
        {/* Top Navigation */}
        <AdminTopNav onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />

        {/* Page Content */}
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
