// ─── Admin User Management Routes ────────────────────────────
// Dedicated routes for comprehensive user management operations.
// All routes protected by authenticate + authorize('ADMIN').

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const adminUserController = require('../controllers/admin.user.controller');

// Validators
const { body } = require('express-validator');
const { uuidParam } = require('../validators/course.validator');

// All routes here require Admin access
router.use(authenticate, authorize('ADMIN'));

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with pagination and filtering
 * @access  Admin only
 */
router.get('/users', adminUserController.getUsers);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create a new user (any role: STUDENT or ADMIN)
 * @access  Admin only
 */
router.post('/users', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('fullName').trim().notEmpty().withMessage('Full name is required.').escape(),
  body('role').optional().isIn(['STUDENT', 'ADMIN']).withMessage('Role must be STUDENT or ADMIN.'),
  body('learnifyEnabled').optional().isBoolean().withMessage('learnifyEnabled must be a boolean.'),
  body('doctorsQuizzEnabled').optional().isBoolean().withMessage('doctorsQuizzEnabled must be a boolean.'),
], validate, adminUserController.createUser);

/**
 * @route   PATCH /api/v1/admin/users/:id/role
 * @desc    Change a user's role (promote/demote)
 * @access  Admin only
 */
router.patch('/users/:id/role', [
  uuidParam('id'),
  body('role').isIn(['STUDENT', 'ADMIN']).withMessage('Role must be STUDENT or ADMIN.'),
], validate, adminUserController.updateUserRole);

module.exports = router;
