'use client';

import { useEffect, useState } from 'react';
import { UserPlus, BookOpen, CheckCircle2, Clock3 } from 'lucide-react';
import { adminApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityType = 'Registration' | 'QuizStarted' | 'QuizCompleted';

export interface ActivityItem {
  id: string;
  userName: string;
  action: string;
  type: ActivityType;
  timestamp: string;
}

// Legacy compat — dashboard page still spreads AdminUser props from the old shape
export interface AdminUser {
  role: string;
  id: string;
  email: string;
  fullName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns up to 2 uppercase initials from a display name.
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const formatRelativeDate = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// Avatar colour pool — deterministic (index-based) so no hydration mismatch
const AVATAR_COLORS = [
  'from-blue-600 to-blue-700',
  'from-violet-600 to-purple-700',
  'from-emerald-600 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

// ─── Badge config per event type ─────────────────────────────────────────────

const TYPE_CONFIG: Record<ActivityType, { label: string; classes: string; Icon: React.ElementType }> = {
  Registration: {
    label: 'Joined',
    classes: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Icon: UserPlus,
  },
  QuizStarted: {
    label: 'Started',
    classes: 'bg-violet-50 text-violet-600 border-violet-200',
    Icon: BookOpen,
  },
  QuizCompleted: {
    label: 'Completed',
    classes: 'bg-blue-50 text-blue-600 border-blue-200',
    Icon: CheckCircle2,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * SystemActivity — fetches the 5 most recent platform events from
 * GET /api/v1/admin/dashboard/activity and renders them as a live feed.
 *
 * Accepts an optional `items` prop for backwards-compat with the dashboard
 * page (which passes pre-fetched data from its own Promise.allSettled block).
 * If `items` is empty, the component falls back to its own internal fetch.
 */
export function RecentRegistrations({ items: propItems }: { items?: ActivityItem[] }) {
  const [items, setItems] = useState<ActivityItem[]>(propItems ?? []);
  const [loading, setLoading] = useState(!propItems?.length);

  useEffect(() => {
    // Skip self-fetch if the parent already provided real data
    if (propItems && propItems.length > 0) {
      setItems(propItems);
      return;
    }

    let cancelled = false;
    adminApi.getSystemActivity()
      .then((res) => {
        if (!cancelled) setItems(res.data?.data ?? []);
      })
      .catch(() => {/* graceful — component already shows empty state */})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [propItems]);

  const recent = items.slice(0, 5);

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-base font-bold text-gray-900">System Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Latest {recent.length} platform events
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Live
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-gray-100">
        {loading && (
          <li className="px-6 py-8 text-center text-sm text-gray-400 animate-pulse">
            Loading activity…
          </li>
        )}
        {!loading && recent.length === 0 && (
          <li className="px-6 py-8 text-center text-sm text-gray-400">
            No activity yet
          </li>
        )}
        {recent.map((item, idx) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.Registration;
          const { Icon } = cfg;

          return (
            <li
              key={item.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${
                  AVATAR_COLORS[idx % AVATAR_COLORS.length]
                } flex items-center justify-center font-bold text-sm text-white shadow-sm`}
              >
                {getInitials(item.userName)}
              </div>

              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.userName}
                  </p>
                  {/* Colour-coded type badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.classes}`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{item.action}</p>
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 text-right space-y-1">
                <div className="flex items-center justify-end gap-1.5">
                  <Clock3 className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {formatRelativeDate(item.timestamp)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
