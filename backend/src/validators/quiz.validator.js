// ─── Quiz Validators ────────────────────────────────────────

const { body } = require('express-validator');

const CORRECT_OPTIONS = ['A', 'B', 'C', 'D'];

// ── Create / Update Category ────────────────────────────────

const categoryValidation = [
  body('name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Category name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters.'),
];

// ── Create Question ─────────────────────────────────────────

const createQuestionValidation = [
  body('questionText')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Question text is required.')
    .isLength({ min: 5 })
    .withMessage('Question text must be at least 5 characters.'),

  body('optionA')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Option A is required.'),

  body('optionB')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Option B is required.'),

  body('optionC')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Option C is required.'),

  body('optionD')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Option D is required.'),

  body('correctOption')
    .notEmpty()
    .withMessage('Correct option is required.')
    .isIn(CORRECT_OPTIONS)
    .withMessage(`Correct option must be one of: ${CORRECT_OPTIONS.join(', ')}`),

  body('explanation')
    .optional()
    .trim()
    .escape(),
];

// ── Bulk Import Questions ───────────────────────────────────

const bulkQuestionsValidation = [
  body('questions')
    .isArray({ min: 1 })
    .withMessage('Questions must be a non-empty array.'),

  body('questions.*.questionText')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Each question must have question text.'),

  body('questions.*.optionA')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Each question must have option A.'),

  body('questions.*.optionB')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Each question must have option B.'),

  body('questions.*.optionC')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Each question must have option C.'),

  body('questions.*.optionD')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Each question must have option D.'),

  body('questions.*.correctOption')
    .isIn(CORRECT_OPTIONS)
    .withMessage(`Each question correctOption must be one of: ${CORRECT_OPTIONS.join(', ')}`),
];

// ── Start Quiz Attempt ──────────────────────────────────────

const startAttemptValidation = [
  body('quizId')
    .notEmpty()
    .withMessage('quizId is required.')
    .isUUID()
    .withMessage('Quiz ID must be a valid UUID.'),

  body('count')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Count must be between 1 and 100.'),
];

// ── Submit Quiz Answers ─────────────────────────────────────

const submitAttemptValidation = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers must be a non-empty array.'),

  body('answers.*.questionId')
    .isUUID()
    .withMessage('Each answer must have a valid question UUID.'),

  body('answers.*.selected')
    .isIn(CORRECT_OPTIONS)
    .withMessage(`Each answer selected must be one of: ${CORRECT_OPTIONS.join(', ')}`),

  body('timeTakenSec')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Time taken must be a non-negative integer.'),
];

// ── Create Full Quiz (named exam wrapper + MCQs) ────────────
// Validates the atomic "create quiz + bulk questions" payload for
// POST /api/v1/admin/quizzes/full.

const createFullQuizValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Quiz title is required.')
    .isLength({ min: 3, max: 200 })
    .withMessage('Quiz title must be between 3 and 200 characters.'),

  body('categoryId')
    .notEmpty()
    .withMessage('categoryId is required.')
    .isUUID()
    .withMessage('categoryId must be a valid UUID.'),

  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must not exceed 200 characters.'),

  body('year')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Year must be an integer between 1 and 5.'),

  body('durationSec')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('durationSec must be an integer between 60 and 86400 seconds.'),

  body('questions')
    .isArray({ min: 1 })
    .withMessage('A quiz must have at least one question.')
    .custom((questions) => {
      const validTypes = ['SINGLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'MATCHING_PAIRS'];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const prefix = `Question [${i}]:`;

        if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length < 5) {
          throw new Error(`${prefix} questionText is required and must be at least 5 characters.`);
        }

        const type = q.type || 'SINGLE_CHOICE';

        if (!validTypes.includes(type)) {
          throw new Error(`${prefix} type must be one of: ${validTypes.join(', ')}.`);
        }

        if (type === 'SINGLE_CHOICE') {
          const isLegacy = q.optionA !== undefined || q.optionB !== undefined || q.optionC !== undefined || q.optionD !== undefined || q.correctOption !== undefined;
          if (isLegacy) {
            if (!q.optionA || typeof q.optionA !== 'string' || !q.optionA.trim()) throw new Error(`${prefix} optionA is required for legacy MCQ.`);
            if (!q.optionB || typeof q.optionB !== 'string' || !q.optionB.trim()) throw new Error(`${prefix} optionB is required for legacy MCQ.`);
            if (!q.optionC || typeof q.optionC !== 'string' || !q.optionC.trim()) throw new Error(`${prefix} optionC is required for legacy MCQ.`);
            if (!q.optionD || typeof q.optionD !== 'string' || !q.optionD.trim()) throw new Error(`${prefix} optionD is required for legacy MCQ.`);
            if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) {
              throw new Error(`${prefix} correctOption must be one of: A, B, C, D.`);
            }
          } else {
            if (!Array.isArray(q.options) || q.options.length < 2) {
              throw new Error(`${prefix} options must be an array with at least 2 items.`);
            }
            if (q.options.some(opt => typeof opt !== 'string' || !opt.trim())) {
              throw new Error(`${prefix} all options must be non-empty strings.`);
            }
            if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
              throw new Error(`${prefix} correctOptionIndex must be a valid index in the options array.`);
            }
          }
        } else if (type === 'TRUE_FALSE') {
          if (q.correctAnswer !== 'true' && q.correctAnswer !== 'false' && typeof q.correctAnswer !== 'boolean') {
            throw new Error(`${prefix} correctAnswer must be 'true', 'false', or a boolean.`);
          }
        } else if (type === 'MULTIPLE_SELECT') {
          if (!Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(`${prefix} options must be an array with at least 2 items.`);
          }
          if (q.options.some(opt => typeof opt !== 'string' || !opt.trim())) {
            throw new Error(`${prefix} all options must be non-empty strings.`);
          }
          if (!Array.isArray(q.correctOptionIndices) || q.correctOptionIndices.length === 0) {
            throw new Error(`${prefix} correctOptionIndices must be a non-empty array.`);
          }
          if (q.correctOptionIndices.some(idx => typeof idx !== 'number' || idx < 0 || idx >= q.options.length)) {
            throw new Error(`${prefix} all correctOptionIndices must be valid indices in the options array.`);
          }
        } else if (type === 'MATCHING_PAIRS') {
          if (!Array.isArray(q.pairs) || q.pairs.length < 2) {
            throw new Error(`${prefix} pairs must be an array with at least 2 matching pairs.`);
          }
          for (let pIdx = 0; pIdx < q.pairs.length; pIdx++) {
            const pair = q.pairs[pIdx];
            if (!pair || typeof pair.left !== 'string' || !pair.left.trim() || typeof pair.right !== 'string' || !pair.right.trim()) {
              throw new Error(`${prefix} pair [${pIdx}] must have non-empty left and right strings.`);
            }
          }
        }
      }
      return true;
    }),
];

module.exports = {
  categoryValidation,
  createQuestionValidation,
  bulkQuestionsValidation,
  createFullQuizValidation,
  startAttemptValidation,
  submitAttemptValidation,
  // ── Sprint 7: DoctorsQuizz high-concurrency engine ───────────
  startQuizValidation:  [], // path param validated via uuidParam; no body required
  submitAnswerValidation: [
    body('questionId')
      .notEmpty().withMessage('questionId is required.')
      .isUUID().withMessage('questionId must be a valid UUID.'),
    body('selected')
      .optional()
      .isIn(CORRECT_OPTIONS).withMessage(`selected must be one of: ${CORRECT_OPTIONS.join(', ')}`),
    body('selectedOption')
      .optional()
      .isIn(CORRECT_OPTIONS).withMessage(`selectedOption must be one of: ${CORRECT_OPTIONS.join(', ')}`),
    body().custom((payload) => {
      if (!payload.selected && !payload.selectedOption) {
        throw new Error('Either selected or selectedOption is required.');
      }
      return true;
    }),
  ],
  submitQuizValidation: [], // no body — all data lives in Redis session
};
