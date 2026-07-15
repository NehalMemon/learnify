// ─── Audit Logger ───────────────────────────────────────────
// Fire-and-forget utility that persists admin-auditable events to the
// system_logs table. Controllers call logSystemEvent() after completing
// their primary transaction; if the log write fails, the failure is
// captured by the structured Pino logger but never propagated to the
// caller — ensuring zero impact on user-facing request latency.

'use strict';

const prisma = require('../config/db');
const logger = require('../config/logger');

/**
 * Valid log levels matching the Prisma LogLevel enum.
 * @type {ReadonlySet<string>}
 */
const VALID_LEVELS = new Set(['INFO', 'WARN', 'ERROR']);

/**
 * Persists an audit event to the system_logs table.
 *
 * Designed to be fire-and-forget safe: callers can `await` for
 * sequencing guarantees, or call without `await` when the log is
 * best-effort and must not block the response.
 *
 * @param {object}  params
 * @param {string}  params.level    - 'INFO' | 'WARN' | 'ERROR'
 * @param {string}  params.action   - Machine-readable event key (e.g. 'USER_REGISTERED')
 * @param {string}  params.message  - Human-readable description
 * @param {object}  [params.metadata] - Optional JSON payload (request body, error context, etc.)
 * @param {string}  [params.userId]   - Optional UUID of the acting user
 * @returns {Promise<object|null>} The created SystemLog record, or null on failure
 */
const logSystemEvent = async ({ level = 'INFO', action, message, metadata, userId }) => {
  try {
    if (!action || !message) {
      logger.warn({ action, message }, 'auditLogger: skipped — action and message are required');
      return null;
    }

    // Normalize and validate the level to prevent Prisma enum rejection
    const normalizedLevel = String(level).toUpperCase();
    if (!VALID_LEVELS.has(normalizedLevel)) {
      logger.warn({ level }, 'auditLogger: invalid level received, defaulting to INFO');
    }

    const record = await prisma.systemLog.create({
      data: {
        level: VALID_LEVELS.has(normalizedLevel) ? normalizedLevel : 'INFO',
        action,
        message,
        metadata: metadata ?? undefined,
        userId: userId ?? undefined,
      },
    });

    logger.debug({ logId: record.id, action }, 'auditLogger: event persisted');
    return record;
  } catch (err) {
    // Why: Audit logging must never crash the main request flow.
    // The structured logger ensures the failure is still observable
    // in CloudWatch / Datadog without affecting the user.
    logger.error({ err, action, message }, 'auditLogger: failed to persist system log');
    return null;
  }
};

module.exports = { logSystemEvent };
