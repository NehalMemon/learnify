'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { SidebarShell, NavItem } from '@/components/layout/SidebarShell';

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/instructors', label: 'Instructor Management', icon: Briefcase },
  { href: '/admin/students', label: 'Student Management', icon: UserCheck },
  { href: '/admin/requests', label: 'Credit Requests', icon: Coins },
  { href: '/admin/taxonomy', label: 'Taxonomy Manager', icon: FolderTree },
  { href: '/admin/quizzes', label: 'Quiz Builder', icon: FileEdit },
  { href: '/admin/quizzes/library', label: 'Quiz Library', icon: BookOpen },
  { href: '/admin/question-bank', label: 'Question Bank', icon: Database },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
  className,
}: AdminSidebarProps) {
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

  const getInitials = (name: string) => {
    if (!name || name === 'Admin') return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <SidebarShell
      portalTitle="Learnify"
      portalSubtitle="Management Console"
      portalIcon={School}
      navItems={adminNavItems}
      profileName={profileName}
      profileRole={profileRole}
      profileInitials={getInitials(profileName)}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobileOpen={isMobileOpen}
      onMobileClose={onMobileClose}
      onLogout={logout}
      className={className}
    />
  );
}

export default AdminSidebar;
