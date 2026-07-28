'use client';

import '@/bones/registry';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Lock } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { createClient } from '@/utils/supabase/client';

/**
 * Student Layout
 *
 * Mobile (< lg): hamburger + slide-out sidebar, bottom tab bar
 * Desktop (lg+): fixed sidebar, no bottom nav
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userStatus, setUserStatus] = useState<string>('ACTIVE');
  const pathname = usePathname();
  const isActiveExamRoom = pathname.startsWith('/dashboard/quiz/attempt/') || pathname.startsWith('/quiz/');

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from('users')
          .select('status')
          .eq('id', user.id)
          .single();

        if (profile?.status && !cancelled) {
          setUserStatus(profile.status);
        }
      } catch {
        // Fallback default ACTIVE
      }
    };
    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isActiveExamRoom) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const isInactive = userStatus === 'INACTIVE';
  const isAllowedPathWhenInactive = pathname === '/dashboard/profile' || pathname === '/settings';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {isMobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <div className={`flex flex-1 flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:pl-[88px]' : 'lg:pl-64'}`}>
        <div className="sticky top-0 z-40 w-full bg-white">
          <Header onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
        </div>

        {/* ── Prominent Inactive Lockout Banner ───────────────────────────── */}
        {isInactive && (
          <div className="mx-auto mt-4 w-full max-w-5xl px-4">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-red-900 shadow-md">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-600 text-white font-bold">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-red-950">Account Deactivated</h3>
                <p className="text-sm font-semibold text-red-800 mt-0.5">
                  Your account is currently inactive. Please contact your administrator to restore access.
                </p>
              </div>
            </div>
          </div>
        )}

        <main className="page-container flex-1 pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">
            {isInactive && !isAllowedPathWhenInactive ? (
              <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-white p-12 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
                  <Lock className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Access Restricted</h2>
                <p className="mt-2 max-w-md text-sm text-gray-600">
                  Your student portal features (courses, quizzes, and workshops) are locked because your account status is INACTIVE.
                </p>
                <p className="mt-4 text-xs font-semibold text-gray-500">
                  Contact support or your administrator to reactivate your access.
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-sm lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
