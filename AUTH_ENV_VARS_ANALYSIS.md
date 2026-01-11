# Authentication Environment Variables Analysis

## Required Environment Variables for Auth

### 1. `DATABASE_URL` ⚠️ **CRITICAL - REQUIRED**

**Location:** `server/db.ts:7-11`
```typescript
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}
```

**What it does:**
- PostgreSQL connection string for all database operations
- Used by Drizzle ORM to connect to the database
- Required for user registration, login, and all data operations

**Error if missing:**
- **App crashes on startup** with: `Error: DATABASE_URL must be set. Did you forget to provision a database?`
- The app will not start at all
- This happens when `server/db.ts` is imported (which happens during server initialization)

**Database operations that fail:**
- `storage.getUserByEmail()` - used in login/register
- `storage.createUser()` - used in registration
- `storage.getUser()` - used in `/api/auth/me`
- All other database queries

---

### 2. `SESSION_SECRET` ⚠️ **REQUIRED FOR PRODUCTION**

**Location:** `server/routes.ts:87`
```typescript
session({
  secret: process.env.SESSION_SECRET || "job-quest-secret-key",
  // ...
})
```

**What it does:**
- Secret key used to sign and encrypt session cookies
- Prevents session tampering and ensures session integrity
- Without a proper secret, sessions can be forged or invalidated

**Error if missing:**
- App will start (uses fallback: `"job-quest-secret-key"`)
- **BUT:** Sessions will be insecure and may not persist correctly
- **In production:** Using the default fallback is a security risk
- Sessions may be lost on server restart (especially with memory store)
- Multiple instances won't share sessions properly

**Symptoms:**
- Login appears to work but user gets logged out immediately
- Session cookies may be rejected or invalid
- "Not authenticated" errors on `/api/auth/me` after login

---

## Additional Issues Found

### 3. **Missing Database Tables (Migrations Not Run)**

**Problem:**
- No `migrations/` folder exists in the codebase
- Database schema must be pushed manually using `npm run db:push`
- If tables don't exist, all database operations will fail

**Error if tables missing:**
- PostgreSQL errors like:
  - `relation "users" does not exist`
  - `relation "contacts" does not exist`
  - etc.

**Where it fails:**
- Registration: `storage.createUser()` → `db.insert(users)` fails
- Login: `storage.getUserByEmail()` → `db.select().from(users)` fails
- All API endpoints that query the database

---

### 4. **Session Store Not Configured**

**Location:** `server/routes.ts:85-96`
- Currently using default **memory store** (no `store` option specified)
- `connect-pg-simple` is installed but not used

**Problem:**
- Memory store doesn't persist across server restarts
- Multiple instances don't share sessions
- Sessions lost on deployment/restart

**Impact:**
- Users may be logged out after server restart
- Not the cause of initial login/registration failure, but will cause issues later

---

## Error Flow Analysis

### Registration Failure Flow:
1. User submits registration form → `POST /api/auth/register`
2. Server tries to check if user exists: `storage.getUserByEmail(data.email)`
3. **If DATABASE_URL missing:** App already crashed on startup (never reaches here)
4. **If DATABASE_URL invalid/missing tables:** 
   - `db.select().from(users)` throws: `relation "users" does not exist`
   - Caught in catch block → Returns `500: "Registration failed"`
5. **If tables exist but connection fails:**
   - Pool connection error → `500: "Registration failed"`

### Login Failure Flow:
1. User submits login form → `POST /api/auth/login`
2. Server tries to find user: `storage.getUserByEmail(data.email)`
3. **If DATABASE_URL missing:** App already crashed on startup
4. **If DATABASE_URL invalid/missing tables:**
   - `db.select().from(users)` throws: `relation "users" does not exist`
   - Caught in catch block → Returns `500: "Login failed"`
5. **If user not found:** Returns `401: "Invalid email or password"` (expected behavior)

---

## Minimal Fix Steps for Render

### Step 1: Set Environment Variables in Render Dashboard

1. Go to your Render service dashboard
2. Navigate to **Environment** tab
3. Add the following environment variables:

   **Required:**
   ```
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```
   - Get this from your Render PostgreSQL database service
   - Or use your Neon database connection string

   **Required:**
   ```
   SESSION_SECRET=<generate-a-random-secure-string>
   ```
   - Generate a secure random string (e.g., use `openssl rand -hex 32`)
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

   **Optional but recommended:**
   ```
   NODE_ENV=production
   PORT=10000
   ```
   - Render sets PORT automatically, but you can override
   - NODE_ENV is already in render.yaml

### Step 2: Run Database Migrations

**Option A: Run migrations locally (recommended)**
```bash
# Set DATABASE_URL to your production database
export DATABASE_URL="postgresql://..."
npm run db:push
```

**Option B: Run migrations via Render Shell**
1. Go to Render dashboard → Your service
2. Click **Shell** tab
3. Run:
   ```bash
   npm run db:push
   ```

**Option C: Add to build command (not recommended for production)**
- Modify `render.yaml` buildCommand to include migrations:
  ```yaml
  buildCommand: npm install && npm run build && npm run db:push
  ```
- ⚠️ This runs migrations on every deploy, which may cause issues

### Step 3: Verify Database Connection

After setting `DATABASE_URL`, check Render logs:
- Should see: `serving on port 10000` (or your PORT)
- Should NOT see: `DATABASE_URL must be set` error
- If you see database connection errors, verify the connection string

### Step 4: Test Authentication

1. Try to register a new user
2. Check Render logs for errors
3. If you see `relation "users" does not exist` → migrations not run
4. If you see connection errors → DATABASE_URL is incorrect

---

## Quick Diagnostic Checklist

When login/registration fails on Render, check:

- [ ] `DATABASE_URL` is set in Render environment variables
- [ ] `SESSION_SECRET` is set in Render environment variables  
- [ ] Database migrations have been run (`npm run db:push`)
- [ ] Database connection string is correct (test it locally)
- [ ] Render logs show the app started successfully
- [ ] Render logs show no "DATABASE_URL must be set" error
- [ ] Render logs show no "relation does not exist" errors

---

## Code Locations Summary

| Env Var | File | Line | Required? | Error if Missing |
|---------|------|------|-----------|------------------|
| `DATABASE_URL` | `server/db.ts` | 7-11 | ✅ Yes | App crashes on startup |
| `SESSION_SECRET` | `server/routes.ts` | 87 | ⚠️ Production | Uses insecure fallback |
| `NODE_ENV` | `server/index.ts` | 76 | No | Defaults to development |
| `PORT` | `server/index.ts` | 87 | No | Defaults to 5000 |

---

## Most Likely Cause of Your Issue

Based on the symptoms (login + registration both fail on first attempt post-deploy):

1. **90% likely:** `DATABASE_URL` not set or incorrect
   - App crashes on startup OR database queries fail
   
2. **80% likely:** Database migrations not run
   - Tables don't exist → `relation "users" does not exist`
   
3. **30% likely:** `SESSION_SECRET` not set
   - Sessions may not work properly, but wouldn't cause initial failure

**Recommended fix order:**
1. Set `DATABASE_URL` in Render
2. Run `npm run db:push` to create tables
3. Set `SESSION_SECRET` in Render
4. Redeploy and test
