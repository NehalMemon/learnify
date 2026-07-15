// ─── Enrollment Controller ───────────────────────────────────
// Student enrollment + progress tracking.

const prisma = require('../config/db');

// ── POST /api/v1/enrollments ─────────────────────────────────
// Enroll current user (or admin enrolling a student) into a course.
// HIGH-04 fix: Wrap enrollment and initial progress creation in prisma.$transaction
// to prevent race conditions and ensure atomic progress initialization.

const createEnrollment = async (req, res, next) => {
  try {
    const { courseId, userId: targetUserId } = req.body;
    const isAdmin = req.user.role === 'ADMIN';

    // Admin can enroll any user; students can only enroll themselves
    const userId = isAdmin && targetUserId ? targetUserId : req.user.id;

    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          select: { id: true, sequence: true, requiredModuleId: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    if (!course.isPublished && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This course is not yet available for enrollment.',
      });
    }

    // Check for existing enrollment
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'Already enrolled in this course.',
        data: existingEnrollment,
      });
    }

    // HIGH-04 fix: Atomic transaction for enrollment + progress initialization
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'ACTIVE',
        },
        include: {
          course: {
            select: { id: true, title: true, courseType: true },
          },
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
      });

      // 2. Initialize ModuleProgress for all modules in the course
      // First module is unlocked by default; others are locked until prerequisites are met
      if (course.modules.length > 0) {
        const sortedModules = course.modules.sort((a, b) => a.sequence - b.sequence);

        const progressRecords = sortedModules.map((module, index) => ({
          enrollmentId: enrollment.id,
          moduleId: module.id,
          isUnlocked: index === 0 && !module.requiredModuleId, // First module without prereq is unlocked
          isCompleted: false,
        }));

        await tx.moduleProgress.createMany({
          data: progressRecords,
        });
      }

      return enrollment;
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enrollments/my ───────────────────────────────
// Current user's enrollments with course info and progress.

const getMyEnrollments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            courseType: true,
            category: true,
            instructor: true,
            classroomUrl: true,
            division: { select: { id: true, name: true, slug: true } },
            _count: { select: { modules: true } },
            // 3NF: meeting link/schedule sourced from ClassSession, not Course
            classSessions: {
              where: { scheduledAt: { gte: new Date() } },
              orderBy: { scheduledAt: 'asc' },
              take: 1,
              select: { meetingLink: true, scheduledAt: true, title: true, platform: true },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            dueDate: true,
            paymentType: true,
            amount: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/enrollments/:id ──────────────────────────────
// Detailed enrollment view — includes module progress.

const getEnrollmentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
        course: {
          include: {
            division: { select: { id: true, name: true, slug: true } },
            modules: {
              orderBy: { sequence: 'asc' },
              include: {
                materials: {
                  orderBy: { sequence: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    materialType: true,
                    secureViewOnly: true,
                    sequence: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            paymentType: true,
            amount: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
        },
        materialProgress: true,
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found.',
      });
    }

    // Ensure the user can only view their own enrollment (unless admin)
    if (enrollment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this enrollment.',
      });
    }

    res.json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

// ── FINDING-08: markMaterialComplete intentionally removed ────
// The duplicate synchronous progress-write path that existed here
// has been deleted. The authoritative, event-driven write path is:
//   POST /api/v1/progress/material/:materialId/complete
// handled by src/controllers/progress.controller.js via BullMQ.
// Having two paths caused split-brain state (one fired the async
// module-unlock worker, the other did not).

module.exports = {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentDetail,
};
