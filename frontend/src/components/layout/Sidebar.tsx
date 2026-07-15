'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Search, BrainCircuit, Trophy, Presentation, UserCircle2, Settings, LogOut, X } from 'lucide-react';
import { Lock } from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, requiresLearnify: false, requiresDoctorsQuizz: false },
  { href: '/dashboard/profile', label: 'Profile & History', Icon: UserCircle2, requiresLearnify: false, requiresDoctorsQuizz: false },
  { href: '/my-courses', label: 'My Courses', Icon: BookOpen, requiresLearnify: true, requiresDoctorsQuizz: false },
  { href: '/dashboard/courses', label: 'Course Catalog', Icon: Search, requiresLearnify: true, requiresDoctorsQuizz: false },
  { href: '/dashboard/quizzes', label: 'Quiz Catalog', Icon: BrainCircuit, requiresLearnify: false, requiresDoctorsQuizz: true },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', Icon: Trophy, requiresLearnify: false, requiresDoctorsQuizz: false },
  { href: '/workshops', label: 'Workshops', Icon: Presentation, requiresLearnify: true, requiresDoctorsQuizz: false },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export function Sidebar({ isMobileOpen = false, onMobileClose, className = '' }: SidebarProps) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuthContext();

  if (loading) {
    return (
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-full max-w-xs flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:w-64 lg:max-w-none lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-4 lg:hidden">
          <p className="text-sm font-bold text-gray-900">Menu</p>
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3 px-3 py-6">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
          <div className="min-w-0 space-y-1">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="flex min-h-[44px] items-center gap-3 rounded-lg p-3 text-sm font-semibold text-foreground/70 transition-all duration-200 hover:bg-muted hover:text-foreground"
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  // Read entitlements directly from the context user object — no prop-drilling required
  const learnifyEnabled = user?.learnifyEnabled ?? false;
  const doctorsQuizzEnabled = user?.doctorsQuizzEnabled ?? false;
  
  // User is "Active" if they have ANY platform enabled (ADMIN always enabled for both)
  const isApproved = isAdmin || learnifyEnabled || doctorsQuizzEnabled;

  const getInitials = (name?: string | null) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?.fullName);

  // Extract first name for cleaner sidebar display
  const firstName = user?.fullName
    ? user.fullName.split(' ')[0]
    : 'Student';

  const displaySub = isAdmin ? 'Administrator' : isApproved ? (user?.studyYear ? `Year ${user.studyYear}` : 'Active') : 'Pending Approval';

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-full max-w-xs flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:w-64 lg:max-w-none lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-4 lg:hidden">
        <p className="text-sm font-bold text-gray-900">Menu</p>
        {onMobileClose ? (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      
      {/* User Widget */}
      <div className="flex items-center gap-3 px-3 py-6 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg select-none">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{firstName}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{displaySub}</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {NAV_LINKS.map(({ href, label, Icon, requiresLearnify, requiresDoctorsQuizz }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          
          // Access logic:
          // 1. ADMIN has full access to everything
          // 2. If route requires no special entitlements, anyone can access
          // 3. If route requires Learnify AND user has it, grant access
          // 4. If route requires DoctorsQuizz AND user has it, grant access
          const requiresAnyEntitlement = requiresLearnify || requiresDoctorsQuizz;
          const hasEntitlementAccess = 
            (requiresLearnify && learnifyEnabled) || 
            (requiresDoctorsQuizz && doctorsQuizzEnabled);
          const hasAccess = isAdmin || !requiresAnyEntitlement || hasEntitlementAccess;

          if (!hasAccess) {
            return (
              <div
                key={href}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-muted-foreground/50 cursor-not-allowed"
                title="Pending Admin Approval"
                aria-disabled="true"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="opacity-50" />
                  <span>{label}</span>
                </div>
                <Lock size={14} className="opacity-50" />
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={onMobileClose}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground/70 hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="space-y-1 border-t border-border px-2 py-3">
        <Link
          href="/settings"
          prefetch={false}
          className="flex min-h-[44px] items-center gap-3 rounded-lg p-3 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings size={18} /> Settings
        </Link>
        <button
          onClick={logout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg p-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}
