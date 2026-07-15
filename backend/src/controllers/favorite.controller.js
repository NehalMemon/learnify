// ─── Favorite Controller ───────────────────────────────────
// GET /api/v1/favorites
// POST /api/v1/favorites/toggle

'use strict';

const prisma = require('../config/db');

const getAuthenticatedUserId = (req) => req.userId || req.user?.id;

const favoriteSelect = {
  id: true,
  itemType: true,
  itemId: true,
  createdAt: true,
};

/**
 * Toggle favorite for the authenticated user.
 * Request body: { itemId, itemType }
 * If favorite exists -> delete and return { status: 'removed' }
 * If not -> create and return { status: 'added' }
 *
 * @security authenticate
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const { itemId, itemType } = req.body || {};
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!itemId || !itemType) {
      return res.status(400).json({ success: false, message: 'itemId and itemType are required.' });
    }

    // Validate itemType against allowed values to avoid invalid enum values
    const allowed = ['COURSE', 'QUIZ'];
    if (!allowed.includes(itemType)) {
      return res.status(400).json({ success: false, message: `itemType must be one of: ${allowed.join(', ')}` });
    }

    // Wrap read-then-write in a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Try to find existing favorite by the composite unique key
      const existing = await tx.favorite.findUnique({
        where: {
          userId_itemId_itemType: {
            userId,
            itemId,
            itemType,
          },
        },
      });

      if (existing) {
        await tx.favorite.delete({ where: { id: existing.id } });
        return { status: 'removed' };
      }

      const created = await tx.favorite.create({
        data: {
          userId,
          itemId,
          itemType,
        },
      });

      return { status: 'added', id: created.id };
    });

    if (result.status === 'removed') {
      return res.status(200).json({ success: true, status: 'removed' });
    }

    return res.status(200).json({ success: true, status: 'added', data: { id: result.id } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/favorites
 * Returns the authenticated user's favorited courses and quizzes.
 */
const getFavorites = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: favoriteSelect,
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = favorites
      .filter((favorite) => favorite.itemType === 'COURSE')
      .map((favorite) => favorite.itemId);

    const quizIds = favorites
      .filter((favorite) => favorite.itemType === 'QUIZ')
      .map((favorite) => favorite.itemId);

    const [courses, quizzes] = await Promise.all([
      courseIds.length
        ? prisma.course.findMany({
            where: { id: { in: courseIds } },
          })
        : Promise.resolve([]),
      quizIds.length
        ? prisma.quiz.findMany({
            where: { id: { in: quizIds } },
          })
        : Promise.resolve([]),
    ]);

    return res.json({
      success: true,
      data: {
        courses,
        quizzes,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { toggleFavorite, getFavorites };
