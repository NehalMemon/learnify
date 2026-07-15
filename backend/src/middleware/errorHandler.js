// ─── Centralized Error Handler ───────────────────────────────

'use strict';

const logger = require('../config/logger');

/**
 * Express 4-argument error-handling middleware.
 * Translates known Prisma error codes and unknown exceptions into
 * standardised JSON responses, using the structured logger rather
 * than console.* so logs reach CloudWatch / Datadog in production.
 */
const errorHandler = (err, req, res, _next) => {
  // Log with full context; never log raw stacks in production.
  if (process.env.NODE_ENV !== 'production') {
    logger.error({ err }, `${req.method} ${req.originalUrl}`);
  } else {
    // In production only log the message — no stack trace.
    logger.error(
      { method: req.method, url: req.originalUrl, errCode: err.code },
      err.message
    );
  }

  // Prisma unique-constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists.`,
    });
  }

  // Prisma record-not-found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An unexpected internal server error occurred.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode !== 500 && { stack: err.stack }),
  });
};

module.exports = errorHandler;
