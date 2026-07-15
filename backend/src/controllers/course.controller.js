// ─── Course Controller ───────────────────────────────────────
// Public course discovery (catalog + detail) and student-facing
// course access routing.
//
// Security: objectUrl (S3 path) is NEVER returned in public responses.
// Signed URLs are served via a separate authenticated endpoint.

const prisma = require('../config/db');

// ── GET /api/v1/courses — Public Catalog ─────────────────────
// Supports: ?division=FOUNDATION|MEDED, ?category=..., ?type=...
//           ?search=..., ?page=1, ?limit=20

const getCourses = async (req, res, next) => {
  try {
    const {
      division,   // 'FOUNDATION' | 'MEDED' (division slug)
      category,
      type,       // CourseType enum
      search,
      page  = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = { isPublished: true };

    // Filter by division slug — join via division relation
    if (division) {
      where.division = { slug: { equals: division, mode: 'insensitive' } };
    }
    if (category) where.category = category;
    if (type)     where.courseType = type;
    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { instructor:  { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: Number(limit),
        // Optimization: NO nested modules here — just the overview row.
        // Full module tree is available via GET /courses/:id.
        select: {
          id:          true,
          title:       true,
          description: true,
          courseType:  true,
          category:    true,
          instructor:  true,
          price:       true,
          createdAt:   true,
          division:    { select: { id: true, name: true, slug: true } },
          _count:      { select: { modules: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        courses,
        pagination: {
          page:  Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/courses/:id ──────────────────────────────────

const getCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        division: { select: { id: true, name: true, slug: true } },
        // Curriculum outline only — materials listed without objectUrl (S3 path)
        modules: {
          orderBy: { sequence: 'asc' },
          select: {
            id:              true,
            title:           true,
            sequence:        true,
            requiredModuleId: true,
            materials: {
              orderBy: { sequence: 'asc' },
              select: {
                id:           true,
                title:        true,
                materialType: true,
                sequence:     true,
                durationSec:  true,
                thumbnailUrl: true,
                // objectUrl intentionally excluded — secure content only
              },
            },
            _count: { select: { materials: true } },
          },
        },
        // Upcoming live classes
        classSessions: {
          where:   { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
          select: {
            id:          true,
            title:       true,
            scheduledAt: true,
            platform:    true,
            // meetingLink excluded from public response
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Unpublished courses visible only to admins
    if (!course.isPublished && (!req.user || req.user.role !== 'ADMIN')) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    return res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/courses/:id/modules ──────────────────────────
// Returns modules with dynamic `isLocked` based on user's progress.

const getCourseModules = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user.id;

    // Confirm enrollment is active
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment || enrollment.status === 'PAUSED') {
      return res.status(403).json({
        success: false,
        message: enrollment
          ? 'Your course access is paused due to pending payment.'
          : 'You are not enrolled in this course.',
      });
    }

    // Fetch modules with materials and progress concurrently —
    // both queries depend only on courseId/enrollmentId, not each other
    const [modules, progressRecords] = await Promise.all([
      prisma.module.findMany({
        where: { courseId },
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
      }),
      prisma.materialProgress.findMany({
        where: { enrollmentId: enrollment.id },
      }),
    ]);

    const completedMaterials = new Set(
      progressRecords.filter((p) => p.isCompleted).map((p) => p.materialId)
    );

    // Build a map of module completion:  module is complete if ALL its materials are completed
    const moduleCompletionMap = {};
    for (const mod of modules) {
      const allComplete =
        mod.materials.length > 0 &&
        mod.materials.every((m) => completedMaterials.has(m.id));
      moduleCompletionMap[mod.id] = allComplete;
    }

    // Determine lock status
    const enrichedModules = modules.map((mod) => {
      let isLocked = false;

      if (mod.requiredModuleId) {
        isLocked = !moduleCompletionMap[mod.requiredModuleId];
      }

      // Attach completion info per material
      const materialsWithProgress = mod.materials.map((m) => ({
        ...m,
        isCompleted: completedMaterials.has(m.id),
      }));

      return {
        id: mod.id,
        title: mod.title,
        sequence: mod.sequence,
        requiredModuleId: mod.requiredModuleId,
        isLocked,
        isCompleted: moduleCompletionMap[mod.id],
        materials: isLocked ? [] : materialsWithProgress,
      };
    });

    res.json({
      success: true,
      data: {
        courseId,
        enrollmentStatus: enrollment.status,
        progressPercent: enrollment.progressPercent,
        modules: enrichedModules,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/courses/:id/live-class ───────────────────────
// Verifies enrollment, then redirects to the live class link.

const joinLiveClass = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user.id;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Active enrollment required to join live class.',
      });
    }

    // Parallelize session+course fetch — both are independent reads
    const [session, course] = await Promise.all([
      prisma.classSession.findFirst({
        where: {
          courseId,
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { meetingLink: true, scheduledAt: true, title: true, platform: true },
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      }),
    ]);

    if (!session || !session.meetingLink) {
      return res.status(404).json({
        success: false,
        message: 'No upcoming live class link is currently set for this course.',
      });
    }

    res.json({
      success: true,
      data: {
        courseTitle: course?.title,
        meetingLink: session.meetingLink,
        scheduledAt: session.scheduledAt,
        sessionTitle: session.title,
        platform: session.platform,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/courses/:id/classroom ────────────────────────
// Verifies enrollment, then returns Google Classroom URL.

const getClassroom = async (req, res, next) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user.id;

    // Parallelize enrollment+course fetch — both are independent reads
    const [enrollment, course] = await Promise.all([
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        select: { classroomUrl: true, title: true },
      }),
    ]);

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Active enrollment required to access classroom.',
      });
    }

    if (!course || !course.classroomUrl) {
      return res.status(404).json({
        success: false,
        message: 'No classroom link is set for this course.',
      });
    }

    res.json({
      success: true,
      data: {
        courseTitle: course.title,
        classroomUrl: course.classroomUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCourses, getCourse, getCourseModules, joinLiveClass, getClassroom };
