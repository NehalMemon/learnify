// ─── Quiz Session Finalization Worker ───────────────────────
// BullMQ worker that processes quiz session finalization jobs.
// When a quiz session ends (timer expires or user submits),
// this worker:
//   1. Fetches all answers from Redis cache
//   2. Grades the quiz and calculates score
//   3. Flushes answers to PostgreSQL (quizAnswer records)
//   4. Updates quizAttempt with final score and finishedAt
//   5. Clears the Redis cache session
//
// This protects PostgreSQL from high-concurrency write storms
// by batching the final flush operation.

'use strict';

const { Worker } = require('bullmq');
const { getRedisClient, getQueue, QUIZ_QUEUE, QUIZ_FINALIZE_JOB } = require('../config/queue');
const prisma = require('../config/db');
const logger = require('../config/logger');
const quizCache = require('../services/quizCache.service');

// Job data type definition (JSDoc for clarity)
/**
 * @typedef {Object} QuizFinalizationJob
 * @property {string} attemptId - Unique quiz attempt identifier
 * @property {string} userId - User who took the quiz
 * @property {string} quizId - Quiz wrapper ID
 * @property {number} [timeTakenSec] - Actual time taken (optional)
 */

/**
 * Processes a quiz finalization job.
 *
 * @param {Object} job - BullMQ job object
 * @param {QuizFinalizationJob} job.data
 */
async function processQuizFinalization(job) {
  if (job.name !== QUIZ_FINALIZE_JOB) {
    logger.warn(
      { jobId: job.id, jobName: job.name, expectedJobName: QUIZ_FINALIZE_JOB },
      '[QuizWorker] Ignoring unsupported job'
    );
    return { skipped: true };
  }

  const { attemptId, userId, quizId, totalQs: _, timeTakenSec } = job.data;
  
  logger.info(
    { attemptId, userId, quizId, jobId: job.id },
    '[QuizWorker] Processing quiz finalization'
  );

  try {
    // Parallelize Redis session fetch and DB attempt record fetch —
    // both are independent reads needed for validation
    const [sessionData, attemptRecord] = await Promise.all([
      quizCache.getSessionAndAnswers(attemptId),
      prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        select: { startedAt: true },
      }),
    ]);
    
    if (!sessionData) {
      logger.warn(
        { attemptId },
        '[QuizWorker] Redis session not found - may have been manually submitted already'
      );
      // Check if attempt already exists in DB and was submitted
      const existingAttempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
      });
      
      if (existingAttempt?.finishedAt) {
        logger.info({ attemptId }, '[QuizWorker] Attempt already finalized in DB');
        return { success: true, message: 'Already finalized' };
      }
      
      throw new Error('Quiz session not found in Redis and not in DB');
    }

    const { session, answers } = sessionData;
    
    // Validate session integrity
    // 3NF: session stores quizId (was categoryId)
    if (session.userId !== userId || session.quizId !== quizId) {
      logger.error(
        { attemptId, sessionUserId: session.userId, requestUserId: userId },
        '[QuizWorker] Session user/quiz mismatch - possible tampering'
      );
      throw new Error('Session validation failed');
    }

    // Anti-Cheat: Validate elapsed time
    const startedAt = session.startTime || (attemptRecord ? attemptRecord.startedAt.getTime() : Date.now());
    const elapsedSec = (Date.now() - startedAt) / 1000;

    if (elapsedSec > session.durationSec + 60) {
      logger.error(
        { attemptId, elapsedSec, allowedSec: session.durationSec },
        '[QuizWorker] Session expired - client timer bypassed'
      );
      
      // Update the DB to mark as expired
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: 0,
          timeTakenSec: Math.floor(elapsedSec),
          finishedAt: new Date(),
        },
      });
      await quizCache.clearSession(attemptId);
      
      throw new Error('Quiz session expired');
    }

    // Step 2: Fetch correct answers from database
    const questionIds = Object.keys(answers);
    const questions = await prisma.quizQuestion.findMany({
      where: {
        id: { in: questionIds },
        quizId,
      },
      select: {
        id: true,
        correctOption: true,
        explanation: true,
      },
    });

    // Anti-forgery: verify all submitted questions belong to this category
    if (questions.length !== questionIds.length) {
      const validIds = new Set(questions.map(q => q.id));
      const invalidIds = questionIds.filter(id => !validIds.has(id));
      
      logger.error(
        { attemptId, invalidIds },
        '[QuizWorker] Answer forgery detected - submitted questions outside category'
      );
      throw new Error('Answer forgery detected');
    }

    // Step 3: Grade the quiz
    const correctMap = {};
    questions.forEach(q => {
      correctMap[q.id] = q.correctOption;
    });

    let score = 0;
    const answerRecords = [];

    for (const [questionId, selectedOption] of Object.entries(answers)) {
      const isCorrect = correctMap[questionId] === selectedOption;
      if (isCorrect) score++;
      
      answerRecords.push({
        attemptId,
        questionId,
        selected: selectedOption,
        isCorrect,
      });
    }

    // Step 4: Flush to PostgreSQL in a transaction.
    // Calculate timeTakenSec server-side from startedAt → now (authoritative)
    // to prevent client-side timer manipulation. Falls back to client value
    // if DB startedAt is unavailable, and finally to null (never to durationSec
    // which was inaccurately reporting the full exam length for every attempt).
    const serverTimeTakenSec = attemptRecord?.startedAt
      ? Math.round((Date.now() - attemptRecord.startedAt.getTime()) / 1000)
      : null;
    const resolvedTimeTakenSec = serverTimeTakenSec ?? timeTakenSec ?? null;

    await prisma.$transaction([
      prisma.quizAnswer.createMany({ data: answerRecords, skipDuplicates: true }),
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          timeTakenSec: resolvedTimeTakenSec,
          finishedAt: new Date(),
        },
      }),
    ]);

    // Step 5: Clear Redis cache
    await quizCache.clearSession(attemptId);

    logger.info(
      { attemptId, score, totalQuestions: questionIds.length },
      '[QuizWorker] Quiz finalized successfully'
    );

    return {
      success: true,
      attemptId,
      score,
      totalQuestions: questionIds.length,
    };
  } catch (error) {
    logger.error(
      { attemptId, err: error },
      '[QuizWorker] Failed to finalize quiz'
    );
    throw error; // Re-throw for BullMQ retry logic
  }
}

/**
 * Initializes and starts the Quiz Worker.
 * 
 * The worker listens to the 'quiz' queue and processes
 * quiz finalization jobs with controlled concurrency.
 * 
 * @returns {Worker | null} The worker instance, or null if Redis unavailable
 */
function startQuizWorker() {
  const client = getRedisClient();
  
  if (!client) {
    logger.warn('[QuizWorker] Redis not configured - worker disabled');
    return null;
  }

  const queue = getQueue(QUIZ_QUEUE);
  
  if (!queue) {
    logger.warn('[QuizWorker] Quiz queue not available - worker disabled');
    return null;
  }

  const worker = new Worker(QUIZ_QUEUE, processQuizFinalization, {
    connection: client,
    concurrency: 5, // Process up to 5 quiz finalizations concurrently
    limiter: {
      max: 10,       // Max 10 jobs
      duration: 1000, // per second (protects DB from write storms)
    },
  });

  // Worker event handlers
  worker.on('completed', (job, result) => {
    logger.info(
      { jobId: job.id, attemptId: job.data.attemptId, result },
      '[QuizWorker] Job completed'
    );
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, attemptId: job?.data?.attemptId, err: error },
      '[QuizWorker] Job failed'
    );
  });

  worker.on('error', (error) => {
    logger.error({ err: error }, '[QuizWorker] Worker error');
  });

  logger.info('[QuizWorker] Started with concurrency=5');
  
  return worker;
}

// Auto-start worker if this is the main module
if (require.main === module) {
  const worker = startQuizWorker();
  
  // Graceful shutdown handlers
  const shutdown = async (signal) => {
    logger.info({ signal }, '[QuizWorker] Shutting down...');
    try {
      if (worker) {
        await worker.close();
      }

      const queue = getQueue(QUIZ_QUEUE);
      if (queue) {
        await queue.close();
      }

      const redis = getRedisClient();
      if (redis) {
        await redis.quit();
      }

      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      logger.error({ signal, err: error }, '[QuizWorker] Shutdown failed');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { startQuizWorker, processQuizFinalization };
