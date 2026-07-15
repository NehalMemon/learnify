// ─── DoctorsQuizz Golden-Path E2E Test ──────────────────────
// Validates the full quiz lifecycle:
//   Admin seeds data → Student starts exam → Submits answers →
//   Finalises → BullMQ worker grades & flushes → DB assertions pass.
//
// Why CSRF is bypassed here:
//   NODE_ENV is set to 'test' so the csrf.js passthrough middleware
//   is active. This is the safe, idiomatic way to test stateless
//   HTTP flows without a persistent cookie jar.
//
// Why rate limiters don't interfere:
//   Each test run uses a unique x-forwarded-for IP derived from the
//   current timestamp so the Redis rate-limit bucket is always fresh.

'use strict';

// ── CRITICAL: must be set before app is required so the CSRF bypass
// passthrough in src/config/csrf.js activates. jest.config.js loads
// dotenv via setupFiles but does not force NODE_ENV to 'test', so
// we enforce it here explicitly.
process.env.NODE_ENV = 'test';

const prisma = require('../../src/config/db');
const { startQuizWorker } = require('../../src/workers/quiz.worker');
const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

// ── Polling helper: wait for an async condition or timeout ──────────
/**
 * Polls `conditionFn` every `intervalMs` until it returns truthy or
 * `timeoutMs` is exceeded. Returns the final value of `conditionFn`.
 *
 * @param {() => Promise<unknown>} conditionFn
 * @param {number} [timeoutMs=5000]
 * @param {number} [intervalMs=250]
 */
async function pollUntil(conditionFn, timeoutMs = 5000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await conditionFn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
// Suite
// ════════════════════════════════════════════════════════════════

describe('DoctorsQuizz — BullMQ Grade & Flush Golden Path', () => {
  let worker;
  let user;
  let quiz;
  let token;
  let authHeader;

  // ── Setup: seed DB, start worker ───────────────────────────
  beforeAll(async () => {
    worker = startQuizWorker();

    // Clean up stale test data from previous runs (idempotent)
    await prisma.quizAttempt.deleteMany({
      where: { user: { email: 'test_sdet@learnify.pk' } },
    });
    await prisma.user.deleteMany({ where: { email: 'test_sdet@learnify.pk' } });
    await prisma.quizCategory.deleteMany({ where: { name: 'E2E Test Category' } });

    user = await prisma.user.create({
      data: {
        email: 'test_sdet@learnify.pk',
        passwordHash: 'dummy',
        fullName: 'SDET Tester',
        role: 'STUDENT',
        learnifyEnabled: false,
        doctorsQuizzEnabled: true,
      },
    });

    const category = await prisma.quizCategory.create({
      data: { name: 'E2E Test Category' },
    });

    // 3NF: questions belong to the Quiz, not to the Category directly.
    // QuizQuestion.quizId is the only FK here — no categoryId on question rows.
    quiz = await prisma.quiz.create({
      data: {
        title: 'E2E BullMQ Quiz',
        categoryId: category.id,
        isPublished: true,
        durationSec: 300,
        questions: {
          create: [
            {
              questionText: 'Q1 — what is the correct answer?',
              optionA: 'A',
              optionB: 'B',
              optionC: 'C',
              optionD: 'D',
              correctOption: 'A',
            },
            {
              questionText: 'Q2 — pick the right option.',
              optionA: 'A',
              optionB: 'B',
              optionC: 'C',
              optionD: 'D',
              correctOption: 'B',
            },
            {
              questionText: 'Q3 — choose wisely.',
              optionA: 'A',
              optionB: 'B',
              optionC: 'C',
              optionD: 'D',
              correctOption: 'C',
            },
          ],
        },
      },
      include: { questions: true },
    });

    token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    authHeader = `Bearer ${token}`;
  }, 30_000); // allow up to 30 s for DB seed + worker boot

  // ── Teardown: close worker, disconnect Prisma ───────────────
  afterAll(async () => {
    if (worker) await worker.close();
    await prisma.$disconnect();
  }, 15_000);

  // ════════════════════════════════════════════════════════════
  // Step 1 — Start attempt
  // ════════════════════════════════════════════════════════════
  let attemptId;
  let returnedQuestions;

  it('POST /quiz/quizzes/:quizId/start — should create an attempt and return questions', async () => {
    const res = await request(app)
      .post(`/api/v1/quiz/quizzes/${quiz.id}/start`)
      .set('Authorization', authHeader);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const { data } = res.body;

    // Shape assertions aligned with the 3NF response from startAttempt().
    // The response includes quizId and categoryName (derived via quiz.category).
    // There is NO categoryId field on individual question objects.
    expect(data).toMatchObject({
      attemptId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      ),
      quizId: quiz.id,
      quizTitle: 'E2E BullMQ Quiz',
      categoryName: 'E2E Test Category',
      totalQuestions: 3,
      durationSec: 300,
    });

    // Each returned question must NOT expose correctOption or explanation
    // (anti-cheat: server never sends the answer while exam is in progress).
    data.questions.forEach((q) => {
      expect(q).not.toHaveProperty('correctOption');
      expect(q).not.toHaveProperty('explanation');
      // 3NF: question rows don't carry categoryId — only quizId (server-side)
      expect(q).not.toHaveProperty('categoryId');
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('questionText');
      expect(q).toHaveProperty('optionA');
      expect(q).toHaveProperty('optionB');
      expect(q).toHaveProperty('optionC');
      expect(q).toHaveProperty('optionD');
    });

    attemptId = data.attemptId;
    returnedQuestions = data.questions;
  });

  // ════════════════════════════════════════════════════════════
  // Step 2 — Submit individual answers (Redis cache)
  // ════════════════════════════════════════════════════════════
  it('POST /quiz/attempts/:id/answer — should accept all three answers', async () => {
    expect(attemptId).toBeDefined();

    // Find questions by their text (order from server is shuffled)
    const q1 = returnedQuestions.find((q) => q.questionText.startsWith('Q1'));
    const q2 = returnedQuestions.find((q) => q.questionText.startsWith('Q2'));
    const q3 = returnedQuestions.find((q) => q.questionText.startsWith('Q3'));

    expect(q1).toBeDefined();
    expect(q2).toBeDefined();
    expect(q3).toBeDefined();

    // The submitAnswer controller accepts both 'selected' and 'selectedOption'.
    // The validator's cross-field check ensures at least one is present.
    // The test uses 'selectedOption' (matching the original E2E script).

    // Q1 → correct (A)
    const r1 = await request(app)
      .post(`/api/v1/quiz/attempts/${attemptId}/answer`)
      .set('Authorization', authHeader)
      .send({ questionId: q1.id, selectedOption: 'A' });
    expect(r1.statusCode).toBe(200);
    expect(r1.body.success).toBe(true);

    // Q2 → correct (B)
    const r2 = await request(app)
      .post(`/api/v1/quiz/attempts/${attemptId}/answer`)
      .set('Authorization', authHeader)
      .send({ questionId: q2.id, selectedOption: 'B' });
    expect(r2.statusCode).toBe(200);
    expect(r2.body.success).toBe(true);

    // Q3 → incorrect (A instead of C)
    const r3 = await request(app)
      .post(`/api/v1/quiz/attempts/${attemptId}/answer`)
      .set('Authorization', authHeader)
      .send({ questionId: q3.id, selectedOption: 'A' });
    expect(r3.statusCode).toBe(200);
    expect(r3.body.success).toBe(true);
  });

  // ════════════════════════════════════════════════════════════
  // Step 3 — Finalise (enqueue BullMQ job)
  // ════════════════════════════════════════════════════════════
  it('POST /quiz/attempts/:id/finalize — should enqueue a grading job', async () => {
    expect(attemptId).toBeDefined();

    const res = await request(app)
      .post(`/api/v1/quiz/attempts/${attemptId}/finalize`)
      .set('Authorization', authHeader)
      .send({ timeTakenSec: 45, reason: 'manual' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      attemptId,
      queued: true,
    });
  });

  // ════════════════════════════════════════════════════════════
  // Step 4 — Wait for BullMQ worker, then assert DB state
  //
  // Uses polling rather than a fixed sleep so the test completes
  // as fast as the worker does (~200-500 ms typically) but will
  // wait up to 8 s before failing — tolerating slow CI runners.
  // ════════════════════════════════════════════════════════════
  it('BullMQ worker — should grade the attempt and flush to PostgreSQL', async () => {
    expect(attemptId).toBeDefined();

    // Poll until finishedAt is set (worker has flushed to DB)
    const finalAttempt = await pollUntil(async () => {
      const row = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { answers: true },
      });
      // Return the row only once the worker has finished it
      return row?.finishedAt ? row : null;
    }, 8_000, 300);

    expect(finalAttempt).not.toBeNull();

    // ── Core grading assertion ──────────────────────────────
    // 2 correct (Q1-A, Q2-B) + 1 incorrect (Q3-A instead of C) = score 2
    expect(finalAttempt.score).toBe(2);
    expect(finalAttempt.timeTakenSec).toBeGreaterThan(0);
    expect(finalAttempt.finishedAt).not.toBeNull();

    // ── Answer-row integrity (3NF shape) ──────────────────
    // QuizAnswer rows: attemptId + questionId + selected + isCorrect.
    // There is NO categoryId on QuizAnswer rows — category is derived
    // through the chain: QuizAnswer → QuizQuestion → Quiz → QuizCategory.
    expect(finalAttempt.answers).toHaveLength(3);

    finalAttempt.answers.forEach((ans) => {
      expect(ans).toHaveProperty('id');
      expect(ans).toHaveProperty('attemptId', attemptId);
      expect(ans).toHaveProperty('questionId');
      expect(ans).toHaveProperty('selected');
      expect(ans).toHaveProperty('isCorrect');
      expect(ans).not.toHaveProperty('categoryId');
    });

    const correctAnswers = finalAttempt.answers.filter((a) => a.isCorrect);
    const incorrectAnswers = finalAttempt.answers.filter((a) => !a.isCorrect);
    expect(correctAnswers).toHaveLength(2);
    expect(incorrectAnswers).toHaveLength(1);
  }, 15_000); // generous timeout for slow CI environments
});
