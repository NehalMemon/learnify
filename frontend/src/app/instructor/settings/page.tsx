import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { GoogleCalendarIntegrationCard } from '@/components/instructor/GoogleCalendarIntegrationCard';
import { Mail, Sparkles, Check } from 'lucide-react';

export const metadata = {
  title: 'Instructor Settings | Learnify',
  description: 'Manage your connected accounts, Google Calendar integration, and live class teaching settings.',
};

/**
 * Instructor Settings Page (React Server Component)
 *
 * Authenticates the instructor session server-side, queries their record
 * in `public.users` to determine connection status, and hydrates the
 * interactive GoogleCalendarIntegrationCard.
 */
export default async function InstructorSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?error=unauthorized');
  }

  // Fetch instructor's profile details including google_refresh_token
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url, google_refresh_token, created_at')
    .eq('id', user.id)
    .single();

  const isConnected = Boolean(profile?.google_refresh_token);
  const fullName = profile?.full_name || 'Instructor';
  const email = profile?.email || user.email || '';
  const role = profile?.role || 'INSTRUCTOR';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Top Page Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
          <span>Instructor Portal</span>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Settings</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Instructor Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your personal teaching integrations, live calendar sync, and conference host credentials.
        </p>
      </div>

      {/* Instructor Profile Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-lg shadow-sm">
            {fullName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                {role}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <span>Account Status:</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>
      </div>

      {/* Primary Integration Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">External Integrations</h2>
            <p className="text-xs text-slate-500">
              Connect third-party platforms to automate your live workshop & seminar operations.
            </p>
          </div>
        </div>

        {/* Google Calendar & Meet Integration Card */}
        <GoogleCalendarIntegrationCard initialConnected={isConnected} instructorEmail={email} />
      </section>

      {/* Integration Guide / Documentation */}
      <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span>How Google Calendar Integration Works</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>1. Offline OAuth Link</span>
            </div>
            <p>
              When you connect, Learnify securely stores an encrypted refresh token used exclusively for scheduling
              events on your calendar.
            </p>
          </div>

          <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>2. Automated 24h Sync</span>
            </div>
            <p>
              24 hours before your assigned class begins, our cron automation mints a meeting link with you as the host
              and whitelists enrolled students.
            </p>
          </div>

          <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>3. Full Host Control</span>
            </div>
            <p>
              You enter the meeting room with full host privileges: screen sharing, participant muting, breakout rooms,
              and optional cloud recording.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
