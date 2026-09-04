'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, LogOut, School, User } from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();

  const isSettingsActive = pathname === '/instructor/settings' || pathname.startsWith('/instructor/settings');

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans">
      {/* Instructor Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Brand + Role Badge */}
            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="/instructor/settings" className="flex items-center gap-2 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs group-hover:bg-purple-700 transition">
                  <School className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                    Learnify
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    Instructor Portal
                  </span>
                </div>
              </Link>

              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                INSTRUCTOR
              </span>
            </div>

            {/* Middle / Navigation Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/instructor/settings"
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  isSettingsActive
                    ? 'bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Settings className={`h-4 w-4 ${isSettingsActive ? 'text-purple-600' : 'text-slate-500'}`} />
                <span>Account Settings</span>
              </Link>
            </nav>

            {/* Right: Instructor Profile & Sign Out */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-slate-900 truncate max-w-[160px]">
                  {user?.fullName || user?.email || 'Instructor'}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[160px]">
                  {user?.email || 'Instructor'}
                </span>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs uppercase">
                {user?.fullName ? user.fullName.substring(0, 2) : <User className="h-4 w-4" />}
              </div>

              <button
                type="button"
                onClick={() => logout()}
                title="Sign Out"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        Learnify LMS · Instructor Workspace · Calendar & Meet Integrations
      </footer>
    </div>
  );
}
