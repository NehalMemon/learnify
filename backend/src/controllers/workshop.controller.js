// ─── Workshop Controller ────────────────────────────────────
// Admin workshop CRUD + student registration and browsing.

const prisma = require('../config/db');

// ═══════════════════════════════════════════════════════════════
// PUBLIC / STUDENT – WORKSHOP BROWSING
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/workshops ───────────────────────────────────
// List workshops (public). Optionally filter by division.

const listWorkshops = async (req, res, next) => {
  try {
    const { divisionId, upcoming, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (divisionId) where.divisionId = divisionId;
    if (upcoming === 'true') {
      where.date = { gte: new Date() };
    }

    const [workshops, total] = await Promise.all([
      prisma.workshop.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          division: { select: { id: true, name: true, slug: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.workshop.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        workshops,
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

// ── GET /api/v1/workshops/:id ───────────────────────────────

const getWorkshop = async (req, res, next) => {
  try {
    const { id } = req.params;

    const workshop = await prisma.workshop.findUnique({
      where: { id },
      include: {
        division: { select: { id: true, name: true, slug: true } },
        _count: { select: { registrations: true } },
      },
    });

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found.',
      });
    }

    res.json({ success: true, data: workshop });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/workshops/:id/register ─────────────────────
// Register current user for a workshop.

const registerForWorkshop = async (req, res, next) => {
  try {
    const { id: workshopId } = req.params;
    const userId = req.user.id;

    // Parallelize workshop existence and registration checks —
    // both are independent reads on different tables
    const [workshop, existing] = await Promise.all([
      prisma.workshop.findUnique({
        where: { id: workshopId },
      }),
      prisma.workshopRegistration.findUnique({
        where: { userId_workshopId: { userId, workshopId } },
      }),
    ]);

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found.',
      });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You are already registered for this workshop.',
      });
    }

    const registration = await prisma.workshopRegistration.create({
      data: { userId, workshopId },
      include: {
        workshop: {
          select: { id: true, title: true, date: true, platform: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registered for workshop.',
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/workshops/:id/register ────────────────────
// Cancel workshop registration.

const cancelRegistration = async (req, res, next) => {
  try {
    const { id: workshopId } = req.params;
    const userId = req.user.id;

    const registration = await prisma.workshopRegistration.findUnique({
      where: { userId_workshopId: { userId, workshopId } },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found.',
      });
    }

    await prisma.workshopRegistration.delete({
      where: { id: registration.id },
    });

    res.json({
      success: true,
      message: 'Registration cancelled.',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/workshops/my ────────────────────────────────
// List workshops the current user is registered for.

const getMyWorkshops = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const registrations = await prisma.workshopRegistration.findMany({
      where: { userId },
      include: {
        workshop: {
          include: {
            division: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// ADMIN – WORKSHOP CRUD
// ═══════════════════════════════════════════════════════════════

// ── POST /api/v1/admin/workshops ────────────────────────────

const createWorkshop = async (req, res, next) => {
  try {
    const {
      divisionId,
      title,
      instructor,
      description,
      date,
      platform,
      meetingLink,
      price,
    } = req.body;

    // Verify division exists
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res.status(400).json({
        success: false,
        message: 'Invalid division ID.',
      });
    }

    const workshop = await prisma.workshop.create({
      data: {
        divisionId,
        title,
        instructor: instructor || null,
        description: description || null,
        date: new Date(date),
        platform: platform || null,
        meetingLink: meetingLink || null,
        price: price || 0,
      },
      include: {
        division: { select: { id: true, name: true, slug: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Workshop created.',
      data: workshop,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/workshops/:id ─────────────────────────

const updateWorkshop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      instructor,
      description,
      date,
      platform,
      meetingLink,
      price,
      recordingUrl,
    } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (instructor !== undefined) data.instructor = instructor;
    if (description !== undefined) data.description = description;
    if (date !== undefined) data.date = new Date(date);
    if (platform !== undefined) data.platform = platform;
    if (meetingLink !== undefined) data.meetingLink = meetingLink;
    if (price !== undefined) data.price = price;
    if (recordingUrl !== undefined) data.recordingUrl = recordingUrl;

    const workshop = await prisma.workshop.update({
      where: { id },
      data,
      include: {
        division: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({
      success: true,
      message: 'Workshop updated.',
      data: workshop,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/workshops/:id ──────────────────────

const deleteWorkshop = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.workshop.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Workshop deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/admin/workshops/:id/registrations ───────────
// List all registrations for a specific workshop.

const listRegistrations = async (req, res, next) => {
  try {
    const { id: workshopId } = req.params;

    const registrations = await prisma.workshopRegistration.findMany({
      where: { workshopId },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        workshopId,
        totalRegistrations: registrations.length,
        registrations,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Public / Student
  listWorkshops,
  getWorkshop,
  registerForWorkshop,
  cancelRegistration,
  getMyWorkshops,
  // Admin
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  listRegistrations,
};
