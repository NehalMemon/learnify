// ─── Prisma Client Manual Mock ───────────────────────────────
// Provides a deep mock of the Prisma client for unit/integration tests.
// Jest automatically uses this file when any module calls:
//   jest.mock('../config/db') (or any path resolving to src/config/db.js)
//
// This decouples tests from a real database connection.
// Use prismaMock.<model>.<method>.mockResolvedValue(...) in tests
// to control return values per scenario.

'use strict';

const { mockDeep, mockReset } = require('jest-mock-extended');

const prismaMock = mockDeep();

// Reset all mock state between every test to prevent bleed-through
beforeEach(() => {
  mockReset(prismaMock);
});

module.exports = prismaMock;
