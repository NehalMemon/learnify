// ─── Structured Logger (Pino) ────────────────────────────────
// Single logger instance shared across the entire application.
// In development, pino-pretty formats output for human readability.
// In production, raw JSON is emitted for ingestion by CloudWatch / Datadog.
//
// Usage:
//   const logger = require('./config/logger');
//   logger.info('Server started');
//   logger.error({ err }, 'Database connection failed');

'use strict';

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

module.exports = logger;
