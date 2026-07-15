// ─── Redis / BullMQ Connection Config ───────────────────────
// Single source of truth for the Redis connection used by both
// the main API (Queue publisher) and background workers.
//
// Uses ioredis directly from the URL string — ioredis handles
// rediss:// TLS (Upstash), redis://, and auth tokens natively.
// BullMQ accepts an ioredis instance as its connection option.
//
// GRACEFUL DEGRADATION: if REDIS_URL is not set, getRedisClient()
// returns null and all queue operations become no-ops. The main
// API remains fully functional without Redis.

'use strict';

const Redis  = require('ioredis');
const { Queue } = require('bullmq');
const logger = require('./logger');

// ── Singletons ────────────────────────────────────────────────

let _redisClient = null;
const _queues = {};

/**
 * Returns a shared ioredis client, or null if REDIS_URL is not set.
 * @returns {Redis | null}
 */
function getRedisClient() {
  if (!process.env.REDIS_URL) return null;

  if (!_redisClient) {
    // Strip accidental surrounding quotes (defensive parsing)
    const url = process.env.REDIS_URL.replace(/^["']|["']$/g, '');

    _redisClient = new Redis(url, {
      // Required by BullMQ — disables the default 3-retry limit
      // so the worker connection is kept alive between jobs.
      maxRetriesPerRequest: null,
      // Silence the aggressive ioredis reconnect logging
      enableReadyCheck: false,
    });

    _redisClient.on('error', (err) => {
      const msg = err?.message || err?.code || String(err);
      if (process.env.NODE_ENV !== 'test') {
        logger.error({ err }, `[Redis] Connection error: ${msg}`);
      }
    });

    _redisClient.on('connect', () => {
      logger.info('[Redis] Connected to Redis.');
    });
  }

  return _redisClient;
}

/**
 * Returns a BullMQ Queue instance, or null if Redis is not configured.
 * @param {string} name - queue name, e.g. 'progress', 'payment'
 * @returns {import('bullmq').Queue | null}
 */
function getQueue(name) {
  const client = getRedisClient();
  if (!client) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn(`[BullMQ] Redis not configured — queue "${name}" is disabled.`);
    }
    return null;
  }

  if (!_queues[name]) {
    _queues[name] = new Queue(name, { connection: client });
  }

  return _queues[name];
}

// ── Named queue constants ─────────────────────────────────────

const PROGRESS_QUEUE = 'progress';
const PAYMENT_QUEUE  = 'payment';
const QUIZ_QUEUE     = 'quiz';
const QUIZ_FINALIZE_JOB = 'finalizeQuiz';

module.exports = { getRedisClient, getQueue, PROGRESS_QUEUE, PAYMENT_QUEUE, QUIZ_QUEUE, QUIZ_FINALIZE_JOB };
