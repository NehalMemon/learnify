// ─── Auth Cache Utilities ──────────────────────────────────────
// Centralized cache key generation and invalidation logic.
// DRY principle: Used by auth.controller, admin.controller, auth.middleware.

const { getRedisClient } = require('../config/queue');

/**
 * Generates a cache key for a user's auth profile.
 * 
 * @param {string} userId - The user ID
 * @returns {string} Cache key in format: auth:user:{userId}
 */
const getAuthCacheKey = (userId) => `auth:user:${userId}`;

/**
 * Invalidates the cached auth profile for a user.
 * Safe to call even if Redis is unavailable or user doesn't exist.
 * 
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
const invalidateAuthCache = async (userId) => {
  const redis = getRedisClient();
  if (!redis || !userId) return;
  await redis.del(getAuthCacheKey(userId));
};

module.exports = {
  getAuthCacheKey,
  invalidateAuthCache,
};
