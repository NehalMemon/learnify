// ─── Progress Routes ──────────────────────────────────────────
// POST /api/v1/progress/material/:materialId/complete
//
// Write path for the event-driven progress tracking system.
// The controller upserts MaterialProgress and publishes a
// MATERIAL_COMPLETED event to the BullMQ queue — it does NOT
// perform module-unlock logic on this thread.

'use strict';

const router = require('express').Router();
// FINDING-06 fix: Redis-backed rate limiter (shared across all instances).
const makeRateLimiter = require('../config/rateLimiter');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uuidParam } = require('../validators/course.validator');
const { completeMaterial } = require('../controllers/progress.controller');

// ── Rate limiter: prevents score/progress spamming ────────────
// Security Rule §4: Redis-backed so limits are enforced across all instances.
const progressLimiter = makeRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // max 30 material completions per minute per IP
  message: {
    success: false,
    message: 'Too many progress updates. Please slow down.',
  },
});

// POST /api/v1/progress/material/:materialId/complete
router.post(
  '/material/:materialId/complete',
  authenticate,
  progressLimiter,
  uuidParam('materialId'),
  validate,
  completeMaterial
);

module.exports = router;
