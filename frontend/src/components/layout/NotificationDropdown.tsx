'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import apiClient from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
}

/**
 * Real-time notifications dropdown.
 *
 * Isolated component — it owns its own state, data fetching and popover
 * behaviour so that it can be dropped into the Header without leaking
 * layout concerns into the parent.
 */
export const NotificationDropdown = () => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Unread count is always derived from the source of truth (the array),
  // so we don't risk it drifting out of sync after optimistic updates.
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // ── Fetch on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await apiClient.get<NotificationsResponse>(
          '/notifications'
        );
        if (!cancelled && data?.success) {
          setNotifications(data.data ?? []);
        }
      } catch {
        // Silent failure — dropdown will render its empty state.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── API Handlers ──────────────────────────────────────────

  const handleMarkAsRead = async (id: string, link: string | null) => {
    // Optimistic update first — UI feels instant even on slow networks.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // If the server call fails we keep the optimistic state so the UI
      // doesn't flicker; the next fetch will reconcile.
    }

    setIsOpen(false);

    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await apiClient.patch('/notifications/read-all');
    } catch {
      // Keep optimistic state on failure; reconciles on next fetch.
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-sm z-50 overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          </div>

          {/* Scrollable list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(n.id, n.link)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-gray-50 ${
                        n.isRead ? 'bg-white' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              n.isRead
                                ? 'text-gray-700 font-medium'
                                : 'text-gray-900 font-semibold'
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
