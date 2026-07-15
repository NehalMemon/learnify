'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Brain,
  CreditCard,
  ClipboardList,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { useAuthContext } from '@/components/providers/AuthProvider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/quizzes', label: 'Quizzes', icon: Brain },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/logs', label: 'System Logs', icon: ClipboardList },
];

export const AdminSidebar = ({ className = '', onMobileClose }: { className?: string; onMobileClose?: () => void }) => {
  const pathname = usePathname();
  const { logout } = useAuthContext();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className={`fixed top-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white ${className}`}>
      <div className="border-b border-gray-200 p-6">
        <Link href="/admin/dashboard" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-sm shadow-purple-600/20 transition-all duration-300 group-hover:shadow-purple-600/30">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-gray-900">Learnify</span>
            <span className="text-xs font-medium text-gray-500">Management Console</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
                    active
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-gray-200 p-4">
        <button
          onClick={logout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition-all duration-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
        <div className="text-center text-xs text-gray-400">© 2026 Learnify</div>
      </div>
    </aside>
  );
};