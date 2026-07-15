// ─── Quiz Routes ─────────────────────────────────────────────
// Public: categories, leaderboard.
// Authenticated: start attempt, submit attempt, attempt history.
// Admin: quiz category & question CRUD.

const router = require('express').Router();
// FINDING-06 fix: Redis-backed rate limiter (shared across all instances).
const makeRateLimiter = require('../config/rateLimiter');
const { authenticate, authorize } = require('../middleware/auth');
const { requireDoctorsQuizz } = require('../middleware/entitlements');
const validate = require('../middleware/validate');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
  getQuizzes,
  getQuizById,
  startAttempt,
  submitAttempt,
  submitAnswer,
  finalizeAttempt,
  getMyAttempts,
  getAttemptDetail,
  getLeaderboard,
} = require('../controllers/quiz.controller');
const {
  categoryValidation,
  createQuestionValidation,
  bulkQuestionsValidation,
  submitAttemptValidation,
} = require('../validators/quiz.validator');
// Finding C: UUID path param validator (shared utility)
const { uuidParam } = require('../validators/course.validator');

// ── Quiz-specific rate limiters (Security Rule §4) ────────────
// Redis-backed so limits are enforced across all server instances.
const startAttemptLimiter = makeRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,                   // max 3 attempts per hour
  message: {
    success: false,
    message: 'Too many quiz start attempts. Please try again after an hour.',
  },
});

const finalizeLimiter = makeRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 2,              // max 2 submissions per minute per IP
  message: {
    success: false,
    message: 'Too many quiz finalization attempts. Please wait before submitting again.',
  },
});

const submitLimiter = makeRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // max 5 submissions per minute per IP
  message: {
    success: false,
    message: 'Too many quiz submissions. Please wait before submitting again.',
  },
});

// ── Public ───────────────────────────────────────────────────
router.get('/categories', listCategories);
// Finding D: leaderboard returns real user full names — require auth to protect PII
router.get('/leaderboard', authenticate, requireDoctorsQuizz, getLeaderboard);
// Named exam catalogue (DoctorsQuizz entitlement required)
router.get('/quizzes', authenticate, requireDoctorsQuizz, getQuizzes);
router.get('/quizzes/:quizId', authenticate, requireDoctorsQuizz, uuidParam('quizId'), validate, getQuizById);

// ── Authenticated — Exam Arena ────────────────────────────────
// The quizId path param is the canonical way to start an exam.
// uuidParam validates the quizId before it reaches the controller.
router.post('/quizzes/:quizId/start', authenticate, requireDoctorsQuizz, startAttemptLimiter, uuidParam('quizId'), validate, startAttempt);
router.post('/attempts/:attemptId/submit', authenticate, requireDoctorsQuizz, submitLimiter, submitAttemptValidation, validate, submitAttempt);
router.get('/attempts/my', authenticate, requireDoctorsQuizz, getMyAttempts);
// Finding C: validate :attemptId is a UUID before allowing Prisma lookup
router.get('/attempts/:attemptId', authenticate, requireDoctorsQuizz, uuidParam('attemptId'), validate, getAttemptDetail);

// ── Sprint 7: Real-Time Quiz Engine (Redis-backed) ───────────
// Individual answer submission (high-concurrency safe)
router.post(
  '/attempts/:attemptId/answer',
  authenticate,
  requireDoctorsQuizz,
  uuidParam('attemptId'),
  require('../validators/quiz.validator').submitAnswerValidation,
  validate,
  submitAnswer
);
// Finalize quiz and flush to PostgreSQL (via BullMQ worker)
router.post(
  '/attempts/:attemptId/finalize',
  authenticate,
  requireDoctorsQuizz,
  finalizeLimiter,
  uuidParam('attemptId'),
  require('../validators/quiz.validator').submitQuizValidation,
  validate,
  finalizeAttempt
);

// ── Admin: Category Management ───────────────────────────────
// Finding C: validate :id is a UUID on mutating category routes
router.post('/categories', authenticate, authorize('ADMIN'), categoryValidation, validate, createCategory);
router.put('/categories/:id', authenticate, authorize('ADMIN'), uuidParam('id'), categoryValidation, validate, updateCategory);
router.delete('/categories/:id', authenticate, authorize('ADMIN'), uuidParam('id'), validate, deleteCategory);

// ── Admin: Question Management ───────────────────────────────
router.get('/categories/:categoryId/questions', authenticate, authorize('ADMIN'), listQuestions);
router.post('/categories/:categoryId/questions', authenticate, authorize('ADMIN'), createQuestionValidation, validate, createQuestion);
router.post('/categories/:categoryId/questions/bulk', authenticate, authorize('ADMIN'), bulkQuestionsValidation, validate, bulkCreateQuestions);
router.put('/questions/:id', authenticate, authorize('ADMIN'), createQuestionValidation, validate, updateQuestion);
router.delete('/questions/:id', authenticate, authorize('ADMIN'), deleteQuestion);

module.exports = router;
