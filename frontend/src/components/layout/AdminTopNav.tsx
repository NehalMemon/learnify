'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ChevronDown, Settings, LogOut, Menu } from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { SearchBar } from '@/components/shared/SearchBar';

export const AdminTopNav = ({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) => {
  const { user, logout } = useAuthContext();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="max-w-lg flex flex-1 items-center gap-2">
          <button
            type="button"
            aria-label="Open admin menu"
            onClick={onMobileMenuToggle}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <SearchBar variant="admin" className="w-full max-w-md" />
        </div>

        <div className="ml-6 flex items-center gap-4">
          <Link
            href="/admin/logs"
            className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900"
          >
            <ClipboardList className="h-5 w-5" />
            <span className="hidden md:inline">System Logs</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex min-h-10 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition-all duration-200 hover:bg-gray-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-bold text-white">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <div className="hidden text-left md:block">
                <div className="text-sm font-semibold text-gray-900">{user?.fullName || 'Admin'}</div>
                <div className="text-xs text-gray-500">{user?.role || 'Administrator'}</div>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">{user?.email || 'admin@learnify.pk'}</div>
                  <div className="mt-1 text-xs text-gray-500">Admin Account</div>
                </div>
                <div className="py-2">
                  <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};