// ─── Progress Controller ──────────────────────────────────────
// POST /api/v1/progress/material/:materialId/complete
//
// Architecture pattern (architecture.md):
//   Main thread  → fast DB upsert → publish event → return 200
//   BullMQ worker → handles module unlock logic asynchronously
//
// This controller NEVER performs module-unlock logic directly.
// That is the responsibility of src/workers/progress.worker.js.

'use strict';

const prisma = require('../config/db');
const { getQueue, PROGRESS_QUEUE } = require('../config/queue');

/**
 * POST /api/v1/progress/material/:materialId/complete
 *
 * Marks a material as completed for the authenticated student.
 * Immediately returns 200 after publishing a MATERIAL_COMPLETED
 * event to the progress queue for async module-unlock processing.
 *
 * @security authenticate
 */
const completeMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;

    // ── 1. Resolve the material and verify the user's enrollment ───
    // Parallelize both lookups — they only depend on req params, not each other
    const [material, enrollmentByModule] = await Promise.all([
      prisma.material.findUnique({
        where: { id: materialId },
        select: {
          id: true,
          moduleId: true,
          module: {
            select: {
              id: true,
              courseId: true,
            },
          },
        },
      }),
      // Deferred: we need courseId from material to look up enrollment.
      // Since we can't know courseId before material resolves, we keep
      // enrollment lookup sequential for correctness.
      null,
    ]);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found.',
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: material.module.courseId,
        },
      },
      select: { id: true, status: true },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'You do not have active access to this course.',
      });
    }

    // ── 2. Upsert MaterialProgress — idempotent ────────────────
    // Marking a material complete twice must not create duplicates
    // or corrupt state (architecture.md §Idempotency).
    const progress = await prisma.materialProgress.upsert({
      where: {
        enrollmentId_materialId: {
          enrollmentId: enrollment.id,
          materialId,
        },
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
      },
      create: {
        enrollmentId: enrollment.id,
        materialId,
        isCompleted: true,
        completedAt: new Date(),
      },
      select: { id: true, isCompleted: true, completedAt: true },
    });

    // ── 3. Publish MATERIAL_COMPLETED event to the progress queue ──
    // The worker handles module-unlock logic asynchronously.
    // If Redis is not configured, this is a no-op and the
    // main API remains functional (graceful degradation).
    const queue = getQueue(PROGRESS_QUEUE);
    if (queue) {
      await queue.add(
        'MATERIAL_COMPLETED',
        {
          userId,
          enrollmentId: enrollment.id,
          moduleId: material.moduleId,
          materialId,
          courseId: material.module.courseId,
        },
        {
          // Deduplication: don't queue the same material completion
          // twice within a 10-second window (idempotency guard).
          jobId: `mat_complete:${enrollment.id}:${materialId}`,
          removeOnComplete: { age: 86400 }, // keep 24h for audit
          removeOnFail: { count: 50 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }
      );
    }

    // ── 4. Return immediately — do not wait for worker ─────────
    return res.status(200).json({
      success: true,
      message: 'Material marked as complete.',
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { completeMaterial };
