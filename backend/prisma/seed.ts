import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const coreMedicalCategories = [
  { name: 'Anatomy', slug: 'anatomy' },
  { name: 'Physiology', slug: 'physiology' },
  { name: 'Biochemistry', slug: 'biochemistry' },
  { name: 'Pathology', slug: 'pathology' },
  { name: 'Pharmacology', slug: 'pharmacology' },
] as const;

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();
  try {
    const existingCategories = await prisma.quizCategory.count();
    if (existingCategories > 0) {
      console.log(`Seed skipped: ${existingCategories} category record(s) already exist.`);
      return;
    }

    await prisma.quizCategory.createMany({
      data: coreMedicalCategories.map((category) => ({ name: category.name })),
      skipDuplicates: true,
    });

    console.log(
      `Seeded ${coreMedicalCategories.length} core DoctorsQuizz categories: ${coreMedicalCategories
        .map((c) => `${c.name} (${c.slug})`)
        .join(', ')}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Database seeding failed:', error);
  process.exit(1);
});

