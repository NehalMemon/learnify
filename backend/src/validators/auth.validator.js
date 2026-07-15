// ─── Auth Request Validators ─────────────────────────────────

const { body } = require('express-validator');

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  // FINDING-09 fix: stronger password entropy for a payment-handling LMS
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/\d/)
    .withMessage('Password must contain at least one number.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[^a-zA-Z0-9]/)
    .withMessage('Password must contain at least one special character (e.g. !@#$%).'),

  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters.')
    .escape(),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number.'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
];

const googleLoginValidation = [
  body('tokenId')
    .trim()
    .notEmpty()
    .withMessage('Google tokenId is required.')
    // A real Google ID token is a signed JWT; realistic length guard prevents
    // oversized payloads from hitting the verification API at all.
    .isLength({ min: 50, max: 4096 })
    .withMessage('tokenId appears malformed.'),
];

module.exports = { registerValidation, loginValidation, googleLoginValidation };
