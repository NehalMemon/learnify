import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Restricted | Learnify',
  description: 'You do not have access to this section of the platform.',
};

/**
 * /no-access — shown when a student tries to access a platform section
 * their account has not been enabled for (e.g., Learnify vs DoctorsQuizz).
 *
 * This page is the middleware's safe landing zone that prevents the
 * /dashboard → /quiz → /dashboard infinite redirect loop for accounts
 * with no entitlements assigned yet.
 */
export default function NoAccessPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="mt-2 text-muted-foreground">
            Your account hasn&apos;t been granted access to this section yet. Please contact
            support or wait for an administrator to activate your access.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            Back to Login
          </Link>
          <a
            href="mailto:support@learnify.pk"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors min-h-[44px]"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
