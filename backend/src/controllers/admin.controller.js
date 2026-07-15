// ─── Admin User Management Controller ────────────────────────
// Admin-only: list users, update roles, toggle DoctorsQuizz access.
// Bootstrap: one-time secret-gated admin creation for first-run setup.

const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { getRedisClient } = require('../config/queue');
const NotificationService = require('../services/notification.service');
const { getAuthCacheKey, invalidateAuthCache } = require('../utils/cache.util');

// ── GET /api/v1/admin/users ──────────────────────────────────

const listUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      learnifyEnabled,
      doctorsQuizzEnabled,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { isDeleted: false };
    if (role) where.role = role;
    if (learnifyEnabled === 'true' || learnifyEnabled === 'false') {
      where.learnifyEnabled = learnifyEnabled === 'true';
    }
    if (doctorsQuizzEnabled === 'true' || doctorsQuizzEnabled === 'false') {
      where.doctorsQuizzEnabled = doctorsQuizzEnabled === 'true';
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          learnifyEnabled: true,
          doctorsQuizzEnabled: true,
          createdAt: true,
          quizAttempts: {
            take: 1,
            orderBy: { startedAt: 'desc' },
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// ── PATCH /api/v1/admin/users/:id/role ───────────────────────

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be STUDENT or ADMIN.',
      });
    }

    const [user] = await Promise.all([
      prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, email: true, fullName: true, role: true },
      }),
      invalidateAuthCache(id),
    ]);

    res.json({
      success: true,
      message: `User role updated to ${role}.`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/users — Create Admin (ADMIN only) ─────
// Allows an existing ADMIN to create additional admin accounts.
// Protected by authenticate + authorize('ADMIN') at the router.

const createAdmin = async (req, res, next) => {
  try {
    const { email, password, fullName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: { email, passwordHash, fullName, phone: phone || null, role: 'ADMIN' },
      select: { id: true, email: true, fullName: true, phone: true, role: true, createdAt: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/users/:id/entitlements ───────────────

const updateUserEntitlements = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { learnifyEnabled, doctorsQuizzEnabled } = req.body;

    const [updated] = await Promise.all([
      prisma.user.update({
        where: { id },
        data: {
          learnifyEnabled,
          doctorsQuizzEnabled,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          learnifyEnabled: true,
          doctorsQuizzEnabled: true,
          updatedAt: true,
        },
      }),
      invalidateAuthCache(id),
    ]);

    return res.json({
      success: true,
      message: 'User entitlements updated.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/v1/admin/users/:id/access ───────────────────

const updateUserAccess = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ── Resilient payload extraction ──────────────────────────
    // The UI may send the flags at the top level (flat) OR wrapped in an
    // `access` object (nested). We accept both shapes so a client refactor
    // doesn't silently break the notification hook again.
    const body = req.body || {};
    const nested = body.access && typeof body.access === 'object' ? body.access : null;

    const learnifyEnabled =
      body.learnifyEnabled !== undefined
        ? body.learnifyEnabled
        : nested && nested.learnify !== undefined
          ? nested.learnify
          : nested && nested.learnifyEnabled !== undefined
            ? nested.learnifyEnabled
            : undefined;

    const doctorsQuizzEnabled =
      body.doctorsQuizzEnabled !== undefined
        ? body.doctorsQuizzEnabled
        : nested && nested.doctorsQuizz !== undefined
          ? nested.doctorsQuizz
          : nested && nested.doctorsQuizzEnabled !== undefined
            ? nested.doctorsQuizzEnabled
            : undefined;

    if (learnifyEnabled === undefined || doctorsQuizzEnabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both learnifyEnabled and doctorsQuizzEnabled are required.',
      });
    }

    if (typeof learnifyEnabled !== 'boolean' || typeof doctorsQuizzEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'learnifyEnabled and doctorsQuizzEnabled must be booleans.',
      });
    }

    const data = { learnifyEnabled, doctorsQuizzEnabled };

    if (learnifyEnabled || doctorsQuizzEnabled) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      data.accessExpiresAt = expiresAt;
    } else {
      data.accessExpiresAt = null;
    }

    const [updated] = await Promise.all([
      prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          fullName: true,
          learnifyEnabled: true,
          doctorsQuizzEnabled: true,
          accessExpiresAt: true,
          updatedAt: true,
        },
      }),
      invalidateAuthCache(id),
    ]);

    // why fire-and-forget: NotificationService.notify is exception-safe by design
    // and must never block the admin response (architecture.md §Event-Driven)
    if (learnifyEnabled === false && doctorsQuizzEnabled === false) {
      NotificationService.notify(
        id,
        'Account Restricted',
        'Your platform access has been temporarily restricted. Please contact your administrator.',
        '/dashboard'
      );
    } else if (learnifyEnabled || doctorsQuizzEnabled) {
      NotificationService.notify(
        id,
        'Account Verified!',
        'Your university credentials have been approved. The Exam Arena is now unlocked.',
        '/quiz/catalog'
      );
    }

    return res.json({
      success: true,
      message: 'User platform access updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/admin/stats ────────────────────────────────────
const getAdminStats = async (_req, res, next) => {
  try {
    const [totalQuizzes, totalStudents, activeAttempts] = await Promise.all([
      prisma.quiz.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.quizAttempt.count({ where: { finishedAt: null } }),
    ]);

    return res.json({
      success: true,
      data: {
        totalQuizzes,
        totalStudents,
        activeAttempts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/bootstrap — First-Run Admin Bootstrap ──
// Security model:
//   1. Requires X-Bootstrap-Secret header === ADMIN_BOOTSTRAP_SECRET env var
//   2. Self-disabling: fails if ANY admin already exists in the database
//   3. NEVER exposed through the same middleware chain as normal routes
//
// This solves the chicken-and-egg problem of creating the very first admin
// without a public endpoint. Once used, it returns 403 on all subsequent calls.

const bootstrapAdmin = async (req, res, next) => {
  try {
    // ── 1. Validate bootstrap secret ─────────────────────────
    const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!secret) {
      return res.status(503).json({
        success: false,
        message: 'Bootstrap is not configured on this server (ADMIN_BOOTSTRAP_SECRET not set).',
      });
    }

    const provided = req.headers['x-bootstrap-secret'];
    if (!provided || provided !== secret) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing bootstrap secret.',
      });
    }

    // ── 2. Self-disabling check ───────────────────────────────
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isDeleted: false } });
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Bootstrap is disabled — an admin account already exists. Use POST /api/v1/admin/users instead.',
      });
    }

    // ── 3. Create first admin account ────────────────────────
    const { email, password, fullName, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Promote existing student to admin
      const promoted = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
        select: { id: true, email: true, fullName: true, role: true },
      });
      return res.status(200).json({
        success: true,
        message: 'Existing account promoted to ADMIN.',
        data: promoted,
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: { email, passwordHash, fullName, phone: phone || null, role: 'ADMIN' },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    return res.status(201).json({
      success: true,
      message: 'First admin account created. Bootstrap is now disabled.',
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Aggregates the 5 most recent platform events across User registrations
 *        and QuizAttempts into a single unified activity feed.
 * @route GET /api/v1/admin/dashboard/activity
 *
 * @typedef {{ id: string, userName: string, action: string, type: 'Registration'|'QuizStarted'|'QuizCompleted', timestamp: Date }} ActivityItem
 * @returns {{ success: boolean, data: ActivityItem[] }}
 */
const getSystemActivity = async (_req, res, next) => {
  try {
    // Single round-trip — fetch the latest 5 of each in parallel (no N+1)
    const [recentUsers, recentAttempts] = await Promise.all([
      prisma.user.findMany({
        where: { isDeleted: false, role: 'STUDENT' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, fullName: true, createdAt: true },
      }),
      prisma.quizAttempt.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          user: { select: { fullName: true } },
          quiz: { select: { title: true } },
        },
      }),
    ]);

    /** @type {ActivityItem[]} */
    const registrationEvents = recentUsers.map((u) => ({
      id:        `reg-${u.id}`,
      userName:  u.fullName || 'New Student',
      action:    'registered on the platform',
      type:      'Registration',
      timestamp: u.createdAt,
    }));

    /** @type {ActivityItem[]} */
    const attemptEvents = recentAttempts.map((a) => {
      const isCompleted = Boolean(a.finishedAt);
      return {
        id:        `att-${a.id}`,
        userName:  a.user?.fullName || 'A student',
        action:    isCompleted
          ? `completed "${a.quiz?.title ?? 'an exam'}"`
          : `started "${a.quiz?.title ?? 'an exam'}"`,
        type:      isCompleted ? 'QuizCompleted' : 'QuizStarted',
        timestamp: isCompleted ? a.finishedAt : a.startedAt,
      };
    });

    // Merge, sort newest-first, take top 5
    const activity = [...registrationEvents, ...attemptEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    return res.json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  updateUserRole,
  createAdmin,
  bootstrapAdmin,
  updateUserEntitlements,
  updateUserAccess,
  getAdminStats,
  getSystemActivity,
};

