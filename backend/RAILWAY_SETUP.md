# Railway Production Setup Documentation

This document explains how the backend is configured for Railway production deployment.

## Package.json Configuration

### Dependencies (Production)
- **`prisma`** (^5.7.1): Prisma CLI must be in `dependencies` (not `devDependencies`) for Railway production, since Railway skips devDependencies by default during `npm install --production`.
- **`@prisma/client`** (^5.7.1): Prisma Client must be in `dependencies` as it's required at runtime.

### Scripts

#### Build & Install Scripts
- **`build`**: Runs `prisma generate` to generate Prisma Client. Railway runs this during build phase.
- **`postinstall`**: Runs `prisma generate` after `npm install`. Ensures Prisma Client is generated in production.

#### Start Scripts
- **`start`**: Runs `node scripts/migrate-and-start.js` - the fail-safe migration and server start script.
- **`start:server`**: Direct server start without migrations (for manual use if needed).

#### Development Scripts
- **`dev`**: Uses `nodemon` for local development (nodemon stays in devDependencies).

### DevDependencies (Local Development Only)
- **`nodemon`** (^3.0.2): Auto-restarts server during local development. Railway production doesn't install devDependencies, so this is fine.

## Migration Strategy

### Fail-Safe Migration Script (`scripts/migrate-and-start.js`)

The `migrate-and-start.js` script is designed to prevent Railway restart loops while ensuring migrations run safely.

#### How It Works:
1. **Validates Environment**: Checks that `DATABASE_URL` is set (exits with code 1 if missing).
2. **Runs Migrations**: Executes `npx prisma migrate deploy` to apply pending migrations.
3. **Fail-Safe Behavior**: 
   - If migrations succeed (exit code 0), starts the server normally.
   - If migrations fail (non-zero exit code), logs warnings but **still starts the server**.
   - This prevents Railway restart loops because we don't exit with code 1 on migration failures.
4. **Server Start**: Always starts the Express server after migration attempt.
5. **Runtime Error Handling**: If database is not ready, the server will fail at runtime (better than infinite restart loop).

#### Why This Prevents Restart Loops:
- Old behavior: Script would exit with code 1 if migrations failed → Railway restarts container → migrations fail again → infinite loop.
- New behavior: Script always starts server → If migrations fail, server starts anyway → Server handles database errors at runtime → Railway doesn't restart unless server crashes.

#### Migration Success Cases:
- **Migrations Applied**: `prisma migrate deploy` exits with code 0 → Server starts normally.
- **Already Applied**: `prisma migrate deploy` exits with code 0 (migrations already up to date) → Server starts normally.

#### Migration Failure Cases:
- **Connection Error**: Migration fails → Warning logged → Server starts anyway → Server will fail at runtime if DB is unreachable.
- **Migration Error**: Migration fails → Warning logged → Server starts anyway → Check Railway logs for migration details.

## Railway Deployment Flow

1. **Build Phase**: Railway runs `npm install` → `npm run build` → `prisma generate` runs → Prisma Client generated.
2. **Start Phase**: Railway runs `npm start` → `migrate-and-start.js` executes:
   - Runs `prisma migrate deploy` (applies pending migrations).
   - Starts Express server (`node server.js`).
3. **Runtime**: Server runs normally. If migrations failed earlier, server will handle database errors gracefully or fail at runtime (prevents restart loop).

## Environment Variables Required

- **`DATABASE_URL`**: PostgreSQL connection string (Railway provides this automatically for PostgreSQL services).
- **`JWT_SECRET`**: Secret key for JWT tokens (must be set manually in Railway Variables).

## Important Notes

- ✅ Migrations are **never** deleted or modified by this setup.
- ✅ Database data is **never** deleted by this setup.
- ✅ Prisma version is **never** downgraded by this setup.
- ✅ Schema is **never** modified by this setup.
- ✅ Local development tooling (nodemon) remains in devDependencies.
- ✅ Production deployment will succeed even if migrations were already applied.

## Troubleshooting

### Server won't start
- Check Railway logs for migration errors.
- Verify `DATABASE_URL` is set in Railway Variables.
- Verify `JWT_SECRET` is set in Railway Variables.

### Migrations not applying
- Check Railway logs for migration output.
- Verify database is accessible (check `DATABASE_URL`).
- Run `prisma migrate status` manually via Railway CLI if needed.

### Restart loops
- This setup should prevent restart loops. If you see loops, check server.js for startup errors (not migration errors).

