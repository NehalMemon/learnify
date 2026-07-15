// ─── Payment Validators ─────────────────────────────────────

const { body } = require('express-validator');

const PAYMENT_TYPES = ['LUMP_SUM', 'MONTHLY'];

// ── Create Payment (Admin) ──────────────────────────────────

const createPaymentValidation = [
  body('enrollmentId')
    .notEmpty()
    .withMessage('Enrollment ID is required.')
    .isUUID()
    .withMessage('Enrollment ID must be a valid UUID.'),

  body('paymentType')
    .notEmpty()
    .withMessage('Payment type is required.')
    .isIn(PAYMENT_TYPES)
    .withMessage(`Payment type must be one of: ${PAYMENT_TYPES.join(', ')}`),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required.')
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Amount must be a valid decimal number.'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date.'),
];

// ── Submit Payment Proof (Student) ──────────────────────────
// FINDING-04 fix: restrict to HTTPS-only URLs to neutralise the
// javascript: URI stored-XSS vector on the admin payment dashboard.

const submitProofValidation = [
  body('proofImageUrl')
    .notEmpty()
    .withMessage('Proof image URL is required.')
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('Proof image URL must be a valid HTTPS URL (http:// and javascript: are rejected).'),
];

module.exports = {
  createPaymentValidation,
  submitProofValidation,
};
