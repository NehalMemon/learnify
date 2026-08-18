'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  FileEdit,
  BookOpen,
  Database,
  Users,
  Briefcase,
  UserCheck,
  Settings,
  Coins,
  School,
  LogOut,
  PanelLeftClose,
  Video,
} from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { createClient } from '@/utils/supabase/client';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Primary vertical navigation items (management links only - no Settings or Logout in main list)
const primaryNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/instructors', label: 'Instructor Management', icon: Briefcase },
  { href: '/admin/students', label: 'Student Management', icon: UserCheck },
  { href: '/admin/requests', label: 'Credit Requests', icon: Coins },
  { href: '/admin/taxonomy', label: 'Taxonomy Manager', icon: FolderTree },
  { href: '/admin/quizzes/library', label: 'Quiz Library', icon: BookOpen },
  { href: '/admin/quizzes', label: 'Quiz Builder', icon: FileEdit },
  { href: '/admin/live-classes', label: 'Classes Library', icon: Video },
  { href: '/admin/live-classes/builder', label: 'Classes Builder', icon: School },
  { href: '/admin/question-bank', label: 'Question Bank', icon: Database },
];

export interface SidebarProps {
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
  const { logout, user } = useAuthContext();
  const pathname = usePathname();

  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed;

  const [profileName, setProfileName] = useState<string>('Admin');
  const [profileRole, setProfileRole] = useState<string>('Administrator');

  // Sync state with localStorage if uncontrolled
  useEffect(() => {
    if (controlledIsCollapsed === undefined) {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
      if (saved !== null) {
        setInternalIsCollapsed(saved === 'true');
      }
    }
  }, [controlledIsCollapsed]);

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalIsCollapsed;
      setInternalIsCollapsed(next);
      localStorage.setItem('admin_sidebar_collapsed', String(next));
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        if (user?.fullName) {
          setProfileName(user.fullName);
          setProfileRole(user.role === 'ADMIN' ? 'Chief Administrator' : user.role || 'Administrator');
          return;
        }

        const supabase = createClient();
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (cancelled) return;

        const name =
          sbUser?.user_metadata?.full_name ??
          sbUser?.user_metadata?.name ??
          (sbUser?.email ? sbUser.email.split('@')[0] : null) ??
          'Admin';

        setProfileName(name);

        const role =
          sbUser?.app_metadata?.role ??
          sbUser?.user_metadata?.role ??
          'Administrator';
        setProfileRole(role === 'ADMIN' ? 'Chief Administrator' : role);
      } catch {
        // Fallback defaults
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const getInitials = (name: string) => {
    if (!name || name === 'Admin') return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isActive = (href: string) => {
    if (pathname === href) return true;

    if (href === '/admin/live-classes') {
      return pathname === '/admin/live-classes';
    }

    if (href === '/admin/live-classes/builder') {
      return pathname.startsWith('/admin/live-classes/builder');
    }

    if (href === '/admin/quizzes' || href === '/admin/quizzes/builder') {
      if (pathname.startsWith('/admin/quizzes/library')) return false;
      return pathname.startsWith('/admin/quizzes');
    }

    if (href === '/admin/quizzes/library') {
      return pathname.startsWith('/admin/quizzes/library');
    }

    if (href === '/dashboard' || href === '/admin/dashboard') {
      return pathname === href;
    }

    return pathname.startsWith(`${href}/`);
  };

  const isSettingsActive = isActive('/admin/settings');

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen h-[100dvh] flex-col border-r border-gray-200 bg-[#fbfbfd] font-sans text-gray-900 antialiased transition-all duration-300 ease-in-out overflow-x-hidden ${
        isCollapsed ? 'w-[88px]' : 'w-64'
      } ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${className}`}
    >
      {/* ── Header Area (Logo Expand Action & Conditional Collapse Toggle) ── */}
      <div className={`p-4 border-b border-gray-100 overflow-x-hidden ${isCollapsed ? 'px-2 flex justify-center' : ''}`}>
        {isCollapsed ? (
          /* Minimized/Collapsed State: Click brand logo container to expand */
          <div className="relative group flex justify-center">
            <button
              type="button"
              onClick={handleToggle}
              title="Click logo to expand sidebar"
              aria-label="Expand sidebar"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/25 transition-transform duration-200 group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <School className="h-5 w-5" />
            </button>

            {/* Collapsed Logo Tooltip */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none transition-all duration-150 ease-in-out top-1/2 -translate-y-1/2">
                Expand Sidebar
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              </div>
            )}
          </div>
        ) : (
          /* Fully Open/Expanded State: Brand logo on left + clean toggle button on top right */
          <div className="flex items-center justify-between w-full overflow-x-hidden">
            <div className="flex items-center gap-3 overflow-x-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/25">
                <School className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left whitespace-nowrap overflow-x-hidden opacity-100 transition-opacity duration-300">
                <span className="text-base font-extrabold tracking-tight text-gray-900 leading-tight whitespace-nowrap">
                  Learnify
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 whitespace-nowrap">
                  Management Console
                </span>
              </div>
            </div>

            {/* Conditional Collapse Toggle Button (Only displayed when expanded) */}
            <button
              type="button"
              onClick={handleToggle}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors shrink-0"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Primary Navigation List ── */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2.5 py-3' : 'px-3 py-3'}`}>
        <ul className="space-y-1.5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href} className="relative group flex justify-center">
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={`relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 ${
                    isCollapsed ? 'h-11 w-11 justify-center p-0' : 'min-h-[44px] w-full gap-3 px-3.5 py-2.5'
                  } ${
                    active
                      ? isCollapsed
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'border border-purple-200/80 bg-purple-50 text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  {active && !isCollapsed && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-purple-600 shrink-0" />
                  )}
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      active
                        ? isCollapsed
                          ? 'text-white'
                          : 'text-purple-600'
                        : 'text-gray-400 group-hover:text-gray-700'
                    }`}
                  />
                  {isCollapsed ? null : <span className="flex-1 truncate whitespace-nowrap overflow-x-hidden">{item.label}</span>}
                </Link>

                {/* Collapsed Hover Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none transition-all duration-150 ease-in-out top-1/2 -translate-y-1/2">
                    {item.label}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Streamlined Bottom Actions (Settings & Profile / Logout) ── */}
      <div className={`border-t border-gray-200/80 bg-white/50 overflow-x-hidden ${isCollapsed ? 'p-2.5' : 'p-3.5'} space-y-2`}>
        {/* Settings Anchor Link */}
        <div className="relative group flex justify-center">
          <Link
            href="/admin/settings"
            onClick={onMobileClose}
            className={`relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 ${
              isCollapsed ? 'h-11 w-11 justify-center p-0' : 'min-h-[44px] w-full gap-3 px-3.5 py-2.5'
            } ${
              isSettingsActive
                ? isCollapsed
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'border border-purple-200/80 bg-purple-50 text-purple-700 shadow-sm'
                : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
            }`}
          >
            {isSettingsActive && !isCollapsed && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-purple-600 shrink-0" />
            )}
            <Settings
              className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                isSettingsActive
                  ? isCollapsed
                    ? 'text-white'
                    : 'text-purple-600'
                  : 'text-gray-400 group-hover:text-gray-700'
              }`}
            />
            {isCollapsed ? null : <span className="flex-1 truncate whitespace-nowrap overflow-x-hidden">Settings</span>}
          </Link>

          {/* Collapsed Settings Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none transition-all duration-150 ease-in-out top-1/2 -translate-y-1/2">
              Settings
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
          )}
        </div>

        {/* User Profile Card with Secondary Logout Action */}
        <div
          className={`flex items-center rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-sm transition-all overflow-x-hidden ${
            isCollapsed ? 'justify-center border-0 bg-transparent p-0 shadow-none' : 'gap-3'
          }`}
        >
          <div className="relative shrink-0 group flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-purple-50 font-bold text-purple-700 shadow-xs">
              {getInitials(profileName)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />

            {/* Collapsed Profile & Logout Tooltip */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 hidden group-hover:flex flex-col px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none transition-all duration-150 ease-in-out top-1/2 -translate-y-1/2">
                <p className="font-bold">{profileName}</p>
                <p className="text-[10px] text-gray-300">{profileRole}</p>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              </div>
            )}
          </div>

          {isCollapsed ? null : (
            <>
              <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden whitespace-nowrap">
                <span className="truncate text-sm font-bold text-gray-900 leading-tight whitespace-nowrap overflow-x-hidden">
                  {profileName}
                </span>
                <span className="truncate text-[11px] font-medium text-gray-500 whitespace-nowrap overflow-x-hidden">
                  {profileRole}
                </span>
              </div>

              {logout && (
                <button
                  type="button"
                  onClick={logout}
                  title="Logout from admin session"
                  aria-label="Logout"
                  className="rounded-xl p-2 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shrink-0"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
