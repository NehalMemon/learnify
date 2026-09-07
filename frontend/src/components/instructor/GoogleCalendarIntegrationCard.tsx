'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import {
  Calendar,
  Video,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { disconnectGoogleAccount } from '@/app/actions/instructorActions';

interface GoogleCalendarIntegrationCardProps {
  initialConnected: boolean;
  instructorEmail?: string | null;
}

export function GoogleCalendarIntegrationCard({
  initialConnected,
  instructorEmail,
}: GoogleCalendarIntegrationCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [isPending, startTransition] = useTransition();
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  // Sync state if server prop changes
  useEffect(() => {
    setIsConnected(initialConnected);
  }, [initialConnected]);

  // Handle URL query parameters for toasts
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (successParam === 'google_connected') {
      setIsConnected(true);
      toast.success('Google Calendar connected successfully! Live Meet links will now be hosted on your account.', {
        duration: 5000,
        id: 'google-connect-success',
      });
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      let message = 'An error occurred during Google connection.';
      switch (errorParam) {
        case 'oauth_denied':
          message = 'Google Calendar permissions were denied.';
          break;
        case 'oauth_failed':
          message = 'Google authorization failed. Please try again.';
          break;
        case 'missing_code':
          message = 'Missing authorization code from Google.';
          break;
        case 'invalid_state':
          message = 'Security state mismatch. Please initiate connection again.';
          break;
        case 'token_exchange_failed':
          message = 'Failed to exchange authorization code for Google tokens.';
          break;
        case 'db_save_failed':
          message = 'Failed to persist Google credentials. Please contact support.';
          break;
        case 'initiation_failed':
          message = 'Could not initiate Google OAuth. Check your environment settings.';
          break;
        case 'session_expired':
          message = 'Your Learnify session expired. Please log in and try again.';
          break;
        default:
          message = `Google OAuth error: ${errorParam}`;
      }

      toast.error(message, {
        duration: 6000,
        id: 'google-connect-error',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        const result = await disconnectGoogleAccount();
        if (result.success) {
          setIsConnected(false);
          setShowConfirmDisconnect(false);
          toast.success('Google Calendar disconnected successfully.', {
            id: 'disconnect-success',
          });
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to disconnect Google account.');
        }
      } catch {
        toast.error('Unexpected error while disconnecting.');
      }
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:shadow-md">
      <Toaster position="top-right" />

      {/* Subtle top decorative gradient line */}
      <div
        className={`h-1.5 w-full transition-colors ${
          isConnected
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
            : 'bg-gradient-to-r from-amber-400 via-rose-400 to-slate-400'
        }`}
      />

      <div className="p-6 sm:p-8">
        {/* Header Row: Title, Service Icons, Status Badge */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/60 shadow-xs">
              {/* Google Brand Colored 'G' Icon */}
              <svg className="h-7 w-7" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                <Video className="h-3 w-3" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900">Google Calendar & Meet</h3>
                {/* Visual Status Indicator */}
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected ✅
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Not Connected ❌
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-xl">
                Automatically generate Google Meet video conference links on your personal calendar for scheduled live
                classes. You retain full host authority, attendee moderation, and calendar management.
              </p>
            </div>
          </div>
        </div>

        {/* Informative Feature Highlights */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <Video className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">Host Privileges</span>
              <span className="text-slate-600">You are the primary Meet host with recording and room controls.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <Calendar className="h-5 w-5 shrink-0 text-purple-600 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">Direct Calendar Sync</span>
              <span className="text-slate-600">Events land directly in your Google Calendar schedule.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900 block">Enrolled Whitelist</span>
              <span className="text-slate-600">Enrolled students bypass the waiting room automatically.</span>
            </div>
          </div>
        </div>

        {/* Connection State Details & Alerts */}
        <div className="mt-6">
          {isConnected ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-900">
                    Your Google Account is active & ready
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    When you are scheduled to teach a live class, Learnify creates the Google Meet session on your calendar
                    24 hours before class start. You do not need to manually configure links.
                  </p>
                  {instructorEmail && (
                    <div className="pt-1 text-xs text-emerald-700">
                      Registered teacher email: <span className="font-medium text-emerald-900">{instructorEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-900">
                    Action Required: Account not linked
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Without connecting your Google account, scheduled live classes assigned to you will fall back to a system
                    calendar or fail to generate Meet links. Connect now to ensure uninterrupted live classes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Scope: calendar.events (Offline access for background scheduling)</span>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                {showConfirmDisconnect ? (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-1.5 border border-rose-200">
                    <span className="text-xs font-medium text-rose-800 px-2">Confirm disconnect?</span>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Yes, Disconnect'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDisconnect(false)}
                      disabled={isPending}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDisconnect(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-rose-600 shadow-xs hover:bg-rose-50 hover:border-rose-200 transition"
                  >
                    <XCircle className="h-4 w-4 text-rose-500" />
                    Disconnect Google Account
                  </button>
                )}

                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  Reconnect / Switch Account
                </a>
              </>
            ) : (
              <a
                href="/api/auth/google"
                className="inline-flex items-center gap-2.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]"
              >
                {/* Google Colored Icon in button */}
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Connect Google Calendar
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
