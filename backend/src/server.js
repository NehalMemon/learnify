// ─── Server Entry Point ──────────────────────────────────────
// Fail-fast env check → DB connect → listen.

'use strict';

require('dotenv').config();

const logger = require('./config/logger');
const app    = require('./app');
const prisma = require('./config/db');

// ── Fail-Fast Env Guard (production.md §Fail-Fast Boot Sequence) ──
// The application MUST NOT start if any critical secret is absent.
// A missing var at runtime causes silent failures deep inside request
// handling — crashing here with a clear message is the correct behaviour.
const checkEnv = () => {
  const REQUIRED = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'REDIS_URL',
    'GEMINI_API_KEY',
    // Sprint 7 — DoctorsQuizz real-time engine
    'PUSHER_APP_ID',
    'PUSHER_KEY',
    'PUSHER_SECRET',
    'PUSHER_CLUSTER',
  ];
  const missing  = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.fatal(
      { missing },
      `[FATAL] Missing required environment variables: ${missing.join(', ')}. ` +
      'Add them to your .env file and restart.'
    );
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;

const start = async () => {
  checkEnv();

  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    app.listen(PORT, () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Learnify API server started');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
};

// ── Graceful Shutdown ────────────────────────────────────────

process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

start();
