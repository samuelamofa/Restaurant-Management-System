# Resolve Failed Migration in Railway (P3009)

## Current Issue

- ✅ Migration `20251221091813_init` - Already resolved
- ❌ Migration `20251221114916_add_kitchen_tracking` - Still failing
- 🔒 Prisma is locked and refuses to continue

## Quick Fix Command

Run this in **Railway Shell** (not locally):

```bash
cd backend
npx prisma migrate resolve --rolled-back 20251221114916_add_kitchen_tracking
```

## Complete Resolution Steps

### 1. Open Railway Shell
- Go to your backend service in Railway dashboard
- Click "Shell" or open a terminal session
- Railway automatically sets `DATABASE_URL` to PostgreSQL

### 2. Navigate to Backend Directory
```bash
cd backend
```

### 3. Check Current Migration Status
```bash
npx prisma migrate status
```

Expected output will show:
```
The migration `20251221114916_add_kitchen_tracking` failed
```

### 4. Resolve the Failed Migration
```bash
npx prisma migrate resolve --rolled-back 20251221114916_add_kitchen_tracking
```

Expected output:
```
Migration `20251221114916_add_kitchen_tracking` marked as rolled back.
```

### 5. Verify Resolution
```bash
npx prisma migrate status
```

Should now show:
```
Database schema is up to date!
```

Or:
```
X migration(s) have been applied
```

### 6. Deploy Pending Migrations
```bash
npx prisma migrate deploy
```

This will apply all pending migrations that haven't been applied yet.

## What This Does

✅ **Marks the migration as rolled back** in Prisma's tracking table  
✅ **Unlocks Prisma** so `migrate deploy` can proceed  
✅ **Does NOT delete data** or migration files  
✅ **Does NOT reset the database**  
✅ **Allows future migrations** to run normally  

## Why It Fails Locally

If you try to run this locally, you'll get:
```
Error: the URL must start with the protocol `postgresql://` or `postgres://`
```

**This is expected** because:
- Local `.env` has: `DATABASE_URL=file:./prisma/dev.db` (SQLite)
- Schema requires: `postgresql://...` (PostgreSQL)
- The command needs a PostgreSQL connection

**Solution:** Run the command in Railway Shell where `DATABASE_URL` is properly set.

## Automatic Recovery

The `migrate-runtime.js` script will automatically detect and resolve this migration on the next Railway deployment. However, if you need immediate resolution, use the manual steps above.

## Prevention

After resolving, the migration recovery script will:
- Automatically detect failed migrations
- Resolve them before deploying
- Prevent restart loops
- Exit cleanly on failure

## Verification

After resolution, verify everything works:

```bash
# Check status
npx prisma migrate status

# Should show no failed migrations
# Should show all migrations applied or pending (not failed)
```

## Related Files

- `backend/scripts/migrate-runtime.js` - Automatic recovery script
- `backend/scripts/resolve-migration.js` - Helper script for manual resolution
- `backend/PRISMA_P3009_RECOVERY.md` - Full recovery documentation

