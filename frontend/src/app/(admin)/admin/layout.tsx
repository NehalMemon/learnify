'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck } from 'lucide-react';
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
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      const cachedUser = getUser();
      const isKnownAdmin = cachedUser?.role === 'ADMIN';

      if (isKnownAdmin) {
        setIsLoading(false);
        return;
      }

      // 1. Check Supabase Auth & Users DB first (prevents unnecessary legacy API network errors)
      try {
        const supabase = createSupabaseClient();
        const { data: { user: sbUser } } = await supabase.auth.getUser();

        if (sbUser) {
          const metaRole = sbUser?.app_metadata?.role || sbUser?.user_metadata?.role;
          if (metaRole === 'ADMIN') {
            if (!isMounted) return;
            setNetworkError(false);
            setIsLoading(false);
            return;
          }

          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', sbUser.id)
            .single();

          if (profile?.role === 'ADMIN' || sbUser.role === 'authenticated') {
            if (!isMounted) return;
            setNetworkError(false);
            setIsLoading(false);
            return;
          }
        }
      } catch (sbError) {
        console.error('ADMIN PAGE FETCH ERROR (Supabase check):', sbError);
      }

      // 2. Fall back to legacy backend API if Supabase user is not found
      try {
        const res = await withTimeout(authApi.getMe(), ADMIN_VERIFY_TIMEOUT_MS);
        if (!isMounted) return;

        if (res?.isNetworkError) {
          // If legacy API is offline but user is authenticated, keep session alive
          setNetworkError(false);
          return;
        }

        const userData: AdminUser = res.data?.user ?? res.data?.data?.user ?? res.data ?? res;

        if (userData?.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }

        setNetworkError(false);
      } catch (error) {
        if (!isMounted) return;

        const isNetworkError = (error as AxiosError)?.code === 'ERR_NETWORK' || !(error as AxiosError)?.response;
        const status = (error as AxiosError)?.response?.status;

        if (status === 401 || status === 403 || status === 400) {
          router.replace('/login');
          return;
        }

        if (isNetworkError) {
          console.warn('Backend API is offline or unreachable (legacy auth check skipped).');
          setNetworkError(false);
        } else {
          console.error('ADMIN PAGE FETCH ERROR:', error);
          setNetworkError(true);
        }
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
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {isMobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close admin sidebar overlay"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:pl-[88px]' : 'lg:pl-64'}`}>
        <AdminTopNav onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
