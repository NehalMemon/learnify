'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks';

const navItems = [
  { label: 'Home', href: '/dashboard', icon: 'home', requiresLearnify: false, requiresDoctorsQuizz: false },
  { label: 'Courses', href: '/dashboard/courses', icon: 'local_library', requiresLearnify: true, requiresDoctorsQuizz: false },
  { label: 'Quizzes', href: '/dashboard/quizzes', icon: 'quiz', requiresLearnify: true, requiresDoctorsQuizz: false },
  { label: 'Profile', href: '/dashboard/profile', icon: 'person', requiresLearnify: false, requiresDoctorsQuizz: false },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const isAdmin = user?.role === 'ADMIN';
  const learnifyEnabled = user?.learnifyEnabled ?? false;
  const doctorsQuizzEnabled = user?.doctorsQuizzEnabled ?? false;

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-gray-200 bg-white/95 px-4 pb-6 pt-3 shadow-sm backdrop-blur-md md:hidden">
      {navItems.map((item) => {
        let hasAccess = true;
        if (!isAdmin) {
          if (item.requiresLearnify && !learnifyEnabled) hasAccess = false;
          if (item.requiresDoctorsQuizz && !doctorsQuizzEnabled) hasAccess = false;
        }

        if (!hasAccess) {
          return (
            <div
              key={item.href}
              className="flex flex-col items-center justify-center text-muted-foreground/30 px-4 py-2 cursor-not-allowed"
              title="Pending Admin Approval"
            >
              <span className="material-symbols-outlined mb-1">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`${
              isActive(item.href)
                ? 'flex flex-col items-center justify-center bg-primary/10 text-primary rounded-xl px-4 py-2 transition-all'
                : 'flex flex-col items-center justify-center text-muted-foreground px-4 py-2 hover:text-foreground transition-all'
            }`}
          >
            <span className="material-symbols-outlined mb-1">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
