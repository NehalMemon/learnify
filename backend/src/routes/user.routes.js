// ─── User Routes ─────────────────────────────────────────────

const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { updateQuizOnboarding } = require('../controllers/user.controller');

router.use(authenticate);

router.patch(
  '/quiz-onboarding',
  [
    body('hasSeenQuizDisclaimer').optional().isBoolean().withMessage('hasSeenQuizDisclaimer must be a boolean.').toBoolean(),
    body('universityProgram').optional({ nullable: true }).trim().isString().withMessage('universityProgram must be a string.').isLength({ max: 100 }).withMessage('universityProgram must be at most 100 characters.'),
    body('studyYear').optional({ nullable: true }).isInt({ min: 1, max: 20 }).withMessage('studyYear must be a valid study year.').toInt(),
  ],
  validate,
  updateQuizOnboarding
);

module.exports = router;