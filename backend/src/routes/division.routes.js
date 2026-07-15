// ─── Division Routes (Public) ────────────────────────────────

const router = require('express').Router();
const { listDivisions, listDivisionCourses } = require('../controllers/division.controller');

// Public – no auth required
router.get('/', listDivisions);
router.get('/:slug/courses', listDivisionCourses);

module.exports = router;
