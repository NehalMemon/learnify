const { loadEnvConfig } = require('@next/env');
const { spawn } = require('child_process');

// Automatically load the correct .env file for this specific folder instance
loadEnvConfig(process.cwd());

// Read PORT from environment, fallback to 3000 if not defined
const port = process.env.PORT || 3000;

console.log(`🚀 Starting Next.js development server on port ${port}...`);

// Spawn Next.js dev process dynamically on the configured port
const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  process.exit(code);
});
