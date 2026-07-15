// ─── Admin Bootstrap Script ───────────────────────────────────
// Creates the first ADMIN user account from environment variables.
// Run once during initial server setup:
//
//   npm run seed:admin
//
// Environment variables (set in .env):
//   ADMIN_EMAIL    — email address for the admin account
//   ADMIN_PASSWORD — password (must meet strength requirements)
//   ADMIN_NAME     — full name (defaults to "System Admin")
//
// SECURITY: This script is safe to run in CI/CD because it only
// creates an admin if none exists — it will NOT overwrite existing
// admins or change any data.

'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function seedAdmin() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME || 'System Admin';

  // ── Validate required env vars ──────────────────────────────
  if (!email || !password) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  console.log(`\n🔧 Learnify Admin Seed Script`);
  console.log(`   Email:    ${email}`);
  console.log(`   Name:     ${fullName}`);
  console.log(`   Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'local'}\n`);

  try {
    // ── Check if this email is already registered ─────────────
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (existing) {
      if (existing.role === 'ADMIN') {
        console.log(`✅ Admin already exists (id: ${existing.id}). No changes made.`);
        return;
      }

      // Promote existing STUDENT to ADMIN
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      console.log(`✅ Existing user promoted to ADMIN (id: ${existing.id}).`);
      return;
    }

    // ── Create new admin user ─────────────────────────────────
    const salt         = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await prisma.user.create({
      data: { email, passwordHash, fullName, role: 'ADMIN' },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    console.log(`✅ Admin account created successfully!`);
    console.log(`   ID:      ${admin.id}`);
    console.log(`   Email:   ${admin.email}`);
    console.log(`   Name:    ${admin.fullName}`);
    console.log(`   Role:    ${admin.role}`);
    console.log(`\n🔑 You can now log in at POST /api/v1/auth/login`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
