// ─── Content Routes ───────────────────────────────────────────
// GET /api/v1/courses/:courseId/content
//
// Serves the full course content tree with per-student progress.
// All routes in this file require authentication.

'use strict';

const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uuidParam } = require('../validators/course.validator');
const { getCourseContent } = require('../controllers/content.controller');

// ── GET /api/v1/courses/:courseId/content ─────────────────────
// Requires ACTIVE enrollment — 403 if not enrolled or paused.
router.get(
  '/:courseId/content',
  authenticate,
  uuidParam('courseId'),
  validate,
  getCourseContent
);

module.exports = router;
