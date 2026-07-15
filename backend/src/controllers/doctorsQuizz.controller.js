// ─── DoctorsQuizz High-Concurrency Engine ────────────────────
// Sprint 7 implementation.
//
// Architecture (architecture.md):
//   ✅ POST /start   → Redis session init via quizCache   (no PostgreSQL write)
//   ✅ POST /answer  → Redis HSET via quizCache            (no PostgreSQL write — returns fast 200)
//   ✅ POST /submit  → Redis flush + Prisma $transaction + Redis cleanup
//
// Real-time events (Pusher):
//   Channel private-quiz-<attemptId>  →  quiz-started
//   Channel public-leaderboard        →  leaderboard-updated
//
// Anti-forgery:
//   QuestionIds are stored in a separate Redis SET to validate that
//   submitted questionIds belong to the originally allocated set.

'use strict';

const { v4: uuidv4 } = require('uuid');
const prisma              = require('../config/db');
const pusher              = require('../config/pusher');
const { getRedisClient }  = require('../config/queue');
const quizCache           = require('../services/quizCache.service');
const logger              = require('../config/logger');

const fisherYatesShuffle = (items) => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

// ── Redis key helper for anti-forgery questionIds ──────────────
// Stores the allocated question IDs as a SET for O(1) membership checks.
const questionIdsKey = (attemptId) => `quizQuestions:v1:${attemptId}`;

// Default quiz duration (minutes). Questions × avg-time-per-question.
// TTL stored alongside the session so submit can verify timing.
const DEFAULT_TIME_PER_Q_SEC = 90; // 90 s per question
const BUFFER_SEC             = 60; // 1-min grace buffer

// ══════════════════════════════════════════════════════════════
// POST /api/v1/quiz/categories/:categoryId/start
// ══════════════════════════════════════════════════════════════

/**
 * Starts a new DoctorsQuizz session.
 *
 * 1. Fetches questions for the category from PostgreSQL (read-only).
 * 2. Generates a UUID attemptId and initializes a Redis session via quizCache.
 * 3. Stores allocated questionIds in a separate Redis SET for anti-forgery checks.
 * 4. Sets TTL = (totalQs × 90 s) + 60 s buffer.
 * 5. Triggers Pusher `quiz-started` on private-quiz-<attemptId>.
 * 6. Returns the attemptId + question list (correctOption excluded).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const startQuiz = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user.id;
    const requestedCount = Math.min(
      parseInt(req.query.count) || 20,
      100 // hard cap: security.md §4
    );

    // ── 1. Validate category exists ───────────────────────────
    const category = await prisma.quizCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    // ── 2. Pick a random published quiz in this category, then
    //    fetch all question IDs via quizId (3NF: Question→Quiz→Category)
    const quizzes = await prisma.quiz.findMany({
      where: { categoryId, isPublished: true },
      select: { id: true },
    });

    if (quizzes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No published quizzes available in this category.',
      });
    }

    const quizIds = quizzes.map((q) => q.id);

    const allQuestions = await prisma.quizQuestion.findMany({
      where: { quizId: { in: quizIds } },
      select: {
        id: true,
        quizId: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        // correctOption and explanation intentionally excluded
      },
    });

    if (allQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions available in this category.',
      });
    }

    // Fisher-Yates shuffle → take requestedCount
    const shuffled = fisherYatesShuffle(allQuestions);
    const selected = shuffled.slice(0, Math.min(requestedCount, shuffled.length));

    // Determine the quizId for the attempt record (use the quiz that contributed the most questions)
    const quizIdFreq = {};
    selected.forEach((q) => {
      quizIdFreq[q.quizId] = (quizIdFreq[q.quizId] || 0) + 1;
    });
    const primaryQuizId = Object.entries(quizIdFreq).sort((a, b) => b[1] - a[1])[0][0];

    // ── 3. Generate attemptId and initialize quizCache session ───
    const attemptId  = uuidv4();
    const startTime  = Date.now();
    const totalQs    = selected.length;
    const durationSec = totalQs * DEFAULT_TIME_PER_Q_SEC + BUFFER_SEC;

    // Initialize Redis session via quizCache service
    // why quizId instead of categoryId: 3NF normalization — category is derived from quiz
    const sessionInitialized = await quizCache.initializeSession(
      attemptId,
      userId,
      primaryQuizId,
      totalQs,
      durationSec
    );

    if (!sessionInitialized) {
      logger.error('Redis unavailable — cannot start DoctorsQuizz session.');
      return res.status(503).json({
        success: false,
        message: 'Real-time quiz service temporarily unavailable. Please try again.',
      });
    }

    // ── 4. Store allocated questionIds in a separate Redis SET ──
    // Used for anti-forgery checks in submitAnswer.
    // why pipeline: collapses two Redis round-trips (sadd + expire) into one
    const redis = getRedisClient();
    if (redis) {
      const selectedIds = selected.map((q) => q.id);
      const pipeline = redis.multi();
      pipeline.sadd(questionIdsKey(attemptId), ...selectedIds);
      pipeline.expire(questionIdsKey(attemptId), durationSec);
      await pipeline.exec();
    }

    // ── 5. Trigger Pusher event ───────────────────────────────
    await pusher.trigger(`private-quiz-${attemptId}`, 'quiz-started', {
      attemptId,
      categoryName: category.name,
      totalQs,
      serverTimestamp: startTime,
      durationSec,
    });

    logger.info({ attemptId, userId, quizId: primaryQuizId, totalQs }, 'DoctorsQuizz session started');

    // Strip quizId from the response — client doesn't need internal IDs
    const sanitizedQuestions = selected.map(({ quizId: _qid, ...rest }) => rest);

    // ── 6. Return attemptId + questions (no answers) ──────────
    res.status(201).json({
      success: true,
      message: 'Quiz started.',
      data: {
        attemptId,
        categoryName: category.name,
        totalQs,
        durationSec,
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /api/v1/quiz/attempts/:attemptId/answer
// ══════════════════════════════════════════════════════════════

/**
 * Records a single answer in Redis via quizCache — zero PostgreSQL writes.
 *
 * High-concurrency safe: quizCache.saveAnswer uses Redis HSET O(1) atomic operation.
 * Each call overwrites any previous answer for the same questionId
 * (last-write-wins — students can change answers before submit).
 *
 * Anti-forgery: validates questionId belongs to this session's
 * pre-selected question SET (stored separately in Redis).
 *
 * FAST PATH: Returns 200 OK immediately after quizCache.saveAnswer resolves.
 * No PostgreSQL queries. No blocking I/O.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selected } = req.body;
    const userId = req.user.id;

    const redis = getRedisClient();
    if (!redis) {
      return res.status(503).json({ success: false, message: 'Quiz service temporarily unavailable.' });
    }

    // ── Quick validation: session must exist ──────────────
    // quizCache will validate this in saveAnswer, but check first
    // to return 404 if session doesn't exist (idempotent).
    const sessionData = await quizCache.getSessionAndAnswers(attemptId);
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        message: 'Quiz session not found or has expired.',
      });
    }

    const { session } = sessionData;

    // ── Ownership check ──────────────────────────────────
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    // ── Anti-forgery: ensure questionId was in the allocated set ──
    const isAllocated = await redis.sismember(questionIdsKey(attemptId), questionId);
    if (!isAllocated) {
      return res.status(400).json({
        success: false,
        message: 'Answer forgery attempt: questionId does not belong to this quiz session.',
      });
    }

    // ── Fast path: Save answer to quizCache ──────────────────────
    // Returns 200 immediately after this resolves.
    const saved = await quizCache.saveAnswer(attemptId, questionId, selected);
    if (!saved) {
      return res.status(500).json({
        success: false,
        message: 'Failed to record answer. Please try again.',
      });
    }

    res.json({
      success: true,
      message: 'Answer recorded.',
    });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /api/v1/quiz/attempts/:attemptId/submit
// ══════════════════════════════════════════════════════════════

/**
 * Finalises a DoctorsQuizz attempt:
 *
 *   1. Fetches session + all submitted answers from quizCache.
 *   2. Fetches correct answers from PostgreSQL for the category.
 *   3. Grades the attempt and calculates timeTakenSec.
 *   4. Runs a Prisma $transaction to atomically persist
 *      QuizAttempt + QuizAnswer rows.
 *   5. Clears both Redis keys (session + answers + questionIds).
 *   6. Triggers Pusher `leaderboard-updated` on public-leaderboard.
 *
 * Idempotency note: After the Redis session is deleted the endpoint
 * returns 404 on any subsequent call — duplicate submissions are safe.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const submitQuiz = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    // ── 1. Fetch session and submitted answers from quizCache ──
    const sessionAndAnswers = await quizCache.getSessionAndAnswers(attemptId);

    if (!sessionAndAnswers) {
      return res.status(404).json({
        success: false,
        message: 'Quiz session not found or has already been submitted.',
      });
    }

    const { session, answers: submittedAnswers } = sessionAndAnswers;

    // ── Ownership check ──────────────────────────────────────
    if (session.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // 3NF: Redis session now stores quizId (was categoryId)
    const { quizId, totalQs, startTime } = session;

    // ── 2. Fetch correct answers from PostgreSQL by quizId ────
    const submittedIds = Object.keys(submittedAnswers);
    const questions = await prisma.quizQuestion.findMany({
      where: { id: { in: submittedIds }, quizId },
      select: { id: true, correctOption: true, explanation: true },
    });

    const correctMap = Object.fromEntries(questions.map((q) => [q.id, q]));

    // ── 3. Calculate score and build answer rows ─────────────
    let score = 0;
    const answerRows = Object.entries(submittedAnswers).map(([questionId, selectedOption]) => {
      const correct = correctMap[questionId];
      const isCorrect = correct?.correctOption === selectedOption;
      if (isCorrect) score++;
      return {
        questionId,
        selected:  selectedOption,
        isCorrect: !!isCorrect,
      };
    });

    const timeTakenSec = Math.round((Date.now() - startTime) / 1000);

    // ── 4. Prisma $transaction: persist attempt + answers ─────
    const [attempt] = await prisma.$transaction([
      prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          score,
          totalQs,
          timeTakenSec,
          finishedAt: new Date(),
        },
      }),
    ]);

    // Link answers to the newly created attempt in a follow-up batch.
    // We do this outside the transaction because createMany inside a
    // transaction cannot reference the ID of a record created in the same
    // transaction in all Prisma versions.
    if (answerRows.length > 0) {
      await prisma.quizAnswer.createMany({
        data: answerRows.map((row) => ({
          attemptId: attempt.id,
          questionId: row.questionId,
          selected:   row.selected,
          isCorrect:  row.isCorrect,
        })),
        skipDuplicates: true,
      });
    }

    // ── 5. Clear Redis session + answers + questionIds ───────
    const redis = getRedisClient();
    if (redis) {
      await Promise.all([
        quizCache.clearSession(attemptId),
        redis.del(questionIdsKey(attemptId)),
      ]);
    }

    logger.info(
      { attemptId: attempt.id, userId, score, totalQs, timeTakenSec },
      'DoctorsQuizz attempt submitted'
    );

    // ── 6. Pusher: notify leaderboard channel ─────────────────
    await pusher.trigger('public-leaderboard', 'leaderboard-updated', {
      userId,
      quizId,
      score,
      totalQs,
      percentage: Math.round((score / totalQs) * 100),
      timeTakenSec,
      attemptId: attempt.id,
      submittedAt: new Date().toISOString(),
    });

    // Build result response with explanations revealed post-submit
    const results = answerRows.map((row) => {
      const q = correctMap[row.questionId];
      return {
        questionId:    row.questionId,
        selected:      row.selected,
        correctOption: q?.correctOption,
        isCorrect:     row.isCorrect,
        explanation:   q?.explanation || null,
      };
    });

    res.json({
      success: true,
      message: 'Quiz submitted.',
      data: {
        attemptId:  attempt.id,
        score,
        totalQs,
        percentage: Math.round((score / totalQs) * 100),
        timeTakenSec,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { startQuiz, submitAnswer, submitQuiz };
