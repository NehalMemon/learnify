const router = require('express').Router();
const { getCategories } = require('../controllers/category.controller');

// Public categories endpoint for dashboard filter hydration.
router.get('/', getCategories);

module.exports = router;

