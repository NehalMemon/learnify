// ─── JWT Authentication Middleware ────────────────────────────
// Extracts and verifies the Bearer token, attaches user to req.

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const prisma = require('../config/db');
const { getRedisClient } = require('../config/queue');
const { getAuthCacheKey } = require('../utils/cache.util');

const AUTH_PROFILE_TTL_SECONDS = 300;

const cacheAuthProfile = async (redis, user) => {
  if (!redis || !user?.id) return;

  const authProfile = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    hasSeenQuizDisclaimer: user.hasSeenQuizDisclaimer,
    universityProgram: user.universityProgram,
    studyYear: user.studyYear,
    learnifyEnabled: user.learnifyEnabled,
    doctorsQuizzEnabled: user.doctorsQuizzEnabled,
  };

  await redis.set(getAuthCacheKey(user.id), JSON.stringify(authProfile), 'EX', AUTH_PROFILE_TTL_SECONDS);
};

const getUserFromCacheOrDb = async (userId) => {
  const redis = getRedisClient();

  if (redis) {
    const cached = await redis.get(getAuthCacheKey(userId));
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      isDeleted: true,
      hasSeenQuizDisclaimer: true,
      universityProgram: true,
      studyYear: true,
      learnifyEnabled: true,
      doctorsQuizzEnabled: true,
    },
  });

  if (user) {
    if (user.isDeleted) {
      return null;
    }

    await cacheAuthProfile(redis, user);
  }

  return user;
};

/**
 * Verifies the JWT access token.
 * On success, sets req.user = { id, email, role, fullName, entitlements }.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      req.cookies?.accessToken ||
      req.cookies?.token ||
      (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }
    
    // 1. Verify the token structure and signature FIRST
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token has expired.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    // 2. Resolve profile from Redis cache first, then DB fallback
    const user = await getUserFromCacheOrDb(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists or is banned.',
      });
    }

    req.user = {
      ...user,
      entitlements: {
        learnify: user.learnifyEnabled,
        doctorsQuizz: user.doctorsQuizzEnabled,
      },
    };
    req.userId = user.id;
    next();
  } catch (error) {
    // 3. Catch actual server/database errors accurately
    const logger = req.log || console;
    logger.error?.({ err: error }, 'Authentication middleware database error');
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

/**
 * Role-based authorization gate.
 * Usage: authorize('ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

/**
 * Strict Admin / Super-Admin role guard.
 * Accepts both ADMIN and SUPER_ADMIN so super-admins are never locked out.
 */
const isAdmin = (req, res, next) => {
  if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.',
    });
  }
  next();
};

/**
 * Named role-based authorization factory used by Phase 2+ routes.
 * Identical in behaviour to `authorize` but surfaced under the canonical
 * name referenced in the architecture docs: authorizeRoles('ADMIN', 'SUPER_ADMIN').
 *
 * @param {...string} roles - Allowed role strings.
 * @returns {import('express').RequestHandler}
 */
const authorizeRoles = (...roles) => authorize(...roles);

/**
 * Optional auth: populate req.user if a valid token is present,
 * but do NOT reject the request if no token is provided.
 * Use on routes that are public but benefit from knowing who is calling
 * (e.g., GET /courses/:id allows admins to preview unpublished courses).
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.accessToken ||
    req.cookies?.token ||
    (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
  
  if (!token) {
    return next(); // guest — continue without user context
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);

    const user = await getUserFromCacheOrDb(decoded.id);

    if (user) {
      if (user.isDeleted) {
        return next();
      }

      req.user = {
        ...user,
        entitlements: {
          learnify: user.learnifyEnabled,
          doctorsQuizz: user.doctorsQuizzEnabled,
        },
      };
      req.userId = user.id;
    }
  } catch (_) {
    // Invalid / expired token on an optional-auth route — treat as guest
  }

  next();
};

module.exports = { authenticate, authorize, authorizeRoles, optionalAuthenticate, isAdmin };
