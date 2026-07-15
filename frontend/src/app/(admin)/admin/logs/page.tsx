'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { SystemLog, LogLevel } from '@/types';

// ─── Constants ──────────────────────────────────────────────────

const LEVEL_BADGE: Record<LogLevel, string> = {
  INFO:  'bg-blue-50 text-blue-700 border border-blue-200',
  WARN:  'bg-amber-50 text-amber-700 border border-amber-200',
  ERROR: 'bg-red-50 text-red-700 border border-red-200',
};

const LEVEL_DOT: Record<LogLevel, string> = {
  INFO:  'bg-blue-500',
  WARN:  'bg-amber-500',
  ERROR: 'bg-red-500',
};

const PAGE_SIZE = 20;

// ─── Helpers ────────────────────────────────────────────────────

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + '  ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

// ─── State ──────────────────────────────────────────────────────

interface LogsState {
  logs: SystemLog[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
  pages: number;
  levelFilter: LogLevel | '';
  actionSearch: string;
}

// ─── Component ──────────────────────────────────────────────────

export default function AdminLogsPage() {
  const [state, setState] = useState<LogsState>({
    logs: [],
    loading: true,
    error: null,
    page: 1,
    total: 0,
    pages: 0,
    levelFilter: '',
    actionSearch: '',
  });

  const fetchLogs = useCallback(async (
    page: number,
    level: LogLevel | '',
    action: string,
  ) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (level) params.level = level;
      if (action.trim()) params.action = action.trim();

      const res = await adminApi.getSystemLogs(params);
      const { logs, pagination } = res.data?.data ?? { logs: [], pagination: { page: 1, total: 0, pages: 0 } };

      setState((s) => ({
        ...s,
        logs,
        page: pagination.page,
        total: pagination.total,
        pages: pagination.pages,
        loading: false,
      }));
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Failed to load system logs.',
      }));
    }
  }, []);

  // Fetch on mount and when filters / page change
  useEffect(() => {
    fetchLogs(state.page, state.levelFilter, state.actionSearch);
    // Why: only refetch when user changes page or applies a filter,
    // NOT on every state mutation — fetchLogs is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.page, state.levelFilter]);

  const handleLevelChange = (level: LogLevel | '') => {
    setState((s) => ({ ...s, levelFilter: level, page: 1 }));
  };

  const handleActionSearch = () => {
    setState((s) => ({ ...s, page: 1 }));
    fetchLogs(1, state.levelFilter, state.actionSearch);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleActionSearch();
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            System Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Audit trail — {state.total.toLocaleString()} events recorded
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs(state.page, state.levelFilter, state.actionSearch)}
          disabled={state.loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filters bar ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Level filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            id="level-filter"
            aria-label="Filter by log level"
            value={state.levelFilter}
            onChange={(e) => handleLevelChange(e.target.value as LogLevel | '')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        {/* Action search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="action-search"
            type="text"
            placeholder="Filter by action…"
            aria-label="Filter by action"
            value={state.actionSearch}
            onChange={(e) => setState((s) => ({ ...s, actionSearch: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <button
          type="button"
          onClick={handleActionSearch}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          Search
        </button>
      </div>

      {/* ── Error state ───────────────────────────────────────── */}
      {state.error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{state.error}</p>
        </div>
      )}

      {/* ── Data table card ───────────────────────────────────── */}
      <div className="table-scroll rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th scope="col" className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Level
                </th>
                <th scope="col" className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Message
                </th>
                <th scope="col" className="whitespace-nowrap px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  User
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {/* Loading skeleton */}
              {state.loading && state.logs.length === 0 && (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-36 rounded bg-gray-100" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-14 rounded-full bg-gray-100" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-100" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-56 rounded bg-gray-100" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-gray-100" /></td>
                  </tr>
                ))
              )}

              {/* Empty state */}
              {!state.loading && state.logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-900">No logs found</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {state.levelFilter || state.actionSearch
                        ? 'Try adjusting your filters.'
                        : 'System events will appear here as they occur.'}
                    </p>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {state.logs.map((log) => (
                <tr
                  key={log.id}
                  className="transition-colors duration-100 hover:bg-gray-50/60"
                >
                  {/* Timestamp */}
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500 font-mono">
                    {formatTimestamp(log.createdAt)}
                  </td>

                  {/* Level badge */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LEVEL_BADGE[log.level]}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${LEVEL_DOT[log.level]}`} />
                      {log.level}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {log.action}
                    </code>
                  </td>

                  {/* Message */}
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-700" title={log.message}>
                    {log.message}
                  </td>

                  {/* User */}
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {log.user ? (
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{log.user.fullName}</p>
                        <p className="text-xs text-gray-400">{log.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">System</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        {/* ── Pagination footer ─────────────────────────────── */}
        {state.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3">
            <p className="text-xs text-gray-500">
              Page <span className="font-semibold text-gray-700">{state.page}</span> of{' '}
              <span className="font-semibold text-gray-700">{state.pages}</span>
              <span className="hidden sm:inline"> — {state.total.toLocaleString()} total events</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={state.page <= 1}
                onClick={() => setState((s) => ({ ...s, page: s.page - 1 }))}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={state.page >= state.pages}
                onClick={() => setState((s) => ({ ...s, page: s.page + 1 }))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
