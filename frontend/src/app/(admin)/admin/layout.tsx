'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck, X } from 'lucide-react';
import { AxiosError } from 'axios';
import { authApi, getUser } from '@/lib/api';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminTopNav } from '@/components/layout/AdminTopNav';
import { AdminUser } from '@/components/admin/dashboard/RecentRegistrations';

const ADMIN_VERIFY_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Admin verification timed out'));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Keep first server/client render identical to avoid hydration mismatches.
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      const cachedUser = getUser();
      const isKnownAdmin = cachedUser?.role === 'ADMIN';

      if (isKnownAdmin) {
        setIsLoading(false);
        return;
      }

      // 1. Check Supabase Auth first (prevents unnecessary legacy API network errors)
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase.auth.getUser();
        const sbUser = data?.user;
        const role = sbUser?.app_metadata?.role || sbUser?.user_metadata?.role;

        if (sbUser && (role === 'ADMIN' || sbUser.role === 'authenticated')) {
          if (!isMounted) return;
          setNetworkError(false);
          setIsLoading(false);
          return;
        }
      } catch (sbError) {
        console.error('ADMIN PAGE FETCH ERROR (Supabase check):', sbError);
      }

      // 2. Fall back to legacy backend API if Supabase user is not found
      try {
        const res = await withTimeout(authApi.getMe(), ADMIN_VERIFY_TIMEOUT_MS);
        const userData: AdminUser = res.data?.user ?? res.data?.data?.user ?? res.data ?? res;

        if (!isMounted) return;

        if (userData?.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }

        setNetworkError(false);
      } catch (error) {
        console.error('ADMIN PAGE FETCH ERROR:', error);

        if (!isMounted) return;

        const status = (error as AxiosError)?.response?.status;

        if (status === 401 || status === 403 || status === 400) {
          router.replace('/login');
          return;
        }

        setNetworkError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7fb] px-6 font-sans text-[#191c1e] antialiased">
        <div className="w-full max-w-sm rounded-2xl border border-[#e4e6ef] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#3525cd]/10 text-[#3525cd]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-2 border-[#3525cd]/20 border-t-[#3525cd]" />
          <p className="mt-5 text-sm font-semibold text-[#191c1e]">Loading security policies...</p>
          <p className="mt-1 text-xs leading-5 text-[#696778]">Verifying your admin session.</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7fb] px-6 font-sans text-[#191c1e] antialiased">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="mt-5 text-lg font-bold tracking-tight text-[#191c1e]">Admin verification paused</p>
          <p className="mt-2 text-sm leading-6 text-[#696778]">
            We could not confirm your admin session from the API. Your session may still be valid, but the request timed out or the backend is unreachable.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="min-h-10 rounded-xl bg-[#3525cd] px-4 text-sm font-semibold text-white transition hover:bg-[#2f20b8]"
            >
              Retry
            </button>
            <button
              onClick={() => router.replace('/login')}
              className="min-h-10 rounded-xl border border-[#dadce5] bg-white px-4 text-sm font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb]"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex"
      />

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
            <AdminSidebar
              className="!static !h-[calc(100%-56px)] !w-full !border-r-0"
              onMobileClose={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-[88px]' : 'lg:ml-64'}`}>
        <AdminTopNav onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
