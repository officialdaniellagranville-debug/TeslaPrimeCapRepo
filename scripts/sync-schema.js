#!/usr/bin/env node
/**
 * Full Prisma schema sync against production DB.
 * Uses DIRECT_URL (bypasses PgBouncer) for DDL operations.
 * Then seeds the admin user.
 */

const { execSync } = require('child_process');
const path = require('path');

// Use DIRECT_URL if available (bypasses PgBouncer for DDL)
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error('ERROR: Neither DIRECT_URL nor DATABASE_URL is set.');
  process.exit(1);
}

console.log('=== Full Prisma Schema Sync ===');
console.log(`Using URL prefix: ${directUrl.substring(0, 30)}...`);

try {
  // Step 1: Push schema using DIRECT_URL
  console.log('\n1. Running prisma db push with DIRECT_URL...');
  const result = execSync(
    'npx prisma db push --accept-data-loss --skip-generate',
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: directUrl },
      timeout: 60000,
      stdio: 'pipe',
      encoding: 'utf-8',
    }
  );
  console.log(result);
  console.log('✅ Schema sync SUCCESS');
} catch (err) {
  console.error('❌ Schema sync FAILED:', err.stderr || err.message);
  process.exit(1);
}

// Step 2: Seed
try {
  console.log('\n2. Running seed...');
  const seedResult = execSync('node prisma/seed.cjs', {
    cwd: path.resolve(__dirname, '..'),
    timeout: 60000,
    stdio: 'pipe',
    encoding: 'utf-8',
  });
  console.log(seedResult);
  console.log('✅ Seed SUCCESS');
} catch (err) {
  console.error('❌ Seed FAILED:', err.stderr || err.message);
  // Don't exit - seed failure is non-fatal
}

console.log('\n=== Schema sync complete ===');
