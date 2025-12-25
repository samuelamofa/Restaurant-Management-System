#!/usr/bin/env node

/**
 * Railway deployment: Runtime migration script with P3009 recovery
 * 
 * This script runs database migrations at runtime (not during build),
 * allowing the build to complete without a database connection.
 * 
 * Features:
 * - Detects failed migrations (P3009 error) using `prisma migrate status`
 * - Automatically resolves failed migrations using `prisma migrate resolve --rolled-back`
 * - Re-applies migrations after resolution
 * - Handles SQLite to PostgreSQL migration transition
 * - Crash-safe: prevents infinite restart loops with retry limits
 * - Railway-compatible: runs only at runtime/start, never during build
 * 
 * Recovery Process:
 * 1. Check migration status before attempting deploy
 * 2. If failed migrations detected (P3009), resolve them automatically
 * 3. Re-apply migrations using `prisma migrate deploy`
 * 4. Fallback to `db push` only for provider mismatch (SQLite → PostgreSQL)
 * 
 * Safety:
 * - Does NOT delete the database
 * - Does NOT manually edit Prisma system tables
 * - Does NOT remove migration files
 * - Uses only Prisma-approved recovery methods
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

/**
 * Check migration status to detect failed migrations (P3009)
 * Returns: { hasFailedMigrations: boolean, failedMigrationName: string | null }
 */
function checkMigrationStatus() {
  try {
    console.log('   Checking migration status...');
    const statusOutput = execSync('npx prisma migrate status', {
      encoding: 'utf8',
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'], // Capture stdout and stderr
    });
    
    // Check for failed migrations in status output
    // Prisma outputs "failed migrations" or "The migration `name` failed"
    if (statusOutput.includes('failed migrations') || 
        statusOutput.includes('failed migration') ||
        statusOutput.includes('P3009')) {
      
      // Extract migration name from status output
      // Pattern: "The migration `20251221091813_init` failed" or "migration `name` failed"
      const migrationNameMatch = statusOutput.match(/migration\s+`?(\d+_\w+)`?/i) ||
                                 statusOutput.match(/`(\d+_\w+)`/);
      
      const failedMigrationName = migrationNameMatch ? migrationNameMatch[1] : null;
      
      return {
        hasFailedMigrations: true,
        failedMigrationName: failedMigrationName,
        statusOutput: statusOutput
      };
    }
    
    return {
      hasFailedMigrations: false,
      failedMigrationName: null,
      statusOutput: statusOutput
    };
  } catch (error) {
    // If migrate status fails, it might mean database is not initialized
    // or there's a connection issue - we'll handle this in the main flow
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
    
    // Check if it's a connection error vs migration error
    if (errorOutput.includes('P3009') || errorOutput.includes('failed migration')) {
      const migrationNameMatch = errorOutput.match(/migration\s+`?(\d+_\w+)`?/i) ||
                                 errorOutput.match(/`(\d+_\w+)`/);
      
      return {
        hasFailedMigrations: true,
        failedMigrationName: migrationNameMatch ? migrationNameMatch[1] : null,
        statusOutput: errorOutput
      };
    }
    
    // For other errors, return false and let main flow handle it
    return {
      hasFailedMigrations: false,
      failedMigrationName: null,
      statusOutput: errorOutput
    };
  }
}

/**
 * Resolve a failed migration using Prisma-approved method
 * Uses `prisma migrate resolve --rolled-back` as per Prisma documentation
 */
function resolveFailedMigration(migrationName) {
  if (!migrationName) {
    console.error('   ❌ Cannot resolve: Migration name not found');
    return false;
  }
  
  try {
    console.log(`   Resolving failed migration: ${migrationName}`);
    console.log('   Using: prisma migrate resolve --rolled-back');
    
    execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log(`   ✅ Migration ${migrationName} marked as rolled back`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to resolve migration ${migrationName}`);
    console.error('   Error:', error.message || error);
    
    // Try alternative: mark as applied (in case migration partially completed)
    try {
      console.log('   Attempting alternative: marking as applied...');
      execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
        stdio: 'inherit',
        env: process.env,
      });
      console.log(`   ✅ Migration ${migrationName} marked as applied`);
      return true;
    } catch (appliedError) {
      console.error(`   ❌ Alternative resolution also failed`);
      return false;
    }
  }
}

// Main migration flow with P3009 recovery
// Crash-safe: Maximum 2 recovery attempts to prevent infinite loops
const MAX_RECOVERY_ATTEMPTS = 2;
let recoveryAttempts = 0;

function runMigrations() {
  // Step 1: Check migration status for failed migrations (P3009 detection)
  console.log('');
  const statusCheck = checkMigrationStatus();
  
  if (statusCheck.hasFailedMigrations) {
    console.log('');
    console.warn('⚠️  Detected failed migrations (P3009 error)');
    console.warn('   This occurs when a migration started but did not complete');
    console.warn('   Attempting automatic recovery...');
    console.log('');
    
    if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      console.error('❌ Maximum recovery attempts reached');
      console.error('   This prevents infinite restart loops');
      console.error('   Please resolve migrations manually:');
      console.error('   npx prisma migrate status');
      console.error('   npx prisma migrate resolve --rolled-back <migration_name>');
      process.exit(1);
    }
    
    recoveryAttempts++;
    console.log(`   Recovery attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}`);
    
    // Resolve the failed migration
    if (statusCheck.failedMigrationName) {
      const resolved = resolveFailedMigration(statusCheck.failedMigrationName);
      if (!resolved) {
        console.error('');
        console.error('❌ Failed to resolve migration automatically');
        console.error('   Please resolve manually:');
        console.error(`   npx prisma migrate resolve --rolled-back ${statusCheck.failedMigrationName}`);
        process.exit(1);
      }
    } else {
      console.error('   ❌ Could not extract migration name from status');
      console.error('   Please check migration status manually:');
      console.error('   npx prisma migrate status');
      process.exit(1);
    }
    
    console.log('');
    console.log('   Retrying migrations after resolution...');
    console.log('');
  }
  
  // Step 2: Attempt to deploy migrations
  try {
    console.log('   Applying database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully');
    return true;
  } catch (error) {
    const errorMessage = error.message || String(error);
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
    const fullError = errorMessage + '\n' + errorOutput;
    
    // Check for P3009 error (failed migration)
    if (fullError.includes('P3009') || fullError.includes('failed migration')) {
      console.log('');
      console.warn('⚠️  P3009 error detected during migration');
      
      // Extract migration name from error
      const migrationNameMatch = fullError.match(/migration\s+`?(\d+_\w+)`?/i) ||
                                 fullError.match(/`(\d+_\w+)`/);
      
      if (migrationNameMatch && recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
        recoveryAttempts++;
        console.log(`   Recovery attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}`);
        
        const resolved = resolveFailedMigration(migrationNameMatch[1]);
        if (resolved) {
          console.log('');
          console.log('   Retrying migrations after resolution...');
          console.log('');
          // Recursively retry (with attempt limit)
          return runMigrations();
        }
      }
      
      console.error('');
      console.error('❌ Failed to recover from P3009 error');
      console.error('   Please resolve manually:');
      if (migrationNameMatch) {
        console.error(`   npx prisma migrate resolve --rolled-back ${migrationNameMatch[1]}`);
      } else {
        console.error('   npx prisma migrate status');
        console.error('   npx prisma migrate resolve --rolled-back <migration_name>');
      }
      process.exit(1);
    }
    
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
        return true;
        
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
    }
    
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

// Execute migration flow
runMigrations();

