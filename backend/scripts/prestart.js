#!/usr/bin/env node

/**
 * Prestart script for Railway/Production deployment
 * Handles Prisma client generation and migrations
 */

require('dotenv').config();

const { execSync } = require('child_process');
const path = require('path');

// Change to backend directory (scripts/.. = backend/)
process.chdir(path.join(__dirname, '..'));

console.log('🔧 Running prestart script...');
console.log('📁 Working directory:', process.cwd());

// For prisma generate, we can use a dummy DATABASE_URL if not set
// Prisma generate only needs it for schema validation, not actual connection
const generateEnv = { ...process.env };
if (!generateEnv.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set, using dummy URL for Prisma generate...');
  generateEnv.DATABASE_URL = 'postgresql://user:password@localhost:5432/dummy?schema=public';
}

try {
  console.log('');
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: generateEnv,
  });
  console.log('✅ Prisma Client generated successfully');
  
  // For migrations, DATABASE_URL is required
  if (!process.env.DATABASE_URL) {
    console.error('');
    console.error('❌ ERROR: DATABASE_URL environment variable is required for migrations!');
    console.error('');
    console.error('Please set DATABASE_URL in your deployment environment:');
    console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
    console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
    console.error('');
    console.error('If using Railway PostgreSQL:');
    console.error('  1. Go to your PostgreSQL service');
    console.error('  2. Click on Variables tab');
    console.error('  3. Copy the DATABASE_URL value');
    console.error('  4. Add it to your backend service Variables');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set for migrations');
  console.log('🔑 Database host:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden');
  
  console.log('');
  console.log('🗄️  Setting up database schema...');
  
  // Try to run migrations first
  try {
    console.log('   Attempting to run migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('✅ Database migrations completed successfully');
  } catch (migrateError) {
    // Extract error message - execSync includes stderr in the error
    const errorMessage = migrateError.message || String(migrateError);
    const errorCode = migrateError.status || migrateError.code;
    
    // Check for failed migration error (P3009)
    // This occurs when a migration was started but didn't complete
    if (errorMessage.includes('P3009') || 
        errorMessage.includes('failed migrations') ||
        errorMessage.includes('migrate found failed migrations')) {
      console.log('');
      console.warn('⚠️  Failed migration detected (P3009)');
      console.warn('   This usually happens when a migration was interrupted.');
      console.warn('   Attempting to resolve by marking failed migration as rolled back...');
      console.log('');
      
      try {
        // Extract migration name from error message if possible
        // Format: "The `20251221091813_init` migration started at..."
        const migrationMatch = errorMessage.match(/`(\d+_\w+)`/);
        const migrationName = migrationMatch ? migrationMatch[1] : null;
        
        // Also try to get it from stderr if available
        let fullErrorOutput = errorMessage;
        if (migrateError.stderr) {
          fullErrorOutput += '\n' + migrateError.stderr.toString();
        }
        if (migrateError.stdout) {
          fullErrorOutput += '\n' + migrateError.stdout.toString();
        }
        
        // Try multiple patterns to find migration name
        const patterns = [
          /`(\d+_\w+)`/,  // `20251221091813_init`
          /migration `(\d+_\w+)`/,  // migration `20251221091813_init`
          /The `(\d+_\w+)` migration/,  // The `20251221091813_init` migration
        ];
        
        let foundMigrationName = migrationName;
        for (const pattern of patterns) {
          const match = fullErrorOutput.match(pattern);
          if (match && match[1]) {
            foundMigrationName = match[1];
            break;
          }
        }
        
        if (foundMigrationName) {
          console.log(`   Resolving failed migration: ${foundMigrationName}`);
          // Mark the failed migration as rolled back
          execSync(`npx prisma migrate resolve --rolled-back ${foundMigrationName}`, {
            stdio: 'inherit',
            env: process.env,
          });
          console.log('✅ Failed migration marked as rolled back');
          console.log('');
          console.log('   Retrying migrations...');
          
          // Retry migrations
          execSync('npx prisma migrate deploy', {
            stdio: 'inherit',
            env: process.env,
          });
          console.log('✅ Database migrations completed successfully');
        } else {
          // If we can't extract the migration name, try to resolve all failed migrations
          console.log('   Attempting to resolve all failed migrations...');
          console.log('   (This may require manual intervention if multiple migrations failed)');
          throw new Error('Cannot auto-resolve: Migration name not found in error message. Please resolve manually using: npx prisma migrate resolve --rolled-back <migration_name>');
        }
      } catch (resolveError) {
        console.error('');
        console.error('❌ Failed to auto-resolve migration issue');
        console.error('');
        console.error('📋 Manual Resolution Steps:');
        console.error('   1. Connect to your Railway database');
        console.error('   2. Run: npx prisma migrate resolve --rolled-back <migration_name>');
        console.error('   3. Or reset migrations: npx prisma migrate resolve --applied <migration_name>');
        console.error('');
        console.error('   Alternative: Use db push for initial setup:');
        console.error('   npx prisma db push --accept-data-loss --skip-generate');
        throw resolveError;
      }
    }
    // Check for provider mismatch error (P3019)
    // This error occurs when migration_lock.toml has different provider than schema
    else if (errorMessage.includes('P3019') || 
        errorMessage.includes('migration_lock') || 
        errorMessage.includes('provider') ||
        errorMessage.includes('does not match') ||
        errorMessage.includes('sqlite') && errorMessage.includes('postgresql')) {
      console.log('');
      console.warn('⚠️  Migration provider mismatch detected (SQLite → PostgreSQL)');
      console.warn('   This is normal when switching from local SQLite to production PostgreSQL');
      console.warn('   Using prisma db push for initial schema setup...');
      console.log('');
      
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
          env: process.env,
        });
        console.log('');
        console.log('✅ Database schema pushed successfully');
        console.log('');
        console.log('💡 Tip: For future deployments, consider creating PostgreSQL migrations:');
        console.log('   npx prisma migrate dev --name init_postgresql');
      } catch (pushError) {
        console.error('');
        console.error('❌ Failed to push database schema');
        throw pushError;
      }
    } else {
      // Other migration errors - rethrow with context
      console.error('');
      console.error('❌ Migration failed');
      throw migrateError;
    }
  }
  
  console.log('');
  console.log('✅ Prestart script completed successfully!');
} catch (error) {
  console.error('');
  console.error('❌ Prestart script failed!');
  if (error.message) {
    console.error('Error:', error.message);
  }
  if (error.stdout) {
    console.error('Output:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('Error output:', error.stderr.toString());
  }
  process.exit(1);
}

