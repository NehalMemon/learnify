// ─── Payment Controller ─────────────────────────────────────
// Admin payment management + student payment submission.

const prisma = require('../config/db');
const { PROGRESS_QUEUE, getRedisClient } = require('../config/queue');
const logger = require('../config/logger');

// ═══════════════════════════════════════════════════════════════
// ADMIN – PAYMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/admin/payments ──────────────────────────────
// List all payments with filters.

const listPayments = async (req, res, next) => {
  try {
    const {
      enrollmentId,
      status,
      paymentType,
      page = 1,
      limit = 20,
    } = req.query;

    // FINDING-07 fix: clamp pagination to prevent OOM from unbounded queries
    const safePage  = Math.max(1, parseInt(page)  || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const where = {};
    if (enrollmentId) where.enrollmentId = enrollmentId;
    if (status) where.status = status;
    if (paymentType) where.paymentType = paymentType;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          enrollment: {
            include: {
              user: { select: { id: true, email: true, fullName: true } },
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/payments ─────────────────────────────
// Create a payment record for an enrollment (e.g., admin creates an invoice).

const createPayment = async (req, res, next) => {
  try {
    const { enrollmentId, paymentType, amount, dueDate } = req.body;

    // Verify enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found.',
      });
    }

    const payment = await prisma.payment.create({
      data: {
        enrollmentId,
        paymentType,
        amount,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
      },
      include: {
        enrollment: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment record created.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/v1/admin/payments/:id/verify ─────────────────
// Admin verifies a payment using an atomic update.
// Enrollment activation is offloaded to BullMQ worker to prevent blocking.

const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Atomic update: Mark payment as VERIFIED only if it's currently PENDING
    // This prevents TOCTOU race conditions where concurrent requests both see PENDING
    const updated = await prisma.payment.updateMany({
      where: {
        id,
        status: 'PENDING', // Only update if still pending
      },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // If no rows were updated, the payment either doesn't exist or is already verified
    if (updated.count === 0) {
      const payment = await prisma.payment.findUnique({ where: { id } });
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Payment is not in PENDING status.',
      });
    }

    // Fetch the updated payment record
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { enrollment: true },
    });

    // Offload enrollment activation to BullMQ worker
    // This prevents blocking the response and avoids event loop delays
    const queue = getRedisClient();
    if (queue && payment) {
      try {
        await queue.lpush(
          PROGRESS_QUEUE,
          JSON.stringify({
            type: 'PAYMENT_VERIFIED',
            enrollmentId: payment.enrollmentId,
            paymentId: id,
            timestamp: new Date().toISOString(),
          })
        );
        logger.info({ paymentId: id, enrollmentId: payment.enrollmentId }, '[PaymentController] PAYMENT_VERIFIED event published');
      } catch (err) {
        logger.warn({ err }, '[PaymentController] Failed to publish PAYMENT_VERIFIED event');
        // Don't fail the request if event publishing fails
      }
    }

    res.json({
      success: true,
      message: 'Payment verified. Enrollment activation in progress.',
      data: {
        id: payment.id,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/v1/admin/payments/:id/overdue ────────────────
// Mark a payment as overdue → enrollment → PAUSED.

const markOverdue = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { enrollment: true },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      });
    }

    // Mark overdue & pause enrollment
    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id },
        data: { status: 'OVERDUE' },
      }),
      prisma.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: 'PAUSED' },
      }),
    ]);

    res.json({
      success: true,
      message: 'Payment marked overdue. Enrollment paused.',
      data: updatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// STUDENT – PAYMENT SUBMISSION
// ═══════════════════════════════════════════════════════════════

// ── GET /api/v1/payments/my ─────────────────────────────────
// Student views their payment history across all enrollments.

const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: {
        enrollment: { userId },
      },
      include: {
        enrollment: {
          select: {
            id: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/v1/payments/:id/submit-proof ─────────────────
// Student submits payment proof image URL for a pending payment.

const submitPaymentProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { proofImageUrl } = req.body;
    const userId = req.user.id;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        enrollment: { select: { userId: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      });
    }

    // Ensure the payment belongs to the requesting student
    if (payment.enrollment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this payment.',
      });
    }

    if (payment.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'This payment is already verified.',
      });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { proofImageUrl },
    });

    res.json({
      success: true,
      message: 'Payment proof submitted. Awaiting admin verification.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Admin
  listPayments,
  createPayment,
  verifyPayment,
  markOverdue,
  // Student
  getMyPayments,
  submitPaymentProof,
};
