# Prisma SQLite to PostgreSQL Migration Guide

## Overview

This backend has been migrated from SQLite to PostgreSQL for Railway deployment. This document explains the migration process and how to handle it.

## Migration Status

✅ **Schema:** Updated to use `provider = "postgresql"`  
✅ **Migration Lock:** Updated to `provider = "postgresql"`  
✅ **Runtime Scripts:** Handle SQLite → PostgreSQL transition automatically  
⚠️ **Existing Migrations:** SQLite-specific migrations exist (will be handled automatically)

## Automatic Migration Handling

The `migrate-and-start.js` script automatically handles the SQLite to PostgreSQL transition:

1. **Checks migration_lock.toml** - Updates to postgresql if needed
2. **Attempts migrate deploy** - Tries to apply existing migrations
3. **Falls back to db push** - If provider mismatch detected, uses `prisma db push`
4. **Creates schema** - Ensures database schema matches current schema.prisma

## Railway Deployment

### First Deployment (Empty Database)

When deploying to Railway for the first time:

1. **Build Phase:**
   - `npm install` → runs `prisma generate` (no DB needed)
   - `npm run build` → runs `prisma generate` (no DB needed)
   - ✅ Build succeeds without database

2. **Start Phase:**
   - `npm start` → runs `migrate-and-start.js`
   - Script detects SQLite → PostgreSQL transition
   - Uses `prisma db push` to create schema
   - Starts server
   - ✅ Database ready

### Subsequent Deployments

After first deployment, future migrations work normally:

1. Create new migrations: `npm run migrate --name migration_name`
2. Deploy: Migrations run automatically at startup via `npm start`

## Manual Migration (If Needed)

If you need to create a proper baseline migration:

```bash
# 1. Ensure DATABASE_URL is set to PostgreSQL
export DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# 2. Create baseline migration
npm run migrate:baseline

# Or manually:
npx prisma migrate dev --name postgresql_baseline --create-only
npx prisma migrate resolve --applied postgresql_baseline
```

## Files Modified

1. **`prisma/schema.prisma`**
   - Provider: `postgresql` ✅
   - DATABASE_URL: `env("DATABASE_URL")` ✅

2. **`prisma/migrations/migration_lock.toml`**
   - Provider: `postgresql` ✅ (updated from sqlite)

3. **`scripts/migrate-and-start.js`**
   - Detects provider mismatch
   - Falls back to `db push` for initial setup
   - Handles SQLite → PostgreSQL transition

4. **`scripts/baseline-postgresql.js`**
   - Creates fresh PostgreSQL baseline migration
   - Backs up old SQLite migrations
   - Marks baseline as applied

## Troubleshooting

### Error: Provider mismatch (P3019)

**Solution:** The migration script automatically handles this by using `db push`. If you see this error, it means the automatic fallback didn't work. Run:

```bash
npx prisma db push --accept-data-loss --skip-generate
```

### Error: Migration not found

**Solution:** This happens when the database is empty. The migration script will use `db push` to create the schema automatically.

### Error: Failed migrations

**Solution:** Check migration status:

```bash
npx prisma migrate status
```

If migrations are in a failed state, resolve them:

```bash
npx prisma migrate resolve --rolled-back <migration_name>
# or
npx prisma migrate resolve --applied <migration_name>
```

## Notes

- **Old SQLite migrations:** Backed up in `prisma/migrations_sqlite_backup` (if baseline script was run)
- **Schema unchanged:** All models and business logic remain the same
- **Data migration:** If you have existing SQLite data, you'll need to export/import separately
- **Railway compatible:** All changes are Railway deployment-ready

## Verification

To verify the migration is working:

```bash
# Check schema provider
cat prisma/schema.prisma | grep provider

# Check migration lock
cat prisma/migrations/migration_lock.toml

# Test migration
npm run migrate:runtime
```

Expected output:
- Schema: `provider = "postgresql"`
- Lock: `provider = "postgresql"`
- Migration: Success or uses db push fallback

