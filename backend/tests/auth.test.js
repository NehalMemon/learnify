// ─── Auth Route Integration Tests ────────────────────────────
// Uses manual DB mock (src/config/__mocks__/db.js) so tests run
// without a real database connection.
// jest.mock() is automatically hoisted to the top of the file.

'use strict';

jest.mock('../src/config/db');

const request   = require('supertest');
const app       = require('../src/app');
const prismaMock = require('../src/config/db'); // the mock instance

// ── Helper ────────────────────────────────────────────────────

const validUser = {
  email: 'test.user@learnify.pk',
  password: 'Test@12345!',
  fullName: 'Test User',
};

// ══════════════════════════════════════════════════════════════
// POST /api/v1/auth/register
// ══════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/register', () => {
  it('should reject a missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'Test@12345!', fullName: 'No Email' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('should reject a weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@test.com', password: 'alllower1!', fullName: 'Test' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/uppercase/i) }),
      ])
    );
  });

  it('should reject a weak password (no symbol)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@test.com', password: 'NoSymbol1', fullName: 'Test' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/special character/i) }),
      ])
    );
  });

  it('should reject an empty fullName', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@test.com', password: 'Test@12345!', fullName: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'fullName' }),
      ])
    );
  });
});

// ══════════════════════════════════════════════════════════════
// POST /api/v1/auth/login
// ══════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/login', () => {
  it('should return 400 on missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 on invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@learnify.pk', password: 'Wrong@Pass1!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /api/v1/auth/refresh
// ══════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/refresh', () => {
  it('should return 400 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 on an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'totally.invalid.token' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// RBAC — unauthenticated access to protected routes
// ══════════════════════════════════════════════════════════════

describe('RBAC — unauthenticated requests', () => {
  const protectedRoutes = [
    { method: 'get', path: '/api/v1/auth/me' },
    { method: 'get', path: '/api/v1/enrollments/my' },
    { method: 'get', path: '/api/v1/payments/my' },
    { method: 'get', path: '/api/v1/admin/users' },
    { method: 'get', path: '/api/v1/quiz/attempts/my' },
  ];

  protectedRoutes.forEach(({ method, path }) => {
    it(`should return 401 for ${method.toUpperCase()} ${path} with no token`, async () => {
      const res = await request(app)[method](path);
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Finding D — Leaderboard PII protection
// ══════════════════════════════════════════════════════════════

describe('GET /api/v1/quiz/leaderboard', () => {
  it('should return 401 without a token (PII protection)', async () => {
    const res = await request(app).get('/api/v1/quiz/leaderboard');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Finding C — UUID path param validation
// ══════════════════════════════════════════════════════════════

describe('UUID path param validation', () => {
  it('GET /api/v1/courses/:id — should return 400 for a non-UUID', async () => {
    const res = await request(app).get('/api/v1/courses/not-a-uuid');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/workshops/:id — should return 400 for a non-UUID', async () => {
    const res = await request(app).get('/api/v1/workshops/not-a-uuid');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Rate limiting — auth routes
// ══════════════════════════════════════════════════════════════

describe('Rate limiting — auth routes', () => {
  it('should eventually return 429 on excessive login attempts', async () => {
    const payload = { email: 'brute@test.com', password: 'Wrong@Pass1!' };
    let got429 = false;

    // Loop up to 15 times — breaks as soon as we hit the rate limit.
    // Cap is 10/15min. Prior tests may have used some slots from the same
    // in-memory store, so we don't rely on a fixed count.
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(payload);

      if (res.statusCode === 429) {
        got429 = true;
        break;
      }
    }

    expect(got429).toBe(true);
  });
});
