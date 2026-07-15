// ─── Database Seeder ─────────────────────────────────────────
// Seeds the two platform divisions and an initial admin user.
//
// Security: Admin password MUST come from ADMIN_SEED_PASSWORD env variable.
// If missing, the seed script will fail with a fatal error.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Seed Divisions ──────────────────────────────────────────
  const foundation = await prisma.division.upsert({
    where: { slug: 'FOUNDATION' },
    update: {},
    create: {
      name: 'Learnify Foundation',
      slug: 'FOUNDATION',
    },
  });

  const meded = await prisma.division.upsert({
    where: { slug: 'MEDED' },
    update: {},
    create: {
      name: 'Learnify MedEd',
      slug: 'MEDED',
    },
  });

  console.log('  ✅ Divisions seeded:', foundation.name, '|', meded.name);

  // ── Seed Admin User ─────────────────────────────────────────
  const adminEmail = 'admin@learnify.pk';

  // CRIT-01 fix: Never hardcode admin password. Require env variable.
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    console.error('❌ FATAL: ADMIN_SEED_PASSWORD environment variable is required.');
    console.error('   Set it in .env or run: ADMIN_SEED_PASSWORD="YourSecurePass123!" npm run db:seed');
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Learnify Admin',
      role: 'ADMIN',
    },
  });

  console.log('  ✅ Admin user seeded:', admin.email);

  // ── Seed DoctorsQuizz Categories ────────────────────────────
  const quizCategories = [
    'Anatomy',
    'Physiology',
    'Pharmacology',
    'Pathology',
    'Medicine',
    'Surgery',
  ];

  for (const name of quizCategories) {
    await prisma.quizCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('  ✅ Quiz categories seeded:', quizCategories.join(', '));
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
