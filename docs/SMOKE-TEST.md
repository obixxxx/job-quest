# Smoke Test Checklist

## Overview

This document provides step-by-step smoke test checklists for verifying critical functionality in both production (Render) and local development environments.

**Purpose**: Quickly verify the application is working after deployment or local setup.

**Time to Complete**:
- Production: ~15 minutes
- Local: ~10 minutes

---

## Production Smoke Test (Render Deployment)

Run these tests after deploying to Render to verify the production instance is healthy.

### Prerequisites
- [ ] Production URL (e.g., `https://job-quest.onrender.com`)
- [ ] Test email address (for registration)
- [ ] Browser with DevTools

---

### Test 1: Application Loads

**Steps**:
1. Navigate to production URL in browser
2. Wait for page to load

**Expected**:
- [ ] Page loads within 5 seconds
- [ ] No console errors in DevTools (F12 → Console)
- [ ] Login/registration form is visible
- [ ] "Job Quest" or app branding is visible

**If fails**:
- Check Render logs for server errors
- Verify `DATABASE_URL` and `SESSION_SECRET` are set in Render environment
- Check build succeeded (Render dashboard → Logs)

---

### Test 2: User Registration

**Steps**:
1. Click "Register" or "Sign Up" tab
2. Enter test email (e.g., `test+{timestamp}@example.com`)
3. Enter password (minimum 8 characters)
4. Click "Register" or "Create Account"

**Expected**:
- [ ] Registration succeeds (no error message)
- [ ] Redirected to dashboard
- [ ] Dashboard loads with user data
- [ ] Sidebar shows user email

**If fails**:
- Check Render logs for errors during registration
- Verify database tables exist: `psql $DATABASE_URL -c "\dt"`
- Verify `users` table has row: `SELECT * FROM users LIMIT 1;`
- Check `SESSION_SECRET` is set (sessions may fail if missing)

---

### Test 3: Session Persistence

**Steps**:
1. After logging in, note the session cookie in DevTools (Application → Cookies → `connect.sid`)
2. Refresh the page (F5)

**Expected**:
- [ ] User remains logged in (not redirected to login page)
- [ ] Dashboard reloads successfully

**Known Issue**:
- ⚠️ Sessions are stored in memory. If server restarts, all sessions are lost. See `docs/KNOWN-GAPS.md` #1.

**If fails**:
- Check `SESSION_SECRET` is set
- Check browser cookies are enabled
- Check server logs for session errors

---

### Test 4: Create Contact

**Steps**:
1. Click "Contacts" in sidebar
2. Click "Add Contact" or "+" button
3. Enter:
   - Name: "John Doe"
   - Company: "Acme Corp"
   - Role: "Engineering Manager"
   - Email: "john.doe@acme.com" (optional)
4. Click "Save" or "Create Contact"

**Expected**:
- [ ] Contact created successfully
- [ ] Contact appears in contacts list
- [ ] Warmth level defaults to "cold"
- [ ] Playbook actions auto-generated (verify in contact detail)

**If fails**:
- Check server logs for errors
- Verify `contacts` table exists
- Verify `playbookActions` table exists and has rows: `SELECT * FROM playbook_actions WHERE contact_id = (SELECT id FROM contacts WHERE name = 'John Doe');`

---

### Test 5: Log Interaction

**Steps**:
1. Navigate to "Contacts"
2. Click on "John Doe" contact (or any contact)
3. Click "Log Interaction" or "+" button
4. Select:
   - Type: "Email"
   - Direction: "Outbound"
   - Outcome: "Response Received" (optional)
   - Message: "Hey John, wanted to connect..." (optional)
5. Click "Log" or "Save"

**Expected**:
- [ ] Interaction logged successfully
- [ ] XP awarded notification appears (e.g., "+5 XP")
- [ ] XP bar on dashboard increases
- [ ] Interaction appears in contact detail history

**If fails**:
- Check server logs for errors during interaction creation
- Verify `interactions` table has new row: `SELECT * FROM interactions WHERE contact_id = (SELECT id FROM contacts WHERE name = 'John Doe');`
- Check `xp_logs` table for XP award: `SELECT * FROM xp_logs ORDER BY "createdAt" DESC LIMIT 1;`

---

### Test 6: Daily Quest Selection

**Steps**:
1. Navigate to dashboard
2. Click "Select Daily Quests" button (if visible)
3. Select 3-5 quests from the list
4. Click "Save Selection"

**Expected**:
- [ ] Quests selected successfully
- [ ] Dashboard shows selected quests with progress bars
- [ ] Quests show 0/X progress (e.g., "Send 3 emails: 0/3")

**If fails**:
- Check server logs for errors
- Verify `selected_quests` table has rows: `SELECT * FROM selected_quests WHERE date = CURRENT_DATE;`

---

### Test 7: Quest Progress Increment

**Steps**:
1. With daily quests selected, log an interaction that matches a quest (e.g., send an email if quest is "Send 3 emails")
2. Return to dashboard

**Expected**:
- [ ] Quest progress increments (e.g., "0/3" → "1/3")
- [ ] If quest completed, bonus XP awarded
- [ ] Confetti or celebration animation (if implemented)

**If fails**:
- Check server logs for quest increment errors
- Verify `selected_quests` table updated: `SELECT * FROM selected_quests WHERE date = CURRENT_DATE;`
- Check `/api/quests/:id/increment` route exists

---

### Test 8: Playbook Next Action

**Steps**:
1. Navigate to dashboard
2. Find "Next Action" card (should show pending playbook action)

**Expected**:
- [ ] Next action card displays pending action (e.g., "Send initial outreach email to John Doe")
- [ ] Clicking "View" or action name navigates to contact detail
- [ ] Contact detail shows playbook actions with "pending" status

**If fails**:
- Check playbook actions were generated on contact creation
- Verify `playbook_actions` table has pending actions: `SELECT * FROM playbook_actions WHERE status = 'pending' LIMIT 5;`
- Check `/api/playbook/next-action` route returns data

---

### Test 9: Badge Awarding

**Steps**:
1. Log first interaction (if not already done in Test 5)
2. Navigate to "Achievements" page

**Expected**:
- [ ] "First Contact" badge is awarded
- [ ] Badge appears in Achievements page
- [ ] Badge shows earned date

**If fails**:
- Check server logs for badge awarding errors
- Verify `badges` table has "first_contact" badge: `SELECT * FROM badges WHERE type = 'first_contact';`
- Check `server/game-engine.ts` - `checkAndAwardBadges()` function

---

### Test 10: Logout and Login

**Steps**:
1. Click "Logout" button in sidebar
2. Verify redirected to login page
3. Enter same email and password used in Test 2
4. Click "Login"

**Expected**:
- [ ] Logout succeeds (session destroyed)
- [ ] Redirected to login page
- [ ] Login succeeds with same credentials
- [ ] Redirected to dashboard
- [ ] User data persists (contacts, interactions, XP, badges)

**If fails (logout)**:
- Check `/api/auth/logout` route exists
- Check session destroy logic

**If fails (login)**:
- Check password hashing logic (`server/auth.ts`)
- Verify user exists in database: `SELECT email FROM users WHERE email = 'test@example.com';`
- Check session creation logic

---

## Production Smoke Test Summary

**Total Tests**: 10
**Critical Tests**: 1, 2, 5, 10 (must pass for app to be functional)
**Nice-to-Have Tests**: 3, 4, 6, 7, 8, 9 (features may be partial but app is usable)

**Pass Criteria**: All critical tests pass + at least 70% of nice-to-have tests pass.

---

## Local Development Smoke Test

Run these tests after setting up local development environment to verify everything works.

### Prerequisites
- [ ] PostgreSQL database running (local or Neon)
- [ ] `.env` file configured with `DATABASE_URL` and `SESSION_SECRET`
- [ ] `npm install` completed
- [ ] `npm run db:push` completed (database tables created)

---

### Test 1: Server Starts

**Steps**:
```bash
npm run dev
```

**Expected**:
- [ ] Server starts without errors
- [ ] Output shows: `serving on port 5000`
- [ ] No database connection errors
- [ ] Vite dev server starts with HMR

**If fails**:
- Check `.env` file exists and has `DATABASE_URL`
- Check PostgreSQL is running: `psql $DATABASE_URL -c "SELECT 1;"`
- Check `npm install` succeeded
- Check for syntax errors in `server/index.ts`

---

### Test 2: Frontend Loads (with HMR)

**Steps**:
1. Navigate to `http://localhost:5000` in browser
2. Wait for page to load

**Expected**:
- [ ] Page loads within 2 seconds
- [ ] No console errors in DevTools
- [ ] Vite HMR overlay not showing errors
- [ ] Login form is visible

**If fails**:
- Check Vite dev server is running (should see logs in terminal)
- Check for TypeScript errors: `npm run check`
- Check `client/src/main.tsx` for errors

---

### Test 3: Hot Module Replacement (HMR)

**Steps**:
1. With dev server running and browser open, edit `client/src/pages/dashboard.tsx`
2. Add a comment or change text: `<h1>Dashboard Test</h1>`
3. Save file
4. Observe browser (do not refresh)

**Expected**:
- [ ] Browser auto-updates with changes (no full page reload)
- [ ] Changes appear within 1 second
- [ ] No errors in console

**If fails**:
- Check Vite dev server logs for HMR errors
- Restart dev server

---

### Test 4: Database Tables Exist

**Steps**:
```bash
psql $DATABASE_URL -c "\dt"
```

**Expected**:
- [ ] Output shows all tables:
  - `users`
  - `contacts`
  - `interactions`
  - `opportunities`
  - `interviews`
  - `xp_logs`
  - `badges`
  - `daily_quests`
  - `selected_quests`
  - `templates`
  - `playbook_actions`

**If fails**:
- Run `npm run db:push` to create tables
- Check `drizzle.config.ts` has correct `DATABASE_URL`
- Check `shared/schema.ts` for syntax errors

---

### Test 5: User Registration (Local)

**Steps**:
1. Navigate to `http://localhost:5000`
2. Register with email: `test@example.com`, password: `password123`
3. Submit form

**Expected**:
- [ ] Registration succeeds
- [ ] Redirected to dashboard
- [ ] No errors in browser console
- [ ] No errors in server terminal

**If fails**:
- Check server logs in terminal
- Check database: `SELECT * FROM users;`
- Verify `POST /api/auth/register` route exists

---

### Test 6: Contact Creation (Local)

**Steps**:
1. Click "Contacts" in sidebar
2. Add contact: "Jane Smith", "Startup Inc", "CTO"
3. Save

**Expected**:
- [ ] Contact created
- [ ] Contact list shows "Jane Smith"
- [ ] Clicking contact shows detail page

**If fails**:
- Check server logs for errors
- Check database: `SELECT * FROM contacts;`

---

### Test 7: Interaction Logging (Local)

**Steps**:
1. Go to "Jane Smith" contact detail
2. Log interaction: Type = "Call", Outcome = "Response Received"
3. Save

**Expected**:
- [ ] Interaction logged
- [ ] XP popup shows "+15 XP" (call = 15 XP base + 5 XP for response)
- [ ] Dashboard XP bar increases

**If fails**:
- Check server logs
- Check database: `SELECT * FROM interactions;`
- Check `xp_logs` table: `SELECT * FROM xp_logs ORDER BY "createdAt" DESC LIMIT 1;`

---

### Test 8: TypeScript Type Checking

**Steps**:
```bash
npm run check
```

**Expected**:
- [ ] No TypeScript errors
- [ ] Output shows: `tsc` completes without errors

**If fails**:
- Fix TypeScript errors shown in output
- Check `tsconfig.json` is valid

---

### Test 9: Build Production Bundle

**Steps**:
```bash
npm run build
```

**Expected**:
- [ ] Build succeeds without errors
- [ ] `dist/public` folder created with:
  - `index.html`
  - `assets/index-{hash}.js`
  - `assets/index-{hash}.css`
- [ ] `dist/index.cjs` created (server bundle)

**If fails**:
- Check Vite config: `vite.config.ts`
- Check esbuild config: `script/build.ts`
- Fix any TypeScript or build errors

---

### Test 10: Start Production Build Locally

**Steps**:
```bash
npm run start
```

**Expected**:
- [ ] Server starts on port 5000
- [ ] Navigate to `http://localhost:5000`
- [ ] Page loads (served from `dist/public`)
- [ ] Login/register works
- [ ] No Vite HMR (production mode)

**If fails**:
- Check `dist/` folder exists and has files
- Run `npm run build` first
- Check for errors in server logs

---

## Local Development Smoke Test Summary

**Total Tests**: 10
**Critical Tests**: 1, 2, 4, 5, 9 (must pass for development to be functional)
**Optional Tests**: 3, 6, 7, 8, 10 (nice to verify but not blockers)

**Pass Criteria**: All critical tests pass.

---

## Quick Reference: Common Commands

### Local Development
```bash
# Start dev server (with HMR)
npm run dev

# Type check without building
npm run check

# Push database schema changes
npm run db:push

# Build production bundle
npm run build

# Start production server
npm run start

# Connect to database
psql $DATABASE_URL
```

### Database Inspection
```bash
# List all tables
psql $DATABASE_URL -c "\dt"

# Show table schema
psql $DATABASE_URL -c "\d users"

# Query users
psql $DATABASE_URL -c "SELECT id, email, total_xp, current_level FROM users;"

# Query contacts
psql $DATABASE_URL -c "SELECT id, name, company, warmth_level FROM contacts;"

# Query recent interactions
psql $DATABASE_URL -c "SELECT * FROM interactions ORDER BY created_at DESC LIMIT 10;"

# Query XP logs
psql $DATABASE_URL -c "SELECT reason, xp_amount, os_amount, created_at FROM xp_logs ORDER BY created_at DESC LIMIT 10;"

# Query badges
psql $DATABASE_URL -c "SELECT type, name, earned_at FROM badges ORDER BY earned_at DESC;"
```

### Render Deployment
```bash
# Check deployment logs
# (Go to Render dashboard → Your service → Logs)

# Run command in Render shell
# (Go to Render dashboard → Your service → Shell)

# Push database schema on Render
npm run db:push

# Tail production logs
# (Render dashboard → Logs → Auto-scroll)
```

---

## Troubleshooting Common Failures

### "DATABASE_URL must be set"
**Cause**: Missing `DATABASE_URL` environment variable.

**Fix**:
- Local: Add to `.env` file
- Render: Set in Environment tab

---

### "relation 'users' does not exist"
**Cause**: Database tables not created.

**Fix**:
```bash
npm run db:push
```

---

### "Invalid email or password"
**Cause**: User doesn't exist or password is incorrect.

**Fix**:
- Verify user exists: `psql $DATABASE_URL -c "SELECT email FROM users;"`
- Register a new account
- Check password was hashed correctly (length should be 64+ characters)

---

### "Not authenticated"
**Cause**: Session expired or cookie not sent.

**Fix**:
- Log in again
- Check browser cookies are enabled
- Verify `SESSION_SECRET` is set
- If on Render, sessions may be lost due to MemoryStore (see KNOWN-GAPS.md #1)

---

### Server won't start: "Port 5000 already in use"
**Cause**: Another process is using port 5000.

**Fix**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

---

### Vite HMR not working
**Cause**: File watcher issue or Vite cache corruption.

**Fix**:
```bash
# Stop server (Ctrl+C)
# Clear Vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

---

### Build fails with TypeScript errors
**Cause**: Type errors in code.

**Fix**:
```bash
# Run type check to see all errors
npm run check

# Fix errors shown in output
# Common issues:
# - Missing imports
# - Incorrect types
# - Unused variables
```

---

### Database connection timeout
**Cause**: Database not accessible or firewall blocking.

**Fix**:
- Check database is running: `psql $DATABASE_URL -c "SELECT 1;"`
- Verify connection string is correct
- Check firewall rules (Neon: ensure IP is allowed)
- Try with SSL: Add `?sslmode=require` to `DATABASE_URL`

---

## Appendix: Manual Verification Queries

Use these SQL queries to manually verify application state during smoke tests.

### Verify User Registered
```sql
SELECT id, email, total_xp, current_level, current_streak, created_at
FROM users
WHERE email = 'test@example.com';
```

### Verify Contact Created
```sql
SELECT c.id, c.name, c.company, c.warmth_level, COUNT(pa.id) as playbook_actions
FROM contacts c
LEFT JOIN playbook_actions pa ON pa.contact_id = c.id
WHERE c.name = 'John Doe'
GROUP BY c.id;
```

### Verify Interaction Logged
```sql
SELECT i.type, i.direction, i.outcome, i.xp_awarded, i.os_awarded, i.created_at,
       c.name as contact_name
FROM interactions i
JOIN contacts c ON i.contact_id = c.id
ORDER BY i.created_at DESC
LIMIT 5;
```

### Verify XP Awarded
```sql
SELECT reason, xp_amount, os_amount, metadata, created_at
FROM xp_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Verify Badges Earned
```sql
SELECT type, name, description, earned_at
FROM badges
ORDER BY earned_at DESC;
```

### Verify Playbook Actions
```sql
SELECT pa.action_label, pa.status, pa.due_date, c.name as contact_name
FROM playbook_actions pa
JOIN contacts c ON pa.contact_id = c.id
WHERE pa.status = 'pending'
ORDER BY pa.action_order
LIMIT 10;
```

### Verify Daily Quests
```sql
SELECT quest_label, xp_reward, target_count, current_count, is_completed
FROM selected_quests
WHERE date = CURRENT_DATE;
```

---

## Smoke Test Log Template

Use this template to document smoke test results.

```markdown
# Smoke Test Results

**Date**: 2026-01-09
**Environment**: Production (Render)
**Tester**: [Your Name]
**URL**: https://job-quest.onrender.com
**Commit**: [Git commit SHA]

## Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Application Loads | ✅ Pass | Loaded in 3s |
| 2 | User Registration | ✅ Pass | test+1234@example.com |
| 3 | Session Persistence | ✅ Pass | Session persisted after refresh |
| 4 | Create Contact | ✅ Pass | John Doe created |
| 5 | Log Interaction | ✅ Pass | +5 XP awarded |
| 6 | Daily Quest Selection | ✅ Pass | 3 quests selected |
| 7 | Quest Progress Increment | ✅ Pass | Email quest: 0/3 → 1/3 |
| 8 | Playbook Next Action | ✅ Pass | Next action displayed |
| 9 | Badge Awarding | ✅ Pass | First Contact badge earned |
| 10 | Logout and Login | ✅ Pass | Logged out and back in successfully |

**Overall Result**: ✅ PASS (10/10)

**Issues Found**: None

**Next Steps**: Deploy to staging
```
