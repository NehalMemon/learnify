// ─── Notification Routes ────────────────────────────────────
// Mounted at /api/v1/notifications in app.js

'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uuidParam } = require('../validators/course.validator');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');

// List all notifications for the authenticated user (newest first)
router.get('/', authenticate, getNotifications);

// Mark all unread notifications as read for the authenticated user.
// NOTE: declared BEFORE '/:id/read' so Express does not treat
// 'read-all' as the :id parameter.
router.patch('/read-all', authenticate, markAllAsRead);

// Mark a single notification (owned by the user) as read
router.patch('/:id/read', authenticate, uuidParam('id'), validate, markAsRead);

module.exports = router;
