# Prisma P3009 Error Recovery Guide

## Overview

This document explains the automatic P3009 error recovery system implemented in the migration runtime script.

## What is P3009?

**P3009** is a Prisma error that occurs when:
- A migration starts but doesn't complete successfully
- The database is left in an inconsistent state
- Prisma's migration tracking table shows a "failed" migration

Common causes:
- Database connection interrupted during migration
- Migration script error
- Database server restart during migration
- Network timeout

## Automatic Recovery Process

The `migrate-runtime.js` script automatically handles P3009 errors:

### Step 1: Pre-flight Check
Before attempting migrations, the script:
1. Runs `prisma migrate status` to check for failed migrations
2. Detects P3009 errors or "failed migration" status
3. Extracts the failed migration name from status output

### Step 2: Automatic Resolution
If failed migrations are detected:
1. Uses `prisma migrate resolve --rolled-back <migration_name>`
   - This is the Prisma-approved recovery method
   - Marks the migration as rolled back in Prisma's tracking table
   - Does NOT delete the database or migration files
   - Does NOT manually edit Prisma system tables

2. Falls back to `--applied` if `--rolled-back` fails
   - Used when migration partially completed
   - Marks migration as applied instead

### Step 3: Re-apply Migrations
After resolution:
1. Re-runs `prisma migrate deploy`
2. Applies all pending migrations
3. Ensures database schema is up to date

### Step 4: Crash Safety
- Maximum 2 recovery attempts to prevent infinite loops
- Exits with error if recovery fails after max attempts
- Prevents Railway restart loops

## Railway Deployment Flow

### Normal Flow (No Failed Migrations)
```
npm start
  → migrate-runtime.js
    → Check status (no failures)
    → prisma migrate deploy
    → ✅ Success
    → Start server
```

### Recovery Flow (P3009 Detected)
```
npm start
  → migrate-runtime.js
    → Check status (P3009 detected)
    → prisma migrate resolve --rolled-back <name>
    → Retry: prisma migrate deploy
    → ✅ Success
    → Start server
```

### Failure Flow (Recovery Failed)
```
npm start
  → migrate-runtime.js
    → Check status (P3009 detected)
    → prisma migrate resolve --rolled-back <name>
    → Retry: prisma migrate deploy
    → Still fails after max attempts
    → ❌ Exit with error (prevents restart loop)
```

## Manual Recovery

If automatic recovery fails, you can recover manually:

### 1. Check Migration Status
```bash
npx prisma migrate status
```

### 2. Identify Failed Migration
Look for output like:
```
The migration `20251221091813_init` failed
```

### 3. Resolve Failed Migration
```bash
# Mark as rolled back (recommended)
npx prisma migrate resolve --rolled-back 20251221091813_init

# Or mark as applied (if migration partially completed)
npx prisma migrate resolve --applied 20251221091813_init
```

### 4. Re-apply Migrations
```bash
npx prisma migrate deploy
```

## Safety Guarantees

✅ **No Data Loss**
- Recovery does NOT delete the database
- Only updates Prisma's migration tracking table
- Your data remains intact

✅ **No Manual Table Edits**
- Does NOT manually edit `_prisma_migrations` table
- Uses only Prisma CLI commands
- Follows Prisma best practices

✅ **No File Deletion**
- Does NOT remove migration files
- All migration history preserved
- Can review migrations later

✅ **Crash-Safe**
- Maximum retry limit prevents infinite loops
- Exits cleanly on failure
- Prevents Railway restart storms

## Error Codes

| Code | Meaning | Auto-Recovery |
|------|---------|---------------|
| P3009 | Failed migration | ✅ Yes |
| P3019 | Provider mismatch | ✅ Yes (uses db push) |
| Other | Various errors | ❌ No (manual fix) |

## Troubleshooting

### Recovery Attempts Exceeded

**Error:** "Maximum recovery attempts reached"

**Solution:**
1. Check migration status: `npx prisma migrate status`
2. Manually resolve: `npx prisma migrate resolve --rolled-back <name>`
3. Re-deploy: `npx prisma migrate deploy`

### Migration Name Not Found

**Error:** "Could not extract migration name"

**Solution:**
1. Run: `npx prisma migrate status`
2. Look for failed migration name in output
3. Manually resolve using the name found

### Database Connection Issues

**Error:** Connection errors during migration

**Solution:**
1. Verify DATABASE_URL is correct
2. Check database is accessible
3. Ensure database server is running
4. Check network connectivity

## Railway-Specific Notes

- **Build Phase:** Migrations do NOT run during build
- **Start Phase:** Migrations run automatically via `npm start`
- **Restart Safety:** Crash-safe design prevents restart loops
- **Logs:** All recovery attempts logged for debugging

## Verification

To verify recovery is working:

```bash
# Check current status
npx prisma migrate status

# Should show: "Database schema is up to date!"
# Or: "X migration(s) have been applied"
```

## Best Practices

1. **Monitor Logs:** Watch Railway logs for P3009 errors
2. **Regular Backups:** Backup database before major migrations
3. **Test Locally:** Test migrations locally before deploying
4. **Small Migrations:** Break large migrations into smaller ones
5. **Review Status:** Check `prisma migrate status` regularly

## Related Files

- `backend/scripts/migrate-runtime.js` - Main recovery script
- `backend/scripts/migrate-and-start.js` - Startup orchestrator
- `backend/PRISMA_POSTGRESQL_MIGRATION.md` - PostgreSQL migration guide

