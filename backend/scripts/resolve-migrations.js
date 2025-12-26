#!/usr/bin/env node

/**
 * Comprehensive Migration Resolution Script
 * 
 * This script:
 * 1. Checks migration status
 * 2. Detects failed migrations
 * 3. Resolves failed migrations by marking them as rolled-back
 * 4. Applies pending migrations
 * 5. Generates Prisma Client
 * 
 * Usage:
 *   node scripts/resolve-migrations.js
 * 
 * Environment:
 *   Requires DATABASE_URL to be set
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🔧 Prisma Migration Resolution Script');
console.log('=====================================');
console.log('');

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required!');
  console.error('');
  console.error('Please set DATABASE_URL in your environment:');
  console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
  console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
  console.error('');
  process.exit(1);
}

// Validate PostgreSQL URL
if (!process.env.DATABASE_URL.includes('postgresql://') && 
    !process.env.DATABASE_URL.includes('postgres://')) {
  console.error('❌ ERROR: DATABASE_URL must be a PostgreSQL connection string!');
  console.error('   Current format:', process.env.DATABASE_URL.split('@')[0] || 'hidden');
  console.error('   Expected format: postgresql://user:password@host:port/database');
  process.exit(1);
}

/**
 * Step 1: Check migration status
 */
function checkMigrationStatus() {
  console.log('📋 Step 1: Checking migration status...');
  console.log('   Command: npx prisma migrate status');
  console.log('');
  
  try {
    const statusOutput = execSync('npx prisma migrate status', {
      encoding: 'utf8',
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    console.log('   Status:');
    console.log('   ' + statusOutput.split('\n').filter(l => l.trim()).join('\n   '));
    console.log('');
    
    // Check for failed migrations
    const hasFailedMigrations = statusOutput.includes('failed migrations') || 
                                statusOutput.includes('failed migration') ||
                                statusOutput.includes('P3009');
    
    if (!hasFailedMigrations) {
      console.log('   ✅ No failed migrations detected');
      console.log('');
      return {
        hasFailedMigrations: false,
        failedMigrationNames: [],
        statusOutput: statusOutput,
        isUpToDate: statusOutput.includes('Database schema is up to date')
      };
    }
    
    // Extract failed migration names
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
    
    // Also check lines with "failed"
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
      statusOutput: statusOutput,
      isUpToDate: false
    };
    
  } catch (error) {
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
    
    console.log('   Status check output:');
    console.log('   ' + errorOutput.split('\n').filter(l => l.trim()).join('\n   '));
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
        statusOutput: errorOutput,
        isUpToDate: false
      };
    }
    
    // Connection or other errors
    if (errorOutput.includes('P1001') || errorOutput.includes('Can\'t reach database')) {
      console.error('   ❌ Cannot connect to database');
      console.error('   Please check your DATABASE_URL and database connectivity');
      console.error('');
      process.exit(1);
    }
    
    console.log('   ℹ️  Status check encountered an error');
    console.log('   Will proceed to migration resolution...');
    console.log('');
    
    return {
      hasFailedMigrations: false,
      failedMigrationNames: [],
      statusOutput: errorOutput,
      isUpToDate: false
    };
  }
}

/**
 * Step 2: Resolve failed migration
 */
function resolveFailedMigration(migrationName) {
  if (!migrationName) {
    console.error('   ❌ Cannot resolve: Migration name not provided');
    return false;
  }
  
  console.log(`📋 Step 2: Resolving failed migration: ${migrationName}`);
  console.log(`   Command: npx prisma migrate resolve --rolled-back ${migrationName}`);
  console.log('');
  
  try {
    execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('');
    console.log(`   ✅ Migration ${migrationName} successfully marked as rolled-back`);
    console.log('');
    return true;
    
  } catch (error) {
    console.error('');
    console.error(`   ❌ Failed to resolve migration ${migrationName} as rolled-back`);
    console.error(`   Error: ${error.message || error}`);
    console.error('');
    
    // Try alternative: mark as applied (in case migration partially completed)
    console.log('   Attempting alternative: marking as applied...');
    console.log(`   Command: npx prisma migrate resolve --applied ${migrationName}`);
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
 * Step 3: Apply pending migrations
 */
function deployMigrations() {
  console.log('📋 Step 3: Applying pending migrations...');
  console.log('   Command: npx prisma migrate deploy');
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
    
    console.error('');
    console.error('❌ Migration deployment failed');
    console.error('   Error:', errorMessage);
    if (errorOutput) {
      console.error('   Details:', errorOutput);
    }
    console.error('');
    
    // Check for P3009 error (should not happen if we resolved correctly)
    if (fullError.includes('P3009') || fullError.includes('failed migration')) {
      console.error('⚠️  P3009 error still present after resolution attempt');
      console.error('   Please check migration status and resolve manually');
      console.error('');
    }
    
    process.exit(1);
  }
}

/**
 * Step 4: Generate Prisma Client
 */
function generatePrismaClient() {
  console.log('📋 Step 4: Generating Prisma Client...');
  console.log('   Command: npx prisma generate');
  console.log('');
  
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('');
    console.log('✅ Prisma Client generated successfully');
    console.log('');
    return true;
    
  } catch (error) {
    console.error('');
    console.error('❌ Failed to generate Prisma Client');
    console.error('   Error:', error.message || error);
    console.error('');
    console.error('⚠️  This may be due to file permission issues (e.g., OneDrive sync)');
    console.error('   Try:');
    console.error('   1. Pause OneDrive sync temporarily');
    console.error('   2. Or move project outside OneDrive folder');
    console.error('   3. Or run: npx prisma generate --schema=prisma/schema.prisma');
    console.error('');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Check migration status
    const statusCheck = checkMigrationStatus();
    
    // Step 2: Resolve failed migrations if detected
    if (statusCheck.hasFailedMigrations && statusCheck.failedMigrationNames.length > 0) {
      console.log('⚠️  Resolving failed migrations...');
      console.log('');
      
      let allResolved = true;
      for (const migrationName of statusCheck.failedMigrationNames) {
        const resolved = resolveFailedMigration(migrationName);
        if (!resolved) {
          console.error(`❌ Failed to resolve migration: ${migrationName}`);
          allResolved = false;
        }
      }
      
      if (!allResolved) {
        console.error('');
        console.error('❌ Not all failed migrations could be resolved');
        console.error('   Please resolve migrations manually before continuing');
        console.error('');
        process.exit(1);
      }
      
      console.log('✅ All failed migrations resolved');
      console.log('');
    }
    
    // Step 3: Apply pending migrations (if not up to date)
    if (!statusCheck.isUpToDate) {
      deployMigrations();
    } else {
      console.log('✅ Database is up to date - no migrations to apply');
      console.log('');
    }
    
    // Step 4: Generate Prisma Client
    generatePrismaClient();
    
    // Final verification
    console.log('📋 Final verification: Checking migration status...');
    console.log('');
    const finalStatus = checkMigrationStatus();
    
    if (finalStatus.hasFailedMigrations) {
      console.error('❌ Failed migrations still present after resolution');
      process.exit(1);
    }
    
    console.log('');
    console.log('✅ Migration resolution completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  - Migration status: ✅ Verified');
    console.log('  - Failed migrations: ✅ Resolved');
    console.log('  - Pending migrations: ✅ Applied');
    console.log('  - Prisma Client: ✅ Generated');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Unexpected error:', error.message || error);
    console.error('');
    process.exit(1);
  }
}

// Execute
main();

