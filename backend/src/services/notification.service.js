// ─── Notification Service ───────────────────────────────────
// Central helper used by any controller / worker that wants to push an
// in-app notification to a user. Errors are swallowed (and logged) so a
// notification failure NEVER breaks the caller's main business flow.

'use strict';

const prisma = require('../config/db');
const logger = require('../config/logger');

class NotificationService {
  /**
   * Persist a notification for a user.
   *
   * @param {string} userId  - Recipient user id.
   * @param {string} title   - Short headline shown in the dropdown.
   * @param {string} message - Full body text.
   * @param {string|null} [link] - Optional deep-link the UI navigates to on click.
   * @returns {Promise<object|null>} The created notification, or null on failure.
   */
  static async notify(userId, title, message, link = null) {
    try {
      if (!userId || !title || !message) {
        logger.warn(
          { userId, title, hasMessage: Boolean(message) },
          'NotificationService.notify called with missing required fields; skipping.'
        );
        return null;
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          link: link || null,
        },
      });

      return notification;
    } catch (error) {
      // CRITICAL: never re-throw. Notification delivery is best-effort and
      // must not take down the caller's primary operation.
      logger.error(
        { err: error, userId, title },
        'NotificationService.notify failed to persist notification.'
      );
      return null;
    }
  }
}

module.exports = NotificationService;
