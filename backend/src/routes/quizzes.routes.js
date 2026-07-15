// ─── Quizzes Browse Routes ─────────────────────────────────
// Dedicated endpoint for published named quizzes catalogue.

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireDoctorsQuizz } = require('../middleware/entitlements');
const validate = require('../middleware/validate');
const { uuidParam } = require('../validators/course.validator');
const { getQuizzes, getQuizById } = require('../controllers/quiz.controller');

router.get('/', authenticate, requireDoctorsQuizz, getQuizzes);
router.get('/:quizId', authenticate, requireDoctorsQuizz, uuidParam('quizId'), validate, getQuizById);

module.exports = router;
