'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserCircle2,
  BookOpen,
  Search,
  BrainCircuit,
  Trophy,
  Presentation,
  Settings,
  Coins,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/credits', label: 'Buy Credits', icon: Coins },
  { href: '/dashboard/profile', label: 'Profile & History', icon: UserCircle2 },
  { href: '/my-courses', label: 'My Courses', icon: BookOpen },
  { href: '/dashboard/courses', label: 'Course Catalog', icon: Search },
  { href: '/dashboard/quizzes', label: 'Quiz Catalog', icon: BrainCircuit },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/workshops', label: 'Workshops', icon: Presentation },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export function Sidebar({
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
  className = '',
}: SidebarProps) {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  const pathname = usePathname();
  const { logout, user } = useAuthContext();

  const [profileName, setProfileName] = useState<string>('Student');
  const [userStatus, setUserStatus] = useState<string>('ACTIVE');

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        if (user?.fullName) {
          setProfileName(user.fullName);
          setProfileRole(user.studyYear ? `Year ${user.studyYear} Student` : 'Medical Student');
          if (user.status) setUserStatus(user.status);
          return;
        }

        const supabase = createClient();
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (cancelled) return;

        const name =
          sbUser?.user_metadata?.full_name ??
          sbUser?.user_metadata?.name ??
          (sbUser?.email ? sbUser.email.split('@')[0] : null) ??
          'Student';

        setProfileName(name);
        setProfileRole('Medical Student');

        if (sbUser?.id) {
          const { data: profile } = await supabase
            .from('users')
            .select('status')
            .eq('id', sbUser.id)
            .single();
          if (profile?.status && !cancelled) {
            setUserStatus(profile.status);
          }
        }
      } catch {
        // Fallback defaults
      }
    };
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const getInitials = (name: string) => {
    if (!name || name === 'Student') return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(profileName);
  const isInactive = userStatus === 'INACTIVE';

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-[#e4e6ef] bg-[#fbfbfd] font-sans text-[#191c1e] antialiased transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[88px]' : 'w-64'
      } ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${className}`}
    >
      {/* Header Section */}
      <div className={`flex flex-col gap-4 ${isCollapsed ? 'px-2 py-5 items-center' : 'p-5'}`}>
        <div className={`flex items-center w-full ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#3525cd] text-white shadow-sm shadow-[#3525cd]/25">
              <GraduationCap className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap opacity-100 transition-opacity duration-300">
                <span className="text-lg font-extrabold leading-none tracking-tight text-[#191c1e]">
                  Learnify
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#696778]">
                  Student Portal
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-2 text-[#5b5a68] transition-colors hover:bg-gray-100 hover:text-[#191c1e]"
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isAllowedWhenInactive = item.href === '/dashboard/profile' || item.href === '/settings';
            const isDisabled = isInactive && !isAllowedWhenInactive;

            if (isDisabled) {
              return (
                <li key={item.href}>
                  <div
                    title="Your account is currently inactive. Contact your administrator."
                    className={`group relative flex min-h-11 cursor-not-allowed items-center gap-3 rounded-xl py-2.5 text-sm font-semibold opacity-40 grayscale select-none ${
                      isCollapsed ? 'justify-center px-0' : 'px-3.5'
                    } text-gray-400`}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0 text-gray-400" />
                    {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </div>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex min-h-11 items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isCollapsed ? 'justify-center px-0' : 'px-3.5'
                  } ${
                    active
                      ? 'border border-[#3525cd]/15 bg-[#3525cd]/10 text-[#3525cd] shadow-sm shadow-[#3525cd]/5'
                      : 'text-[#5b5a68] hover:bg-white hover:text-[#191c1e] hover:shadow-sm'
                  }`}
                >
                  {active && !isCollapsed && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-[#3525cd]"></div>
                  )}
                  <Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 ${
                      active ? 'text-[#3525cd]' : 'text-[#8d8b99] group-hover:text-[#191c1e]'
                    }`}
                  />
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Section */}
      <div className={`border-t border-[#e4e6ef] ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div
          className={`flex items-center gap-3 rounded-2xl border border-[#e4e6ef] bg-white shadow-sm ${
            isCollapsed ? 'justify-center border-0 bg-transparent p-0 shadow-none' : 'p-2.5'
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e6ef] bg-[#f3f4f6] font-bold text-[#3525cd]">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"></span>
          </div>

          {!isCollapsed && (
            <>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="truncate text-sm font-bold text-[#191c1e]">
                  {profileName}
                </span>
                <span className="truncate text-[11px] font-medium text-[#696778]">
                  {profileRole}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Logout"
                className="rounded-lg p-2 text-[#5b5a68] transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

