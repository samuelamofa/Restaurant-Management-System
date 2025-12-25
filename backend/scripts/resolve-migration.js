#!/usr/bin/env node

/**
 * Resolve Failed Prisma Migration (P3009 Recovery)
 * 
 * This script resolves a failed migration by marking it as rolled back.
 * Run this in Railway's shell/terminal where DATABASE_URL is set.
 * 
 * Usage:
 *   node scripts/resolve-migration.js <migration_name>
 * 
 * Example:
 *   node scripts/resolve-migration.js 20251221114916_add_kitchen_tracking
 */

require('dotenv').config();

const { execSync } = require('child_process');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

// Get migration name from command line argument
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ ERROR: Migration name is required!');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/resolve-migration.js <migration_name>');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/resolve-migration.js 20251221114916_add_kitchen_tracking');
  process.exit(1);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required!');
  console.error('');
  console.error('Please set DATABASE_URL in your deployment environment.');
  process.exit(1);
}

// Verify it's a PostgreSQL URL
if (!process.env.DATABASE_URL.includes('postgresql://') && !process.env.DATABASE_URL.includes('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must be a PostgreSQL connection string!');
  process.exit(1);
}

console.log('🔧 Resolving failed migration...');
console.log(`   Migration: ${migrationName}`);
console.log('');

try {
  // Run the resolve command
  console.log(`Running: npx prisma migrate resolve --rolled-back ${migrationName}`);
  console.log('');
  
  execSync(
    `npx prisma migrate resolve --rolled-back ${migrationName}`,
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    }
  );
  
  console.log('');
  console.log('✅ Migration marked as rolled back successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: npx prisma migrate deploy');
  console.log('  2. This will apply all pending migrations');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('❌ Failed to resolve migration');
  console.error('');
  console.error('Troubleshooting:');
  console.error('  1. Verify the migration name is correct');
  console.error('  2. Check that DATABASE_URL is valid');
  console.error('  3. Ensure you have database access');
  console.error('  4. Check Railway logs for more details');
  console.error('');
  process.exit(1);
}

