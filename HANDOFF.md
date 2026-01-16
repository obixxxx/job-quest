# Job Quest - Developer Handoff Documentation

## Executive Summary

**Job Quest** is a gamified job search application that incentivizes networking and outreach through a dual-currency system (XP for momentum, OS for relationship quality). This handoff pack provides comprehensive documentation for a new developer taking over the codebase.

**Current Status**: ✅ Deployed and operational on Render
**Completion**: ~65% of planned features implemented
**Production URL**: [Configure in Render]
**Tech Stack**: React 18 + Express.js + PostgreSQL + Drizzle ORM

---

## Quick Start

### Running Locally (First Time)

```bash
# 1. Clone and install
git clone <repo-url>
cd job-quest
npm install

# 2. Set up database
# Create .env file with DATABASE_URL and SESSION_SECRET
cp .env.example .env
# Edit .env and add your PostgreSQL connection string

# 3. Push database schema
npm run db:push

# 4. Start dev server
npm run dev

# 5. Open browser
open http://localhost:5000
```

**Expected result**: Login page loads, you can register a test account.

**Troubleshooting**: See `docs/ENVIRONMENT.md` for detailed setup instructions.

---

## How Deployment Works on Render

### Current Setup

**Platform**: Render (render.com)
**Service Type**: Web Service
**Runtime**: Node.js
**Build Command**: `npm install && npm run build`
**Start Command**: `npm run start`

### Deployment Flow

1. **Push to GitHub** → Render auto-detects changes
2. **Build runs**:
   - `npm install` (installs dependencies)
   - `npm run build` (runs `script/build.ts`)
     - Vite builds frontend → `dist/public/`
     - esbuild bundles server → `dist/index.cjs`
3. **Start server**: `npm run start` → Runs `node dist/index.cjs`
4. **Health check**: Render verifies server responds on PORT
5. **Live**: New version deployed

**Auto-deploy**: Enabled (deploys on every push to main branch)

**Manual deploy**: Render Dashboard → "Manual Deploy" → "Deploy latest commit"

---

## How to Run `db:push`

### What is `db:push`?

`npm run db:push` applies the database schema from `shared/schema.ts` to your PostgreSQL database. It creates tables, indexes, and constraints.

**When to run**:
- After pulling schema changes from git
- When setting up a new database (local or production)
- When adding/modifying tables in `shared/schema.ts`

### Local

```bash
# Set DATABASE_URL in .env first
npm run db:push
```

**Expected output**:
```
✓ Pushing schema changes to database
✓ Done!
```

### Render (Production)

**Option 1: Via Render Shell (Recommended)**
1. Go to Render Dashboard
2. Select your "job-quest" service
3. Click "Shell" tab
4. Wait for shell to connect
5. Run: `npm run db:push`
6. Verify tables created: `psql $DATABASE_URL -c "\dt"`

**Option 2: Run locally against production database**
```bash
# Export production DATABASE_URL
export DATABASE_URL="postgresql://[production-url]"

# Run push
npm run db:push
```

**⚠️ Warning**: Do not add `db:push` to Render's `buildCommand`. It will run on every deploy and may cause race conditions or data loss.

---

## Where Auth/Session is Configured

### Session Configuration

**File**: `server/routes.ts:85-96`

**Session Middleware**:
```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET || "job-quest-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,       // false = works with HTTP (Render uses HTTP internally)
      httpOnly: true,      // prevents JavaScript access (XSS protection)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);
```

**Session Store**: MemoryStore (default)
**⚠️ Known Issue**: Sessions are lost on server restart. See `docs/KNOWN-GAPS.md` #1 for fix.

---

### Authentication Logic

**File**: `server/auth.ts`

**Password Hashing**:
- Algorithm: scrypt (Node.js crypto module)
- Salt: 16 random bytes
- Format: `salt:hash` (hex-encoded)

**Key Functions**:
1. `hashPassword(password: string): Promise<string>`
   - Called during registration
   - Returns salted hash

2. `comparePasswords(supplied: string, stored: string): Promise<boolean>`
   - Called during login
   - Timing-safe comparison

3. `authMiddleware(req, res, next)`
   - Applied to all protected routes
   - Checks `req.session.userId` exists
   - Returns 401 if not authenticated

**Auth Routes** (`server/routes.ts:98-160`):
- `POST /api/auth/register` - Create account + hash password + start session
- `POST /api/auth/login` - Verify credentials + start session
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/me` - Get current user (requires session)

---

### Client-Side Auth

**File**: `client/src/lib/auth.tsx`

**AuthContext**:
- Provides `user`, `loading`, `login()`, `register()`, `logout()`, `refreshUser()`
- Uses `credentials: "include"` to send session cookies with every request
- Stores user data in React state (not localStorage)

**Protected Routes** (`client/src/App.tsx`):
```typescript
if (!user) {
  return <Route path="/" component={AuthPage} />;
}

return (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      {/* Protected routes */}
    </SidebarInset>
  </SidebarProvider>
);
```

---

## What NOT to Touch

### 🚨 Critical - Do Not Modify Without Understanding Impact

1. **Session Secret (`SESSION_SECRET`)**
   - **File**: `server/routes.ts:87`
   - **Why**: Changing this invalidates all active sessions (logs out all users)
   - **If you must change it**: Announce downtime, coordinate with users

2. **Database Schema (`shared/schema.ts`)**
   - **Why**: Modifying tables can cause data loss or break production
   - **Safe changes**: Add new columns (with defaults), add new tables
   - **Unsafe changes**: Rename columns, delete columns, change types
   - **Always**: Test schema changes locally first, then run `db:push` in production

3. **XP/OS Reward Formulas (`server/game-engine.ts`)**
   - **Why**: Changing rewards affects game balance and user expectations
   - **Impact**: Users may feel cheated if XP values decrease
   - **If you must change**: Consider grandfathering existing users or scaling retroactively

4. **Playbook Template (`server/routes.ts:17-25`)**
   - **Why**: Changing this only affects NEW contacts, not existing playbooks
   - **Impact**: Inconsistent user experience (old contacts have old playbook, new contacts have new playbook)
   - **Alternative**: Make templates user-editable instead of hardcoded

5. **Build Configuration (`script/build.ts`, `vite.config.ts`)**
   - **Why**: Breaking the build breaks deployment
   - **If you must change**: Test `npm run build` locally first, verify `dist/` output

6. **Database Connection Pool (`server/db.ts`)**
   - **Why**: Incorrect pool settings can exhaust database connections
   - **Current**: Uses pg defaults (max 10 connections)
   - **If you must change**: Research Render/Neon connection limits first

---

### ⚠️ Modify with Caution

1. **API Routes (`server/routes.ts`)**
   - **Safe**: Add new routes, add optional request parameters
   - **Unsafe**: Rename routes (breaks frontend), change response structure (breaks frontend)
   - **Best Practice**: Version API routes (e.g., `/api/v1/contacts`)

2. **Database Queries (`server/storage.ts`)**
   - **Safe**: Optimize queries, add indexes
   - **Unsafe**: Change return types without updating callers
   - **Best Practice**: Add tests before refactoring

3. **Frontend Components (`client/src/components/`)**
   - **Safe**: Style changes, new components, add props
   - **Unsafe**: Remove props without updating all usages, change component behavior
   - **Best Practice**: Use TypeScript to catch breaking changes

---

### ✅ Safe to Modify

1. **UI Styling** (`client/src/components/ui/`, Tailwind classes)
2. **Environment Variables** (add new ones, document in `.env.example`)
3. **Templates** (`templates` table, seed script)
4. **Badge Logic** (`server/game-engine.ts` - add new badges)
5. **Documentation** (`docs/`, `HANDOFF.md`, `README.md`)

---

## Documentation Index

This handoff pack includes the following documents:

### `/docs/ENVIRONMENT.md`
**Purpose**: Complete guide to environment variables, local setup, and Render deployment.

**Key Sections**:
- Required env vars (`DATABASE_URL`, `SESSION_SECRET`)
- Local development setup (PostgreSQL options)
- Render deployment steps
- Troubleshooting database connection issues

**When to use**: Setting up new environment, debugging deployment issues.

---

### `/docs/ARCHITECTURE.md`
**Purpose**: Deep dive into tech stack, folder structure, and key modules.

**Key Sections**:
- Tech stack breakdown (React, Express, Drizzle ORM)
- Folder structure with file counts
- Module-by-module documentation (server + client)
- Data model (11 tables)
- API endpoint reference (29 routes)
- Game mechanics (XP/OS, streaks, badges)

**When to use**: Onboarding, understanding codebase structure, adding new features.

---

### `/docs/FEATURE-PARITY.md`
**Purpose**: Audit of implemented vs. planned features.

**Key Sections**:
- Executive summary (65% completion)
- Phase-by-phase breakdown (8 phases)
- Task status (Done/Partial/Not Implemented) with file references
- Critical gaps (AI, email, analytics)

**When to use**: Prioritizing next features, understanding what's missing.

---

### `/docs/KNOWN-GAPS.md`
**Purpose**: Catalog of broken, partial, or incomplete behaviors.

**Key Sections**:
- 3 critical gaps (session store, AI, email)
- 4 major gaps (opportunity unlocks, analytics, badges, campaigns)
- 8 minor gaps (timers, animations, auto-detect, etc.)
- 5 unverified behaviors (need testing)
- Reproduction steps for each gap

**When to use**: Bug triage, understanding limitations, prioritizing fixes.

---

### `/docs/SMOKE-TEST.md`
**Purpose**: Step-by-step verification checklists for production and local.

**Key Sections**:
- 10-step production smoke test (15 minutes)
- 10-step local smoke test (10 minutes)
- Common troubleshooting
- Database verification queries
- Test log template

**When to use**: After deployment, after local setup, verifying fixes.

---

## Common Tasks

### Adding a New API Route

1. **Define route** in `server/routes.ts`:
   ```typescript
   app.get("/api/new-endpoint", authMiddleware, async (req, res) => {
     const { userId } = req.session;
     const data = await storage.someMethod(userId);
     res.json({ data });
   });
   ```

2. **Add storage method** in `server/storage.ts`:
   ```typescript
   async someMethod(userId: string) {
     return await db.select().from(someTable).where(eq(someTable.userId, userId));
   }
   ```

3. **Call from frontend** in React component:
   ```typescript
   const { data } = useQuery({
     queryKey: ['/api/new-endpoint'],
     queryFn: () => apiRequest('/api/new-endpoint'),
   });
   ```

4. **Test**:
   - Verify route returns expected data
   - Test auth middleware (try without session)
   - Update smoke tests if critical feature

---

### Adding a New Database Table

1. **Define schema** in `shared/schema.ts`:
   ```typescript
   export const newTable = pgTable("new_table", {
     id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
     userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
     // ... other fields
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });

   export const newTableRelations = relations(newTable, ({ one }) => ({
     user: one(users, { fields: [newTable.userId], references: [users.id] }),
   }));
   ```

2. **Add to exports** (bottom of `shared/schema.ts`):
   ```typescript
   export const insertNewTableSchema = createInsertSchema(newTable);
   ```

3. **Push schema**:
   ```bash
   npm run db:push
   ```

4. **Add storage methods** in `server/storage.ts`:
   ```typescript
   async createNewTableEntry(data) {
     const [entry] = await db.insert(newTable).values(data).returning();
     return entry;
   }
   ```

5. **Add API routes** in `server/routes.ts`

6. **Update relations** in `shared/schema.ts` (add to `usersRelations` if needed)

---

### Modifying Game Mechanics (XP/Badges)

1. **Edit rewards** in `server/game-engine.ts`:
   ```typescript
   // Example: Increase email XP from 5 to 10
   const baseXP = type === "email" ? 10 : /* ... */;
   ```

2. **Add new badge** in `server/game-engine.ts`:
   ```typescript
   export async function checkAndAwardBadges(userId: string) {
     // ... existing checks ...

     // New badge
     const coffeeCount = await storage.getInteractionCountByType(userId, 'coffee');
     if (coffeeCount >= 10 && !await storage.checkBadgeExists(userId, 'coffee_champion')) {
       await storage.awardBadge(userId, 'coffee_champion', 'Coffee Champion', 'Had 10 coffee chats');
     }
   }
   ```

3. **Add helper query** in `server/storage.ts` (if needed):
   ```typescript
   async getInteractionCountByType(userId: string, type: string) {
     const result = await db.select({ count: sql<number>`count(*)` })
       .from(interactions)
       .where(and(eq(interactions.userId, userId), eq(interactions.type, type)));
     return result[0]?.count || 0;
   }
   ```

4. **Test**:
   - Log interactions to trigger badge
   - Verify XP amounts are correct
   - Check `xp_logs` and `badges` tables

**⚠️ Warning**: Changing XP formulas affects all future interactions. Existing XP logs are not recalculated.

---

### Deploying Changes to Render

**Standard Deployment** (automatic):
1. Commit changes to git
2. Push to main branch: `git push origin main`
3. Render auto-detects push and starts build
4. Monitor build logs in Render dashboard
5. Verify deployment succeeded (check logs for "serving on port")
6. Run production smoke test (see `docs/SMOKE-TEST.md`)

**Manual Deployment** (if auto-deploy disabled):
1. Go to Render dashboard
2. Select "job-quest" service
3. Click "Manual Deploy"
4. Select branch (usually `main`)
5. Click "Deploy"

**Rolling Back**:
1. Render dashboard → "Events" tab
2. Find previous successful deploy
3. Click "Rollback to this version"

---

## Helpful Commands

### Development

```bash
# Start dev server with HMR
npm run dev

# Type check (no build)
npm run check

# Build production bundle
npm run build

# Start production server locally
npm run start

# Push database schema
npm run db:push
```

---

### Database

```bash
# Connect to database
psql $DATABASE_URL

# List tables
psql $DATABASE_URL -c "\dt"

# Query users
psql $DATABASE_URL -c "SELECT id, email, total_xp, current_level FROM users;"

# Query recent interactions
psql $DATABASE_URL -c "SELECT * FROM interactions ORDER BY created_at DESC LIMIT 10;"

# Backup database (Render)
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

### Debugging

```bash
# Check server logs (local)
# Just watch terminal where `npm run dev` is running

# Check server logs (Render)
# Go to Render Dashboard → Logs tab

# Tail production logs (Render)
# Logs tab → Enable "Auto-scroll"

# Check build output
npm run build
# Inspect dist/ folder

# Test production build locally
npm run build && npm run start
```

---

## Understanding the Codebase

### Key Patterns

**Data Flow** (typical user action):
1. User clicks button in React component
2. Component calls `apiRequest('/api/endpoint')`
3. Request hits Express route in `server/routes.ts`
4. Route calls `storage.someMethod()` to query database
5. Storage method uses Drizzle ORM to query PostgreSQL
6. Result returned to route → route sends JSON response
7. React Query updates cache → component re-renders

**Game Mechanics Flow** (logging interaction):
1. User logs interaction → `POST /api/interactions`
2. Route calls `calculateInteractionRewards(type, outcome, followUpCount)`
3. Game engine returns `{ xp, os }`
4. Route calls `awardXP(userId, xp, os, reason)`
5. `awardXP` updates `users.totalXP` and `users.totalOS`
6. `awardXP` logs to `xp_logs` table
7. `awardXP` calls `checkAndAwardBadges(userId)`
8. Badge logic checks milestones and awards badges
9. Response sent to frontend with awarded XP/OS
10. XP popup appears in UI

**Playbook Flow** (contact creation):
1. User creates contact → `POST /api/contacts`
2. Route calls `storage.createContact(data)`
3. Contact inserted into database
4. Route calls `generatePlaybookForContact(userId, contactId)`
5. Function loops through `PLAYBOOK_TEMPLATE` (7 actions)
6. For each action:
   - Look up template by name
   - Calculate due date (today + X days)
   - Insert into `playbook_actions` table
7. Contact detail page shows playbook actions

---

### Finding Things

**Where is authentication handled?**
- Server: `server/auth.ts`, `server/routes.ts:85-160`
- Client: `client/src/lib/auth.tsx`

**Where are XP rewards calculated?**
- `server/game-engine.ts:9-45` (`calculateInteractionRewards`)

**Where is the database schema defined?**
- `shared/schema.ts` (12 tables)

**Where are API routes defined?**
- `server/routes.ts` (all 29 routes in one file)

**Where is the dashboard UI?**
- `client/src/pages/dashboard.tsx`
- Components: `client/src/components/dashboard/`

**Where are UI components?**
- Primitives: `client/src/components/ui/` (43 shadcn components)
- Custom: `client/src/components/game/`, `client/src/components/contacts/`, etc.

**Where is the build script?**
- `script/build.ts` (Vite + esbuild)

**Where are environment variables documented?**
- `.env.example` (template)
- `docs/ENVIRONMENT.md` (full documentation)

**Where is the database connection configured?**
- `server/db.ts` (PostgreSQL pool + Drizzle ORM)

---

## Recent Features

### Flexible Playbook System (✅ Implemented - Jan 2026)

**What**: Made playbooks optional for contacts, enabling both structured cold outreach and freestyle relationship tracking.

**Key Changes**:
- **Database**: Added `usePlaybook` boolean field to contacts table (defaults to true)
- **UI**: Added "Use playbook?" checkbox to contact creation form
- **Backend**: Conditionally generates 7-step playbook only when `usePlaybook = true`
- **Interaction Logging**: Fixed standalone "Log" button on contacts page to work without playbook

**Why This Matters**:
- Users can now track existing friends/family without forcing them through cold outreach playbook
- Supports warm networking (former colleagues, mutual connections) vs. cold outreach
- Users can log freestyle interactions from contacts list without going through playbook flow

**Implementation Details**:
- **Files Modified**:
  - `shared/schema.ts` (added usePlaybook field)
  - `client/src/components/contacts/contact-form.tsx` (checkbox UI)
  - `server/routes.ts` (conditional playbook generation)
  - `client/src/pages/contacts.tsx` (fixed Log button)
  - `client/src/components/interactions/interaction-form-modal.tsx` (new modal component)
  - `client/src/components/interactions/interaction-form.tsx` (self-contained form)

**Source Options Expanded**:
- Added: "Existing Friend/Family", "Former Colleague", "Mutual Connection", "Cold Outreach"
- Updated both contact form and outcome form for consistency
- Ordered from warmest to coldest relationships

**Introduction Tracking**:
- When recording "Introduction Made" outcome, users can link to the introduced contact
- Shows "→ Introduced to [Name]" on contact detail page
- Creates clickable introduction chains to visualize referral networks
- Backend uses leftJoin to fetch introduced contact details

**Status**: ✅ Completed (Tasks 1-6 of implementation plan)
**Remaining**: Manual testing checklist, documentation updates, end-to-end testing

**Plan Document**: `docs/plans/2026-01-11-flexible-playbook-and-interaction-logging.md`

---

### Outcomes Tracking (✅ Implemented)

**What**: Track major relationship milestones (interviews, job offers, client projects, introductions, referrals, dead ends) with revenue tracking and analytics.

**Key Components**:
- **Database**: `outcomes` table with revenue fields and auto-calculated metrics
- **Frontend**: `/outcomes` page with timeline and revenue analytics
- **UI**: Outcome badges on contact cards, "Record Outcome" button on contact detail
- **API**: `GET/POST /api/outcomes`, `GET /api/outcomes/analytics`

**How It Works**:
1. User records outcome from contact detail page
2. System auto-calculates interaction count and duration since first contact
3. Outcomes appear on contact card and `/outcomes` timeline
4. Analytics show total revenue, revenue by source, revenue by type

**Files**:
- Schema: `shared/schema.ts` (outcomes table, lines 273-305)
- Backend: `server/storage.ts` (createOutcome, getAllOutcomes, getOutcomesAnalytics)
- Routes: `server/routes.ts` (outcomes routes, lines 870-923)
- Frontend: `client/src/pages/outcomes.tsx`, `client/src/components/outcomes/`

**Features**:
- ✅ Revenue tracking (salary, one-time, recurring)
- ✅ Source attribution (how you met the contact)
- ✅ Auto-calculated ROI metrics (interactions → outcome)
- ✅ Timeline view with revenue badges
- ✅ Contact linking for introductions
- ✅ Scheduled interactions (status field: completed/scheduled/cancelled)
- ⏸️ AI integration (pending - will enhance with outcomes data when AI is implemented)

---

## Next Steps

### 🎯 WHERE WE LEFT OFF (January 16, 2026)

**Last Session Summary**:
We just completed implementing the **Flexible Playbook & Interaction Logging** feature (Tasks 1-6 of 9 from the plan). This major feature makes playbooks optional and enables freestyle relationship tracking.

**What Was Completed**:
- ✅ Task 1: Added `usePlaybook` boolean field to contacts schema
- ✅ Task 2: Added "Use playbook?" checkbox to contact creation form
- ✅ Task 3: Made playbook generation conditional based on usePlaybook field
- ✅ Task 4: Fixed "Log" button on contacts page to work without playbook (created InteractionFormModal)
- ✅ Task 5: Expanded source options (Existing Friend/Family, Former Colleague, Mutual Connection, etc.)
- ✅ Task 6: Added introduction tracking (link contacts when recording "Introduction Made" outcomes)

**What's Committed But NOT Pushed**:
- 16 commits on branch `feature/your-work` (ahead of origin/main)
- All code changes are committed and ready to push
- Documentation updated in HANDOFF.md and BACKLOG.md

**What Still Needs to Be Done**:
1. ⏳ **Task 7**: Manual testing checklist (see plan lines 751-787)
   - Test playbook toggle (create contacts with/without playbook)
   - Test freestyle interaction logging (Log button on contacts page)
   - Test new source options (Existing Friend/Family, etc.)
   - Test introduction tracking (link contacts in outcomes)

2. ⏳ **Task 8**: Update documentation (see plan lines 790-848)
   - Mark backlog items as completed
   - Update ARCHITECTURE.md with new fields/components

3. ⏳ **Task 9**: End-to-end user flow testing (see plan lines 852-906)
   - Test cold contact with playbook flow
   - Test warm contact without playbook flow
   - Test introduction chain creation
   - Test existing friend tracking

**Next Developer Actions**:
1. **Push changes to GitHub**: `git push origin feature/your-work` (or merge to main)
2. **Run database migration on production**: `npm run db:push` (via Render shell)
3. **Complete manual testing** (Tasks 7-9 from plan)
4. **Consider next feature**: AI Assistant (has existing plan) or fix critical gaps (session store, email sending)

**Key Files to Review Before Testing**:
- Implementation Plan: `docs/plans/2026-01-11-flexible-playbook-and-interaction-logging.md`
- Backlog: `BACKLOG.md` (tracks bugs/features)
- Contact Form: `client/src/components/contacts/contact-form.tsx` (has checkbox)
- Contacts Page: `client/src/pages/contacts.tsx` (has Log button)
- Outcome Form: `client/src/components/outcomes/outcome-form-modal.tsx` (has contact picker)

---

### Immediate Priorities (Critical Gaps)

Based on `docs/KNOWN-GAPS.md`, these are the most important issues to address:

1. **Fix Session Store** (🔴 Critical)
   - Users are logged out on server restart
   - Switch from MemoryStore to `connect-pg-simple`
   - Estimated effort: 2 hours
   - See: `docs/KNOWN-GAPS.md` #1

2. **Add Email Sending** (🔴 Critical for plan completeness)
   - Integrate Postmark API
   - Add "Send & Log" button to interaction form
   - Track email delivery status
   - Estimated effort: 1-2 days
   - See: `docs/KNOWN-GAPS.md` #3

3. **Add AI Integration** (🔴 Critical for plan completeness)
   - Integrate Anthropic Claude API
   - Add message drafting UI
   - Add reply parsing (auto-detect outcomes)
   - Estimated effort: 3-5 days
   - See: `docs/KNOWN-GAPS.md` #2

---

### Medium-Term Enhancements (Major Gaps)

4. **Implement Opportunity Unlocks** (🟡 Major)
   - Add cold outreach slot system
   - Enforce slot limits on interactions
   - Display available slots on dashboard
   - Estimated effort: 1 day
   - See: `docs/KNOWN-GAPS.md` #4

5. **Add Analytics/Charts** (🟡 Major)
   - XP history chart (Recharts)
   - Opportunity funnel visualization
   - Template performance metrics
   - Estimated effort: 2-3 days
   - See: `docs/KNOWN-GAPS.md` #5

6. **Complete Badge System** (🟡 Major)
   - Add missing badges (intel, persistence, mailer, etc.)
   - Add helper queries to `storage.ts`
   - Test badge awarding logic
   - Estimated effort: 1 day
   - See: `docs/KNOWN-GAPS.md` #6

---

### Long-Term Features (From Plan)

7. **Campaign Builder** (🟡 Major)
   - Bulk outreach sequences
   - A/B testing templates
   - Campaign performance tracking
   - Estimated effort: 1 week
   - See: `docs/FEATURE-PARITY.md` Phase 6

8. **Gmail Integration** (🟡 Major)
   - OAuth2 flow
   - Gmail API integration
   - Manual send fallback
   - Estimated effort: 3-5 days
   - See: `docs/FEATURE-PARITY.md` Phase 5

---

## Getting Help

### Troubleshooting Resources

1. **This handoff pack** (`docs/` folder)
2. **Code comments** (inline documentation in key files)
3. **Render logs** (for production issues)
4. **Database queries** (use `psql` to inspect state)

### Useful External Resources

- **Drizzle ORM Docs**: https://orm.drizzle.team/
- **React Query Docs**: https://tanstack.com/query/latest
- **Express.js Docs**: https://expressjs.com/
- **Render Docs**: https://render.com/docs
- **shadcn/ui Docs**: https://ui.shadcn.com/

---

## Final Notes

### Strengths of This Codebase

- **Clean separation**: Frontend and backend are well-organized
- **Type safety**: TypeScript throughout
- **Modern stack**: React 18, Drizzle ORM, Vite
- **Playbook system**: Well-designed contact engagement flow (bonus feature not in plan)
- **UI quality**: Professional UI with shadcn/ui components

### Areas for Improvement

- **Session persistence**: Needs PostgreSQL session store
- **AI features**: Missing core differentiator (message drafting)
- **Email integration**: Manual process, should be automated
- **Testing**: No automated tests (see: Phase 8 in plan)
- **Analytics**: Limited visibility into progress/trends

### What Makes This Project Unique

**Dual-currency system** (XP + OS):
- XP rewards momentum (quantity of outreach)
- OS rewards outcomes (quality of relationships)
- Balances ADHD-friendly instant feedback with real job search results

**Playbook automation**:
- Auto-generates 7-step outreach sequence for every contact
- Reduces decision fatigue (tells user exactly what to do next)
- Ties templates to actions (reduces context switching)

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ JOB QUEST - DEVELOPER QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────┤
│ LOCAL DEV                                               │
│  npm run dev      → Start dev server (port 5000)       │
│  npm run check    → Type check                          │
│  npm run db:push  → Apply schema changes                │
│  npm run build    → Build production bundle             │
│                                                          │
│ DEPLOYMENT                                              │
│  git push origin main → Auto-deploy to Render          │
│  Render Dashboard → Manual Deploy (if needed)          │
│  Render Shell → npm run db:push (for schema)           │
│                                                          │
│ KEY FILES                                               │
│  server/routes.ts     → All API routes (33 endpoints)  │
│  server/game-engine.ts → XP/OS/badge logic             │
│  server/storage.ts    → Database queries               │
│  shared/schema.ts     → Database schema (12 tables)    │
│  client/src/App.tsx   → Frontend router                │
│                                                          │
│ DATABASE                                                │
│  psql $DATABASE_URL -c "\dt" → List tables             │
│  psql $DATABASE_URL -c "SELECT * FROM users;"          │
│                                                          │
│ DOCS                                                    │
│  docs/ENVIRONMENT.md     → Setup & deployment          │
│  docs/ARCHITECTURE.md    → Tech stack & structure      │
│  docs/FEATURE-PARITY.md  → What's implemented          │
│  docs/KNOWN-GAPS.md      → Issues & limitations        │
│  docs/SMOKE-TEST.md      → Testing checklist           │
│                                                          │
│ CRITICAL GAPS                                           │
│  🔴 Session store (use connect-pg-simple)              │
│  🔴 AI integration (Claude API for drafting)           │
│  🔴 Email sending (Postmark API)                       │
└─────────────────────────────────────────────────────────┘
```

---

**Welcome to the team! This handoff pack should give you everything you need to hit the ground running. If you find gaps in the documentation, please update this file and the `/docs` folder. Good luck! 🚀**
