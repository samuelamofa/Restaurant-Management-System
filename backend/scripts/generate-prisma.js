#!/usr/bin/env node

/**
 * Prisma Client Generation Script
 * This script ensures Prisma Client is generated, handling different environments
 * Works around Railway deployment issues where npx might not be available
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('📦 Generating Prisma Client...');
console.log('   Working directory:', process.cwd());

// Try different methods to run Prisma generate
const methods = [
  // Method 1: Try direct path to prisma binary (most reliable)
  () => {
    const prismaPath = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
    if (fs.existsSync(prismaPath)) {
      console.log('   Using: node_modules/.bin/prisma');
      execSync(`"${prismaPath}" generate --schema=prisma/schema.prisma`, { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: process.env
      });
      return true;
    }
    return false;
  },
  // Method 2: Try npx (works in most environments)
  () => {
    try {
      console.log('   Trying: npx prisma generate');
      execSync('npx prisma generate --schema=prisma/schema.prisma', { 
        stdio: 'inherit',
        cwd: process.cwd(),
        env: process.env
      });
      return true;
    } catch (error) {
      return false;
    }
  },
  // Method 3: Try node with prisma CLI directly
  () => {
    try {
      const prismaCliPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
      if (fs.existsSync(prismaCliPath)) {
        console.log('   Using: node prisma/build/index.js');
        execSync(`node "${prismaCliPath}" generate --schema=prisma/schema.prisma`, { 
          stdio: 'inherit',
          cwd: process.cwd(),
          env: process.env
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },
];

let success = false;
let lastError = null;

for (const method of methods) {
  try {
    if (method()) {
      success = true;
      console.log('✅ Prisma Client generated successfully');
      break;
    }
  } catch (error) {
    lastError = error;
    console.log(`   ⚠️  Method failed: ${error.message || error}`);
    continue;
  }
}

if (!success) {
  console.error('');
  console.error('❌ Failed to generate Prisma Client using all methods');
  if (lastError) {
    console.error('   Last error:', lastError.message || lastError);
  }
  console.error('');
  console.error('Troubleshooting:');
  console.error('   1. Ensure Prisma is installed: npm install prisma @prisma/client');
  console.error('   2. Check that node_modules/.bin/prisma exists');
  console.error('   3. Verify npm install completed successfully');
  console.error('');
  // Don't exit with error in postinstall to allow build to continue
  // Railway will fail at build step if this is critical
  if (process.env.npm_lifecycle_event !== 'postinstall') {
    process.exit(1);
  } else {
    console.error('⚠️  Continuing despite Prisma generation failure (postinstall)');
    console.error('   Build step will retry Prisma generation');
  }
}

