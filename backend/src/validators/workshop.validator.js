// ─── Workshop Validators ────────────────────────────────────

const { body } = require('express-validator');

// ── Create Workshop (Admin) ─────────────────────────────────

const createWorkshopValidation = [
  body('divisionId')
    .notEmpty()
    .withMessage('Division ID is required.')
    .isUUID()
    .withMessage('Division ID must be a valid UUID.'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Workshop title is required.')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.')
    .escape(),

  body('date')
    .notEmpty()
    .withMessage('Workshop date is required.')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date.'),

  body('instructor').optional().trim().escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters.')
    .escape(),

  body('platform')
    .optional()
    .trim(),

  body('meetingLink')
    .optional()
    .isURL()
    .withMessage('Meeting link must be a valid URL.'),

  body('price')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price must be a valid decimal number.'),
];

// ── Update Workshop (all fields optional) ───────────────────

const updateWorkshopValidation = [
  body('title')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date.'),

  body('instructor').optional().trim().escape(),
  body('description')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters.'),

  body('platform').optional().trim(),

  body('meetingLink')
    .optional()
    .isURL()
    .withMessage('Meeting link must be a valid URL.'),

  body('price')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price must be a valid decimal number.'),

  body('recordingUrl')
    .optional()
    .isURL()
    .withMessage('Recording URL must be a valid URL.'),
];

module.exports = {
  createWorkshopValidation,
  updateWorkshopValidation,
};
