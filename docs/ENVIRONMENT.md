# Environment Configuration

## Overview

Job Quest requires environment variables for database connectivity, session management, and runtime configuration. This document covers both local development and Render production deployment.

---

## Required Environment Variables

### 1. `DATABASE_URL` (CRITICAL - REQUIRED)

**Purpose**: PostgreSQL connection string for all database operations.

**Where it's used**:
- `server/db.ts:7-11` - Validated on app startup (throws if missing)
- `drizzle.config.ts:3-5` - Used for database migrations
- `server/db.ts:16` - Connection pool configuration

**Format**:
```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

**Example (Neon)**:
```
DATABASE_URL=postgresql://user:password@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Example (Local)**:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobquest_dev
```

**Behavior if missing**:
- App crashes immediately on startup with: `Error: DATABASE_URL must be set. Did you forget to provision a database?`
- Cannot run `npm run db:push` (migration command also requires it)

**Neon-specific notes** (server/db.ts:14-18):
- SSL is auto-enabled if `DATABASE_URL` contains `neon.tech`
- Connection pool uses `{ ssl: { rejectUnauthorized: false } }` for Neon databases

---

### 2. `SESSION_SECRET` (REQUIRED FOR PRODUCTION)

**Purpose**: Secret key used to sign and encrypt session cookies (express-session).

**Where it's used**:
- `server/routes.ts:87` - Session middleware configuration

**Code**:
```typescript
session({
  secret: process.env.SESSION_SECRET || "job-quest-secret-key",
  // ...
})
```

**Behavior if missing**:
- App will start with fallback value: `"job-quest-secret-key"`
- **SECURITY RISK**: Sessions can be forged or tampered with
- Sessions may be invalidated across server restarts
- Multiple instances won't share sessions properly

**How to generate**:
```bash
# Generate a 32-byte random hex string
openssl rand -hex 32
```

**Example**:
```
SESSION_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

---

### 3. `NODE_ENV` (Optional, defaults to development)

**Purpose**: Runtime environment flag (development/production).

**Where it's used**:
- `server/db.ts:431` - Controls Prisma query logging
- `server/index.ts:76` - Controls static file serving
- Build process optimization

**Valid values**:
- `development` - Verbose logging, hot reload
- `production` - Minimal logging, optimized builds

**Default**: If not set, Node.js defaults to no value (treated as development by most tools).

---

### 4. `PORT` (Optional, defaults to 5000)

**Purpose**: HTTP server listen port.

**Where it's used**:
- `server/index.ts:87` - Express server listen port

**Code**:
```typescript
const PORT = process.env.PORT || 5000;
```

**Default**: `5000`

**Note**: Render automatically sets this to `10000` on their platform.

---

## Local Development Setup

### Step 1: Create `.env` file

Copy the example file:
```bash
cp .env.example .env
```

### Step 2: Configure database

**Option A: Use Neon (recommended for simplicity)**

1. Create a free database at https://neon.tech
2. Copy the connection string
3. Add to `.env`:
   ```
   DATABASE_URL=postgresql://[user]:[password]@[neon-host]/[database]?sslmode=require
   ```

**Option B: Use local PostgreSQL**

1. Install PostgreSQL 16+ locally
2. Create a database:
   ```bash
   psql -U postgres
   CREATE DATABASE jobquest_dev;
   ```
3. Add to `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobquest_dev
   ```

### Step 3: Set session secret

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env
```

### Step 4: Optional overrides

```bash
echo "NODE_ENV=development" >> .env
echo "PORT=5000" >> .env
```

### Step 5: Push database schema

```bash
npm run db:push
```

This command:
- Reads `shared/schema.ts`
- Connects to `DATABASE_URL`
- Creates all tables, indexes, and constraints
- Outputs to `migrations/` folder

### Step 6: Verify setup

```bash
npm run dev
```

Expected output:
```
serving on port 5000
```

If you see `DATABASE_URL must be set`, repeat Step 2.

---

## Render Production Setup

### Step 1: Create PostgreSQL database on Render

1. Go to Render dashboard
2. Click **New +** → **PostgreSQL**
3. Configure:
   - Name: `job-quest-db`
   - Database: `jobquest`
   - User: `jobquest_user`
   - Region: Same as your web service
   - PostgreSQL Version: 16
   - Plan: Free (or paid if needed)
4. Click **Create Database**
5. Copy the **Internal Database URL** (starts with `postgresql://`)

### Step 2: Create web service

1. Go to Render dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - Name: `job-quest`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Plan: Free (or paid if needed)

### Step 3: Set environment variables

In the Render web service dashboard, go to **Environment** tab and add:

| Key | Value | Source |
|-----|-------|--------|
| `DATABASE_URL` | (paste internal database URL from Step 1) | Manual |
| `SESSION_SECRET` | (generate with `openssl rand -hex 32`) | Manual |
| `NODE_ENV` | `production` | Auto-set by `render.yaml` |

**IMPORTANT**: Use the **Internal Database URL**, not the External URL. Internal URLs are faster and free from rate limits.

### Step 4: Run database migrations

**Option A: Via Render Shell (recommended)**

1. In Render web service dashboard, go to **Shell** tab
2. Wait for shell to connect
3. Run:
   ```bash
   npm run db:push
   ```
4. Verify output shows tables created

**Option B: Run locally against production database**

```bash
export DATABASE_URL="postgresql://[production-url]"
npm run db:push
```

**Warning**: Never run `db:push` in the build command (`render.yaml`). It will run on every deploy and may cause race conditions.

### Step 5: Deploy

1. Render auto-deploys on git push (if connected to GitHub)
2. Or click **Manual Deploy** → **Deploy latest commit**
3. Watch logs for:
   ```
   serving on port 10000
   ```

### Step 6: Verify

1. Visit your Render URL (e.g., `https://job-quest.onrender.com`)
2. Try to register a new account
3. Check Render logs if errors occur:
   - `relation "users" does not exist` → Run `db:push` (Step 4)
   - `DATABASE_URL must be set` → Check environment variables (Step 3)
   - `connect ECONNREFUSED` → Database URL is incorrect

---

## Render Deployment Notes

### `render.yaml` Configuration

The repo includes a `render.yaml` file that defines:

```yaml
services:
  - type: web
    name: job-quest
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: DATABASE_URL
        sync: false  # Must be set manually in Render dashboard
      - key: SESSION_SECRET
        sync: false  # Must be set manually in Render dashboard
      - key: NODE_ENV
        value: production  # Auto-set by render.yaml
```

**Why `sync: false`?**
- These values are sensitive and should be set in the Render dashboard, not committed to git
- Render will prompt you to set these on first deploy

### Database Connection Pooling

The app uses `pg.Pool` for connection pooling (server/db.ts:15-18):

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isNeonDatabase ? { rejectUnauthorized: false } : undefined
});
```

**Default pool settings** (inherited from `pg`):
- Max connections: 10
- Idle timeout: 10 seconds
- Connection timeout: 0 (no timeout)

For high-traffic production, consider adding to `server/db.ts`:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: isNeonDatabase ? { rejectUnauthorized: false } : undefined
});
```

**Render Free Tier Limits**:
- Max 95 connections per PostgreSQL instance
- Recommend max pool size of 10-20 to leave headroom

**Neon Free Tier Limits**:
- Max 100 concurrent connections
- Connection pooling recommended for production

### Session Store

**Current implementation** (server/routes.ts:85-96):
- Uses **MemoryStore** (default express-session store)
- Sessions stored in Node.js process memory
- **Problem**: Sessions lost on server restart

**Status**: `connect-pg-simple` is installed but not configured.

**Future improvement** (NOT in scope for this handover):
```typescript
import connectPgSimple from 'connect-pg-simple';
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,  // Reuse existing pg pool
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || "job-quest-secret-key",
  // ... rest of config
}));
```

**Current workaround**: Users will be logged out on server restart. This is acceptable for MVP but should be fixed before scaling.

---

## Troubleshooting

### Error: "DATABASE_URL must be set"

**Cause**: Missing `DATABASE_URL` environment variable.

**Fix**:
1. Verify `.env` file exists (local) or Render environment variables are set (production)
2. Restart the server
3. Check for typos in variable name (case-sensitive)

### Error: "relation 'users' does not exist"

**Cause**: Database migrations not run.

**Fix**:
```bash
npm run db:push
```

**Verification**:
```bash
# Connect to your database
psql $DATABASE_URL

# List tables
\dt

# Should see:
# users, contacts, interactions, opportunities, interviews, xpLogs, badges, dailyQuests, templates, playbookActions, selectedQuests
```

### Error: "connect ECONNREFUSED" or "connection timeout"

**Cause**: Incorrect database URL or database not accessible.

**Fix**:
1. Verify `DATABASE_URL` format is correct
2. Test connection:
   ```bash
   psql $DATABASE_URL
   ```
3. Check firewall/network settings
4. For Neon: Ensure `?sslmode=require` is appended

### Sessions not persisting across restarts

**Cause**: Using MemoryStore (current implementation).

**Expected behavior**: Sessions are lost on restart.

**Temporary fix**: N/A (requires code changes to implement PgSession store)

**Workaround**: Users will need to log in again after server restart.

### "Invalid email or password" after registration

**Possible causes**:
1. Registration actually failed (check server logs)
2. Session not set correctly (check `SESSION_SECRET`)
3. Password hashing error (unlikely, but check `server/auth.ts:hashPassword`)

**Debug steps**:
1. Check server logs for registration errors
2. Query database directly:
   ```sql
   SELECT id, email, "createdAt" FROM users;
   ```
3. Verify user was created
4. Try logging in with exact credentials used during registration

---

## Environment Variable Summary

| Variable | Required | Default | Where Used | Impact if Missing |
|----------|----------|---------|------------|-------------------|
| `DATABASE_URL` | ✅ Yes | None | `server/db.ts`, `drizzle.config.ts` | **App crashes on startup** |
| `SESSION_SECRET` | ⚠️ Production | `"job-quest-secret-key"` | `server/routes.ts` | **Insecure sessions** |
| `NODE_ENV` | No | `development` | Multiple files | Sub-optimal logging/performance |
| `PORT` | No | `5000` | `server/index.ts` | Uses default port |

---

## Quick Reference

### Local Development Checklist

- [ ] PostgreSQL database running (local or Neon)
- [ ] `.env` file created with `DATABASE_URL`
- [ ] `.env` file includes `SESSION_SECRET`
- [ ] Run `npm run db:push` to create tables
- [ ] Run `npm run dev` to start server
- [ ] Visit `http://localhost:5000`

### Render Deployment Checklist

- [ ] PostgreSQL database created on Render
- [ ] `DATABASE_URL` set in Render environment (use Internal URL)
- [ ] `SESSION_SECRET` set in Render environment
- [ ] `npm run db:push` executed via Render Shell or locally
- [ ] Deployment successful (check logs for "serving on port")
- [ ] Registration/login working (test in browser)

---

## Additional Resources

- **Neon Documentation**: https://neon.tech/docs
- **Render PostgreSQL**: https://render.com/docs/databases
- **Drizzle ORM**: https://orm.drizzle.team/
- **express-session**: https://github.com/expressjs/session
- **connect-pg-simple**: https://github.com/voxpelli/node-connect-pg-simple
