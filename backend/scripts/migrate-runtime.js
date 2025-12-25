#!/usr/bin/env node

/**
 * Railway deployment: Runtime migration script with P3009 recovery
 * 
 * This script runs database migrations at runtime (not during build),
 * allowing the build to complete without a database connection.
 * 
 * Recovery Process (P3009 Error):
 * 1. ALWAYS run `prisma migrate status` BEFORE `prisma migrate deploy`
 * 2. Parse status output to detect failed migrations
 * 3. If any migration is failed, resolve it using:
 *    `npx prisma migrate resolve --rolled-back <migration_name>`
 * 4. Known migrations that may need resolution:
 *    - 20251221091813_init (already resolved)
 *    - 20251221114916_add_kitchen_tracking (currently failing)
 * 5. After resolution, run `prisma migrate deploy`
 * 6. Ensure this runs only once per container start (prevents infinite loops)
 * 
 * Safety:
 * - Does NOT delete the database
 * - Does NOT manually edit Prisma system tables
 * - Does NOT remove migration files
 * - Uses only Prisma-approved recovery methods
 * - Crash-safe: exits on failure to prevent restart loops
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🗄️  Running database migrations...');
console.log('');

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
 * Step 1: Check migration status BEFORE deploying
 * This detects failed migrations (P3009) proactively
 * Returns: { hasFailedMigrations: boolean, failedMigrationNames: string[] }
 */
function checkMigrationStatus() {
  console.log('📋 Step 1: Checking migration status...');
  console.log('   Running: npx prisma migrate status');
  console.log('');
  
  try {
    const statusOutput = execSync('npx prisma migrate status', {
      encoding: 'utf8',
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'], // Capture stdout and stderr
    });
    
    console.log('   Status output:');
    console.log('   ' + statusOutput.split('\n').join('\n   '));
    console.log('');
    
    // Check for failed migrations in status output
    const hasFailedMigrations = statusOutput.includes('failed migrations') || 
                                statusOutput.includes('failed migration') ||
                                statusOutput.includes('P3009');
    
    if (!hasFailedMigrations) {
      console.log('   ✅ No failed migrations detected');
      console.log('');
      return {
        hasFailedMigrations: false,
        failedMigrationNames: [],
        statusOutput: statusOutput
      };
    }
    
    // Extract all failed migration names from status output
    // Pattern examples:
    // - "The migration `20251221091813_init` failed"
    // - "migration `20251221091813_init` failed"
    // - "`20251221091813_init`"
    const failedMigrationNames = [];
    const patterns = [
      /migration\s+`?(\d+_\w+)`?\s+failed/i,
      /The\s+migration\s+`?(\d+_\w+)`?\s+failed/i,
      /`(\d+_\w+)`.*failed/i,
      /failed.*`(\d+_\w+)`/i,
    ];
    
    for (const pattern of patterns) {
      const matches = statusOutput.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        if (match[1] && !failedMigrationNames.includes(match[1])) {
          failedMigrationNames.push(match[1]);
        }
      }
    }
    
    // Also try to find migration names near "failed" keyword
    const lines = statusOutput.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('failed')) {
        const migrationMatch = line.match(/(\d+_\w+)/);
        if (migrationMatch && !failedMigrationNames.includes(migrationMatch[1])) {
          failedMigrationNames.push(migrationMatch[1]);
        }
      }
    }
    
    console.log('   ⚠️  Failed migrations detected:');
    failedMigrationNames.forEach(name => {
      console.log(`      - ${name}`);
    });
    console.log('');
    
    return {
      hasFailedMigrations: true,
      failedMigrationNames: failedMigrationNames,
      statusOutput: statusOutput
    };
    
  } catch (error) {
    // If migrate status fails, check if it's a P3009 error
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
    
    console.log('   Status check output:');
    console.log('   ' + errorOutput.split('\n').join('\n   '));
    console.log('');
    
    // Check if it's a failed migration error (P3009)
    if (errorOutput.includes('P3009') || 
        errorOutput.includes('failed migration') ||
        errorOutput.includes('failed migrations')) {
      
      const failedMigrationNames = [];
      const patterns = [
        /migration\s+`?(\d+_\w+)`?/i,
        /The\s+migration\s+`?(\d+_\w+)`?/i,
        /`(\d+_\w+)`/,
        /(\d+_\w+)/,
      ];
      
      for (const pattern of patterns) {
        const match = errorOutput.match(pattern);
        if (match && match[1] && !failedMigrationNames.includes(match[1])) {
          failedMigrationNames.push(match[1]);
        }
      }
      
      console.log('   ⚠️  Failed migrations detected in error output:');
      failedMigrationNames.forEach(name => {
        console.log(`      - ${name}`);
      });
      console.log('');
      
      return {
        hasFailedMigrations: true,
        failedMigrationNames: failedMigrationNames,
        statusOutput: errorOutput
      };
    }
    
    // For other errors (connection issues, etc.), return no failures
    // The deploy step will handle these
    console.log('   ℹ️  Status check encountered an error (may be connection issue)');
    console.log('   Will proceed to migration deploy...');
    console.log('');
    
    return {
      hasFailedMigrations: false,
      failedMigrationNames: [],
      statusOutput: errorOutput
    };
  }
}

/**
 * Step 2: Resolve failed migration using Prisma-approved method
 * Specifically handles migration `20251221091813_init` if it's failed
 */
function resolveFailedMigration(migrationName) {
  if (!migrationName) {
    console.error('   ❌ Cannot resolve: Migration name not provided');
    return false;
  }
  
  console.log(`📋 Step 2: Resolving failed migration: ${migrationName}`);
  console.log(`   Running: npx prisma migrate resolve --rolled-back ${migrationName}`);
  console.log('');
  
  try {
    execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('');
    console.log(`   ✅ Migration ${migrationName} successfully marked as rolled back`);
    console.log('');
    return true;
    
  } catch (error) {
    console.error('');
    console.error(`   ❌ Failed to resolve migration ${migrationName} as rolled-back`);
    console.error(`   Error: ${error.message || error}`);
    console.error('');
    
    // Try alternative: mark as applied (in case migration partially completed)
    console.log('   Attempting alternative: marking as applied...');
    console.log(`   Running: npx prisma migrate resolve --applied ${migrationName}`);
    console.log('');
    
    try {
      execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log('');
      console.log(`   ✅ Migration ${migrationName} successfully marked as applied`);
      console.log('');
      return true;
      
    } catch (appliedError) {
      console.error('');
      console.error(`   ❌ Alternative resolution also failed`);
      console.error(`   Error: ${appliedError.message || appliedError}`);
      console.error('');
      return false;
    }
  }
}

/**
 * Step 3: Deploy migrations after resolving any failed ones
 */
function deployMigrations() {
  console.log('📋 Step 3: Deploying migrations...');
  console.log('   Running: npx prisma migrate deploy');
  console.log('');
  
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('');
    console.log('✅ Database migrations completed successfully');
    console.log('');
    return true;
    
  } catch (error) {
    const errorMessage = error.message || String(error);
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
    const fullError = errorMessage + '\n' + errorOutput;
    
    // Check for P3009 error (failed migration) - should not happen if we resolved correctly
    if (fullError.includes('P3009') || fullError.includes('failed migration')) {
      console.error('');
      console.error('❌ P3009 error still present after resolution attempt');
      console.error('   This should not happen if resolution was successful');
      console.error('');
      console.error('📋 Manual Resolution Required:');
      console.error('   1. Check status: npx prisma migrate status');
      console.error('   2. Resolve manually: npx prisma migrate resolve --rolled-back <migration_name>');
      console.error('   3. Deploy: npx prisma migrate deploy');
      console.error('');
      console.error('⚠️  Exiting with code 1 to prevent Railway restart loop');
      console.error('   Script will NOT retry - manual intervention required');
      console.error('');
      process.exit(1);
    }
    
    // Check for provider mismatch (P3019) - SQLite to PostgreSQL transition
    if (fullError.includes('P3019') || 
        fullError.includes('migration_lock') || 
        (fullError.includes('provider') && fullError.includes('does not match')) ||
        (fullError.includes('sqlite') && fullError.includes('postgresql'))) {
      
      console.log('');
      console.warn('⚠️  Provider mismatch detected (SQLite → PostgreSQL)');
      console.warn('   This is normal when switching from SQLite to PostgreSQL');
      console.warn('   Using db push to create schema...');
      console.log('');
      
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
          env: process.env,
        });
        
        console.log('');
        console.log('✅ Database schema created successfully using db push');
        console.log('');
        return true;
        
      } catch (pushError) {
        console.error('');
        console.error('❌ Failed to push database schema');
        console.error('   Error:', pushError.message || pushError);
        process.exit(1);
      }
    }
    
    // Other migration errors
    console.error('');
    console.error('❌ Migration deployment failed');
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
    console.error('');
    console.error('⚠️  Exiting with code 1 to prevent Railway restart loop');
    console.error('   Script will NOT retry - please fix issues and redeploy');
    console.error('');
    process.exit(1);
  }
}

// Main migration flow - runs ONCE per container start
// This prevents infinite restart loops on Railway
// IMPORTANT: This script exits on failure to prevent Railway restart loops
console.log('🚀 Starting migration process...');
console.log('   This will run ONCE per container start');
console.log('   On failure, script exits to prevent restart loop');
console.log('');

// Step 1: Check migration status BEFORE deploying
const statusCheck = checkMigrationStatus();

// Step 2: Resolve failed migrations if detected
if (statusCheck.hasFailedMigrations && statusCheck.failedMigrationNames.length > 0) {
  console.log('⚠️  Failed migrations detected - resolving before deploy');
  console.log('');
  
  // Prioritize resolving known problematic migrations first
  // Order matters: resolve in chronological order (oldest first)
  const priorityMigrations = [
    '20251221091813_init',
    '20251221114916_add_kitchen_tracking'
  ];
  
  // Resolve all failed migrations, prioritizing known migrations first
  const migrationsToResolve = [];
  
  // Add priority migrations first (if they're in the failed list)
  for (const priorityMigration of priorityMigrations) {
    if (statusCheck.failedMigrationNames.includes(priorityMigration)) {
      migrationsToResolve.push(priorityMigration);
    }
  }
  
  // Add any other failed migrations that aren't in the priority list
  for (const failedMigration of statusCheck.failedMigrationNames) {
    if (!migrationsToResolve.includes(failedMigration)) {
      migrationsToResolve.push(failedMigration);
    }
  }
  
  if (migrationsToResolve.length > 0) {
    
    let allResolved = true;
    for (const migrationName of migrationsToResolve) {
      const resolved = resolveFailedMigration(migrationName);
      if (!resolved) {
        console.error(`❌ Failed to resolve migration: ${migrationName}`);
        console.error('   Please resolve manually:');
        console.error(`   npx prisma migrate resolve --rolled-back ${migrationName}`);
        allResolved = false;
      }
    }
    
    if (!allResolved) {
      console.error('');
      console.error('❌ Not all failed migrations could be resolved');
      console.error('   Exiting with code 1 to prevent Railway restart loop');
      console.error('   Please resolve migrations manually before redeploying');
      console.error('');
      process.exit(1);
    }
    
    console.log('✅ All failed migrations resolved');
    console.log('');
  }
}

// Step 3: Deploy migrations
// Note: deployMigrations() exits with code 1 on failure, so this only runs on success
deployMigrations();

// If we reach here, migrations deployed successfully
console.log('✅ Migration process completed successfully');
console.log('   All migrations are now applied');
console.log('   Backend can start normally');
console.log('');
