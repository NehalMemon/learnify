// ─── Admin Sprint 5 Controller ────────────────────────────────
// Handles: Payment Verification, Live Class Management, Grade Sheets.
// All handlers in this file are ADMIN-only (enforced at the router).

'use strict';

const prisma = require('../config/db');
const { getQueue, PAYMENT_QUEUE } = require('../config/queue');
const { uploadToS3 } = require('../services/s3.service');

// ══════════════════════════════════════════════════════════════
// Step 1 — PUT /api/v1/admin/payments/:id/verify
// ══════════════════════════════════════════════════════════════

/**
 * Marks a payment as VERIFIED and publishes PAYMENT_VERIFIED event.
 * The enrollment status update is handled asynchronously by the worker.
 *
 * Architecture: main thread never updates enrollment directly.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Update payment to VERIFIED — if already verified, this is idempotent
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
      select: {
        id: true,
        status: true,
        verifiedAt: true,
        enrollmentId: true,
        amount: true,
        paymentType: true,
      },
    });

    // Publish event to payment queue — worker sets enrollment to ACTIVE
    const queue = getQueue(PAYMENT_QUEUE);
    if (queue) {
      await queue.add(
        'PAYMENT_VERIFIED',
        { paymentId: payment.id, enrollmentId: payment.enrollmentId },
        {
          jobId:            `pay_verified:${payment.id}`, // idempotency key
          removeOnComplete: { age: 86400 },
          removeOnFail:     { count: 50 },
          attempts:         3,
          backoff:          { type: 'exponential', delay: 2000 },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message:  'Payment verified. Enrollment activation is processing.',
      data:     payment,
    });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// Step 2 — POST /api/v1/admin/classes
// ══════════════════════════════════════════════════════════════

/**
 * Creates a new ClassSession for a course.
 */
const createClassSession = async (req, res, next) => {
  try {
    const { courseId, title, scheduledAt, meetingLink, platform } = req.body;

    const session = await prisma.classSession.create({
      data: { courseId, title, scheduledAt: new Date(scheduledAt), meetingLink, platform },
      select: { id: true, courseId: true, title: true, scheduledAt: true, meetingLink: true, platform: true, createdAt: true },
    });

    return res.status(201).json({ success: true, message: 'Class session created.', data: session });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// Step 2 — PUT /api/v1/admin/classes/:id
// ══════════════════════════════════════════════════════════════

/**
 * Updates an existing ClassSession.
 */
const updateClassSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, scheduledAt, meetingLink, platform } = req.body;

    const session = await prisma.classSession.update({
      where: { id },
      data: {
        ...(title       && { title }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(meetingLink && { meetingLink }),
        ...(platform    && { platform }),
      },
      select: { id: true, courseId: true, title: true, scheduledAt: true, meetingLink: true, platform: true },
    });

    return res.json({ success: true, message: 'Class session updated.', data: session });
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Class session not found.' });
    }
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// Step 3 — POST /api/v1/admin/enrollments/:enrollmentId/grades
// ══════════════════════════════════════════════════════════════

/**
 * Accepts a PDF upload (via multer memoryStorage) and stores a
 * GradeSheet record linked to the enrollment.
 *
 * Files never touch the disk — multer keeps them in memory until
 * uploadToS3() streams the buffer to AWS (or mock S3 in dev).
 *
 * HIGH-08 fix: Defense-in-depth mimetype check for application/pdf.
 */
const uploadGradeSheet = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const { title } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A PDF file is required.' });
    }

    // HIGH-08 fix: Defense-in-depth mimetype validation
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PDF files are accepted.',
      });
    }

    // Verify enrollment exists before storing the grade sheet
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    // Upload to S3 (mock in dev, real in production)
    const s3Url = await uploadToS3(req.file, 'grades');

    const gradeSheet = await prisma.gradeSheet.create({
      data: {
        enrollmentId,
        title: title || req.file.originalname,
        s3Url,
      },
      select: { id: true, enrollmentId: true, title: true, s3Url: true, uploadedAt: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Grade sheet uploaded.',
      data:    gradeSheet,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyPayment,
  createClassSession,
  updateClassSession,
  uploadGradeSheet,
};
