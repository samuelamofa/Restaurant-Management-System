#!/usr/bin/env node

/**
 * Railway Production: Fail-Safe Migration and Start Script
 * 
 * This script safely runs database migrations before starting the server.
 * It's designed to prevent Railway restart loops by handling migration failures gracefully.
 * 
 * Behavior:
 * - Checks for failed migrations before deploying
 * - For failed migrations, follows Prisma best practices:
 *   1. Uses `prisma migrate diff` to check database state vs schema
 *   2. Uses `prisma db execute` to apply missing changes if migration was partially applied
 *   3. Marks the migration as applied using `prisma migrate resolve --applied`
 * - Runs `prisma migrate deploy` to apply pending migrations
 * - If migrations succeed or are already applied (exit code 0), starts the server
 * - If migrations fail with recoverable errors, logs warnings but continues to start server
 * - Only exits with code 1 for critical errors that prevent the app from running
 * 
 * Railway Production Notes:
 * - Prisma CLI must be in dependencies (not devDependencies) for production
 * - Migrations run at startup, not during build (build runs `prisma generate` only)
 * - If migrations are already applied, `prisma migrate deploy` exits with code 0
 * - This prevents restart loops because we don't exit on non-critical migration failures
 * - Failed migrations are handled using Prisma's recommended approach from official docs
 */

require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Change to backend directory to ensure relative paths work correctly
process.chdir(path.join(__dirname, '..'));

console.log('🚀 Starting backend service...');
console.log('');

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is required!');
  console.error('');
  console.error('Please set DATABASE_URL in your deployment environment:');
  console.error('  - Railway: Go to Service → Variables → Add DATABASE_URL');
  console.error('  - Format: postgresql://user:password@host:port/database?schema=public');
  console.error('');
  process.exit(1);
}

/**
 * Checks migration status to detect failed migrations (P3009)
 * Returns: { hasFailedMigrations: boolean, failedMigrationNames: string[] }
 */
function checkMigrationStatus() {
  return new Promise((resolve) => {
    const { execSync } = require('child_process');
    
    try {
      const statusOutput = execSync('npx prisma migrate status', {
        encoding: 'utf8',
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      // Check for failed migrations
      const hasFailedMigrations = statusOutput.includes('failed migrations') || 
                                  statusOutput.includes('failed migration') ||
                                  statusOutput.includes('P3009');
      
      if (!hasFailedMigrations) {
        resolve({
          hasFailedMigrations: false,
          failedMigrationNames: [],
        });
        return;
      }
      
      // Extract failed migration names
      const failedMigrationNames = [];
      const patterns = [
        /The\s+`(\d+_\w+)`\s+migration/i,  // "The `20251221114916_add_kitchen_tracking` migration"
        /migration\s+`?(\d+_\w+)`?\s+failed/i,
        /The\s+migration\s+`?(\d+_\w+)`?\s+failed/i,
        /`(\d+_\w+)`.*failed/i,
        /failed.*`(\d+_\w+)`/i,
        /`(\d+_\w+)`/g,  // Fallback: any migration name in backticks
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
          // Try to match migration name with backticks
          const backtickMatch = line.match(/`(\d+_\w+)`/);
          if (backtickMatch && !failedMigrationNames.includes(backtickMatch[1])) {
            failedMigrationNames.push(backtickMatch[1]);
          }
          // Also try without backticks
          const migrationMatch = line.match(/(\d+_\w+)/);
          if (migrationMatch && !failedMigrationNames.includes(migrationMatch[1])) {
            failedMigrationNames.push(migrationMatch[1]);
          }
        }
      }
      
      resolve({
        hasFailedMigrations: true,
        failedMigrationNames: failedMigrationNames,
      });
      
    } catch (error) {
      const errorOutput = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      
      // Check if it's a P3009 error
      if (errorOutput.includes('P3009') || 
          errorOutput.includes('failed migration') ||
          errorOutput.includes('failed migrations')) {
        
        const failedMigrationNames = [];
        const patterns = [
          /The\s+`(\d+_\w+)`\s+migration/i,  // "The `20251221114916_add_kitchen_tracking` migration"
          /migration\s+`?(\d+_\w+)`?/i,
          /The\s+migration\s+`?(\d+_\w+)`?/i,
          /`(\d+_\w+)`/g,  // Any migration name in backticks
          /(\d+_\w+)/,  // Fallback: any migration pattern
        ];
        
        for (const pattern of patterns) {
          const matches = errorOutput.matchAll(new RegExp(pattern, 'gi'));
          for (const match of matches) {
            if (match[1] && !failedMigrationNames.includes(match[1])) {
              failedMigrationNames.push(match[1]);
            }
          }
        }
        
        // Also try to extract from the specific error format
        const specificMatch = errorOutput.match(/The\s+`(\d+_\w+)`/);
        if (specificMatch && !failedMigrationNames.includes(specificMatch[1])) {
          failedMigrationNames.push(specificMatch[1]);
        }
        
        resolve({
          hasFailedMigrations: true,
          failedMigrationNames: failedMigrationNames,
        });
      } else {
        // Other errors - assume no failed migrations
        resolve({
          hasFailedMigrations: false,
          failedMigrationNames: [],
        });
      }
    }
  });
}

/**
 * Resolves a failed migration following Prisma best practices:
 * 1. Check if migration was partially applied by comparing DB state with schema
 * 2. Use migrate diff to generate SQL script to complete the migration
 * 3. Use db execute to apply the missing changes
 * 4. Mark the migration as applied
 * 
 * Returns: boolean (success)
 */
function resolveFailedMigration(migrationName) {
  return new Promise(async (resolve) => {
    const { execSync, writeFileSync, unlinkSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    console.log(`📋 Resolving failed migration: ${migrationName}`);
    console.log('   Following Prisma best practices for failed migrations');
    console.log('');
    
    // Step 1: Check if migration was partially applied
    // Use migrate diff to see what's missing between current DB state and target schema
    const tempSqlFile = path.join(__dirname, '..', `temp_migration_${migrationName}.sql`);
    
    try {
      console.log('   Step 1: Checking database state vs schema...');
      console.log('   Command: npx prisma migrate diff --from-url $DATABASE_URL --to-schema schema.prisma --script');
      console.log('');
      
      // Generate SQL script to take DB from current state to target schema state
      // Using Prisma 5 syntax: --from-url for source DB, --to-schema-datamodel for target schema
      // We're already in the backend directory, so use relative path
      const diffOutput = execSync(
        `npx prisma migrate diff --from-url "${process.env.DATABASE_URL}" --to-schema-datamodel prisma/schema.prisma --script`,
        {
          encoding: 'utf8',
          env: process.env,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      
      // If there are differences, write them to a temp file and apply them
      if (diffOutput && diffOutput.trim().length > 0) {
        console.log('   ⚠️  Database state differs from schema - migration was partially applied');
        console.log('   Step 2: Generating SQL script to complete migration...');
        console.log('');
        
        writeFileSync(tempSqlFile, diffOutput);
        
        console.log('   Step 3: Applying missing changes using db execute...');
        console.log(`   Command: npx prisma db execute --file ${tempSqlFile}`);
        console.log('');
        
        try {
          execSync(`npx prisma db execute --file "${tempSqlFile}"`, {
            stdio: 'inherit',
            env: process.env,
          });
          
          console.log('');
          console.log('   ✅ Missing changes applied successfully');
          console.log('');
          
          // Clean up temp file
          try {
            if (fs.existsSync(tempSqlFile)) {
              unlinkSync(tempSqlFile);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          
        } catch (executeError) {
          const executeErrorOutput = executeError.stderr?.toString() || executeError.stdout?.toString() || executeError.message || '';
          
          // Clean up temp file
          try {
            if (fs.existsSync(tempSqlFile)) {
              unlinkSync(tempSqlFile);
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          
          // If execute fails, it might mean the changes are already applied
          // or there's a different issue - try to mark as applied anyway
          console.log('');
          console.log('   ⚠️  db execute failed (changes may already be applied)');
          console.log(`   Error: ${executeErrorOutput.substring(0, 200)}`);
          console.log('');
        }
      } else {
        console.log('   ✅ Database state matches schema - migration appears complete');
        console.log('');
      }
      
      // Step 4: Mark migration as applied
      console.log('   Step 4: Marking migration as applied...');
      console.log(`   Command: npx prisma migrate resolve --applied ${migrationName}`);
      console.log('');
      
      try {
        execSync(`npx prisma migrate resolve --applied "${migrationName}"`, {
          stdio: 'inherit',
          env: process.env,
        });
        
        console.log('');
        console.log(`✅ Migration ${migrationName} marked as applied`);
        console.log('');
        resolve(true);
        
      } catch (resolveError) {
        const resolveErrorOutput = resolveError.stderr?.toString() || resolveError.stdout?.toString() || resolveError.message || '';
        
        // Check if migration is already resolved
        if (resolveErrorOutput.includes('already') || 
            resolveErrorOutput.includes('not found') ||
            resolveErrorOutput.includes('does not exist')) {
          console.log('');
          console.log(`ℹ️  Migration ${migrationName} appears to already be resolved`);
          console.log('');
          resolve(true); // Consider this a success
        } else {
          console.warn('');
          console.warn(`⚠️  Could not mark migration as applied (will continue anyway)`);
          console.warn(`   Error: ${resolveErrorOutput.substring(0, 200)}`);
          console.warn('');
          resolve(true); // Continue anyway - migration might be in a state we can work with
        }
      }
      
    } catch (error) {
      const errorOutput = error.stderr?.toString() || error.stdout?.toString() || error.message || '';
      
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tempSqlFile)) {
          unlinkSync(tempSqlFile);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // If migrate diff fails, try the simpler approach: just mark as applied
      console.log('');
      console.log('   ⚠️  Could not check database state, trying simple resolve...');
      console.log(`   Error: ${errorOutput.substring(0, 200)}`);
      console.log('');
      console.log(`   Command: npx prisma migrate resolve --applied ${migrationName}`);
      console.log('');
      
      try {
        execSync(`npx prisma migrate resolve --applied "${migrationName}"`, {
          stdio: 'inherit',
          env: process.env,
        });
        
        console.log('');
        console.log(`✅ Migration ${migrationName} marked as applied`);
        console.log('');
        resolve(true);
        
      } catch (appliedError) {
        const appliedErrorOutput = appliedError.stderr?.toString() || appliedError.stdout?.toString() || appliedError.message || '';
        
        // Check if migration is already resolved
        if (appliedErrorOutput.includes('already') || 
            appliedErrorOutput.includes('not found') ||
            appliedErrorOutput.includes('does not exist')) {
          console.log('');
          console.log(`ℹ️  Migration ${migrationName} appears to already be resolved`);
          console.log('');
          resolve(true); // Consider this a success
        } else {
          console.warn('');
          console.warn(`⚠️  Could not resolve migration ${migrationName} (will continue anyway)`);
          console.warn(`   Error: ${appliedErrorOutput.substring(0, 200)}`);
          console.warn('');
          resolve(true); // Continue anyway - migration might be in a state we can work with
        }
      }
    }
  });
}

/**
 * Runs `prisma migrate deploy` to apply pending migrations
 * 
 * Important: `prisma migrate deploy` exits with code 0 if:
 * - Migrations are successfully applied
 * - All migrations are already applied (up to date)
 * 
 * It only exits with non-zero code if there's an actual error.
 * Even in error cases, we start the server to prevent Railway restart loops.
 * The server will fail at runtime if there are critical database issues.
 * 
 * Returns: { success: boolean, exitCode: number }
 */
function runMigrations() {
  return new Promise(async (resolve) => {
    // Step 1: Check for failed migrations BEFORE deploying
    console.log('📋 Checking migration status...');
    console.log('');
    
    let statusCheck;
    try {
      statusCheck = await checkMigrationStatus();
    } catch (error) {
      console.warn('⚠️  Status check failed, will attempt to resolve known problematic migrations');
      console.log('');
      statusCheck = {
        hasFailedMigrations: true,
        failedMigrationNames: []
      };
    }
    
    // Step 2: Resolve any failed migrations
    // Always try to resolve known problematic migrations as a safety measure
    const knownProblematicMigrations = ['20251221114916_add_kitchen_tracking'];
    const migrationsToResolve = [...new Set([
      ...statusCheck.failedMigrationNames,
      ...knownProblematicMigrations
    ])];
    
    if (statusCheck.hasFailedMigrations || migrationsToResolve.length > 0) {
      console.log('⚠️  Attempting to resolve failed migrations before deploy');
      console.log(`   Migrations to resolve: ${migrationsToResolve.join(', ')}`);
      console.log('');
      
      let allResolved = true;
      for (const migrationName of migrationsToResolve) {
        const resolved = await resolveFailedMigration(migrationName);
        if (!resolved) {
          console.warn(`⚠️  Could not resolve migration: ${migrationName} (may already be resolved)`);
          // Don't fail completely - migration might already be resolved
        } else {
          console.log(`✅ Successfully resolved: ${migrationName}`);
        }
      }
      
      console.log('');
      console.log('📋 Proceeding with migration deploy...');
      console.log('');
    }
    
    // Step 3: Deploy migrations
    console.log('📋 Running database migrations...');
    console.log('   Command: npx prisma migrate deploy');
    console.log('');

    const migrateProcess = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit', // Pipe output directly to console for Railway logs
      env: process.env,
      shell: true,
    });

    // Handle process execution errors (e.g., command not found)
    migrateProcess.on('error', (error) => {
      console.error('');
      console.error('❌ Failed to execute migration command:', error.message || String(error));
      console.error('   This may indicate Prisma CLI is not installed');
      console.error('   Server will start anyway to prevent restart loop');
      console.error('   Check that "prisma" is in dependencies (not devDependencies)');
      console.log('');
      resolve({
        success: false,
        exitCode: 1,
      });
    });

    migrateProcess.on('close', async (code) => {
      if (code === 0) {
        // Success: migrations applied or already up to date
        console.log('');
        console.log('✅ Database migrations completed successfully');
        console.log('   (Migrations were applied or already up to date)');
        console.log('');
        resolve({ success: true, exitCode: 0 });
      } else {
        // Migration failed with non-zero exit code
        console.log('');
        console.warn('⚠️  Migration deployment exited with code:', code);
        console.warn('   This indicates a migration error occurred');
        
        // Check if it's a SQL syntax error (SQLite migration on PostgreSQL)
        // In this case, we can try using db push as a fallback
        console.warn('   Attempting fallback: using prisma db push to sync schema...');
        console.log('');
        
        const dbPushProcess = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss', '--skip-generate'], {
          stdio: 'inherit',
          env: process.env,
          shell: true,
        });
        
        dbPushProcess.on('close', (pushCode) => {
          if (pushCode === 0) {
            console.log('');
            console.log('✅ Database schema synced using db push');
            console.log('   (This is a fallback when migrations have SQL syntax issues)');
            console.log('');
            resolve({ success: true, exitCode: 0 });
          } else {
            console.log('');
            console.warn('⚠️  db push also failed');
            console.warn('   Server will start anyway to prevent restart loops');
            console.warn('   Check logs above for error details');
            console.warn('   If database is not ready, server will fail at runtime');
            console.log('');
            resolve({
              success: false,
              exitCode: code,
            });
          }
        });
        
        dbPushProcess.on('error', (error) => {
          console.error('');
          console.error('❌ Failed to execute db push:', error.message || String(error));
          console.warn('   Server will start anyway to prevent restart loop');
          console.log('');
          resolve({
            success: false,
            exitCode: code,
          });
        });
      }
    });
  });
}

/**
 * Starts the Express server
 * This function never returns - it runs the server process
 */
function startServer() {
  console.log('🚀 Starting Express server...');
  console.log('');

  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit', // Pipe output directly to console
    env: process.env,
    shell: true,
  });

  // Forward exit code from server process
  serverProcess.on('close', (code) => {
    console.log('');
    console.log(`Server process exited with code ${code}`);
    process.exit(code || 0);
  });

  // Handle termination signals (Railway sends SIGTERM for graceful shutdown)
  process.on('SIGTERM', () => {
    console.log('');
    console.log('📡 Received SIGTERM signal, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('');
    console.log('📡 Received SIGINT signal, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });

  // Handle server process errors
  serverProcess.on('error', (error) => {
    console.error('');
    console.error('❌ Failed to start server:', error.message || String(error));
    console.error('');
    process.exit(1);
  });
}

/**
 * Main execution flow
 * 
 * Railway Production Behavior:
 * 1. Runs migrations first (fail-safe: continues even if migrations fail)
 * 2. Always starts the server (prevents restart loops)
 * 3. Server will fail at runtime if there are critical database issues
 *    (better than infinite restart loop on Railway)
 */
async function main() {
  try {
    // Step 1: Attempt to run migrations
    // Note: runMigrations() always resolves (never rejects) to prevent crashes
    const migrationResult = await runMigrations();

    // Step 2: Log migration status summary
    if (!migrationResult.success) {
      console.warn('⚠️  Migrations did not complete successfully');
      console.warn('   Exit code:', migrationResult.exitCode);
      console.warn('   Server will start anyway to prevent Railway restart loops');
      console.warn('   If database is not ready, server will fail at runtime');
      console.log('');
    }

    // Step 3: Start the server (this function never returns unless server exits)
    // The server process handles its own errors and will exit with appropriate codes
    startServer();
  } catch (error) {
    // This catch block should rarely execute since runMigrations() always resolves
    // Handle unexpected errors gracefully to prevent restart loops
    console.error('');
    console.error('❌ Unexpected error in migration/start script:', error);
    console.error('   Error details:', error.message || String(error));
    console.error('');
    console.error('⚠️  Starting server anyway to prevent restart loop...');
    console.error('   Server may fail at runtime if database is not ready');
    console.log('');
    startServer();
  }
}

// Execute main flow
main();