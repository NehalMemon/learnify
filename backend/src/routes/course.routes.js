// ─── Course Routes ───────────────────────────────────────────
// Mix of public (course detail) and authenticated (modules, live-class, classroom).

const router = require('express').Router();
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireLearnify } = require('../middleware/entitlements');
const validate = require('../middleware/validate');
const {
  getCourses,
  getCourse,
  getCourseModules,
  joinLiveClass,
  getClassroom,
} = require('../controllers/course.controller');
// UUID path param validator
const { uuidParam } = require('../validators/course.validator');

// Public catalog — no auth required, only isPublished:true courses returned
router.get('/', getCourses);

// Public course detail — validate :id so Prisma never receives garbage input
// optionalAuthenticate: admins can preview unpublished courses
router.get('/:id', uuidParam('id'), validate, optionalAuthenticate, getCourse);

// Authenticated – enrollment required
router.get('/:id/modules',    authenticate, requireLearnify, uuidParam('id'), validate, getCourseModules);
router.get('/:id/live-class', authenticate, requireLearnify, uuidParam('id'), validate, joinLiveClass);
router.get('/:id/classroom',  authenticate, requireLearnify, uuidParam('id'), validate, getClassroom);

module.exports = router;
