// ─── DoctorsQuizz Seeder ─────────────────────────────────────
// Injects a seed Quiz wrapper and questions for local API testing.
// Run with: node scripts/prisma/seed-quiz.js
//
// Idempotent: uses upsert + createMany(skipDuplicates) so it is safe
// to re-run multiple times without creating duplicate records.

require('dotenv').config();
const prisma = require('../../src/config/db');

async function main() {
  process.stdout.write('🌱 Seeding DoctorsQuizz dummy data...\n');

  // ── 1. Upsert Category ────────────────────────────────────────
  const anatomy = await prisma.quizCategory.upsert({
    where:  { name: 'Anatomy' },
    update: {},
    create: { name: 'Anatomy' },
  });

  process.stdout.write(`  ✅ Category seeded: ${anatomy.name} (${anatomy.id})\n`);

  // ── 2. Upsert Quiz Wrapper ────────────────────────────────────
  let quiz = await prisma.quiz.findFirst({
    where: { categoryId: anatomy.id, title: 'Anatomy — Seed Quiz' },
  });

  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        categoryId:  anatomy.id,
        title:       'Anatomy — Seed Quiz',
        subject:     'General Anatomy',
        isPublished: true,
      },
    });
    process.stdout.write(`  ✅ Quiz wrapper created: ${quiz.title} (${quiz.id})\n`);
  } else {
    process.stdout.write(`  ⏭  Quiz wrapper already exists: ${quiz.title} (${quiz.id})\n`);
  }

  // ── 3. Seed Questions ─────────────────────────────────────────
  const { count } = await prisma.quizQuestion.createMany({
    skipDuplicates: true,
    data: [
      {
        quizId:        quiz.id,
        questionText:  'Which bone is the longest in the human body?',
        type:          'SINGLE_CHOICE',
        content:       ['Femur', 'Tibia', 'Humerus', 'Fibula'],
        correctAnswer: 0,
        optionA:       'Femur',
        optionB:       'Tibia',
        optionC:       'Humerus',
        optionD:       'Fibula',
        correctOption: 'A',
        explanation:   'The femur (thigh bone) is the longest and strongest bone in the human body.',
      },
      {
        quizId:        quiz.id,
        questionText:  'How many chambers does the human heart have?',
        type:          'SINGLE_CHOICE',
        content:       ['Two', 'Three', 'Four', 'Five'],
        correctAnswer: 2,
        optionA:       'Two',
        optionB:       'Three',
        optionC:       'Four',
        optionD:       'Five',
        correctOption: 'C',
        explanation:   'The human heart has four chambers: two atria and two ventricles.',
      },
      {
        quizId:        quiz.id,
        questionText:  'Which part of the brain is responsible for balance and coordination?',
        type:          'SINGLE_CHOICE',
        content:       ['Cerebrum', 'Cerebellum', 'Medulla oblongata', 'Thalamus'],
        correctAnswer: 1,
        optionA:       'Cerebrum',
        optionB:       'Cerebellum',
        optionC:       'Medulla oblongata',
        optionD:       'Thalamus',
        correctOption: 'B',
        explanation:   'The cerebellum coordinates voluntary movements, posture, balance, and fine motor skills.',
      },
      {
        quizId:        quiz.id,
        questionText:  'What is the smallest bone in the human body?',
        type:          'SINGLE_CHOICE',
        content:       ['Stapes', 'Incus', 'Malleus', 'Patella'],
        correctAnswer: 0,
        optionA:       'Stapes',
        optionB:       'Incus',
        optionC:       'Malleus',
        optionD:       'Patella',
        correctOption: 'A',
        explanation:   'The stapes (stirrup bone) in the middle ear is the smallest bone, measuring about 3 mm.',
      },
      {
        quizId:        quiz.id,
        questionText:  'The mitral valve is located between which two chambers of the heart?',
        type:          'SINGLE_CHOICE',
        content:       ['Right atrium and right ventricle', 'Left atrium and left ventricle', 'Right ventricle and pulmonary artery', 'Left ventricle and aorta'],
        correctAnswer: 1,
        optionA:       'Right atrium and right ventricle',
        optionB:       'Left atrium and left ventricle',
        optionC:       'Right ventricle and pulmonary artery',
        optionD:       'Left ventricle and aorta',
        correctOption: 'B',
        explanation:   'The mitral (bicuspid) valve controls blood flow between the left atrium and left ventricle.',
      },
    ],
  });

  process.stdout.write(`  ✅ Questions seeded: ${count} new record(s) inserted.\n`);
  process.stdout.write('🎉 DoctorsQuizz seeding complete!\n');
}

main()
  .catch((error) => {
    process.stderr.write(`❌ Seeding failed: ${error.message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
