// ─── Division Controller ─────────────────────────────────────
// Public endpoints for browsing platform divisions and their courses.

const prisma = require('../config/db');

// ── GET /api/v1/divisions ────────────────────────────────────

const listDivisions = async (req, res, next) => {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        _count: { select: { courses: true, workshops: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: divisions,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/divisions/:slug/courses ──────────────────────

const listDivisionCourses = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { category, courseType, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Validate slug
    const upperSlug = slug.toUpperCase();
    if (!['FOUNDATION', 'MEDED'].includes(upperSlug)) {
      return res.status(400).json({
        success: false,
        message: 'Division slug must be "foundation" or "meded".',
      });
    }

    const division = await prisma.division.findUnique({
      where: { slug: upperSlug },
    });

    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Division not found.',
      });
    }

    // Build filter
    const where = {
      divisionId: division.id,
      isPublished: true,
    };
    if (category) where.category = category;
    if (courseType) where.courseType = courseType;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          description: true,
          courseType: true,
          category: true,
          instructor: true,
          price: true,
          isPublished: true,
          createdAt: true,
          _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        division: { id: division.id, name: division.name, slug: division.slug },
        courses,
        pagination: {
          page: Number(page),
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

module.exports = { listDivisions, listDivisionCourses };
