// ─── Favorites Routes ───────────────────────────────────────

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body } = require('express-validator');
const { toggleFavorite, getFavorites } = require('../controllers/favorite.controller');

// Fetch favorites for the authenticated user
router.get('/', authenticate, getFavorites);

// Toggle favorite: add or remove
router.post('/toggle', authenticate, body('itemId').isUUID().withMessage('itemId must be a valid UUID.'), validate, toggleFavorite);

module.exports = router;
