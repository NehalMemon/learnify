// ─── DoctorsQuizz Controller ────────────────────────────────
// Quiz categories, questions (admin CRUD), attempt flow, and leaderboard.
// 
// Sprint 7: Real-Time Quiz Engine with Redis Caching
// - Answers are cached in Redis during active quiz sessions
// - Final submission flushes all data to PostgreSQL via BullMQ worker
// - Protects DB from high-concurrency submission storms

const prisma = require('../config/db');
const { getQueue } = require('../config/queue');
const quizCache = require('../services/quizCache.service');
const logger = require('../config/logger');

// ═══════════════════════════════════════════════════════════════
// QUIZ CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Lists all quiz categories ordered by name in ascending order,
 * including a count of quizzes in each category.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {Promise<void>} Resolves when the categories have been sent in the response
 */
const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.quizCategory.findMany({
      include: {
        _count: { select: { quizzes: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/quiz/categories ──────────────────────

const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    const category = await prisma.quizCategory.create({
      data: { name },
    });

    res.status(201).json({
      success: true,
      message: 'Quiz category created.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/quiz/categories/:id ───────────────────

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await prisma.quizCategory.update({
      where: { id },
      data: { name },
    });

    res.json({
      success: true,
      message: 'Category updated.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/quiz/categories/:id ────────────────

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.quizCategory.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Category deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// QUIZ QUESTIONS (ADMIN)
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/admin/quiz/categories/:categoryId/questions ─

const listQuestions = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [questions, total] = await Promise.all([
      prisma.quizQuestion.findMany({
        where: { categoryId },
        skip,
        take: Number(limit),
        orderBy: { questionText: 'asc' },
      }),
      prisma.quizQuestion.count({ where: { categoryId } }),
    ]);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/quiz/categories/:categoryId/questions

const createQuestion = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { questionText, optionA, optionB, optionC, optionD, correctOption, explanation } = req.body;

    // Verify category exists
    const category = await prisma.quizCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    const question = await prisma.quizQuestion.create({
      data: {
        categoryId,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation: explanation || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Question created.',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/quiz/questions/:id ────────────────────

const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questionText, optionA, optionB, optionC, optionD, correctOption, explanation } = req.body;

    const data = {};
    if (questionText !== undefined) data.questionText = questionText;
    if (optionA !== undefined) data.optionA = optionA;
    if (optionB !== undefined) data.optionB = optionB;
    if (optionC !== undefined) data.optionC = optionC;
    if (optionD !== undefined) data.optionD = optionD;
    if (correctOption !== undefined) data.correctOption = correctOption;
    if (explanation !== undefined) data.explanation = explanation;

    const question = await prisma.quizQuestion.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: 'Question updated.',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/quiz/questions/:id ──────────────────

const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.quizQuestion.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Question deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/quiz/categories/:categoryId/questions/bulk
// Bulk import questions for a category.

const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { questions } = req.body; // Array of question objects

    // Verify category
    const category = await prisma.quizCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    const data = questions.map((q) => ({
      categoryId,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation || null,
    }));

    const result = await prisma.quizQuestion.createMany({ data });

    res.status(201).json({
      success: true,
      message: `${result.count} questions imported.`,
      data: { count: result.count },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// STUDENT – QUIZ ATTEMPT FLOW
// ═══════════════════════════════════════════════════════════════

// ── POST /api/v1/quizzes/:quizId/start ──────────────────────
// Start a new Quiz-Arena attempt.
// The quizId is a path parameter so the Exam Arena frontend can construct
// the URL deterministically from the quiz catalogue browse response.
//
// Anti-Cheat: correctOption and explanation are never included in the response.
// durationSec comes from the Quiz record — it is the server's authoritative
// source of truth for the exam timer, preventing client-side manipulation.

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const startAttempt = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id:          true,
        title:       true,
        durationSec: true,
        categoryId:  true,
        isPublished: true,
        category:    { select: { name: true } },
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found.',
      });
    }

    if (!quiz.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'This exam is not yet available.',
      });
    }

    // Fetch all question IDs belonging to this quiz.
    // Prisma does not support ORDER BY RANDOM() — we shuffle application-side.
    const allIds = await prisma.quizQuestion.findMany({
      where: { quizId: quiz.id },
      select: { id: true },
    });

    if (allIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This exam has no questions yet.',
      });
    }

    // Deliver all questions in the quiz (no artificial count cap for named exams).
    const shuffledIds = allIds
      .sort(() => 0.5 - Math.random())
      .map((q) => q.id);

    // Create the attempt record before touching Redis so a crash leaves a
    // recoverable DB row rather than an orphaned Redis session.
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId:     quiz.id,
        categoryId: quiz.categoryId,
        totalQs:    shuffledIds.length,
      },
    });

    // Seed the Redis session with the quiz's authoritative durationSec.
    // This value is checked by finalizeAttempt to detect expired sessions.
    await quizCache.initializeSession(
      attempt.id,
      userId,
      quiz.categoryId,
      shuffledIds.length,
      quiz.durationSec
    );

    // Return only the safe subset of question fields — correctOption and
    // explanation are never included while the attempt is in progress.
    const questions = await prisma.quizQuestion.findMany({
      where: { id: { in: shuffledIds } },
      select: {
        id:           true,
        questionText: true,
        optionA:      true,
        optionB:      true,
        optionC:      true,
        optionD:      true,
      },
    });

    logger.info(
      { attemptId: attempt.id, userId, quizId: quiz.id, totalQs: shuffledIds.length, durationSec: quiz.durationSec },
      '[QuizController] Exam Arena session started'
    );

    return res.status(201).json({
      success: true,
      message: 'Exam started. Good luck!',
      data: {
        attemptId:      attempt.id,
        quizId:         quiz.id,
        quizTitle:      quiz.title,
        categoryName:   quiz.category.name,
        totalQuestions: shuffledIds.length,
        durationSec:    quiz.durationSec,
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/quiz/attempts/:attemptId/submit ────────────
// Submit answers for a quiz attempt. Grades automatically.

const submitAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { answers, timeTakenSec } = req.body;
    // answers = [{ questionId, selected }]
    const userId = req.user.id;

    // Verify attempt exists and belongs to user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found.',
      });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    if (attempt.finishedAt) {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been submitted.',
      });
    }

    // ── FINDING-05 fix: Anti-Forgery Validation ────────────────
    // Verify every submitted questionId actually belongs to the
    // same category as this attempt. Without this check a malicious
    // actor could start an easy category and submit questionIds from
    // a different, already-seen category to inflate their score.
    const questionIds = answers.map((a) => a.questionId);

    const validQuestions = await prisma.quizQuestion.findMany({
      where: {
        id: { in: questionIds },
        quizId: attempt.quizId,
      },
      select: { id: true, correctOption: true, explanation: true },
    });

    // If any submitted ID doesn't exist in this category, the counts differ.
    if (validQuestions.length !== questionIds.length) {
      const foreignIds = questionIds.filter(
        (id) => !validQuestions.find((q) => q.id === id)
      );
      return res.status(400).json({
        success: false,
        message: 'Answer forgery attempt detected: one or more submitted question IDs do not belong to this quiz.',
        invalidIds: foreignIds,
      });
    }

    // Fetch correct answers for the submitted questions

    // validQuestions is already the authoritative correct-answer set
    const correctMap = {};
    validQuestions.forEach((q) => {
      correctMap[q.id] = q;
    });

    // Grade and build answer records
    let score = 0;
    const answerRecords = answers.map((a) => {
      const correct = correctMap[a.questionId];
      const isCorrect = correct && correct.correctOption === a.selected;
      if (isCorrect) score++;

      return {
        attemptId,
        questionId: a.questionId,
        selected: a.selected,
        isCorrect: !!isCorrect,
      };
    });

    // Persist everything in a transaction
    await prisma.$transaction([
      prisma.quizAnswer.createMany({ data: answerRecords }),
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          timeTakenSec: timeTakenSec || null,
          finishedAt: new Date(),
        },
      }),
    ]);

    // Build result response with explanations
    const results = answers.map((a) => {
      const correct = correctMap[a.questionId];
      return {
        questionId: a.questionId,
        selected: a.selected,
        correctOption: correct?.correctOption,
        isCorrect: correct?.correctOption === a.selected,
        explanation: correct?.explanation || null,
      };
    });

    res.json({
      success: true,
      message: 'Quiz submitted.',
      data: {
        attemptId,
        score,
        totalQuestions: answers.length,
        percentage: Math.round((score / answers.length) * 100),
        timeTakenSec: timeTakenSec || null,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// SPRINT 7: REAL-TIME QUIZ ENGINE (REDIS-BACKED)
// ═══════════════════════════════════════════════════════════════

// ── POST /api/v1/quiz/attempts/:attemptId/answer ─────────────
// Submit a single answer to Redis cache (high-concurrency safe).
// This endpoint is called for each question as the student answers.
// Answers are stored in Redis and flushed to PostgreSQL when the
// quiz session ends (via BullMQ worker).

const submitAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selected } = req.body;
    const userId = req.user.id;

    // Verify attempt exists and belongs to user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found.',
      });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    if (attempt.finishedAt) {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been submitted.',
      });
    }

    // Verify question belongs to the same category (anti-forgery)
    const question = await prisma.quizQuestion.findFirst({
      where: {
        id: questionId,
        quizId: attempt.quizId,
      },
    });

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question for this quiz.',
      });
    }

    // Save answer to Redis cache
    const cached = await quizCache.saveAnswer(attemptId, questionId, selected);

    if (!cached) {
      logger.warn(
        { attemptId, questionId },
        '[QuizController] Answer not cached - Redis unavailable'
      );
      // Graceful degradation: if Redis is down, we could either:
      // 1. Reject the request (strict mode)
      // 2. Allow it but log warning (current behavior)
      // For now, we allow it but the answer won't be persisted
    }

    // Return only a success acknowledgement — never echo back the selected
    // answer, correctness, or cache status while the exam is still in progress.
    // This prevents client-side scripts from harvesting correctness signals.
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/quiz/attempts/:attemptId/finalize ───────────
// Finalize a quiz attempt - triggers BullMQ worker to flush
// Redis data to PostgreSQL.
//
// This is called when:
// 1. Student clicks "Submit Quiz"
// 2. Timer expires (client-side trigger)
//
// The worker handles the heavy lifting:
// - Fetches all answers from Redis
// - Grades the quiz
// - Persists to PostgreSQL
// - Clears Redis cache

const finalizeAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { timeTakenSec } = req.body;
    const userId = req.user.id;

    // Verify attempt exists and belongs to user
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found.',
      });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    if (attempt.finishedAt) {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been submitted.',
      });
    }

    // Verify session exists in Redis
    const sessionData = await quizCache.getSessionAndAnswers(attemptId);
    
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        message: 'Quiz session not found in cache. Please try again or contact support.',
      });
    }

    const answerCount = Object.keys(sessionData.answers).length;

    // Add finalization job to BullMQ queue
    const queue = getQueue('quiz');
    
    if (!queue) {
      // Redis not available - fall back to direct PostgreSQL submission
      logger.warn(
        { attemptId },
        '[QuizController] Redis unavailable - using direct submission'
      );
      // Redirect to the standard submit endpoint
      return submitAttempt(req, res, next);
    }

    await queue.add('finalizeQuiz', {
      attemptId,
      userId,
      quizId: attempt.quizId,
      categoryId: attempt.categoryId,
      totalQs: attempt.totalQs,
      timeTakenSec: timeTakenSec || null,
    }, {
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s backoff
      },
      removeOnComplete: {
        age: 3600, // Keep successful jobs for 1 hour (debugging)
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours (debugging)
      },
    });

    logger.info(
      { attemptId, userId, answerCount },
      '[QuizController] Quiz finalization job queued'
    );

    res.json({
      success: true,
      message: 'Quiz submitted. Calculating results...',
      data: {
        attemptId,
        queued: true,
        answerCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/quiz/attempts/my ────────────────────────────
// Get current user's attempt history.

// ── GET /api/v1/quiz/attempts/my ────────────────────────────
// Get current user's attempt history (Optimized with Cursor Pagination).

const getMyAttempts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // We replace 'page' with 'cursor'
    const { quizId, categoryId, cursor, limit = 20 } = req.query;

    const where = { userId };
    if (quizId) where.quizId = quizId;
    if (categoryId) where.categoryId = categoryId;

    // Fetch limit + 1 items to see if there is a next page
    const attempts = await prisma.quizAttempt.findMany({
      take: Number(limit) + 1,
      ...(cursor && {
        skip: 1, // Skip the item that acts as the cursor
        cursor: {
          id: String(cursor),
        },
      }),
      where,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        quizId: true,
        categoryId: true,
        score: true,
        totalQs: true,
        timeTakenSec: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    // Check if we have a next page by seeing if we got that +1 extra item
    let nextCursor = null;
    if (attempts.length > Number(limit)) {
      const nextItem = attempts.pop(); // Remove the extra item from the array
      nextCursor = nextItem.id;        // Save its ID as the cursor for the next request
    }

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          nextCursor, // Frontend will pass this back as ?cursor=... to get the next page
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/quiz/attempts/:attemptId ────────────────────
// Get full detail of a specific attempt with answers.

const getAttemptDetail = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                correctOption: true,
                explanation: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found.',
      });
    }

    if (attempt.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/quiz/leaderboard ────────────────────────────
// Top scorers per category (or overall).

const getLeaderboard = async (req, res, next) => {
  try {
    const { categoryId, limit = 20 } = req.query;

    const where = { finishedAt: { not: null } };
    if (categoryId) where.categoryId = categoryId;

    // Get top attempts ordered by score (desc), then time (asc)
    const topAttempts = await prisma.quizAttempt.findMany({
      where,
      take: Number(limit),
      orderBy: [
        { score: 'desc' },
        { timeTakenSec: 'asc' },
      ],
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    const leaderboard = topAttempts.map((a, index) => ({
      rank: index + 1,
      userId: a.user.id,
      fullName: a.user.fullName,
      score: a.score,
      totalQs: a.totalQs,
      percentage: Math.round((a.score / a.totalQs) * 100),
      timeTakenSec: a.timeTakenSec,
      attemptDate: a.startedAt,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/quiz/quizzes ────────────────────────────────
// Filterable browse endpoint for published named exams.
// Students can filter by categoryId, subject, or free-text search on title.

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getQuizzes = async (req, res, next) => {
  try {
    const { categoryId, subject, search } = req.query;

    /** @type {import('@prisma/client').Prisma.QuizWhereInput} */
    const where = { isPublished: true };

    if (categoryId) where.categoryId = categoryId;
    if (subject)    where.subject    = subject;
    if (search) {
      where.title = { contains: String(search), mode: 'insensitive' };
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      select: {
        id:          true,
        title:       true,
        subject:     true,
        createdAt:   true,
        category:    { select: { id: true, name: true } },
        _count:      { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single published quiz by its ID, including its category and question count.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<import('express').Response>} JSON response with the quiz data or error message.
 */
const getQuizById = async (req, res, next) => {
  try {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });

    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found.',
      });
    }

    return res.json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Categories
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // Questions (admin)
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
  // Named quizzes (exam wrappers)
  getQuizzes,
  getQuizById,
  // Student quiz flow
  startAttempt,
  submitAttempt,
  // Sprint 7: Real-time quiz engine (Redis-backed)
  submitAnswer,
  finalizeAttempt,
  // Attempt history & details
  getMyAttempts,
  getAttemptDetail,
  // Leaderboard
  getLeaderboard,
};
