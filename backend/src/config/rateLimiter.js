// ─── Redis-Backed Rate Limiter Factory ───────────────────────
// FINDING-06 fix: replaces in-memory express-rate-limit stores with a
// Redis-backed store so rate limits are shared across all server
// instances (required for horizontal scaling / serverless).
//
// Uses `rate-limit-redis` which wraps any client that supports
// the sendCommand interface. We reuse the ioredis singleton from
// queue.js — no additional connection overhead.
//
// Graceful degradation: if Redis is not configured, the factory
// returns a plain express-rate-limit instance with the default
// in-memory store so development environments without Redis still
// work. A warning is logged to make the degradation visible.
//
// Usage:
//   const makeRateLimiter = require('./config/rateLimiter');
//   const loginLimiter = makeRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

'use strict';

const rateLimit      = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('./queue');
const logger         = require('./logger');

/**
 * Creates an express-rate-limit instance backed by Redis when available.
 *
 * @param {object} options - express-rate-limit options (windowMs, max, message, etc.)
 * @returns {import('express-rate-limit').RateLimitRequestHandler}
 */
function makeRateLimiter(options) {
  // Why the test bypass exists:
  // In NODE_ENV=test every request originates from the loopback address (::1 / 127.0.0.1).
  // A single bucket shared across all test requests would exhaust a tight limit (e.g. 3/hour)
  // within the first suite, causing unrelated tests to fail with 429. The Redis-backed store
  // also cannot be reliably flushed between runs. A passthrough is the safe, idiomatic solution
  // — rate limiting is tested via dedicated load/security tests, not golden-path integration suites.
  if (process.env.NODE_ENV === 'test') {
    return (_req, _res, next) => next();
  }

  const client = getRedisClient();

  if (!client) {
    // Architecture rule: pure stateless API. Log once so the operator
    // knows rate-limiting is operating in degraded (in-process) mode.
    logger.warn(
      '[RateLimit] REDIS_URL not set — falling back to in-memory store. ' +
      'Rate limits will NOT be shared across multiple server instances.'
    );

    return rateLimit({
      standardHeaders: true,
      legacyHeaders: false,
      ...options,
    });
  }

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    // rate-limit-redis uses the ioredis sendCommand interface.
    store: new RedisStore({
      sendCommand: (...args) => client.call(...args),
    }),
    ...options,
  });
}

module.exports = makeRateLimiter;
