# Resolve Failed Migration in Railway (P3009)

## Quick Command

```bash
npx prisma migrate resolve --rolled-back 20251221114916_add_kitchen_tracking
```

## Important Notes

⚠️ **This command MUST be run in Railway, not locally!**

- **Local environment:** Uses SQLite (`file:./prisma/dev.db`)
- **Production (Railway):** Uses PostgreSQL (`postgresql://...`)
- **Schema provider:** Set to `postgresql` for production

## Steps to Resolve in Railway

1. **Open Railway Shell:**
   - Go to your backend service in Railway dashboard
   - Click "Shell" or open a terminal session
   - Railway automatically sets `DATABASE_URL` to PostgreSQL

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Resolve the failed migration:**
   ```bash
   npx prisma migrate resolve --rolled-back 20251221114916_add_kitchen_tracking
   ```

4. **Verify status:**
   ```bash
   npx prisma migrate status
   ```

5. **Apply pending migrations:**
   ```bash
   npx prisma migrate deploy
   ```

## Why It Fails Locally

If you try to run this command locally, you'll get:
```
Error: the URL must start with the protocol `postgresql://` or `postgres://`
```

This is **expected** because:
- Local `.env` has: `DATABASE_URL=file:./prisma/dev.db` (SQLite)
- Schema requires: `postgresql://...` (PostgreSQL)
- The command needs a PostgreSQL connection

## Solution

✅ **Run the command in Railway Shell** where `DATABASE_URL` is properly set to PostgreSQL.

The command syntax is correct - it just needs the right environment!

