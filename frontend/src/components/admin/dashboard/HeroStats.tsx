'use client';

import Link from 'next/link';
import { Users, Activity, Brain, BookOpenCheck } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeroStatsProps {
  totalStudents: number;
  activeExamAttempts: number;
  totalQuizzes: number;
  totalEnrollments: number;
}

interface StatCard {
  label: string;
  value: string;
  sub: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
  iconBg: string;
  trend: string;
  trendUp: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * HeroStats — top-of-dashboard KPI grid.
 * Renders 4 animated stat cards derived from live API data.
 */
export function HeroStats({
  totalStudents,
  activeExamAttempts,
  totalQuizzes,
  totalEnrollments,
}: HeroStatsProps) {
  const cards: StatCard[] = [
    {
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      sub: 'Registered learners',
      href: '/admin/users',
      icon: Users,
      gradient: 'from-blue-50 to-blue-100/50',
      glow: 'shadow-sm',
      iconBg: 'bg-blue-100 text-blue-600',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Active Exam Attempts',
      value: activeExamAttempts.toLocaleString(),
      sub: 'In-progress now',
      href: '/admin/dashboard',
      icon: Activity,
      gradient: 'from-emerald-50 to-emerald-100/50',
      glow: 'shadow-sm',
      iconBg: 'bg-emerald-100 text-emerald-600',
      trend: 'Live',
      trendUp: true,
    },
    {
      label: 'Total Quizzes',
      value: totalQuizzes.toLocaleString(),
      sub: 'Across all categories',
      href: '/admin/quizzes',
      icon: Brain,
      gradient: 'from-violet-50 to-violet-100/50',
      glow: 'shadow-sm',
      iconBg: 'bg-violet-100 text-violet-600',
      trend: 'Updated',
      trendUp: true,
    },
    {
      label: 'Total Enrollments',
      value: totalEnrollments.toLocaleString(),
      sub: 'Across all courses',
      href: '/admin/courses',
      icon: BookOpenCheck,
      gradient: 'from-amber-50 to-amber-100/50',
      glow: 'shadow-sm',
      iconBg: 'bg-amber-100 text-amber-600',
      trend: '+5%',
      trendUp: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className={`relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br p-6 shadow-sm ${card.gradient} transition-colors duration-200 group hover:border-gray-300`}
          >
            {/* Decorative orb */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-current opacity-5 group-hover:opacity-10 transition-opacity duration-300" />

            <div className="flex items-start justify-between mb-4">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${card.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${
                  card.trendUp
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {card.trend}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-2xl font-black text-gray-900 tracking-tight">
                {card.value}
              </p>
              <p className="text-sm font-semibold text-gray-700">{card.label}</p>
              <p className="text-xs text-gray-500">{card.sub}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
