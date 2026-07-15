// ─── Admin Password Reset ─────────────────────────────────────────────────
// One-shot utility: re-hashes the admin password and writes it to the DB.
// Run once with: node scripts/reset-admin-password.js
//
// Uses the same driver-adapter pattern as src/config/db.js (Prisma v7 + pg pool).

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');
const { Pool }         = require('pg');
const bcrypt           = require('bcryptjs');

async function main() {
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    process.stderr.write('❌ ADMIN_EMAIL or ADMIN_PASSWORD is missing from .env\n');
    process.exit(1);
  }

  const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma  = new PrismaClient({ adapter });

  try {
    const salt         = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const updated = await prisma.user.upsert({
      where:  { email: adminEmail },
      update: { passwordHash, role: 'ADMIN', isDeleted: false },
      create: {
        email:        adminEmail,
        fullName:     process.env.ADMIN_NAME || 'Learnify Admin',
        passwordHash,
        role:         'ADMIN',
      },
    });

    process.stdout.write(`✅ Admin password reset for: ${updated.email}\n`);
    process.stdout.write(`   Role : ${updated.role}\n`);
    process.stdout.write(`   ID   : ${updated.id}\n`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  process.stderr.write(`❌ Reset failed: ${err.message}\n`);
  process.exit(1);
});
