#!/usr/bin/env node

/**
 * Railway deployment: Runtime migration script
 * Runs database migrations at runtime (not during build)
 * This allows the build to complete without a database connection
 * 
 * Handles SQLite to PostgreSQL migration transition:
 * - Detects provider mismatch (SQLite migrations on PostgreSQL)
 * - Uses db push as fallback for initial setup
 * - Creates baseline migration if needed
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
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

// Verify it's a PostgreSQL URL
if (!process.env.DATABASE_URL.includes('postgresql://') && !process.env.DATABASE_URL.includes('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must be a PostgreSQL connection string!');
  console.error('   Current format:', process.env.DATABASE_URL.split('@')[0] || 'hidden');
  process.exit(1);
}

// Check migration lock file for provider mismatch
const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
const lockFile = path.join(migrationsDir, 'migration_lock.toml');

// Ensure migration_lock.toml is set to postgresql
if (fs.existsSync(lockFile)) {
  let lockContent = fs.readFileSync(lockFile, 'utf8');
  if (lockContent.includes('provider = "sqlite"')) {
    console.log('⚠️  Detected SQLite migration lock file');
    console.log('   Updating to PostgreSQL...');
    lockContent = lockContent.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(lockFile, lockContent);
    console.log('   ✅ Updated migration_lock.toml to postgresql');
    console.log('');
  }
}

try {
  // Try to run migrations first
  console.log('   Attempting to apply migrations...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Database migrations completed successfully');
} catch (error) {
  const errorMessage = error.message || String(error);
  const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
  const fullError = errorMessage + '\n' + errorOutput;
  
  // Check for provider mismatch (P3019) or SQLite-specific errors
  if (fullError.includes('P3019') || 
      fullError.includes('migration_lock') || 
      fullError.includes('provider') ||
      fullError.includes('does not match') ||
      (fullError.includes('sqlite') && fullError.includes('postgresql'))) {
    
    console.log('');
    console.warn('⚠️  Provider mismatch detected (SQLite → PostgreSQL)');
    console.warn('   This is normal when switching from SQLite to PostgreSQL');
    console.warn('   Using db push to create schema...');
    console.log('');
    
    try {
      // Use db push to create schema from current schema.prisma
      // This is safe for initial setup on empty database
      execSync('npx prisma db push --accept-data-loss --skip-generate', {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log('');
      console.log('✅ Database schema created successfully using db push');
      console.log('');
      console.log('📝 Note: Future migrations will use migrate deploy');
      console.log('   For production, consider creating a baseline migration:');
      console.log('   npx prisma migrate dev --name postgresql_baseline --create-only');
      console.log('   npx prisma migrate resolve --applied postgresql_baseline');
      
    } catch (pushError) {
      console.error('');
      console.error('❌ Failed to push database schema');
      console.error('   Error:', pushError.message || pushError);
      console.error('');
      console.error('📋 Troubleshooting:');
      console.error('   1. Verify DATABASE_URL is correct');
      console.error('   2. Check database connectivity');
      console.error('   3. Ensure database is empty or you can accept data loss');
      console.error('   4. Run manually: npx prisma db push --accept-data-loss');
      process.exit(1);
    }
  } else {
    // Other migration errors
    console.error('');
    console.error('❌ Migration failed');
    console.error('   Error:', errorMessage);
    if (errorOutput) {
      console.error('   Details:', errorOutput);
    }
    console.error('');
    console.error('📋 Troubleshooting:');
    console.error('   1. Verify DATABASE_URL is correct');
    console.error('   2. Check database connectivity');
    console.error('   3. Run manually: npx prisma migrate deploy');
    console.error('   4. Check migration status: npx prisma migrate status');
    process.exit(1);
  }
}

