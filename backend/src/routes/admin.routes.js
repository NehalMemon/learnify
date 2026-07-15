// ─── Admin Routes ────────────────────────────────────────────

const router  = require('express').Router();
const multer  = require('multer');
const { authenticate, isAdmin, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

// Controllers
const { listUsers, updateUserRole, createAdmin, updateUserEntitlements, updateUserAccess, getAdminStats, getSystemActivity } = require('../controllers/admin.controller');

const adminUserController = require('../controllers/admin.user.controller');
const {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  togglePublish,
  updateLiveClassLink,
  listModules,
  createModule,
  updateModule,
  deleteModule,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  listEnrollments,
  updateEnrollmentStatus,
} = require('../controllers/adminCourse.controller');

// Sprint 5 controllers
const {
  verifyPayment,
  createClassSession,
  updateClassSession,
  uploadGradeSheet,
} = require('../controllers/adminSprint5.controller');

// Admin Quiz controllers
const {
  createCategory,
  addQuestion,
  bulkAddQuestions,
  updateQuestion,
  deleteQuestion,
  listCategories,
  listQuestions,
  updateCategory,
  deleteCategory,
  getAdminQuizzes,
  getAdminQuizById,
  createFullQuiz,
  updateFullQuiz,
  toggleQuizStatus,
  deleteQuiz,
  extractFromImages,
  bulkCreateQuestions,
} = require('../controllers/adminQuiz.controller');

// Log controller
const { getSystemLogs } = require('../controllers/admin.log.controller');

// Validators
const {
  createCourseValidation,
  updateCourseValidation,
  createModuleValidation,
  updateModuleValidation,
  createMaterialValidation,
  updateMaterialValidation,
  updateEnrollmentStatusValidation,
  updateUserRoleValidation,
  uuidParam,
} = require('../validators/course.validator');

// Sprint 5 validators
const {
  createClassSessionValidation,
  updateClassSessionValidation,
  gradeSheetValidation,
} = require('../validators/adminSprint5.validator');

// Quiz validators
const {
  categoryValidation,
  createQuestionValidation,
  bulkQuestionsValidation,
  createFullQuizValidation,
} = require('../validators/quiz.validator');

// ── Multer: memory-only PDF upload (no disk writes) ──────────
// Security Rule §3 (architecture.md): uploaded files must NEVER
// be written to the local /tmp disk space.
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'), false);
    }
  },
});

// All admin routes require authentication + ADMIN or SUPER_ADMIN role
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// ── Dashboard Aggregators ────────────────────────────────────
router.get('/dashboard/activity', getSystemActivity);

// ── System Audit Logs ────────────────────────────────────────
router.get('/logs', getSystemLogs);

// ── User Management ─────────────────────────────────────────
router.get('/stats', getAdminStats);

router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRoleValidation, validate, updateUserRole);
router.put('/users/:id/entitlements', uuidParam('id'), validate, updateUserEntitlements);
router.patch('/users/:id/access', [
  uuidParam('id'),
  require('express-validator').body('learnifyEnabled').isBoolean().withMessage('learnifyEnabled must be boolean.'),
  require('express-validator').body('doctorsQuizzEnabled').isBoolean().withMessage('doctorsQuizzEnabled must be boolean.'),
], validate, updateUserAccess);

// POST /admin/users — create additional admin accounts
// Requires ADMIN role (enforced by router.use above).
// Reuses register-style validation from course.validator.
router.post('/users', [
  require('express-validator').body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
  require('express-validator').body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  require('express-validator').body('fullName').trim().notEmpty().withMessage('Full name is required.').escape(),
], validate, createAdmin);

// ───────────────────────────────────────────────────────────
// ── Extended User Management (admin.user.controller) ────────
// ───────────────────────────────────────────────────────────
// Alternative comprehensive user management endpoints using admin.user.controller
// These endpoints provide flexibility to create users of any role (STUDENT/ADMIN)
// Uncomment below to use the new controller instead of the existing ones:

// router.get('/users', adminUserController.getUsers);
// router.post('/users', [
//   require('express-validator').body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
//   require('express-validator').body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
//   require('express-validator').body('fullName').trim().notEmpty().withMessage('Full name is required.').escape(),
//   require('express-validator').body('role').optional().isIn(['STUDENT', 'ADMIN']).withMessage('Role must be STUDENT or ADMIN.'),
// ], validate, adminUserController.createUser);
// router.patch('/users/:id/role', updateUserRoleValidation, validate, adminUserController.updateUserRole);


// ── Course Management ───────────────────────────────────────
router.get('/courses', listCourses);
router.post('/courses', createCourseValidation, validate, createCourse);
// FINDING-03 fix: validate :id is a UUID before every mutating course route
router.put('/courses/:id',              uuidParam('id'), validate, updateCourseValidation, validate, updateCourse);
router.delete('/courses/:id',           uuidParam('id'), validate, deleteCourse);
router.patch('/courses/:id/publish',    uuidParam('id'), validate, togglePublish);
router.patch('/courses/:id/live-class', uuidParam('id'), validate, updateLiveClassLink);

// ── Module Management ───────────────────────────────────────
// FINDING-03 fix: validate :courseId / :id are UUIDs
router.get('/courses/:courseId/modules',  uuidParam('courseId'), validate, listModules);
router.post('/courses/:courseId/modules', uuidParam('courseId'), validate, createModuleValidation, validate, createModule);
router.put('/modules/:id',    uuidParam('id'), validate, updateModuleValidation, validate, updateModule);
router.delete('/modules/:id', uuidParam('id'), validate, deleteModule);

// ── Material Management ─────────────────────────────────────
// FINDING-03 fix: validate :moduleId / :id are UUIDs
// File upload: multipart/form-data with 'file' field (optional)
router.post('/modules/:moduleId/materials', uuidParam('moduleId'), validate, upload.single('file'), createMaterialValidation, validate, createMaterial);
router.put('/materials/:id',    uuidParam('id'), validate, upload.single('file'), updateMaterialValidation, validate, updateMaterial);
router.delete('/materials/:id', uuidParam('id'), validate, deleteMaterial);

// ── Enrollment Management ───────────────────────────────────
router.get('/enrollments', listEnrollments);
// FINDING-03 fix: validate :id is a UUID before enrollment status update
router.patch('/enrollments/:id/status', uuidParam('id'), validate, updateEnrollmentStatusValidation, validate, updateEnrollmentStatus);

// ───────────────────────────────────────────────────────────
// ── Sprint 5: Payment Verification ─────────────────────────
// ───────────────────────────────────────────────────────────
router.put(
  '/payments/:id/verify',
  uuidParam('id'),
  validate,
  verifyPayment
);

// ───────────────────────────────────────────────────────────
// ── Sprint 5: Live Class Session Management ─────────────────
// ───────────────────────────────────────────────────────────
router.post(
  '/classes',
  createClassSessionValidation,
  validate,
  createClassSession
);

router.put(
  '/classes/:id',
  updateClassSessionValidation,
  validate,
  updateClassSession
);

// ───────────────────────────────────────────────────────────
// ── Sprint 5: Grade Sheet Upload ────────────────────────────
// ───────────────────────────────────────────────────────────
router.post(
  '/enrollments/:enrollmentId/grades',
  pdfUpload.single('file'),  // field name: 'file'
  gradeSheetValidation,
  validate,
  uploadGradeSheet
);

// ───────────────────────────────────────────────────────────
// ── Admin Quiz Management ──────────────────────────────────
// ───────────────────────────────────────────────────────────
router.get('/quizzes', getAdminQuizzes);
router.get('/quizzes/:id', uuidParam('id'), validate, getAdminQuizById);
// Category management
router.get('/quiz/categories', listCategories);
router.post('/quiz/categories', categoryValidation, validate, createCategory);
router.put('/quiz/categories/:id', uuidParam('id'), validate, categoryValidation, validate, updateCategory);
router.delete('/quiz/categories/:id', uuidParam('id'), validate, deleteCategory);

// Question management
router.get('/quiz/categories/:categoryId/questions', uuidParam('categoryId'), validate, listQuestions);
router.post('/quiz/categories/:categoryId/questions', uuidParam('categoryId'), validate, createQuestionValidation, validate, addQuestion);
router.post('/quiz/categories/:categoryId/questions/bulk', uuidParam('categoryId'), validate, bulkQuestionsValidation, validate, bulkAddQuestions);
router.put('/quiz/questions/:id', uuidParam('id'), validate, createQuestionValidation, validate, updateQuestion);
router.delete('/quiz/questions/:id', uuidParam('id'), validate, deleteQuestion);

// Named exam wrapper + MCQs (single transaction)
// Requires ADMIN role (inherited from router.use above).
router.post('/quizzes/full', createFullQuizValidation, validate, createFullQuiz);
router.put('/quizzes/:id', uuidParam('id'), validate, updateFullQuiz);
router.patch('/quizzes/:id/status', uuidParam('id'), validate, toggleQuizStatus);
router.delete('/quizzes/:id', uuidParam('id'), validate, deleteQuiz);

// AI-Powered MCQ Extraction (accepts up to 10 images per request)
router.post('/quizzes/extract', upload.array('images', 10), extractFromImages);
router.post('/quizzes/bulk-create', bulkQuestionsValidation, validate, bulkCreateQuestions);

module.exports = router;
