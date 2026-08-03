'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/components/providers/AuthProvider';
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/actions/notificationActions';

// ─── Types ──────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────

/** Maps a raw Supabase row (snake_case) into our typed NotificationItem */
function mapRow(row: Record<string, unknown>, fallbackUserId: string): NotificationItem {
  return {
    id: String(row.id),
    user_id: String(row.user_id ?? fallbackUserId),
    title: String(row.title ?? 'Notification'),
    message: String(row.message ?? ''),
    type: String(row.type ?? 'GENERAL'),
    link: row.link ? String(row.link) : null,
    is_read: Boolean(row.is_read ?? false),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function formatTimeAgo(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

// ─── Component ──────────────────────────────────────────────
export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user: currentUser } = useAuthContext();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // ── Fetch Initial Notifications & Realtime Subscription ─────
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      try {
        setIsLoading(true);
        const res = await fetchNotificationsAction(currentUser?.id || resolvedUserId || undefined);

        if (res.error) {
          throw new Error(res.error);
        }

        if (!cancelled && res.success && res.data) {
          const activeUserId = res.resolvedUserId || currentUser?.id || resolvedUserId || '';
          if (activeUserId && activeUserId !== resolvedUserId) {
            setResolvedUserId(activeUserId);
          }

          setNotifications(
            res.data.map((row) => mapRow(row as unknown as Record<string, unknown>, activeUserId))
          );

          // Realtime listener for INSERT events
          if (activeUserId && !channel) {
            channel = supabase
              .channel(`notifications-realtime-${activeUserId}`)
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'notifications',
                  filter: `user_id=eq.${activeUserId}`,
                },
                (payload) => {
                  if (payload.new) {
                    const newNotif = mapRow(payload.new as Record<string, unknown>, activeUserId);

                    setNotifications((prev) => {
                      if (prev.some((n) => n.id === newNotif.id)) return prev;
                      return [newNotif, ...prev];
                    });
                  }
                }
              )
              .subscribe();
          }
        }
      } catch (error) {
        console.error('[notifications] bell fetch error:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id]);

  // ── Outside Click Listener ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── Handlers ──────────────────────────────────────────────

  /**
   * On click: mark notification as read in DB via server action, update local state,
   * close dropdown, and navigate to the notification's link (if any).
   */
  const handleItemClick = useCallback(
    async (item: NotificationItem) => {
      // Optimistic UI update
      if (!item.is_read) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );

        try {
          await markNotificationReadAction(item.id);
        } catch (err: unknown) {
          console.error('Error marking notification read:', err);
        }
      }

      setIsOpen(false);

      if (item.link) {
        router.push(item.link);
      }
    },
    [router]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await markAllNotificationsReadAction(userId);
    } catch (err: unknown) {
      console.error('Error marking all notifications read:', err);
    }
  }, [userId, unreadCount]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden font-sans text-slate-900 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-black">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-xs font-extrabold tracking-tight text-slate-950 uppercase">
                Notifications
              </h3>
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-950 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400 mb-2" />
                <p className="text-xs font-medium text-slate-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50 ${
                    item.is_read ? 'bg-white' : 'bg-slate-50/70'
                  }`}
                >
                  {!item.is_read && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs ${item.is_read ? 'font-bold text-slate-800' : 'font-extrabold text-slate-950'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
