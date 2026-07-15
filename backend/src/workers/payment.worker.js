// ─── Payment Worker (BullMQ) ──────────────────────────────────
// Subscribes to the 'payment' queue on the Redis Event Bus.
// PAYMENT_VERIFIED: activates the enrollment associated with a payment.
//
// Architecture rules:
//   ✅ Enrollment status update NEVER happens on the main API thread
//   ✅ All DB writes are idempotent (updateMany with status check)
//   ✅ Worker retries up to 3× with exponential back-off
//
// Run: node src/workers/payment.worker.js
// PM2: pm2 start src/workers/payment.worker.js --name learnify-payment-worker

'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const prisma  = require('../config/db');
const logger  = require('../config/logger');
const { getRedisClient, PAYMENT_QUEUE } = require('../config/queue');

// ═════════════════════════════════════════════════════════════════
// PAYMENT_VERIFIED handler
// ═════════════════════════════════════════════════════════════════

/**
 * When a payment is verified, set the related Enrollment to ACTIVE.
 *
 * Idempotency: `updateMany` with `status: { notIn: ['ACTIVE', 'COMPLETED'] }`
 * means running this twice for the same enrollment is a no-op.
 *
 * @param {import('bullmq').Job} job
 */
async function handlePaymentVerified(job) {
  const { paymentId, enrollmentId } = job.data;

  logger.info({ paymentId, enrollmentId }, '[Payment Worker] Processing PAYMENT_VERIFIED');

  // Idempotent update: only set ACTIVE if not already ACTIVE or COMPLETED
  const result = await prisma.enrollment.updateMany({
    where: {
      id: enrollmentId,
      status: { notIn: ['ACTIVE', 'COMPLETED'] },
    },
    data: { status: 'ACTIVE' },
  });

  if (result.count === 0) {
    logger.info({ enrollmentId }, '[Payment Worker] Enrollment already ACTIVE/COMPLETED — no-op');
  } else {
    logger.info({ enrollmentId }, '[Payment Worker] Enrollment activated');
  }
}

// ── Worker registration ───────────────────────────────────────

function startPaymentWorker() {
  const connection = getRedisClient();

  if (!connection) {
    logger.warn('[Payment Worker] Redis not configured - worker disabled');
    return null;
  }

  const worker = new Worker(
    PAYMENT_QUEUE,
    async (job) => {
      if (job.name === 'PAYMENT_VERIFIED') return handlePaymentVerified(job);
      logger.warn({ jobName: job.name }, '[Payment Worker] Unknown job type');
    },
    { connection, concurrency: 10 }
  );

  worker.on('completed', (job) =>
    logger.info({ jobId: job.id, jobName: job.name }, '[Payment Worker] Job completed')
  );
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, jobName: job?.name, err }, '[Payment Worker] Job failed')
  );
  worker.on('error', (err) =>
    logger.error({ err }, '[Payment Worker] Worker error')
  );

  async function shutdown() {
    logger.info('[Payment Worker] Shutting down gracefully...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info({ queue: PAYMENT_QUEUE }, '[Payment Worker] Listening on queue');

  return worker;
}

if (require.main === module) {
  startPaymentWorker();
}

module.exports = { startPaymentWorker, handlePaymentVerified };
