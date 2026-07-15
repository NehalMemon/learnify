// ─── Cron Service ───────────────────────────────────────────
// Scheduled background jobs for the Learnify platform.
//
// Jobs registered here:
//   • 03:00 daily — deactivate users whose accessExpiresAt has passed.

'use strict';

const cron = require('node-cron');
const prisma = require('../config/db');
const logger = require('../config/logger');
const NotificationService = require('./notification.service');

/**
 * Sweep the users table and deactivate anyone whose access window
 * (accessExpiresAt) has expired.
 *
 * Steps:
 *   1. Find all users with an expired accessExpiresAt AND at least one
 *      access flag still enabled (so we don't re-process already-locked users).
 *   2. Flip both access flags off and clear accessExpiresAt in a single round-trip.
 *   3. Notify each affected user in-app.
 *
 * @returns {Promise<{ scanned: number, deactivated: number }>}
 */
const deactivateExpiredUsers = async () => {
  const now = new Date();

  // Step 1 — Find expired users who still hold access.
  const expiredUsers = await prisma.user.findMany({
    where: {
      accessExpiresAt: { lt: now },
      OR: [
        { learnifyEnabled: true },
        { doctorsQuizzEnabled: true },
      ],
    },
    select: { id: true, email: true },
  });

  if (expiredUsers.length === 0) {
    logger.info('Cron[deactivateExpiredUsers]: no expired users to deactivate.');
    return { scanned: 0, deactivated: 0 };
  }

  const ids = expiredUsers.map((u) => u.id);

  // Step 2 — Bulk deactivate in a single query.
  const result = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: {
      learnifyEnabled: false,
      doctorsQuizzEnabled: false,
      accessExpiresAt: null,
    },
  });

  logger.info(
    { scanned: expiredUsers.length, deactivated: result.count },
    'Cron[deactivateExpiredUsers]: expired users deactivated.'
  );

  // Step 3 — Notify each affected user. NotificationService is
  // already exception-safe, so one failure will not abort the loop.
  await Promise.all(
    ids.map((userId) =>
      NotificationService.notify(
        userId,
        'Account Restricted',
        'Your 30-day access has expired. Please contact your administrator to renew.',
        '/dashboard'
      )
    )
  );

  return { scanned: expiredUsers.length, deactivated: result.count };
};

/**
 * Register all recurring jobs. Call once on server boot.
 */
const startCronJobs = () => {
  // 03:00 every day, server local time.
  // Cron expression: min hour day month weekday  →  0 3 * * *
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron[03:00]: daily access-expiry sweep starting.');
    try {
      await deactivateExpiredUsers();
    } catch (error) {
      logger.error(
        { err: error },
        'Cron[03:00]: deactivateExpiredUsers failed.'
      );
    }
  });

  logger.info('Cron jobs registered (daily access-expiry sweep @ 03:00).');
};

module.exports = {
  startCronJobs,
  deactivateExpiredUsers,
};
