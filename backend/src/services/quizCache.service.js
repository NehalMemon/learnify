// ─── Quiz Cache Service ────────────────────────────────────────
// Redis-backed cache for live quiz session data to protect PostgreSQL
// from high-concurrency answer submission storms (100s of simultaneous students).
//
// Architecture:
//   Each active quiz session is stored in Redis as a Hash with a TTL.
//   Metadata fields are prefixed with `__` (systemId, userId, categoryId, etc.).
//   Answer data uses the field naming scheme `question:${questionId}`.
//   When the quiz session ends, the entire hash is fetched and flushed to PostgreSQL.
//
// Graceful degradation: if REDIS_URL is not configured, all cache operations
// safely degrade to no-ops, allowing the API to function (though without
// high-concurrency write protection).

'use strict';

const { getRedisClient } = require('../config/queue');
const logger = require('../config/logger');

// ─── Constants ──────────────────────────────────────────────────
const CACHE_CONFIG = {
  PREFIX: 'quizAttempt',
  VERSION: '1',
  METADATA_PREFIX: '__',
  ANSWER_PREFIX: 'question:',
  DEFAULT_TTL_SEC: parseInt(process.env.QUIZ_SESSION_TTL_SEC ?? '3600'),
  GRACE_PERIOD_SEC: 300, // 5 minutes buffer after quiz ends
};

// Metadata field constants to avoid stringly-typed code
const METADATA_FIELDS = {
  ATTEMPT_ID: '__attemptId',
  USER_ID: '__userId',
  QUIZ_ID: '__quizId',
  TOTAL_QS: '__totalQs',
  DURATION_SEC: '__durationSec',
  START_TIME: '__startTime',
};

// Field type definitions for auto-parsing
const FIELD_TYPES = {
  totalQs: 'number',
  durationSec: 'number',
  startTime: 'number',
  attemptId: 'string',
  userId: 'string',
  quizId: 'string',
};

/**
 * Gets the Redis cache key for a quiz attempt.
 * @param {string} attemptId
 * @returns {string}
 */
function getCacheKey(attemptId) {
  return `${CACHE_CONFIG.PREFIX}:v${CACHE_CONFIG.VERSION}:${attemptId}`;
}

/**
 * Initializes a quiz session in Redis cache.
 *
 * Stores session metadata (userId, categoryId, totalQs, etc.) as a Hash
 * with an expiration TTL. The durationSec is used to set the Redis TTL,
 * with a grace period added to account for network latency and submission delays.
 *
 * @param {string} attemptId - Unique quiz attempt identifier
 * @param {string} userId - User taking the quiz
 * @param {string} quizId - Quiz identifier (3NF: category derived through quiz)
 * @param {number} totalQs - Total number of questions
 * @param {number} durationSec - Quiz duration in seconds (used to calculate Redis TTL)
 * @returns {Promise<boolean>} true if session initialized, false if Redis unavailable
 */
async function initializeSession(attemptId, userId, quizId, totalQs, durationSec) {
  const client = getRedisClient();
  if (!client) {
    logger.warn(
      { attemptId, userId },
      '[QuizCache] Redis not configured — session caching disabled'
    );
    return false;
  }

  const key = getCacheKey(attemptId);
  // TTL = quiz duration + grace period (5 min), but respect default minimum
  const ttl = Math.max(durationSec + CACHE_CONFIG.GRACE_PERIOD_SEC, CACHE_CONFIG.DEFAULT_TTL_SEC);
  const now = Date.now();

  try {
    // Store session metadata in the Hash using pipeline for efficiency
    const pipeline = client.multi();
    pipeline.hset(key, {
      [METADATA_FIELDS.ATTEMPT_ID]: attemptId,
      [METADATA_FIELDS.USER_ID]: userId,
      [METADATA_FIELDS.QUIZ_ID]: quizId,
      [METADATA_FIELDS.TOTAL_QS]: String(totalQs),
      [METADATA_FIELDS.DURATION_SEC]: String(durationSec),
      [METADATA_FIELDS.START_TIME]: String(now),
    });
    pipeline.expire(key, ttl);
    await pipeline.exec();

    logger.info(
      { attemptId, userId, quizId, ttl },
      '[QuizCache] Session initialized'
    );

    return true;
  } catch (err) {
    logger.error(
      { err, attemptId },
      '[QuizCache] Failed to initialize session'
    );
    return false;
  }
}

/**
 * Saves a student's answer to a question.
 *
 * PRE-CONDITION: Session must exist (initialized via initializeSession).
 * This function validates the session exists before storing the answer.
 *
 * Stores the selectedOption in the Redis Hash at field `question:${questionId}`.
 * Does NOT update TTL — the session expires after the original durationSec + grace period.
 *
 * @param {string} attemptId - Unique quiz attempt identifier
 * @param {string} questionId - Question identifier
 * @param {string} selectedOption - The selected answer (e.g., 'A', 'B', 'C', 'D')
 * @returns {Promise<boolean>} true if saved, false if Redis unavailable or error
 */
async function saveAnswer(attemptId, questionId, selectedOption) {
  const client = getRedisClient();
  if (!client) {
    logger.warn(
      { attemptId, questionId },
      '[QuizCache] Redis not configured — answer not cached'
    );
    return false;
  }

  const key = getCacheKey(attemptId);
  const fieldName = `${CACHE_CONFIG.ANSWER_PREFIX}${questionId}`;

  try {
    // PRE-CONDITION: Verify session exists before allowing answers
    const sessionExists = await client.hexists(key, METADATA_FIELDS.ATTEMPT_ID);
    if (!sessionExists) {
      logger.error(
        { attemptId, questionId },
        '[QuizCache] Attempt to save answer to non-existent session'
      );
      return false;
    }

    await client.hset(key, fieldName, selectedOption);
    // Debug-level logging removed in high-concurrency path
    // Log only on errors or use structured sampling in production
    return true;
  } catch (err) {
    logger.error(
      { err, attemptId, questionId },
      '[QuizCache] Failed to save answer'
    );
    return false;
  }
}

/**
 * Retrieves all session metadata and answers for a quiz attempt.
 *
 * Fetches the entire Redis Hash and returns it in a structured format with
 * auto-parsed numeric fields:
 *   {
 *     session: { attemptId, userId, categoryId, totalQs: number, durationSec: number },
 *     answers: { [questionId]: selectedOption, ... }
 *   }
 *
 * This is called during session finalization to flush data to PostgreSQL.
 *
 * @param {string} attemptId - Unique quiz attempt identifier
 * @returns {Promise<{session: object, answers: object} | null>}
 *   Returns structured data if found (with parsed types), null if Redis unavailable or session not found.
 */
async function getSessionAndAnswers(attemptId) {
  const client = getRedisClient();
  if (!client) {
    logger.warn(
      { attemptId },
      '[QuizCache] Redis not configured — cannot retrieve session'
    );
    return null;
  }

  const key = getCacheKey(attemptId);

  try {
    const allData = await client.hgetall(key);

    // Check if the session exists; if no fields, it may have expired or not exist
    if (!allData || Object.keys(allData).length === 0) {
      logger.warn(
        { attemptId },
        '[QuizCache] Session not found or expired'
      );
      return null;
    }

    // Separate metadata (keys starting with METADATA_PREFIX) from answers
    const session = {};
    const answers = {};

    for (const [field, value] of Object.entries(allData)) {
      if (field.startsWith(CACHE_CONFIG.METADATA_PREFIX)) {
        // Strip the prefix for cleaner output
        const keyName = field.slice(CACHE_CONFIG.METADATA_PREFIX.length);
        // Auto-parse numeric fields based on schema
        const fieldType = FIELD_TYPES[keyName];
        session[keyName] = fieldType === 'number' ? Number(value) : value;
      } else if (field.startsWith(CACHE_CONFIG.ANSWER_PREFIX)) {
        // Extract questionId from `question:${questionId}` format
        const questionId = field.slice(CACHE_CONFIG.ANSWER_PREFIX.length);
        answers[questionId] = value;
      }
    }

    logger.info(
      { attemptId, sessionKeys: Object.keys(session), answerCount: Object.keys(answers).length },
      '[QuizCache] Session and answers retrieved'
    );

    return { session: Object.freeze(session), answers };
  } catch (err) {
    logger.error(
      { err, attemptId },
      '[QuizCache] Failed to retrieve session and answers'
    );
    return null;
  }
}

/**
 * Clears a quiz session from Redis cache.
 *
 * Called after the session is flushed to PostgreSQL to free up memory.
 * This is idempotent — no error if the key doesn't exist.
 *
 * @param {string} attemptId - Unique quiz attempt identifier
 * @returns {Promise<boolean>} true if cleared successfully, false if Redis unavailable
 */
async function clearSession(attemptId) {
  const client = getRedisClient();
  if (!client) {
    logger.warn(
      { attemptId },
      '[QuizCache] Redis not configured — session not cleared'
    );
    return false;
  }

  const key = getCacheKey(attemptId);

  try {
    const result = await client.del(key);
    logger.info(
      { attemptId, deleted: result > 0 },
      '[QuizCache] Session cleared'
    );
    return true;
  } catch (err) {
    logger.error(
      { err, attemptId },
      '[QuizCache] Failed to clear session'
    );
    return false;
  }
}

module.exports = {
  initializeSession,
  saveAnswer,
  getSessionAndAnswers,
  clearSession,
};
