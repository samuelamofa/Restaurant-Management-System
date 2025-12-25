#!/usr/bin/env node

/**
 * Railway deployment: Runtime migration script
 * Runs database migrations at runtime (not during build)
 * This allows the build to complete without a database connection
 */

require('dotenv').config();

const { execSync } = require('child_process');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🗄️  Running database migrations...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required for migrations!');
  console.error('');
  console.error('Please set DATABASE_URL in your deployment environment:');
  console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
  console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
  process.exit(1);
}

try {
  // Run migrations
  console.log('   Applying database migrations...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Database migrations completed successfully');
} catch (error) {
  console.error('');
  console.error('❌ Migration failed');
  console.error('   Error:', error.message || error);
  console.error('');
  console.error('📋 Troubleshooting:');
  console.error('   1. Verify DATABASE_URL is correct');
  console.error('   2. Check database connectivity');
  console.error('   3. Run manually: npx prisma migrate deploy');
  process.exit(1);
}

