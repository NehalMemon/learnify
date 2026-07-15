// ─── Auth Routes ─────────────────────────────────────────────

const router = require('express').Router();
const makeRateLimiter = require('../config/rateLimiter');
const { register, login, refreshToken, getMe, googleLogin, logout } = require('../controllers/auth.controller');
const { bootstrapAdmin } = require('../controllers/admin.controller');
const { registerValidation, loginValidation, googleLoginValidation } = require('../validators/auth.validator');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// ── Rate Limiter: strict brute-force protection on auth endpoints ──
// Security Rule §4: Prevent brute-force on login / register / refresh.

const authLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 10, // Relaxed in dev to prevent developer lockout
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

const loginLimiter = makeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Relaxed in dev to prevent developer lockout
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

// Public routes (rate-limited)
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login',    loginLimiter, loginValidation,    validate, login);
router.post('/refresh',  authLimiter, refreshToken);
router.post('/google',   loginLimiter, googleLoginValidation, validate, googleLogin);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

// ── POST /api/v1/auth/bootstrap — First-Run Admin Setup ──────
// SECURITY: Protected by X-Bootstrap-Secret header, not JWT.
// Self-disabling once any admin exists.
// Rate-limited below authLimiter threshold to prevent probing.
router.post('/bootstrap',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('fullName').trim().notEmpty().withMessage('Full name is required.').escape(),
  ],
  validate,
  bootstrapAdmin
);

module.exports = router;
