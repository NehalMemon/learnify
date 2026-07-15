// ─── Admin Sprint 5 Validators ────────────────────────────────
// express-validator schemas for:
//   - ClassSession creation / update
//   - Grade sheet upload (title field)

'use strict';

const { body, param } = require('express-validator');

// ── POST/PUT ClassSession ─────────────────────────────────────

const createClassSessionValidation = [
  body('courseId')
    .notEmpty().withMessage('courseId is required.')
    .isUUID().withMessage('courseId must be a valid UUID.'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title must not exceed 200 characters.')
    .escape(),

  body('scheduledAt')
    .notEmpty().withMessage('scheduledAt is required.')
    .isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date-time.'),

  body('meetingLink')
    .notEmpty().withMessage('meetingLink is required.')
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('meetingLink must be a valid HTTPS URL.'),

  body('platform')
    .optional()
    .trim()
    .isIn(['Zoom', 'Google Meet', 'Microsoft Teams'])
    .withMessage('platform must be "Zoom", "Google Meet", or "Microsoft Teams".'),
];

const updateClassSessionValidation = [
  param('id')
    .isUUID().withMessage('id must be a valid UUID.'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title must not exceed 200 characters.')
    .escape(),

  body('scheduledAt')
    .optional()
    .isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date-time.'),

  body('meetingLink')
    .optional()
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('meetingLink must be a valid HTTPS URL.'),

  body('platform')
    .optional()
    .trim()
    .isIn(['Zoom', 'Google Meet', 'Microsoft Teams'])
    .withMessage('platform must be "Zoom", "Google Meet", or "Microsoft Teams".'),
];

// ── Grade sheet upload ────────────────────────────────────────

const gradeSheetValidation = [
  param('enrollmentId')
    .isUUID().withMessage('enrollmentId must be a valid UUID.'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.')
    .escape(),
];

module.exports = {
  createClassSessionValidation,
  updateClassSessionValidation,
  gradeSheetValidation,
};
