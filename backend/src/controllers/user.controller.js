// ─── User Controller ─────────────────────────────────────────
// Handles authenticated profile updates for quiz onboarding.

const prisma = require('../config/db');
const { getRedisClient } = require('../config/queue');

const getAuthCacheKey = (userId) => `auth:user:${userId}`;

const invalidateAuthCache = async (userId) => {
  const redis = getRedisClient();
  if (!redis || !userId) return;
  await redis.del(getAuthCacheKey(userId));
};

const updateQuizOnboarding = async (req, res, next) => {
  try {
    const { hasSeenQuizDisclaimer, universityProgram, studyYear } = req.body;

    const data = {};

    if (typeof hasSeenQuizDisclaimer !== 'undefined') {
      data.hasSeenQuizDisclaimer = hasSeenQuizDisclaimer;
    }

    if (typeof universityProgram !== 'undefined') {
      data.universityProgram = universityProgram || null;
    }

    if (typeof studyYear !== 'undefined') {
      data.studyYear = studyYear === '' || studyYear === null ? null : studyYear;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one quiz onboarding field is required.',
      });
    }

    const [user] = await Promise.all([
      prisma.user.update({
        where: { id: req.user.id },
        data,
        select: {
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
          createdAt: true,
          updatedAt: true,
        },
      }),
      invalidateAuthCache(req.user.id),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Quiz onboarding profile updated successfully.',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateQuizOnboarding };