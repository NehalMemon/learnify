import { createClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────
interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}

interface NotifyAllAdminsParams {
  title: string;
  message: string;
  type: string;
  link?: string;
}

// ─── Admin Client (singleton, lazy-initialized) ─────────────
// Why a dedicated admin client: RLS blocks cross-user inserts.
// The service-role key bypasses RLS so server actions can write
// notifications into any user's row without policy exceptions.
let _adminClient: any = null;

function getAdminClient(): any {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY – notifications cannot be sent.'
    );
  }

  _adminClient = createClient(url, key);
  return _adminClient;
}

// ─── Core: sendNotification ─────────────────────────────────
/**
 * Inserts a single notification row for a specific user.
 * Uses the Supabase Admin client (service-role key) to bypass
 * Row Level Security so any server action can notify any user.
 *
 * @param params.userId  - Target recipient's auth UID
 * @param params.title   - Notification headline
 * @param params.message - Body text
 * @param params.type    - Semantic type (e.g. CREDIT_REQUEST, CREDIT_UPDATE)
 * @param params.link    - Optional in-app route the notification links to
 */
export async function sendNotification({
  userId,
  title,
  message,
  type,
  link,
}: SendNotificationParams): Promise<void> {
  try {
    const admin = getAdminClient();

    const { error } = await admin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link: link ?? null,
      is_read: false,
    });

    if (error) {
      console.error('[notifications] sendNotification insert error:', error);
    }
  } catch (err) {
    // Non-fatal: notification failure must never block the primary action
    console.error('[notifications] sendNotification exception:', err);
  }
}

// ─── Helper: notifyAllAdmins ────────────────────────────────
/**
 * Fetches every user with an admin-level role and inserts a
 * notification for each one. Uses the Admin client for both
 * the user query and the notification insert so RLS is fully
 * bypassed end-to-end.
 *
 * Role matching is case-insensitive and covers common variants:
 * ADMIN, admin, CHIEF_ADMINISTRATOR, etc.
 *
 * @param params.title   - Notification headline
 * @param params.message - Body text
 * @param params.type    - Semantic type (e.g. CREDIT_REQUEST)
 * @param params.link    - Optional in-app route
 */
export async function notifyAllAdmins({
  title,
  message,
  type,
  link,
}: NotifyAllAdminsParams): Promise<void> {
  try {
    const admin = getAdminClient();

    // Fetch admin IDs using the admin client to bypass user-table RLS
    // The Postgres "Role" enum only accepts: 'STUDENT' | 'ADMIN' (uppercase)
    const { data: admins, error: fetchErr } = await admin
      .from('users')
      .select('id')
      .eq('role', 'ADMIN');

    if (fetchErr) {
      console.error('[notifications] notifyAllAdmins user fetch error:', fetchErr);
      return;
    }

    const adminIds = (admins ?? []).map((a: any) => a.id as string);

    if (adminIds.length === 0) {
      console.error('[notifications] notifyAllAdmins: no admin users found');
      return;
    }

    // Batch insert one notification per admin
    const rows = adminIds.map((adminId: string) => ({
      user_id: adminId,
      title,
      message,
      type,
      link: link ?? null,
      is_read: false,
    }));

    const { error: insertErr } = await admin.from('notifications').insert(rows);

    if (insertErr) {
      console.error('[notifications] notifyAllAdmins insert error:', insertErr);
    }
  } catch (err) {
    console.error('[notifications] notifyAllAdmins exception:', err);
  }
}
