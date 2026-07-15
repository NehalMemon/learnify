// ─── Jest Configuration ──────────────────────────────────────

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Point at the backend root so paths like '../src/config/db' resolve
  rootDir: '.',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  // Prevent open handles from Prisma/server
  forceExit: true,
  clearMocks: true,
  // Load .env before tests so JWT guard doesn't throw
  setupFiles: ['./tests/setup.js'],
};
