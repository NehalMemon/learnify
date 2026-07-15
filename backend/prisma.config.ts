// Prisma v7 configuration file.
// The DATABASE_URL is now managed here, not in schema.prisma.
// Security Rule §5: Always read credentials from process.env — never hardcode.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'scripts/prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
