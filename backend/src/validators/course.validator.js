// ─── Course Validators ───────────────────────────────────────
// Covers CREATE and UPDATE validation for courses, modules,
// materials, enrollments, and user roles.

const { body, param } = require('express-validator');

const COURSE_TYPES = [
  'FULL_COURSE',
  'CRASH_COURSE',
  'TEST_SERIES',
  'REVISION',
  'NOTES_ONLY',
  'QUIZ_ACCESS',
];

const MATERIAL_TYPES = ['NOTE', 'VIDEO', 'QUIZ'];

// ── Create Course ────────────────────────────────────────────

const createCourseValidation = [
  body('divisionId')
    .notEmpty()
    .withMessage('Division ID is required.')
    .isUUID()
    .withMessage('Division ID must be a valid UUID.'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required.')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.')
    .escape(), // FINDING-12: prevent stored XSS

  body('courseType')
    .notEmpty()
    .withMessage('Course type is required.')
    .isIn(COURSE_TYPES)
    .withMessage(`Course type must be one of: ${COURSE_TYPES.join(', ')}`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters.')
    .escape(),

  body('category').optional().trim().escape(),
  body('instructor').optional().trim().escape(),

  body('price')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price must be a valid decimal number.'),

  body('classroomUrl')
    .optional()
    .isURL()
    .withMessage('Classroom URL must be a valid URL.'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean.'),
];

// ── Update Course (all fields optional) ─────────────────────
// FINDING-10 fix: .escape() added to all string fields to prevent
// stored XSS from admin-submitted content reaching the frontend.
const updateCourseValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.')
    .escape(),

  body('courseType')
    .optional()
    .isIn(COURSE_TYPES)
    .withMessage(`Course type must be one of: ${COURSE_TYPES.join(', ')}`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters.')
    .escape(),

  body('category').optional().trim().escape(),
  body('instructor').optional().trim().escape(),

  body('price')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price must be a valid decimal number.'),

  body('classroomUrl')
    .optional()
    .isURL()
    .withMessage('Classroom URL must be a valid URL.'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean.'),
];

// ── Create Module ────────────────────────────────────────────

const createModuleValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Module title is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.'),

  body('sequence')
    .notEmpty()
    .withMessage('Sequence number is required.')
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer.'),

  body('requiredModuleId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Required module ID must be a valid UUID.'),
];

// ── Update Module (all fields optional) ─────────────────────
// FINDING-10 fix: .escape() on title.
const updateModuleValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.')
    .escape(),

  body('sequence')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer.'),

  body('requiredModuleId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Required module ID must be a valid UUID.'),
];

// ── Create Material ──────────────────────────────────────────

const createMaterialValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Material title is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.'),

  body('materialType')
    .notEmpty()
    .withMessage('Material type is required.')
    .isIn(MATERIAL_TYPES)
    .withMessage(`Material type must be one of: ${MATERIAL_TYPES.join(', ')}`),

  body('objectUrl')
    .optional()
    .trim(),

  body('secureViewOnly')
    .optional()
    .isBoolean()
    .withMessage('secureViewOnly must be a boolean.'),

  body('sequence')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sequence must be a non-negative integer.'),

  body('durationSec')
    .optional()
    .isInt({ min: 1 })
    .withMessage('durationSec must be a positive integer (seconds).'),

  body('thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('thumbnailUrl must be a valid URL.'),
];

// ── Update Material (all fields optional) ───────────────────
// FINDING-10 fix: .escape() on title.
const updateMaterialValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.')
    .escape(),

  body('materialType')
    .optional()
    .isIn(MATERIAL_TYPES)
    .withMessage(`Material type must be one of: ${MATERIAL_TYPES.join(', ')}`),

  body('objectUrl').optional().trim(),

  body('secureViewOnly')
    .optional()
    .isBoolean()
    .withMessage('secureViewOnly must be a boolean.'),

  body('sequence')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sequence must be a non-negative integer.'),

  body('durationSec')
    .optional()
    .isInt({ min: 1 })
    .withMessage('durationSec must be a positive integer (seconds).'),

  body('thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('thumbnailUrl must be a valid URL.'),
];

// ── Enrollment ────────────────────────────────────────────────

const createEnrollmentValidation = [
  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required.')
    .isUUID()
    .withMessage('Course ID must be a valid UUID.'),

  body('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID.'),
];

// ── Update Enrollment Status ─────────────────────────────────

const updateEnrollmentStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required.')
    .isIn(['ACTIVE', 'PAUSED', 'COMPLETED'])
    .withMessage('Status must be ACTIVE, PAUSED, or COMPLETED.'),
];

// ── Update User Role ─────────────────────────────────────────

const updateUserRoleValidation = [
  body('role')
    .notEmpty()
    .withMessage('Role is required.')
    .isIn(['STUDENT', 'ADMIN'])
    .withMessage('Role must be STUDENT or ADMIN.'),
];

// ── UUID param ───────────────────────────────────────────────

const uuidParam = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID.`),
];

module.exports = {
  createCourseValidation,
  updateCourseValidation,
  createModuleValidation,
  updateModuleValidation,
  createMaterialValidation,
  updateMaterialValidation,
  createEnrollmentValidation,
  updateEnrollmentStatusValidation,
  updateUserRoleValidation,
  uuidParam,
};
