// ─── Content Controller ───────────────────────────────────────
// GET /api/v1/courses/:courseId/content
//
// Security Model:
//   1. authenticate middleware verifies JWT → req.user populated
//   2. This handler verifies the user has an ACTIVE enrollment
//   3. A single Prisma query fetches modules + materials + both
//      progress tables — zero N+1 queries (security.md §Prisma Optimization)
//
// Response shape:
//   { success, data: { course, enrollment, modules: [ { ...module,
//     materials: [...], moduleProgress, materials[].materialProgress } ] } }

'use strict';

const prisma = require('../config/db');

/**
 * GET /api/v1/courses/:courseId/content
 *
 * Returns the full course content tree annotated with the
 * requesting student's per-module and per-material progress.
 *
 * @security authenticate
 */
const getCourseContent = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // ── Single query: enrollment + course + modules + materials + progress ──
    // Prisma uses LEFT JOINs for nested includes — one round trip.
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            courseType: true,
            instructor: true,
            isPublished: true,
          },
        },
        modules: {
          // moduleProgress on Enrollment → ModuleProgress[]
          // filtered to this enrollment automatically via the FK
          orderBy: { sequence: 'asc' },
          include: {
            materials: {
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                title: true,
                materialType: true,
                thumbnailUrl: true,
                durationSec: true,
                sequence: true,
                // NOTE: objectUrl is intentionally excluded here.
                // It is only served via a signed-URL endpoint to
                // enforce secure_view_only (security.md §Payment Lock).
              },
            },
            moduleProgress: {
              where: { enrollmentId: { not: undefined } },
            },
          },
        },
        moduleProgress: true,
        materialProgress: {
          select: {
            materialId: true,
            isCompleted: true,
            completedAt: true,
          },
        },
      },
    });

    // ── Authorization checks ──────────────────────────────────

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course.',
      });
    }

    if (enrollment.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Course access is ${enrollment.status.toLowerCase()}. Please contact support.`,
      });
    }

    // ── Shape the response — annotate each module with per-student state ──
    // Build a materialId → progress lookup to avoid nested loops (O(n)).
    const matProgressMap = new Map(
      enrollment.materialProgress.map((p) => [p.materialId, p])
    );

    // Build a moduleId → moduleProgress lookup
    const modProgressMap = new Map(
      enrollment.moduleProgress.map((p) => [p.moduleId, p])
    );

    const modules = enrollment.modules.map((mod) => {
      const progress = modProgressMap.get(mod.id) ?? {
        isUnlocked: mod.sequence === 1, // first module is always unlocked
        isCompleted: false,
        completedAt: null,
      };

      const materials = mod.materials.map((mat) => ({
        ...mat,
        progress: matProgressMap.get(mat.id) ?? {
          isCompleted: false,
          completedAt: null,
        },
      }));

      return {
        id: mod.id,
        title: mod.title,
        sequence: mod.sequence,
        requiredModuleId: mod.requiredModuleId,
        progress,
        materials,
      };
    });

    res.json({
      success: true,
      data: {
        course: enrollment.course,
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          progressPercent: enrollment.progressPercent,
          enrolledAt: enrollment.enrolledAt,
        },
        modules,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCourseContent };
