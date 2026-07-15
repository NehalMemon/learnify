// ─── Admin Course Management Controller ──────────────────────
// CRUD operations for Courses, Modules, and Materials.
// Also: live-class link updates, enrollment admin, publish toggles.
//
// Materials: Supports multipart/form-data file uploads via multer.
// Files are stored locally via storage.service.js (cloud-ready abstraction).

const prisma = require('../config/db');
const storageService = require('../services/storage.service');

// ═══════════════════════════════════════════════════════════════
// COURSE CRUD
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/admin/courses ────────────────────────────────

const listCourses = async (req, res, next) => {
  try {
    const { divisionId, category, courseType, page = 1, limit = 20, search } = req.query;
    // FINDING-07 fix: clamp pagination to prevent OOM from unbounded queries
    const safePage  = Math.max(1, parseInt(page)  || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const where = {};
    if (divisionId) where.divisionId = divisionId;
    if (category) where.category = category;
    if (courseType) where.courseType = courseType;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          division: { select: { id: true, name: true, slug: true } },
          _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/courses ───────────────────────────────

const createCourse = async (req, res, next) => {
  try {
    const {
      divisionId,
      title,
      description,
      courseType,
      category,
      instructor,
      price,
      classroomUrl,
      isPublished,
    } = req.body;

    // Verify division exists
    const division = await prisma.division.findUnique({ where: { id: divisionId } });
    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'Invalid division ID.',
      });
    }

    const course = await prisma.course.create({
      data: {
        divisionId,
        title,
        description: description || null,
        courseType,
        category: category || null,
        instructor: instructor || null,
        price: price || 0,
        classroomUrl: classroomUrl || null,
        isPublished: isPublished || false,
      },
      include: {
        division: { select: { id: true, name: true, slug: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/courses/:id ────────────────────────────

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      courseType,
      category,
      instructor,
      price,
      classroomUrl,
      isPublished,
    } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (courseType !== undefined) data.courseType = courseType;
    if (category !== undefined) data.category = category;
    if (instructor !== undefined) data.instructor = instructor;
    if (price !== undefined) data.price = price;
    if (classroomUrl !== undefined) data.classroomUrl = classroomUrl;
    if (isPublished !== undefined) data.isPublished = isPublished;

    const course = await prisma.course.update({
      where: { id },
      data,
      include: {
        division: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      message: 'Course updated.',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/courses/:id ─────────────────────────

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    res.json({ success: true, message: 'Course deleted.' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    next(error);
  }
};

// ── PATCH /api/v1/admin/courses/:id/publish ──────────────────

const togglePublish = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Wrap read-then-write in a transaction to prevent race conditions
    const updated = await prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id } });
      if (!course) {
        throw new Error('Course not found.');
      }

      return tx.course.update({
        where: { id },
        data: { isPublished: !course.isPublished },
        select: { id: true, title: true, isPublished: true },
      });
    });

    res.json({
      success: true,
      message: `Course ${updated.isPublished ? 'published' : 'unpublished'}.`,
      data: updated,
    });
  } catch (error) {
    if (error.message === 'Course not found.') {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    next(error);
  }
};

// ── PATCH /api/v1/admin/courses/:id/live-class ───────────────
// 3NF: meetZoomLink/nextClassTime removed from Course.
// This endpoint now upserts the next ClassSession for the course.

const updateLiveClassLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { meetingLink, scheduledAt, title, platform } = req.body;

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    const data = {};
    if (meetingLink !== undefined) data.meetingLink = meetingLink;
    if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : undefined;
    if (title !== undefined) data.title = title;
    if (platform !== undefined) data.platform = platform;

    // Create a new class session for this course
    const session = await prisma.classSession.create({
      data: {
        courseId: id,
        ...data,
      },
    });

    res.json({
      success: true,
      message: 'Live class session created.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// MODULE CRUD
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/admin/courses/:courseId/modules ──────────────

const listModules = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const modules = await prisma.module.findMany({
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
            objectUrl: true,
          },
        },
        requiredModule: { select: { id: true, title: true, sequence: true } },
      },
    });

    res.json({ success: true, data: modules });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/courses/:courseId/modules ─────────────

const createModule = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { title, sequence, requiredModuleId } = req.body;

    // Verify course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        sequence,
        requiredModuleId: requiredModuleId || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Module created.',
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/modules/:id ────────────────────────────

const updateModule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, sequence, requiredModuleId } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (sequence !== undefined) data.sequence = sequence;
    if (requiredModuleId !== undefined) data.requiredModuleId = requiredModuleId || null;

    const module = await prisma.module.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: 'Module updated.',
      data: module,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/modules/:id ─────────────────────────

const deleteModule = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.module.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Module deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// MATERIAL CRUD
// ═══════════════════════════════════════════════════════════════

// ── POST /api/v1/admin/modules/:moduleId/materials ───────────
// Creates a new material. Supports multipart/form-data file upload.
// Field name: 'file' (optional — can also use objectUrl string)

const createMaterial = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    
    // Multipart form-data: all fields are strings, must cast types
    const {
      title,
      materialType,
      objectUrl,
      secureViewOnly,
      sequence,
      durationSec,
      thumbnailUrl,
    } = req.body;

    const module = await prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    // Handle file upload if present, otherwise use provided objectUrl
    let finalObjectUrl = objectUrl || null;
    if (req.file) {
      finalObjectUrl = storageService.handleUpload(req.file);
    }

    // Type casting for form-data fields
    const material = await prisma.material.create({
      data: {
        moduleId,
        title,
        materialType,
        objectUrl:      finalObjectUrl,
        // Cast string 'true'/'false' to boolean, default to true
        secureViewOnly: secureViewOnly !== undefined ? (secureViewOnly === 'true') : true,
        // Cast to number, default to 0
        sequence:       sequence !== undefined ? Number(sequence) : 0,
        // Cast to number, only for VIDEO type
        durationSec:    materialType === 'VIDEO' && durationSec ? Number(durationSec) : null,
        thumbnailUrl:   thumbnailUrl   || null,
      },
    });

    res.status(201).json({ success: true, message: 'Material created.', data: material });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/materials/:id ──────────────────────────
// Updates a material. Supports multipart/form-data file upload.
// Field name: 'file' (optional — replaces existing objectUrl)

const updateMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Multipart form-data: all fields are strings, must cast types
    const { title, materialType, objectUrl, secureViewOnly, sequence, durationSec, thumbnailUrl } = req.body;

    // Build update data object
    const data = {};
    if (title          !== undefined) data.title          = title;
    if (materialType   !== undefined) data.materialType   = materialType;
    
    // Handle new file upload if present
    if (req.file) {
      // Get existing material to delete old file
      const existing = await prisma.material.findUnique({
        where: { id },
        select: { objectUrl: true },
      });
      
      if (existing?.objectUrl) {
        // Delete old file from storage
        storageService.deleteFile(existing.objectUrl);
      }
      
      // Store new file and get URL
      data.objectUrl = storageService.handleUpload(req.file);
    } else if (objectUrl !== undefined) {
      // Use provided objectUrl string if no file uploaded
      data.objectUrl = objectUrl;
    }
    
    // Type casting for form-data fields
    if (secureViewOnly !== undefined) {
      data.secureViewOnly = secureViewOnly === 'true';
    }
    if (sequence !== undefined) {
      data.sequence = Number(sequence);
    }
    if (durationSec !== undefined) {
      data.durationSec = durationSec ? Number(durationSec) : null;
    }
    if (thumbnailUrl !== undefined) {
      data.thumbnailUrl = thumbnailUrl;
    }

    const material = await prisma.material.update({ where: { id }, data });
    res.json({ success: true, message: 'Material updated.', data: material });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }
    next(error);
  }
};

// ── DELETE /api/v1/admin/materials/:id ───────────────────────
// Deletes a material and removes the associated file from storage.

const deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get material to retrieve file URL before deletion
    const material = await prisma.material.findUnique({
      where: { id },
      select: { objectUrl: true },
    });
    
    // Delete the file from storage first
    if (material?.objectUrl) {
      storageService.deleteFile(material.objectUrl);
    }
    
    // Then delete the database record (cascade will handle progress records)
    await prisma.material.delete({ where: { id } });
    
    res.json({ success: true, message: 'Material deleted.' });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ENROLLMENT ADMIN
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/admin/enrollments ────────────────────────────

const listEnrollments = async (req, res, next) => {
  try {
    const { courseId, userId, status, page = 1, limit = 20 } = req.query;
    // FINDING-07 fix: clamp pagination to prevent OOM from unbounded queries
    const safePage  = Math.max(1,   parseInt(page)  || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const where = {};
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          course: { select: { id: true, title: true, courseType: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, amount: true, dueDate: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      prisma.enrollment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/v1/admin/enrollments/:id/status ───────────────

const updateEnrollmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'PAUSED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE, PAUSED, or COMPLETED.',
      });
    }

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        course: { select: { id: true, title: true } },
      },
    });

    res.json({
      success: true,
      message: `Enrollment status updated to ${status}.`,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Courses
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublish,
  updateLiveClassLink,
  // Modules
  listModules,
  createModule,
  updateModule,
  deleteModule,
  // Materials
  createMaterial,
  updateMaterial,
  deleteMaterial,
  // Enrollment admin
  listEnrollments,
  updateEnrollmentStatus,
};
