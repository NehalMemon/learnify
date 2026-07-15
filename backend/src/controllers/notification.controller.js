// ─── Notification Controller ────────────────────────────────
// GET   /api/v1/notifications          -> list current user's notifications
// PATCH /api/v1/notifications/:id/read -> mark a single notification as read
// PATCH /api/v1/notifications/read-all -> mark all user's notifications as read

'use strict';

const prisma = require('../config/db');

const getAuthenticatedUserId = (req) => req.userId || req.user?.id;

/**
 * GET /api/v1/notifications
 * Returns all notifications for the authenticated user,
 * sorted newest first.
 *
 * @security authenticate
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read. The notification MUST belong to the
 * authenticated user; otherwise the request is rejected (ownership check).
 *
 * @security authenticate
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Notification id is required.',
      });
    }

    // updateMany enforces the ownership predicate (id AND userId) atomically.
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Marks every unread notification for the authenticated user as read.
 *
 * @security authenticate
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: { updated: result.count },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
