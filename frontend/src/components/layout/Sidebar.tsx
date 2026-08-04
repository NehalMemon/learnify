'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { SidebarShell, NavItem } from '@/components/layout/SidebarShell';

const studentNavItems: NavItem[] = [
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
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
  className,
}: SidebarProps) {
  const { logout, user } = useAuthContext();

  const [profileName, setProfileName] = useState<string>('Student');
  const [profileRole, setProfileRole] = useState<string>('Medical Student');
  const [userStatus, setUserStatus] = useState<string>('ACTIVE');
  const [userCredits, setUserCredits] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    const fetchUser = async () => {
      try {
        const supabase = createClient();

        if (user?.fullName) {
          setProfileName(user.fullName);
          setProfileRole(user.studyYear ? `Year ${user.studyYear} Student` : 'Medical Student');
          if (user.status) setUserStatus(user.status);
          if (typeof user.credits === 'number') setUserCredits(user.credits);
        }

        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (cancelled || !sbUser?.id) return;

        if (!user?.fullName) {
          const name =
            sbUser?.user_metadata?.full_name ??
            sbUser?.user_metadata?.name ??
            (sbUser?.email ? sbUser.email.split('@')[0] : null) ??
            'Student';

          setProfileName(name);
        }

        const { data: profile } = await supabase
          .from('users')
          .select('status, credits')
          .eq('id', sbUser.id)
          .single();

        if (profile && !cancelled) {
          if (profile.status) setUserStatus(profile.status);
          if (typeof profile.credits === 'number') setUserCredits(profile.credits);
        }

        channel = supabase
          .channel(`sidebar-credits-${sbUser.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              filter: `id=eq.${sbUser.id}`,
            },
            (payload) => {
              if (payload.new && typeof payload.new.credits === 'number') {
                setUserCredits(payload.new.credits);
              }
            }
          )
          .subscribe();
      } catch {
        // Fallback defaults
      }
    };

    fetchUser();
    return () => {
      cancelled = true;
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const getInitials = (name: string) => {
    if (!name || name === 'Student') return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isInactive = userStatus === 'INACTIVE';

  return (
    <SidebarShell
      portalTitle="Learnify"
      portalSubtitle="Student Portal"
      portalIcon={GraduationCap}
      navItems={studentNavItems}
      profileName={profileName}
      profileRole={profileRole}
      profileInitials={getInitials(profileName)}
      credits={userCredits}
      isInactive={isInactive}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobileOpen={isMobileOpen}
      onMobileClose={onMobileClose}
      onLogout={logout}
      className={className}
    />
  );
}

export default Sidebar;

