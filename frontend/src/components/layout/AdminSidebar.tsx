'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  FileEdit,
  Database,
  Users,
  Settings,
  Coins,
  School,
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
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Credit Requests', icon: Coins },
  { href: '/admin/taxonomy', label: 'Taxonomy Manager', icon: FolderTree },
  { href: '/admin/quizzes', label: 'Quiz Builder', icon: FileEdit },
  { href: '/admin/questions', label: 'Question Bank', icon: Database },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export const AdminSidebar = ({
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onMobileClose,
  className = '',
}: AdminSidebarProps) => {
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

  const [profileName, setProfileName] = useState<string>('Admin');
  const [profileRole, setProfileRole] = useState<string>('Administrator');

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

  const isActive = (href: string) => pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));

  const getInitials = (name: string) => {
    if (!name || name === 'Admin') return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(profileName);

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
              <School className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col whitespace-nowrap opacity-100 transition-opacity duration-300">
                <span className="text-lg font-extrabold leading-none tracking-tight text-[#191c1e]">
                  Learnify
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#696778]">
                  Management Console
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
};

export default AdminSidebar;
