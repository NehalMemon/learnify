// ─── Admin System Log Controller ─────────────────────────────
// Serves the admin "System Logs" page with paginated, filterable
// access to the system_logs audit table. Read-only endpoint —
// logs are created exclusively via the auditLogger utility.

'use strict';

const prisma = require('../config/db');

/** Allowed filter values for the `level` query param. */
const VALID_LEVELS = new Set(['INFO', 'WARN', 'ERROR']);

// ── GET /api/v1/admin/logs ──────────────────────────────────

/**
 * Returns a paginated, filterable list of system audit logs.
 *
 * Query params:
 *   - page   {number}  Page index (1-based, default 1)
 *   - limit  {number}  Items per page (default 20, max 100)
 *   - level  {string}  Filter by log level: INFO | WARN | ERROR
 *   - action {string}  Filter by action key (exact match)
 *
 * Response:
 *   { success, data: { logs, pagination: { page, limit, total, pages } } }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getSystemLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      level,
      action,
    } = req.query;

    // Clamp pagination values to safe ranges
    const safePage  = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip      = (safePage - 1) * safeLimit;

    // ── Build dynamic WHERE clause ──────────────────────────
    const where = {};

    if (level) {
      const normalized = String(level).toUpperCase();
      if (VALID_LEVELS.has(normalized)) {
        where.level = normalized;
      }
    }

    if (action) {
      where.action = String(action);
    }

    // ── Single round-trip: fetch page + total count ─────────
    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          level: true,
          action: true,
          message: true,
          metadata: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.systemLog.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        logs,
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

module.exports = { getSystemLogs };
