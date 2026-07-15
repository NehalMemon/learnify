'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

async function createStudent() {
  const email = 'student@example.com';
  const password = 'Password123!';
  const fullName = 'Test Student';

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { studyYear: 4 },
      });
      console.log('✅ Student already exists.');
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        studyYear: 4,
        role: 'STUDENT',
        learnifyEnabled: true,
        doctorsQuizzEnabled: true
      }
    });
    console.log('✅ Student account created.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
createStudent();
