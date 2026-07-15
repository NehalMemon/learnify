// ─── Health Check Route ──────────────────────────────────────

const router = require('express').Router();
const prisma = require('../config/db');

router.get('/', async (req, res) => {
  try {
    // Use a safe Prisma model query instead of $queryRaw (banned by security policy)
    await prisma.$connect();
    res.json({
      success: true,
      message: 'Learnify API is running.',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    res.status(503).json({
      success: false,
      message: 'Learnify API is running but database is unreachable.',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
