'use client';

import '@/bones/registry';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

/**
 * Student Layout
 *
 * Mobile (< lg): hamburger + slide-out sidebar, bottom tab bar
 * Desktop (lg+): fixed sidebar, no bottom nav
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isActiveExamRoom = pathname.startsWith('/dashboard/quiz/attempt/') || pathname.startsWith('/quiz/');

  if (isActiveExamRoom) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
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

      <div className="flex flex-1 flex-col transition-all duration-200 ease-in-out lg:pl-64">
        <div className="sticky top-0 z-40 w-full bg-white">
          <Header onMobileMenuToggle={() => setIsMobileSidebarOpen(true)} />
        </div>

        <main className="page-container flex-1 pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-sm lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
