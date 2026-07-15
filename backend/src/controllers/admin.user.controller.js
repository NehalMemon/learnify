// ─── Admin User Management Controller ────────────────────────
// Comprehensive user management: list, create (any role), and update roles.
// All endpoints protected by authenticate + authorize('ADMIN').

const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const logger = require('../config/logger');

/**
 * @desc    List all users with pagination and filtering
 * @route   GET /api/v1/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // BASE FILTER: Exclude 'ADMIN' explicitly.
    // Note: If 'role' is a String (not an Enum) in Prisma, case matters.
    let filter = {
      isDeleted: false,
      role: { notIn: ['ADMIN', 'Admin', 'admin'] } // Catch case variations
    };

    // OVERRIDE PROTECTION: Only apply specific roles if they are NOT admin or "ALL"
    if (role && role.toUpperCase() !== 'ALL' && role.toUpperCase() !== 'ADMIN') {
      filter.role = role;
    }

    if (search) {
      filter.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: filter,
        select: { 
          id: true, 
          email: true, 
          fullName: true, 
          role: true, 
          createdAt: true, 
          learnifyEnabled: true, 
          doctorsQuizzEnabled: true 
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: filter })
    ]);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json({
      success: true,
      pagination: { total, page: Number(page), limit: Number(limit) },
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Directly create a new user (Staff/Admin or Student)
 * @route   POST /api/v1/admin/users
 */
const createUser = async (req, res, next) => {
  try {
    const { email, password, fullName, role = 'STUDENT', learnifyEnabled = true, doctorsQuizzEnabled = false } = req.body;

    // Ensure the role is valid based on Prisma Enum
    if (!['STUDENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role,
        learnifyEnabled,
        doctorsQuizzEnabled
      },
      select: { id: true, email: true, fullName: true, role: true } // Don't return password hash
    });

    logger.info(`Admin ${req.user.email} created new ${role} account: ${email}`);

    return res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change a user's role (Promote/Demote)
 * @route   PATCH /api/v1/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }
    
    // Prevent an admin from demoting themselves by accident
    if (id === req.user.id && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You cannot demote your own account.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });

    logger.info(`Admin ${req.user.email} changed role of user ${id} to ${role}`);

    return res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'User not found.' });
    next(error);
  }
};

module.exports = { getUsers, createUser, updateUserRole };
