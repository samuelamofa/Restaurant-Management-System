# Production Setup - Vercel Deployment

## Package.json Changes

### Prisma CLI in Dependencies

**Change:** Moved `prisma` from `devDependencies` to `dependencies`

**Reason:** 
- Production builds may run `npm install --production` which omits devDependencies
- Runtime migrations require Prisma CLI to run `npx prisma migrate deploy`
- Without Prisma CLI in dependencies, production builds fail with "sh: 1: prisma: not found"

**Impact:**
- ✅ Prisma CLI is now available in production
- ✅ Runtime migrations can execute successfully
- ✅ No changes needed to migration scripts (they already use `npx prisma`)

### Scripts Configuration

**Build Script (`build`):**
```json
"build": "prisma generate"
```
- Runs during Vercel build phase
- Generates Prisma Client from schema
- Required before server can start

**Start Script (`start`):**
```json
"start": "node scripts/migrate-and-start.js"
```
- Runs migrations first via `migrate-and-start.js`
- Then starts the Express server
- Prevents server from starting with outdated schema
- Exits on migration failure to prevent restart loops

**Postinstall Script (`postinstall`):**
```json
"postinstall": "prisma generate"
```
- Automatically generates Prisma Client after `npm install`
- Ensures client is available even if build script is skipped
- Production-compatible: runs in both build and runtime phases

### Dependencies vs DevDependencies

**Production Dependencies (required at runtime):**
- `@prisma/client` - Prisma Client for database queries
- `prisma` - Prisma CLI for migrations and schema management
- All Express, Socket.io, and other runtime dependencies

**Development Dependencies (only for local dev):**
- `nodemon` - Auto-restart server during development
- Other dev tools (if added later)

## Vercel Deployment Flow

1. **Build Phase:**
   - Vercel runs `npm install` (includes all dependencies)
   - Runs `npm run build` → `prisma generate`
   - Prisma Client is generated and ready

2. **Runtime:**
   - Vercel uses serverless functions for API routes
   - Migrations should be run via Vercel build command or manually
   - Script runs migration recovery and deploy:
     - Checks migration status
     - Resolves any failed migrations (P3009 recovery)
     - Runs `npx prisma migrate deploy`
   - If migrations succeed → starts Express server
   - If migrations fail → exits with code 1 (prevents restart loop)

## Safety Features

### Crash-Safe Migration Handling
- Script exits on migration failure (prevents infinite restart loops)
- Clear error messages guide manual resolution
- P3009 error auto-recovery built into `migrate-and-start.js`

### No Data Loss
- Uses only Prisma-supported commands
- Does not delete database or migration files
- Does not manually edit `_prisma_migrations` table

## Verification

To verify Prisma CLI is available in production:

```bash
# In Vercel logs or production container
npx prisma --version
# Should output: prisma 5.7.1 (or current version)

# Check migration status
npx prisma migrate status
# Should show migration status without "command not found" errors
```

## Troubleshooting

### "prisma: not found" Error
**Cause:** Prisma CLI was in devDependencies
**Solution:** Already fixed - Prisma is now in dependencies

### Migration Failures
**Cause:** P3009 error (failed migration in database)
**Solution:** Script automatically resolves via `migrate-and-start.js`

### Build Failures
**Cause:** Missing Prisma Client generation
**Solution:** `postinstall` script ensures client is generated

## Related Files

- `backend/scripts/migrate-and-start.js` - Migration handler with P3009 recovery and server startup
- `backend/package.json` - Dependencies and scripts configuration

