// ─── Prisma Client Singleton (Prisma v7 / driver-adapter pattern) ──
// Prisma v7 removed the bare PrismaClient() constructor.
// A driver adapter must be provided — we use @prisma/adapter-pg
// backed by a pg.Pool, which works for both local Postgres and
// connection-pooled environments (Neon, Supabase, etc.).
//
// The singleton pattern prevents multiple pool instances during
// hot-reload in development (nodemon re-executes this file).

'use strict';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');
const { Pool }         = require('pg');

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

// Reuse the existing instance across hot-reload cycles and serverless invocations.
if (!global.__prisma) {
  global.__prisma = createPrismaClient();
}

const prisma = global.__prisma;

module.exports = prisma;
