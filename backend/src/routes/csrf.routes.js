const express = require('express');
const router = express.Router();
const { generateToken } = require('../config/csrf');

/**
 * @route GET /api/v1/csrf-token
 * @desc Generate and return a CSRF token
 * @access Public
 */
router.get('/csrf-token', (req, res) => {
  const token = generateToken(req);
  res.json({
    success: true,
    csrfToken: token,
  });
});

module.exports = router;
