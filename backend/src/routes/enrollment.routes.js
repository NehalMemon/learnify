// ─── Enrollment Routes ───────────────────────────────────────

const router = require('express').Router();
// FINDING-06 fix: Redis-backed rate limiter (shared across all instances).
const makeRateLimiter = require('../config/rateLimiter');
const { authenticate } = require('../middleware/auth');
const { requireLearnify } = require('../middleware/entitlements');
const validate = require('../middleware/validate');
const {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentDetail,
} = require('../controllers/enrollment.controller');
const { createEnrollmentValidation, uuidParam } = require('../validators/course.validator');


// FINDING-11 fix + FINDING-06 fix: Redis-backed to prevent enrollment flood
// from a valid token across all server instances.
const enrollLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many enrollment requests. Please try again later.' },
});

// All enrollment routes require authentication + Learnify entitlement
router.use(authenticate, requireLearnify);

router.post('/', enrollLimiter, createEnrollmentValidation, validate, createEnrollment);
router.get('/my', getMyEnrollments);
// Finding C: validate :id is a UUID before Prisma lookup
router.get('/:id', uuidParam('id'), validate, getEnrollmentDetail);
// FINDING-08 fix: markMaterialComplete removed from this router.
// The authoritative progress write path is:
//   POST /api/v1/progress/material/:materialId/complete
// which is handled by progress.controller.js via BullMQ.

module.exports = router;
