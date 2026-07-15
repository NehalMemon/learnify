// ─── Payment Routes ──────────────────────────────────────────
// Student: view own payments, submit proof.
// Admin: list, create, verify, mark overdue.

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uuidParam } = require('../validators/course.validator');
const {
  listPayments,
  createPayment,
  verifyPayment,
  markOverdue,
  getMyPayments,
  submitPaymentProof,
} = require('../controllers/payment.controller');
const {
  createPaymentValidation,
  submitProofValidation,
} = require('../validators/payment.validator');

// ── Student Routes (authenticated) ──────────────────────────
router.use(authenticate);

router.get('/my', getMyPayments);
router.patch('/:id/submit-proof', uuidParam('id'), validate, submitProofValidation, validate, submitPaymentProof);

// ── Admin Routes ─────────────────────────────────────────────
router.get('/', authorize('ADMIN'), listPayments);
router.post('/', authorize('ADMIN'), createPaymentValidation, validate, createPayment);
router.patch('/:id/verify', authorize('ADMIN'), uuidParam('id'), validate, verifyPayment);
router.patch('/:id/overdue', authorize('ADMIN'), uuidParam('id'), validate, markOverdue);

module.exports = router;
