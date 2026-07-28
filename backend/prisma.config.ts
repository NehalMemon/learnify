import { defineConfig } from '@prisma/config';
import 'dotenv/config';
import process from 'process';

export default defineConfig({
  earlyAccess: true,
  schema: 'scripts/prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL,
  },
  migrate: {
    url: process.env.DIRECT_URL,
  },
  client: {
    url: process.env.DATABASE_URL,
  },
});
