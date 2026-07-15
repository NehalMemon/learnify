// ─── Progress Worker (BullMQ) ─────────────────────────────────
// Subscribes to the 'progress' queue on the Redis Event Bus.
// Handles module-completion detection and sequential module unlocking.
//
// Architecture rules enforced:
//   ✅ No module-unlock logic on the main Express thread
//   ✅ All DB writes are idempotent (upsert, not insert)
//   ✅ Worker retries up to 3× with exponential back-off
//   ✅ Processing the same event twice produces the same result
//
// Run this worker as a separate process:
//   node src/workers/progress.worker.js
//
// In production, use PM2 or a container sidecar:
//   pm2 start src/workers/progress.worker.js --name learnify-progress-worker

'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const prisma  = require('../config/db');
const logger  = require('../config/logger');
const { getRedisClient, PROGRESS_QUEUE } = require('../config/queue');

// ══════════════════════════════════════════════════════════════
// MATERIAL_COMPLETED handler
// ══════════════════════════════════════════════════════════════

/**
 * Processes a MATERIAL_COMPLETED event.
 *
 * Logic:
 *   1. Count completed materials in this module for this enrollment.
 *   2. Count total materials in this module.
 *   3. If all materials are done → mark moduleProgress.isCompleted = true.
 *   4. Find the dependent module (requiredModuleId === current moduleId).
 *   5. If found → upsert its ModuleProgress.isUnlocked = true.
 *   6. Recalculate overall enrollment progressPercent.
 *
 * All DB writes use upsert — safe to run multiple times (idempotent).
 *
 * @param {import('bullmq').Job} job
 */
async function handleMaterialCompleted(job) {
  // L-5 fix: materialId is part of the payload but not used in this handler;
  // prefixed with _ to communicate the intentional non-use.
  const { enrollmentId, moduleId, _materialId, courseId } = job.data;

  logger.info({ enrollmentId, moduleId }, '[Progress Worker] Processing MATERIAL_COMPLETED');

  const [completedCount, totalCount] = await Promise.all([
    prisma.materialProgress.count({
      where: { enrollmentId, material: { moduleId }, isCompleted: true },
    }),
    prisma.material.count({ where: { moduleId } }),
  ]);

  logger.info({ moduleId, completedCount, totalCount }, '[Progress Worker] Module material count');

  if (completedCount < totalCount) return; // module not yet complete

  // Wrap all progress updates in a transaction to prevent race conditions
  // from concurrent MATERIAL_COMPLETED events overwriting each other's stale data
  await prisma.$transaction(async (tx) => {
    // ── Mark current module as completed ─────────────────────────
    await tx.moduleProgress.upsert({
      where: { enrollmentId_moduleId: { enrollmentId, moduleId } },
      update: { isCompleted: true, completedAt: new Date() },
      create: { enrollmentId, moduleId, isUnlocked: true, isCompleted: true, completedAt: new Date() },
    });

    logger.info({ moduleId }, '[Progress Worker] Module COMPLETED');

    // ── Unlock the next module (if any) ──────────────────────────
    const nextModule = await tx.module.findFirst({
      where: { courseId, requiredModuleId: moduleId },
      select: { id: true, sequence: true },
    });

    if (nextModule) {
      await tx.moduleProgress.upsert({
        where: { enrollmentId_moduleId: { enrollmentId, moduleId: nextModule.id } },
        update: { isUnlocked: true },
        create: { enrollmentId, moduleId: nextModule.id, isUnlocked: true, isCompleted: false },
      });
      logger.info({ nextModuleId: nextModule.id, sequence: nextModule.sequence }, '[Progress Worker] Next module UNLOCKED');
    }

    // ── Recalculate enrollment progress % ────────────────────────
    const [completedModules, totalModules] = await Promise.all([
      tx.moduleProgress.count({ where: { enrollmentId, isCompleted: true } }),
      tx.module.count({ where: { courseId } }),
    ]);

    const progressPercent = totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;

    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent,
        status: progressPercent === 100 ? 'COMPLETED' : undefined,
      },
    });

    logger.info({ enrollmentId, progressPercent }, '[Progress Worker] Enrollment progress updated');
  });
}

// ── Worker registration ───────────────────────────────────────

function startProgressWorker() {
  const connection = getRedisClient();

  if (!connection) {
    logger.warn('[Progress Worker] Redis not configured - worker disabled');
    return null;
  }

  const worker = new Worker(
    PROGRESS_QUEUE,
    async (job) => {
      if (job.name === 'MATERIAL_COMPLETED') return handleMaterialCompleted(job);
      logger.warn({ jobName: job.name }, '[Progress Worker] Unknown job type');
    },
    { connection, concurrency: 5 }
  );

  worker.on('completed', (job) =>
    logger.info({ jobId: job.id, jobName: job.name }, '[Progress Worker] Job completed')
  );
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, jobName: job?.name, err }, '[Progress Worker] Job failed')
  );
  worker.on('error', (err) =>
    logger.error({ err }, '[Progress Worker] Worker error')
  );

  async function shutdown() {
    logger.info('[Progress Worker] Shutting down gracefully...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info({ queue: PROGRESS_QUEUE }, '[Progress Worker] Listening on queue');

  return worker;
}

if (require.main === module) {
  startProgressWorker();
}

module.exports = { startProgressWorker, handleMaterialCompleted };
