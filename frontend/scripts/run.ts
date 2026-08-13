import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// 1. Strict safety check for production environment
if (process.env.NODE_ENV === 'production') {
  console.error('🚨 DANGER: You are trying to run a seed script in PRODUCTION. Aborting.');
  process.exit(1);
}

// 2. Load environment variables explicitly from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const target = process.argv[2];

  if (!target) {
    console.error('❌ Error: Please specify a seeder target.');
    console.error('Usage: npm run seed <seeder-name> (e.g., npm run seed users)');
    process.exit(1);
  }

  const seederFilePath = resolve(process.cwd(), 'scripts', 'seeders', `${target}.ts`);

  if (!existsSync(seederFilePath)) {
    console.error(`❌ Error: Seeder file not found: scripts/seeders/${target}.ts`);
    process.exit(1);
  }

  console.log(`🚀 Executing seeder: ${target}...\n`);

  try {
    const seederModule = await import(`./seeders/${target}.ts`);
    const runSeeder = seederModule.default;

    if (typeof runSeeder !== 'function') {
      throw new Error(`Seeder "${target}" does not export a default function.`);
    }

    await runSeeder();
    console.log(`\n🎉 Seeder "${target}" executed successfully!`);
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error running seeder "${target}":`, error?.message || error);
    process.exit(1);
  }
}

main();
