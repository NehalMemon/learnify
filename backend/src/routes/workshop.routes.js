// ─── Workshop Routes ─────────────────────────────────────────
// Public: list workshops, get workshop detail.
// Authenticated: register, cancel registration, my workshops.
// Admin: CRUD + list registrations.

const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listWorkshops,
  getWorkshop,
  registerForWorkshop,
  cancelRegistration,
  getMyWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  listRegistrations,
} = require('../controllers/workshop.controller');
const { createWorkshopValidation, updateWorkshopValidation } = require('../validators/workshop.validator');
// Finding C: shared UUID path param validator
const { uuidParam } = require('../validators/course.validator');

// ── Public ───────────────────────────────────────────────────
router.get('/', listWorkshops);
router.get('/my', authenticate, getMyWorkshops);
// Finding C: validate :id is a UUID before Prisma lookup
router.get('/:id', uuidParam('id'), validate, getWorkshop);

// ── Authenticated (Student) ──────────────────────────────────
router.post('/:id/register', authenticate, uuidParam('id'), validate, registerForWorkshop);
router.delete('/:id/register', authenticate, uuidParam('id'), validate, cancelRegistration);

// ── Admin ────────────────────────────────────────────────────
router.post('/', authenticate, authorize('ADMIN'), createWorkshopValidation, validate, createWorkshop);
router.put('/:id', authenticate, authorize('ADMIN'), uuidParam('id'), updateWorkshopValidation, validate, updateWorkshop);
router.delete('/:id', authenticate, authorize('ADMIN'), uuidParam('id'), validate, deleteWorkshop);
router.get('/:id/registrations', authenticate, authorize('ADMIN'), uuidParam('id'), validate, listRegistrations);

module.exports = router;
