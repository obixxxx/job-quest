# Known Gaps and Issues

## Overview

This document catalogs broken, partial, or incomplete behaviors in the Job Quest codebase. Each gap includes reproduction steps, evidence (file references), and impact assessment.

**Status Key**:
- 🔴 **Critical**: Blocks core functionality or user workflows
- 🟡 **Major**: Degrades user experience significantly
- 🟢 **Minor**: Cosmetic or edge case issues

---

## 🔴 Critical Gaps

### 1. Session Store Uses Memory (Sessions Lost on Restart)

**Status**: ✅ Completed (2026-01-18)

**Problem**: Sessions were stored in Node.js process memory and were lost when the server restarted.

**Evidence**: `server/routes.ts:85-96`
```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET || "job-quest-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    // NO STORE SPECIFIED - defaults to MemoryStore
  })
);
```

**Reproduction**:
1. Log in to the app
2. Restart the server (`npm run start` or Render redeploy)
3. Refresh the browser
4. User is logged out

**Impact** (before fix):
- Users had to re-login after every server restart
- On Render free tier, server restarts happen frequently (inactivity timeout, deploys)
- Poor user experience for production deployment

**Fix Implemented**:
✅ Configured `connect-pg-simple` with PostgreSQL session store
- `server/routes.ts:86-105` - Uses PgSession with existing pool
- `shared/schema.ts:6-13` - Session table schema with expire index
- Sessions now persist across server restarts

---

### 2. No AI Integration (Message Drafting/Reply Parsing)

**Status**: 🔴 Critical (for plan completeness)

**Problem**: The plan specifies AI-powered message drafting (Claude/OpenAI) and reply parsing, but none of this is implemented.

**Planned Features (not implemented)**:
- **Message Drafting**: AI generates personalized outreach emails based on contact info + templates
- **Reply Parsing**: AI extracts outcomes from email replies (referral_obtained, intel_gathered, etc.)
- **Value Pack Generation**: AI suggests talking points based on contact research
- **Intel Gathering Prompts**: AI helps refine outreach strategy

**Evidence**:
- No API calls to Claude or OpenAI in codebase
- No environment variables for `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Templates exist (`server/routes.ts` and `templates` table) but are static text
- User must manually compose messages and log outcomes

**Plan References**:
- Phase 4, Tasks 19-24 (attached_assets/2026-01-03-job-search-gamification-app_1767546157484.md)

**Impact**:
- Users must write all emails manually (time-consuming, reduces velocity)
- No automated outcome detection (users forget to log results)
- Missing key differentiation feature (job search apps without AI are commodity)

**Fix Required**:
1. Add Anthropic SDK (`npm install @anthropic-ai/sdk`)
2. Create `server/ai.ts` with functions:
   - `draftMessage(contact, template, context)`
   - `parseReply(emailText)`
   - `generateValuePack(contactInfo)`
3. Add API routes:
   - `POST /api/ai/draft` - Generate message draft
   - `POST /api/ai/parse-reply` - Extract outcome from reply
4. Update UI with "AI Draft" button in interaction forms

**Files to create**:
- `server/ai.ts` - AI integration layer
- `client/src/components/ai/draft-message-modal.tsx` - UI for AI drafts

**Files to modify**:
- `server/routes.ts` - Add `/api/ai/*` routes
- `client/src/components/interactions/interaction-form.tsx` - Add AI draft button
- `.env.example` - Add `ANTHROPIC_API_KEY`

---

### 3. No Email Sending (Postmark/Gmail Integration)

**Status**: 🔴 Critical (for plan completeness)

**Problem**: The plan specifies email sending via Postmark (automated) or Gmail (manual fallback), but none of this is implemented.

**Current Behavior**:
- User logs an "email" interaction
- App stores `messageContent` in database
- **User must manually send the email outside the app** (Gmail, Outlook, etc.)
- No tracking of actual sends

**Planned Features (not implemented)**:
- **Postmark Integration**: Send emails via Postmark API with templates
- **Gmail Integration**: OAuth2 flow + Gmail API for manual sending
- **Send Tracking**: Track sent emails with delivery status
- **Email Templates**: Pre-fill subject + body from templates

**Evidence**:
- No Postmark or Gmail dependencies in `package.json`
- No email-related environment variables in `.env.example`
- `interactions` table has no `emailSent` or `emailStatus` fields

**Plan References**:
- Phase 5, Tasks 25-28 (attached_assets/2026-01-03-job-search-gamification-app_1767546157484.md)

**Impact**:
- Users must context-switch to email client (breaks flow, reduces velocity)
- No automation of outreach sequences
- Cannot verify if email was actually sent (only user's word)
- Playbook actions don't trigger email sends

**Fix Required**:
1. Add Postmark SDK (`npm install postmark`)
2. Create `server/email.ts` with functions:
   - `sendEmail(to, subject, body, fromAddress)`
   - `getEmailStatus(messageId)`
3. Add API routes:
   - `POST /api/email/send` - Send email via Postmark
   - `GET /api/email/status/:id` - Check delivery status
4. Update `interactions` table schema:
   - `emailSent` (boolean)
   - `emailStatus` (text) - "sent", "delivered", "bounced", "failed"
   - `emailMessageId` (text) - Postmark message ID
5. Update interaction form UI with "Send & Log" button

**Files to create**:
- `server/email.ts` - Email integration layer

**Files to modify**:
- `server/routes.ts` - Add `/api/email/*` routes
- `shared/schema.ts` - Add email fields to `interactions` table
- `client/src/components/interactions/interaction-form.tsx` - Add send button
- `.env.example` - Add `POSTMARK_API_KEY`

---

## 🟡 Major Gaps

### 4. No Opportunity Abundance Unlocks

**Status**: 🟡 Major

**Problem**: The plan specifies an "Opportunity Abundance" unlock system that gates access to cold outreach based on warm intro ratio. This is completely missing.

**Planned Feature (not implemented)**:
- User starts with 3 cold outreach "slots"
- Earning warm intros/referrals unlocks more slots
- Prevents spam, encourages relationship-building
- Visual "slots" UI on dashboard

**Evidence**:
- No `opportunitySlots` field in `users` table
- No slot tracking in `server/game-engine.ts`
- No UI for displaying available slots
- Cold outreach is unlimited (no enforcement)

**Plan Reference**:
- Phase 6, Task 34 (Opportunity Abundance visualization)

**Impact**:
- Users can spam cold outreach without building relationships
- Game mechanics don't guide behavior toward warm intros
- Missing key incentive alignment (OS currency feels pointless)

**Fix Required**:
1. Add to `users` table:
   - `coldOutreachSlots` (integer, default 3)
   - `warmIntrosEarned` (integer, default 0)
2. Update `server/game-engine.ts`:
   - `unlockSlot(userId)` - Called when warm intro logged
   - `checkSlotAvailability(userId)` - Returns available slots
3. Enforce in `POST /api/interactions`:
   - Reject cold outreach if no slots available
   - Decrement slot on cold outreach
   - Increment slot on warm intro outcome
4. Add UI component to display slots (dashboard)

**Files to modify**:
- `shared/schema.ts` - Add fields to `users` table
- `server/game-engine.ts` - Add slot logic
- `server/routes.ts` - Enforce in interaction logging
- `client/src/components/dashboard/opportunity-slots.tsx` (create)
- `client/src/pages/dashboard.tsx` - Display slots

---

### 5. No Analytics/Visualizations (Charts, Graphs, Progress)

**Status**: 🟡 Major

**Problem**: The plan specifies analytics and visualizations (Recharts), but very limited implementation exists.

**Planned Features (not implemented)**:
- **Campaign Performance**: Track email open rates, response rates by template
- **Opportunity Map**: Funnel visualization (prospect → engaged → interviewing → offer)
- **Weekly Progress Charts**: XP earned over time, streak history
- **Warmth Level Distribution**: Pie chart of cold/warm/hot contacts
- **Next Action Timeline**: Gantt chart of upcoming playbook actions

**Current Implementation**:
- Basic stats grid on dashboard (interview count, conversation count, etc.)
- No charts or graphs
- No trend analysis

**Evidence**:
- `recharts` is installed (`package.json:68`)
- No `<LineChart>`, `<BarChart>`, or `<PieChart>` components in codebase
- Dashboard shows only static numbers (`client/src/components/dashboard/stats-grid.tsx`)

**Impact**:
- Users cannot see progress over time (demotivating)
- No visibility into what's working (which templates get responses, which contacts engage)
- Cannot identify patterns (best outreach times, most responsive industries)

**Fix Required**:
1. Create API endpoints for analytics:
   - `GET /api/analytics/xp-history` - XP earned per day (last 30 days)
   - `GET /api/analytics/opportunity-funnel` - Count by status
   - `GET /api/analytics/warmth-distribution` - Count by warmth level
   - `GET /api/analytics/template-performance` - Response rate by template
2. Create chart components:
   - `client/src/components/analytics/xp-chart.tsx` (LineChart)
   - `client/src/components/analytics/funnel-chart.tsx` (BarChart)
   - `client/src/components/analytics/warmth-pie.tsx` (PieChart)
3. Add Analytics page (`client/src/pages/analytics.tsx`)

**Files to create**:
- `server/routes.ts` - Add `/api/analytics/*` routes
- `client/src/pages/analytics.tsx` - Analytics dashboard
- `client/src/components/analytics/*.tsx` - Chart components

**Files to modify**:
- `client/src/App.tsx` - Add route for `/analytics`
- `client/src/components/app-sidebar.tsx` - Add Analytics nav item

---

### 6. Missing Badges (Intel, Persistence, Mailer, Interview)

**Status**: 🟡 Major

**Problem**: The plan specifies 8+ badge types, but only 8 are implemented. Missing badges reduce gamification depth.

**Implemented Badges** (`server/game-engine.ts:91-128`):
- `first_contact` - First interaction logged
- `networker` - 100 total XP
- `conversationalist` - 500 total XP
- `streak_3`, `streak_7`, `streak_14` - Streak milestones
- `opportunity_scout` - 10 OS
- `interview_ace` - 50 OS

**Missing Badges** (from plan):
- `intel_gathered` - Log X interactions with "intel_gathered" outcome
- `persistence` - Complete a 4-follow-up sequence
- `network_effect` - Get 3 referrals from a single contact
- `mailer` - Send 50 emails
- `campaigner` - Complete a campaign (not implemented)
- `coffee_champion` - Have 10 coffee chats
- `call_master` - Make 20 calls

**Evidence**:
- `server/game-engine.ts:91-128` - Only 8 badge types checked
- No `badgeType` for persistence, intel_gathered, etc.

**Impact**:
- Fewer milestones to celebrate (reduces motivation)
- Missing incentives for specific behaviors (e.g., intel gathering)
- Achievements page feels sparse

**Fix Required**:
1. Add badge checks to `checkAndAwardBadges()`:
```typescript
// Intel Gathered
const intelCount = await storage.getInteractionCountByOutcome(userId, 'intel_gathered');
if (intelCount >= 10 && !hasBadge('intel_gathered')) {
  await awardBadge('intel_gathered', 'Intel Gatherer', 'Gathered intel 10 times');
}

// Persistence
const persistenceSequences = await storage.getCompletedFollowUpSequences(userId, 4);
if (persistenceSequences >= 1 && !hasBadge('persistence')) {
  await awardBadge('persistence', 'Persistent', 'Completed a 4-follow-up sequence');
}

// Mailer
const emailCount = await storage.getInteractionCountByType(userId, 'email');
if (emailCount >= 50 && !hasBadge('mailer')) {
  await awardBadge('mailer', 'Mailer', 'Sent 50 emails');
}
```

2. Add helper methods to `storage.ts`:
   - `getInteractionCountByOutcome(userId, outcome)`
   - `getInteractionCountByType(userId, type)`
   - `getCompletedFollowUpSequences(userId, minCount)`

**Files to modify**:
- `server/game-engine.ts` - Add badge checks
- `server/storage.ts` - Add helper queries

---

### 7. No Campaign Builder

**Status**: 🟡 Major

**Problem**: The plan specifies a campaign builder for bulk outreach sequences, but this is not implemented.

**Planned Feature (not implemented)**:
- Create campaign with target contact list
- Define outreach sequence (email 1 → wait 3 days → email 2 → etc.)
- Track campaign performance (open rate, response rate)
- Pause/resume campaigns

**Current Workaround**:
- Playbook system provides per-contact sequences
- No bulk operations

**Evidence**:
- No `campaigns` table in schema
- No `/api/campaigns` routes
- No campaign-related UI

**Impact**:
- Cannot run coordinated outreach to multiple contacts
- Must manually execute playbook for each contact
- No A/B testing of templates

**Fix Required**:
1. Add `campaigns` table:
   - `id`, `userId`, `name`, `status`, `createdAt`
2. Add `campaignMembers` table:
   - `id`, `campaignId`, `contactId`, `status`, `currentStep`
3. Add campaign execution logic (cron job or manual trigger)
4. Create UI for campaign builder

**Files to create**:
- `server/campaign-engine.ts` - Campaign execution logic
- `client/src/pages/campaigns.tsx` - Campaign management UI

**Files to modify**:
- `shared/schema.ts` - Add `campaigns` and `campaignMembers` tables
- `server/routes.ts` - Add `/api/campaigns/*` routes

---

## 🟢 Minor Gaps

### 8. No Micro-Task Timers

**Status**: 🟢 Minor

**Problem**: The plan specifies micro-task timers (5-15 minute focus blocks) to help ADHD users, but this is not implemented.

**Planned Feature (not implemented)**:
- Pomodoro-style timer for tasks (e.g., "Draft 3 emails in 15 minutes")
- Timer tied to quests
- Celebration when timer completes

**Evidence**:
- No timer component in UI
- No timer state management

**Impact**:
- Missing ADHD-friendly feature
- Users may struggle to maintain focus without structure

**Fix Required**:
1. Create timer component (`client/src/components/game/task-timer.tsx`)
2. Add timer to quest cards or dashboard
3. Use browser Notification API to alert when timer completes

**Files to create**:
- `client/src/components/game/task-timer.tsx`

---

### 9. No Level-Up Animations

**Status**: 🟢 Minor

**Problem**: XP bar exists, but no visual feedback when user levels up.

**Current Implementation**:
- XP bar shows progress to next level (`client/src/components/game/xp-bar.tsx`)
- `users.currentLevel` field exists
- No level-up celebration

**Evidence**:
- `client/src/components/game/xp-bar.tsx` - Progress bar only
- No confetti, modal, or animation on level change

**Impact**:
- Reduced celebration of milestones
- Users may not notice they leveled up

**Fix Required**:
1. Add level-up detection in `useEffect` on dashboard
2. Trigger confetti + modal when level increases
3. Display level-up rewards (if any)

**Files to modify**:
- `client/src/pages/dashboard.tsx` - Add level-up detection
- `client/src/components/game/confetti.tsx` - Trigger on level-up

---

### 10. No Follow-Up Auto-Detection

**Status**: 🟢 Minor

**Problem**: When logging an interaction, user must manually set `followUpDate`. App should suggest follow-up date based on type and outcome.

**Current Implementation**:
- User can set `followUpDate` in interaction form
- No auto-suggestions

**Suggested Logic**:
- Email with no response: suggest +3 days
- Call with no answer: suggest +1 day
- Coffee chat: suggest +7 days (for thank-you note)
- Response received: no follow-up needed

**Impact**:
- Minor UX friction
- Users may forget to set follow-ups

**Fix Required**:
1. Add logic to `client/src/components/interactions/interaction-form.tsx`
2. Pre-fill `followUpDate` field based on type + outcome
3. User can override if needed

**Files to modify**:
- `client/src/components/interactions/interaction-form.tsx` - Add auto-suggestion logic

---

### 11. No Contact Import (LinkedIn CSV)

**Status**: 🟢 Minor

**Problem**: The plan specifies LinkedIn CSV import, but this is not implemented.

**Current Implementation**:
- Manual contact entry only (one at a time)

**Impact**:
- Tedious to add existing network
- Users may abandon app if they have to manually enter 50+ contacts

**Fix Required**:
1. Add CSV upload UI (`client/src/pages/contacts.tsx`)
2. Add API route `POST /api/contacts/import`
3. Parse CSV, create contacts in bulk
4. Generate playbooks for all imported contacts

**Files to modify**:
- `server/routes.ts` - Add `/api/contacts/import` route
- `client/src/pages/contacts.tsx` - Add import button + file upload

---

### 12. No Search/Filter on Follow-Ups Page

**Status**: 🟢 Minor

**Problem**: Follow-ups page shows all follow-ups, but no way to search or filter.

**Current Implementation**:
- `client/src/pages/follow-ups.tsx` displays tabs: Overdue / Today / Upcoming
- No search bar
- No filters (by contact, by type, by outcome)

**Impact**:
- Hard to find specific follow-up in long list

**Fix Required**:
1. Add search input (`<Input>` component)
2. Filter contacts by name or company
3. Add dropdown to filter by interaction type

**Files to modify**:
- `client/src/pages/follow-ups.tsx` - Add search + filter UI

---

### 13. No Dark Mode Persistence

**Status**: 🟢 Minor

**Problem**: Dark mode toggle exists, but preference is not saved.

**Current Implementation**:
- `client/src/components/theme-toggle.tsx` - Toggle between light/dark
- Uses `next-themes` library with localStorage
- **Unverified**: May already persist (needs testing)

**Verification Needed**:
1. Toggle dark mode
2. Refresh page
3. Check if dark mode persists

**If not persisting**:
- `next-themes` should auto-save to localStorage
- Check `ThemeProvider` configuration in `client/src/main.tsx`

**Files to check**:
- `client/src/components/theme-provider.tsx`
- `client/src/main.tsx`

---

### 14. No Response Rate Calculation

**Status**: 🟢 Minor

**Problem**: Dashboard shows "Response Rate" stat, but unclear how it's calculated.

**Current Implementation**:
- `client/src/components/dashboard/stats-grid.tsx` displays response rate
- `GET /api/dashboard` returns `responseRate` field
- **Unverified**: Check if calculation is correct

**Expected Calculation**:
```
responseRate = (interactions with outcome="response_received") / (total outbound interactions) * 100
```

**Verification Needed**:
1. Check `server/routes.ts` - `/api/dashboard` route
2. Verify SQL query for response rate
3. Test with sample data

**Files to check**:
- `server/routes.ts` - Dashboard route logic
- `server/storage.ts` - `getResponseRate()` method (if exists)

---

### 15. No Opportunity Status Pipeline

**Status**: 🟢 Minor

**Problem**: Opportunities have a `status` field ("prospect", "engaged", "interviewing", "offer", etc.), but no UI to move opportunities through stages.

**Current Implementation**:
- `client/src/pages/opportunities.tsx` lists opportunities
- No drag-and-drop kanban board
- No status update UI

**Impact**:
- Cannot track opportunity progress
- `status` field is not useful without UI

**Fix Required**:
1. Add status dropdown to each opportunity card
2. Update status via `PATCH /api/opportunities/:id`
3. (Optional) Add kanban board with drag-and-drop

**Files to modify**:
- `client/src/pages/opportunities.tsx` - Add status update UI
- `server/routes.ts` - Add `PATCH /api/opportunities/:id` route (if not exists)

---

## Testing Gaps (Unverified Behaviors)

The following behaviors require manual testing to verify if they work correctly:

### 16. Streak Calculation Accuracy

**Concern**: Does streak reset correctly if user skips a day?

**Test Steps**:
1. Log interaction today (streak = 1)
2. Wait until tomorrow, log interaction (streak = 2)
3. Wait 2 days (skip day), log interaction
4. Expected: streak = 1 (reset)
5. Actual: Verify in database

**Files to check**:
- `server/game-engine.ts:47-76` - `updateStreak()` function

---

### 17. Playbook Action Auto-Completion

**Concern**: Does logging an interaction automatically mark playbook action as completed?

**Test Steps**:
1. Create new contact (playbook generated)
2. View next action: "Send initial outreach email"
3. Log email interaction to that contact
4. Expected: Playbook action marked `completed`, next action appears
5. Actual: Verify in UI

**Files to check**:
- `server/routes.ts:57-72` - `detectPlaybookActionType()` function
- `server/routes.ts` - `POST /api/interactions` route (check if playbook updated)

---

### 18. XP Log Metadata

**Concern**: Is `metadata` field in `xpLogs` populated correctly?

**Test Steps**:
1. Log interaction
2. Query `xpLogs` table: `SELECT * FROM xp_logs ORDER BY "createdAt" DESC LIMIT 5`
3. Expected: `metadata` contains `{ contactId, interactionId }`
4. Actual: Verify in database

**Files to check**:
- `server/game-engine.ts:78-89` - `awardXP()` function

---

### 19. Badge Deduplication

**Concern**: Are badges awarded multiple times?

**Test Steps**:
1. Earn `first_contact` badge
2. Log another interaction
3. Query `badges` table: `SELECT * FROM badges WHERE type = 'first_contact'`
4. Expected: Only 1 badge
5. Actual: Verify in database

**Files to check**:
- `server/game-engine.ts:91-128` - `checkAndAwardBadges()` function
- `server/storage.ts` - `checkBadgeExists()` method

---

### 20. Session Cookie Expiry

**Concern**: Do sessions expire after 7 days as configured?

**Test Steps**:
1. Log in
2. Wait 7 days
3. Try to access protected route
4. Expected: Session expired, redirected to login
5. Actual: Verify in browser

**Files to check**:
- `server/routes.ts:90-93` - Cookie maxAge: 7 days

---

## Summary of Gaps

### By Priority

| Priority | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 3 | Session store, AI integration, Email sending |
| 🟡 Major | 4 | Opportunity unlocks, Analytics, Missing badges, Campaign builder |
| 🟢 Minor | 8 | Timers, Level-up animations, Follow-up auto-detect, Contact import, etc. |
| ⚠️ Unverified | 5 | Streak accuracy, Playbook auto-complete, XP metadata, Badge dedup, Session expiry |

**Total**: 20 identified gaps + unverified behaviors

---

## Critical Path to Production-Ready

If prioritizing fixes for production deployment, address in this order:

1. **Session Store** (🔴) - Users being logged out is unacceptable
2. **Email Sending** (🔴) - Core feature for job search app
3. **AI Integration** (🔴) - Key differentiation, reduces user effort
4. **Opportunity Unlocks** (🟡) - Aligns incentives, prevents spam
5. **Missing Badges** (🟡) - Improves gamification depth
6. **Analytics** (🟡) - Users need progress visibility

**Everything else** can be deferred to post-launch iterations.

---

## Evidence Summary

**Files with Critical Gaps**:
- `server/routes.ts` - Session store, missing AI/email routes
- `server/game-engine.ts` - Missing badges, no slot logic
- `shared/schema.ts` - Missing campaign tables, no email fields

**Files with Minor Gaps**:
- `client/src/pages/follow-ups.tsx` - No search/filter
- `client/src/pages/opportunities.tsx` - No status update UI
- `client/src/components/interactions/interaction-form.tsx` - No auto-suggestions

---

## Notes

- All gaps are documented with file paths for easy reference
- Reproduction steps assume local development environment
- Some gaps are design choices (e.g., Drizzle vs Prisma) and are not bugs
- Testing gaps require manual verification (cannot be determined from code alone)
