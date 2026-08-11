/**
 * Learnify - Local Dev Cron Worker
 *
 * Replicates the Hostinger production cron in development by pinging
 * GET /api/cron/live-classes once per minute, so Google Meet links are
 * generated for scheduled live classes without waiting for a real trigger.
 *
 * Usage:
 *   npm run dev:cron   (from the frontend directory)
 *
 * Requires CRON_SECRET to be set in frontend/.env.local.
 * Uses native fetch (Node >= 18) — no node-fetch dependency needed.
 */
import cron from 'node-cron';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load frontend env vars (.env.local takes priority, matching Next.js)
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: path.join(frontendRoot, '.env.local') });

const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  console.error('❌ CRON_SECRET is missing. Add it to frontend/.env.local');
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const cronUrl = `${baseUrl.replace(/\/$/, '')}/api/cron/live-classes`;

console.log('🧪 Starting Local Dev Cron Worker...');
console.log(`   Target: ${cronUrl}`);

// Run every minute for testing purposes
cron.schedule('* * * * *', async () => {
  console.log('⏰ Ping API Route...');
  try {
    const res = await fetch(cronUrl, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    console.log('✅ Cron Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(
      '❌ Cron Ping Failed:',
      error instanceof Error ? error.message : error
    );
  }
});
