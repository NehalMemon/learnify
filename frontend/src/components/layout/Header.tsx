'use client';

import Link from 'next/link';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { Menu, Heart } from 'lucide-react';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { SearchBar } from '@/components/shared/SearchBar';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export const Header = ({ onMobileMenuToggle }: HeaderProps = {}) => {
  const { user: _user, loading: _loading } = useAuthContext();

  return (
    <nav className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3 md:gap-8">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMobileMenuToggle}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex min-h-[44px] items-center text-lg font-bold tracking-tight text-gray-900 md:text-xl">
          Learnify
        </Link>

        <div className="hidden lg:block">
          <SearchBar variant="student" appearance="pill" className="w-full max-w-sm" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationDropdown />

        <Link href="/dashboard/favorites" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-500">
          <Heart className="h-5 w-5 text-gray-600 hover:text-red-500 transition-colors cursor-pointer" />
        </Link>
      </div>
    </nav>
  );
};
