// ─── Auth Controller ─────────────────────────────────────────
// Handles registration, login, token refresh, profile retrieval, and Google OAuth.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/db');
const jwtConfig = require('../config/jwt');
const logger = require('../config/logger');
const { getRedisClient } = require('../config/queue');
const { getAuthCacheKey, invalidateAuthCache } = require('../utils/cache.util');

// Why: Instantiated once at module load — avoids re-creating the HTTP client on
// every request, which is both expensive and unnecessary.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// HttpOnly cookie options for secure JWT storage.
// Security Rule §2: cookies must be HttpOnly and secure in production.
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const clearCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

const setAuthCookies = (res, tokens) => {
  res.cookie('accessToken', tokens.accessToken, cookieOptions);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
  // Remove the legacy access-token cookie name after migrating to accessToken.
  res.clearCookie('token', clearCookieOptions);
};

const AUTH_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  hasSeenQuizDisclaimer: true,
  universityProgram: true,
  studyYear: true,
  learnifyEnabled: true,
  doctorsQuizzEnabled: true,
  accessExpiresAt: true,
  createdAt: true,
};

const formatAuthUser = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone ?? null,
  role: user.role,
  hasSeenQuizDisclaimer: user.hasSeenQuizDisclaimer ?? false,
  universityProgram: user.universityProgram ?? null,
  studyYear: user.studyYear ?? null,
  learnifyEnabled: user.learnifyEnabled,
  doctorsQuizzEnabled: user.doctorsQuizzEnabled,
  accessExpiresAt: user.accessExpiresAt ?? null,
  createdAt: user.createdAt,
});

// ── Helper: Generate Token Pair ──────────────────────────────

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    learnifyEnabled: user.learnifyEnabled,
    doctorsQuizzEnabled: user.doctorsQuizzEnabled,
    entitlements: {
      learnify: user.learnifyEnabled,
      doctorsQuizz: user.doctorsQuizzEnabled,
    },
  };

  const accessToken = jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });

  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

// ── POST /api/v1/auth/register ───────────────────────────────

const register = async (req, res, next) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user — always STUDENT on self-registration
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone: phone || null,
        role: 'STUDENT',
      },
      select: AUTH_USER_SELECT,
    });

    const tokens = generateTokens(user);
    setAuthCookies(res, tokens);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user,
      redirect: '/dashboard',
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/login ──────────────────────────────────

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user — exclude soft-deleted accounts (FINDING-04 fix)
    // Include passwordHash for verification but select the full auth profile
    const user = await prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
      },
      select: {
        // include passwordHash for authentication, plus all auth profile fields
        passwordHash: true,
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        hasSeenQuizDisclaimer: true,
        universityProgram: true,
        studyYear: true,
        learnifyEnabled: true,
        doctorsQuizzEnabled: true,
        accessExpiresAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const tokens = generateTokens(user);
    setAuthCookies(res, tokens);

    res.json({
      success: true,
      message: 'Login successful.',
      user: formatAuthUser(user),
      redirect: user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/refresh ────────────────────────────────

const refreshToken = async (req, res, _next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    const decoded = jwt.verify(token, jwtConfig.refreshSecret);

    // Exclude soft-deleted accounts — closes the token-refresh bypass (FINDING-06 fix)
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        hasSeenQuizDisclaimer: true,
        universityProgram: true,
        studyYear: true,
        learnifyEnabled: true,
        doctorsQuizzEnabled: true,
        accessExpiresAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    const tokens = generateTokens(user);
    setAuthCookies(res, tokens);

    res.json({
      success: true,
      message: 'Tokens refreshed.',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired. Please login again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token.',
    });
  }
};

// ── GET /api/v1/auth/me ──────────────────────────────────────
// Returns the current authenticated user's profile with all critical UI fields.
// CRITICAL: formatAuthUser ensures consistent null-coalescing for optional fields,
// preventing frontend fallbacks from triggering when fields are undefined.

const getMe = async (req, res, next) => {
  try {
    const includeCourses = req.query.includeCourses === 'true';

    const [user, enrollments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: AUTH_USER_SELECT,
      }),
      prisma.enrollment.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          status: true,
          progressPercent: true,
          courseId: true,
        },
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const courseIds = includeCourses
      ? [...new Set(enrollments.map((item) => item.courseId).filter(Boolean))]
      : [];

    const courses =
      includeCourses && courseIds.length
        ? await prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: {
              id: true,
              title: true,
              courseType: true,
              divisionId: true,
            },
          })
        : [];

    const divisionIds =
      includeCourses && courses.length
        ? [...new Set(courses.map((item) => item.divisionId).filter(Boolean))]
        : [];

    const divisions =
      includeCourses && divisionIds.length
        ? await prisma.division.findMany({
            where: { id: { in: divisionIds } },
            select: {
              id: true,
              slug: true,
              name: true,
            },
          })
        : [];

    const divisionById = new Map(divisions.map((division) => [division.id, division]));
    const courseById = new Map(
      courses.map((course) => [
        course.id,
        {
          id: course.id,
          title: course.title,
          courseType: course.courseType,
          division: course.divisionId ? divisionById.get(course.divisionId) || null : null,
        },
      ])
    );

    const payload = {
      ...formatAuthUser(user),
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment.id,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        course:
          includeCourses && enrollment.courseId
            ? courseById.get(enrollment.courseId) || null
            : null,
      })),
    };

    res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/auth/google ─────────────────────────────────

/**
 * Authenticate or register a user via Google OAuth 2.0.
 *
 * @param {import('express').Request}  req - Express request. Body: { tokenId: string }
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Error forwarding middleware.
 *
 * @returns {Promise<void>} 200 for existing users, 201 for newly created accounts.
 *
 * @throws {401} If the Google token is invalid, expired, or audience-mismatched.
 * @throws {403} If the resolved user account has been soft-deleted (banned).
 */
const googleLogin = async (req, res, next) => {
  try {
    const { tokenId } = req.body;

    // Verify the token's signature AND audience claim in a single round-trip.
    // An audience mismatch (token meant for a different app) throws immediately.
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, name } = payload;

    // Prefer the pre-formatted `name` claim; fall back to constructing it from
    // given/family parts; finally fall back to the email prefix for edge-cases
    // where Google omits name data (e.g., privacy-restricted accounts).
    const fullName = name || [given_name, family_name].filter(Boolean).join(' ') || email.split('@')[0];

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        hasSeenQuizDisclaimer: true,
        universityProgram: true,
        studyYear: true,
        isDeleted: true,
        learnifyEnabled: true,
        doctorsQuizzEnabled: true,
        accessExpiresAt: true,
        createdAt: true,
      },
    });

    if (existingUser) {
      // Block soft-deleted (banned) accounts before issuing any token.
      if (existingUser.isDeleted) {
        return res.status(403).json({
          success: false,
          message: 'This account has been suspended. Please contact support.',
        });
      }

      const tokens = generateTokens(existingUser);
    setAuthCookies(res, tokens);
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        user: formatAuthUser(existingUser),
        redirect: existingUser.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard',
      });
    }

    // New user — provision a random, non-guessable passwordHash so the account
    // physically cannot be accessed via the password-login route.
    const randomPasswordHash = crypto.randomBytes(32).toString('hex');

    const newUser = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: randomPasswordHash,
        role: 'STUDENT',
      },
      select: AUTH_USER_SELECT,
    });

    const tokens = generateTokens(newUser);
    setAuthCookies(res, tokens);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: newUser,
      redirect: '/dashboard',
    });
  } catch (error) {
    // google-auth-library throws a generic Error (not a typed class) with
    // a message containing "Token used too late" or "Invalid token signature".
    // We surface these as 401s rather than letting the 500 handler catch them.
    if (
      error.message?.includes('Token used too late') ||
      error.message?.includes('Invalid token') ||
      error.message?.includes('Wrong number of segments') ||
      error.message?.includes('audience mismatch')
    ) {
      logger.warn({ msg: 'Google token verification failed', reason: error.message });
      return res.status(401).json({
        success: false,
        message: 'Google authentication failed. Token is invalid or expired.',
      });
    }
    next(error);
  }
};

// ── POST /api/v1/auth/logout ─────────────────────────────────

/**
 * Invalidates the user's session by clearing auth cookies server-side.
 *
 * The client-side clearAuth() (js-cookie) removes the JS-readable copies,
 * but the backend is the authoritative place to expire the HttpOnly cookie
 * (if one is ever set) and to signal a clean logout to any future middleware.
 *
 * @param {import('express').Request}  req  - Express request.
 * @param {import('express').Response} res  - Express response.
 * @returns {void} 200 { success: true }
 */
const logout = (req, res) => {
  // Clear the auth cookies — maxAge 0 instructs the browser to delete them
  // immediately. The path must match the path used when the cookie was set.

  res.clearCookie('token', clearCookieOptions);
  res.clearCookie('accessToken', clearCookieOptions);
  res.clearCookie('refreshToken', clearCookieOptions);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

module.exports = { register, login, refreshToken, getMe, googleLogin, logout };
