# Architecture Documentation

## Overview

Job Quest is a full-stack monorepo application that gamifies the job search process. It combines React SPA frontend with Express.js backend, PostgreSQL database, and game mechanics (XP/OS dual-currency system) to incentivize networking and outreach.

**Architecture Pattern**: Server-rendered SPA with client-side routing and session-based authentication.

---

## Tech Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.6.3
- **Build Tool**: Vite 7.3.0
- **Router**: Wouter 3.3.5 (lightweight client-side router)
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: React Query (TanStack) 5.60.5
- **Form Handling**: React Hook Form 7.55.0 with Zod 3.24.2 validation
- **Styling**: Tailwind CSS 3.4.17 with CSS variables
- **Animations**: Framer Motion 11.13.1

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.21.2
- **Language**: TypeScript 5.6.3
- **ORM**: Drizzle ORM 0.39.3
- **Database**: PostgreSQL 16 (via node-postgres 8.16.3)
- **Session**: express-session 1.18.1 with MemoryStore
- **Auth**: Passport.js 0.7.0 with passport-local 1.0.0
- **Password Hashing**: Node.js crypto (scrypt)

### Database
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM 0.39.3
- **Migration Tool**: drizzle-kit 0.31.8
- **Schema**: `/shared/schema.ts` (14,953 bytes, 11 tables)

### Build & Deployment
- **Server Bundler**: esbuild 0.25.0
- **Production Format**: CommonJS (`dist/index.cjs`)
- **Static Assets**: Vite build to `dist/public`
- **Platforms**: Render (primary), Replit (alternative)

---

## Folder Structure

```
job-quest/
├── client/                    # Frontend React application
│   └── src/
│       ├── components/        # UI components
│       │   ├── ui/           # shadcn/ui primitives (43 components)
│       │   ├── contacts/     # Contact-specific components
│       │   ├── dashboard/    # Dashboard widgets
│       │   ├── game/         # Game mechanic UI (XP bar, streak, badges)
│       │   ├── interactions/ # Interaction logging
│       │   ├── outcomes/     # Outcome tracking components
│       │   └── playbook/     # Playbook action UI
│       ├── hooks/            # React hooks (use-mobile, use-toast)
│       ├── lib/              # Client utilities
│       │   ├── auth.tsx      # AuthContext provider
│       │   ├── queryClient.ts # React Query config
│       │   └── utils.ts      # Helper functions
│       ├── pages/            # Route pages (10 pages)
│       │   ├── auth.tsx      # Login/registration
│       │   ├── dashboard.tsx # Main dashboard
│       │   ├── contacts.tsx  # Contact list
│       │   ├── contact-detail.tsx # Contact profile
│       │   ├── follow-ups.tsx # Follow-up management
│       │   ├── opportunities.tsx # Job opportunities
│       │   ├── outcomes.tsx  # Outcomes tracking & analytics
│       │   ├── achievements.tsx # Badges
│       │   ├── templates.tsx # Email templates
│       │   └── not-found.tsx # 404 page
│       ├── App.tsx           # Root router component
│       └── main.tsx          # React DOM entry point
│
├── server/                    # Backend Express application
│   ├── index.ts              # Express app initialization
│   ├── routes.ts             # All API route handlers (790 lines)
│   ├── db.ts                 # PostgreSQL connection pool
│   ├── auth.ts               # Password hashing + session middleware
│   ├── storage.ts            # DatabaseStorage class (data access layer)
│   ├── game-engine.ts        # XP/OS calculation, badges, streaks
│   ├── vite.ts               # Vite dev server middleware
│   └── static.ts             # Production static file serving
│
├── shared/                    # Shared types and schemas
│   └── schema.ts             # Drizzle schema + Zod validators
│
├── script/                    # Build scripts
│   ├── build.ts              # Production build (client + server)
│   └── seed-templates.ts     # Template seeding script
│
├── migrations/                # Database migrations (drizzle-kit output)
│
├── attached_assets/           # Plan documents
│   └── 2026-01-03-job-search-gamification-app_1767546157484.md
│
├── dist/                      # Production build output (gitignored)
│   ├── index.cjs             # Server bundle
│   └── public/               # Client static assets
│
├── docs/                      # Documentation (this folder)
│
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── drizzle.config.ts         # Drizzle ORM configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── components.json           # shadcn/ui configuration
├── render.yaml               # Render deployment config
├── .replit                   # Replit deployment config
├── .env.example              # Environment variable template
└── README.md                 # (Missing - not present in repo)
```

---

## Key Modules

### Server Modules

#### `server/index.ts`
**Purpose**: Express application initialization and server bootstrap.

**Responsibilities**:
- Initialize Express app
- Apply middleware (cors, json parsing)
- Register routes via `registerRoutes()`
- Serve static files (dev: Vite HMR, prod: `dist/public`)
- Start HTTP server on PORT

**Key Code**:
```typescript
const app = express();
app.use(cors());
app.use(express.json());

if (app.get("env") === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);
}

await registerRoutes(server, app);
server.listen(PORT);
```

---

#### `server/routes.ts` (790 lines)
**Purpose**: All API route handlers and business logic.

**Structure**:
- Session middleware setup (lines 85-96)
- Auth routes: `/api/auth/*` (register, login, logout, me)
- Dashboard route: `/api/dashboard` (stats + next action + quests)
- Contact routes: `/api/contacts` (CRUD + detail)
- Interaction routes: `/api/interactions` (log interaction)
- Follow-up routes: `/api/follow-ups` (overdue/today/upcoming)
- Opportunity routes: `/api/opportunities` (CRUD)
- Interview routes: `/api/interviews` (schedule)
- Playbook routes: `/api/playbook/*` (next-action, complete, skip)
- Quest routes: `/api/quests/*` (options, today, select, increment)
- Template routes: `/api/templates` (CRUD)
- Badge routes: `/api/badges` (list)

**Protected Routes**: All routes except `/api/auth/login` and `/api/auth/register` use `authMiddleware`.

**Playbook Template** (lines 17-25):
```typescript
const PLAYBOOK_TEMPLATE = [
  { actionType: 'initial_outreach', label: 'Send initial outreach email', order: 1, templateName: 'Initial Outreach Email', dueDaysFromNow: 0 },
  { actionType: 'follow_up_1', label: 'Send Follow-up #1 (Add Value)', order: 2, templateName: 'Follow-up #1 (Add Value)', dueDaysFromNow: 3 },
  { actionType: 'follow_up_2', label: 'Send Follow-up #2 (Direct)', order: 3, templateName: 'Follow-up #2 (Direct)', dueDaysFromNow: 7 },
  { actionType: 'follow_up_3', label: 'Send Follow-up #3 (Final)', order: 4, templateName: 'Follow-up #3 (Final)', dueDaysFromNow: 14 },
  { actionType: 'schedule_call', label: 'Schedule a call', order: 5, templateName: null, dueDaysFromNow: null },
  { actionType: 'execute_call', label: 'During call: pivot to opportunities', order: 6, templateName: 'Call Conversation Script', dueDaysFromNow: null },
  { actionType: 'ask_for_intro', label: 'Ask for introductions', order: 7, templateName: 'Ask for Introduction', dueDaysFromNow: null },
];
```

**Auto-playbook generation** (lines 28-54): When a contact is created, `generatePlaybookForContact()` creates 7 playbook actions with due dates and templates.

---

#### `server/db.ts`
**Purpose**: PostgreSQL connection pool setup.

**Code**:
```typescript
const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isNeonDatabase ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle(pool, { schema });
```

**Exports**:
- `pool`: node-postgres connection pool
- `db`: Drizzle ORM database instance with schema

---

#### `server/auth.ts`
**Purpose**: Authentication utilities and middleware.

**Functions**:

1. `hashPassword(password: string): Promise<string>`
   - Uses Node.js crypto scrypt with 16-byte salt
   - Returns format: `salt:hashedPassword` (hex-encoded)

2. `comparePasswords(supplied: string, stored: string): Promise<boolean>`
   - Timing-safe password comparison
   - Extracts salt from stored password

3. `authMiddleware(req, res, next)`
   - Validates `req.session.userId` exists
   - Returns 401 if not authenticated
   - Adds `userId` to request context

---

#### `server/storage.ts` (19,353 bytes)
**Purpose**: Data access layer implementing `IStorage` interface.

**Class**: `DatabaseStorage`

**Methods** (30+ methods):
- **User**: `createUser`, `getUser`, `getUserByEmail`, `updateUserGameState`
- **Contact**: `createContact`, `getContacts`, `getContactById`, `updateContact`, `deleteContact`, `getContactDetail`
- **Interaction**: `createInteraction`, `getInteractionsByContact`, `getFollowUpsDue`
- **Opportunity**: `createOpportunity`, `getOpportunities`, `getOpportunityById`, `linkOpportunityToContact`
- **Interview**: `createInterview`, `getInterviews`, `getInterviewById`, `updateInterview`
- **XP/Badges**: `logXP`, `getXPLogs`, `awardBadge`, `getUserBadges`, `checkBadgeExists`
- **Quests**: `createDailyQuest`, `getDailyQuestByDate`, `updateDailyQuest`, `getSelectedQuestsForDate`, `createSelectedQuest`, `updateSelectedQuest`
- **Templates**: `createTemplate`, `getTemplates`, `getTemplateById`, `getTemplateByName`, `updateTemplate`, `deleteTemplate`
- **Playbook**: `createPlaybookAction`, `getPlaybookActionsByContact`, `getNextActionForUser`, `getPlaybookActionById`, `updatePlaybookAction`

**Pattern**: All methods use Drizzle ORM queries with error handling.

---

#### `server/game-engine.ts`
**Purpose**: Game mechanics logic (XP, OS, streaks, badges).

**Functions**:

1. `calculateInteractionRewards(type, outcome, followUpCount)`
   - **XP rewards**: email=5, call=15, coffee=25, linkedin_dm=5, comment=3, letter=10
   - **Outcome bonuses**: response=5 XP, referral=20 XP + 10 OS, intro=15 XP + 8 OS, intel=5 XP
   - **Follow-up penalty**: -2 XP per follow-up (encourages persistence but rewards new contacts)

2. `calculateInterviewRewards(stage, outcome, source)`
   - **Stage XP**: phone_screen=30, first_round=40, second_round=50, final_round=60
   - **Outcome bonuses**: passed=10 XP, offer=50 XP + 20 OS
   - **Source bonuses**: referral=10 OS, warm_intro=5 OS
   - **Total OS**: Sum of source + outcome bonuses

3. `updateStreak(userId)`
   - Checks `lastActiveDate` vs today
   - Increments `currentStreak` if consecutive days
   - Resets to 1 if streak broken
   - Updates `bestStreak` if current > best

4. `awardXP(userId, xp, os, reason, metadata?)`
   - Updates `users.totalXP` and `users.totalOS`
   - Logs to `xpLogs` table
   - Calls `checkAndAwardBadges()` for milestone badges

5. `checkAndAwardBadges(userId)`
   - Awards badges based on conditions:
     - `first_contact`: totalXP >= 5 (first interaction)
     - `networker`: totalXP >= 100 (20 interactions)
     - `conversationalist`: totalXP >= 500 (100+ interactions or 33 calls)
     - `streak_3`, `streak_7`, `streak_14`: currentStreak >= 3/7/14
     - `opportunity_scout`: totalOS >= 10 (2 referrals)
     - `interview_ace`: totalOS >= 50 (10 referrals or 5 interviews from warm intros)

---

### Client Modules

#### `client/src/App.tsx`
**Purpose**: Root router component with layout logic.

**Structure**:
```typescript
function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) {
    return <Route path="/" component={AuthPage} />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/contacts/:id" component={ContactDetail} />
          <Route path="/follow-ups" component={FollowUps} />
          <Route path="/opportunities" component={Opportunities} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/templates" component={Templates} />
          <Route component={NotFound} />
        </Switch>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

**Auth Flow**: Unauthenticated users see only `/auth`, authenticated users see sidebar + routes.

---

#### `client/src/lib/auth.tsx`
**Purpose**: Authentication context provider.

**Exports**:
- `AuthProvider`: React context provider
- `useAuth()`: Hook to access auth state

**State**:
```typescript
{
  user: User | null,
  loading: boolean,
  login: (email, password) => Promise<void>,
  register: (email, password) => Promise<void>,
  logout: () => Promise<void>,
  refreshUser: () => Promise<void>
}
```

**API Calls**:
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Start session
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/me` - Fetch current user

**Session Management**: Uses cookies (`credentials: "include"`).

---

#### `client/src/lib/queryClient.ts`
**Purpose**: React Query configuration and API helper.

**Exports**:
- `queryClient`: TanStack Query client instance
- `apiRequest(endpoint, options?)`: Fetch wrapper with error handling

**apiRequest Features**:
- Automatically adds `credentials: "include"` for session cookies
- Handles JSON serialization
- Throws errors with message from `res.error` or status text
- Returns typed data from `res.data` or full response

---

#### `client/src/pages/dashboard.tsx`
**Purpose**: Main dashboard with game stats, playbook, and quests.

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ [XP Bar] Level 5   [Streak: 7 🔥]              │
├─────────────────────────────────────────────────┤
│ [StatsGrid]                                     │
│  - Interviews This Week                         │
│  - Conversations This Week                      │
│  - Active Contacts                              │
│  - Response Rate                                │
├─────────────────────────────────────────────────┤
│ [NextActionCard]                                │
│  "Send initial outreach email to John Doe"      │
├─────────────────────────────────────────────────┤
│ [DailyQuestProgress]                            │
│  Quest 1: Send 2 emails (1/2)                   │
│  Quest 2: Have 1 conversation (0/1)             │
├─────────────────────────────────────────────────┤
│ [FollowUpQueue]                                 │
│  Overdue (3) | Today (2) | Upcoming (5)         │
└─────────────────────────────────────────────────┘
```

**Data Sources**:
- `GET /api/dashboard` - Fetches all dashboard data in single request
- Returns: `{ stats, nextAction, quests, user }`

---

## Data Model

### Schema Overview (12 tables)

```
users
├── contacts
│   ├── interactions
│   ├── playbookActions
│   ├── outcomes
│   └── opportunities
│       └── interviews
├── xpLogs
├── badges
├── dailyQuests (legacy)
├── selectedQuests (new quest system)
└── templates
```

### Core Tables

#### `users`
**Purpose**: User accounts and game state.

**Key Fields**:
- `id` (varchar 36, UUID)
- `email` (text, unique)
- `passwordHash` (text)
- `totalXP` (integer, default 0)
- `currentLevel` (integer, default 1)
- `totalOS` (integer, default 0) - Outreach Score (relationship quality)
- `currentStreak` (integer, default 0)
- `bestStreak` (integer, default 0)
- `lastActiveDate` (date, nullable)

**Relations**: One-to-many with all other tables.

---

#### `contacts`
**Purpose**: Networking contacts.

**Key Fields**:
- `id`, `userId`
- `name`, `company`, `role`, `email`, `linkedinUrl`, `phoneNumber`
- `source` (text) - "LinkedIn", "Referral", "Event", etc.
- `warmthLevel` (text) - "cold", "warm", "hot"
- `tags` (text array) - ["hiring_manager", "recruiter", "peer"]
- `notes` (text)

**Relations**:
- One-to-many: `interactions`, `playbookActions`
- One-to-many (as `hiringManager`): `opportunities`

---

#### `interactions`
**Purpose**: Log all contact interactions.

**Key Fields**:
- `id`, `userId`, `contactId`
- `type` (text) - "email", "linkedin_dm", "call", "coffee", "text", "comment", "physical_letter"
- `direction` (text) - "outbound", "inbound"
- `status` (text) - "completed", "scheduled", "cancelled" (for scheduled interactions)
- `messageContent` (text)
- `outcome` (text) - "response_received", "referral_obtained", "intro_obtained", "intel_gathered", "no_response"
- `outcomeDetails` (text)
- `followUpDate` (timestamp)
- `followUpCount` (integer) - Number of follow-ups sent
- `isFollowUpDue` (boolean)
- `xpAwarded`, `osAwarded` (integers)

**XP/OS Flow**:
1. User logs interaction
2. `calculateInteractionRewards()` computes XP/OS based on type + outcome
3. Values stored in `xpAwarded`/`osAwarded`
4. User's `totalXP`/`totalOS` updated via `awardXP()`

---

#### `outcomes`
**Purpose**: Major relationship milestones and results.

**Key Fields**:
- `id`, `userId`, `contactId`
- `type` (text) - "job_offer", "client_project", "introduction_made", "referral_obtained", "interview", "dead_end", "other"
- `description` (text) - What happened
- `revenueAmount` (integer, nullable) - Dollar amount
- `revenueType` (text, nullable) - "salary", "one_time", "monthly_recurring", "yearly_recurring"
- `outcomeDate` (date) - When outcome occurred
- `sourceType` (text, nullable) - "cold_outreach", "warm_intro", "referral", "event", "linkedin", "mutual_connection", "text"
- `introducedToContactId` (varchar, nullable) - If introduction_made, who were you introduced to
- `interactionCount` (integer, auto-calculated) - Number of interactions that led to this
- `durationDays` (integer, auto-calculated) - Days from first interaction to outcome

**Relations**:
- Many-to-one: `user`, `contact`
- One-to-one (optional): `introducedToContact`

**Use Cases**:
- Track job offers and revenue
- Measure relationship ROI (interactions → outcome)
- Analytics on what sources produce best results
- Timeline view of networking journey

---

#### `opportunities`
**Purpose**: Job opportunities being pursued.

**Key Fields**:
- `id`, `userId`
- `role`, `company`, `postingUrl`
- `status` (text) - "prospect", "engaged", "interviewing", "offer", "rejected", "accepted"
- `hiringManagerId` (foreign key to `contacts`)

**Relations**:
- Many-to-one: `hiringManager` (contact)
- One-to-many: `interviews`

---

#### `interviews`
**Purpose**: Interview records with attribution.

**Key Fields**:
- `id`, `userId`, `opportunityId`, `contactId`
- `scheduledDate` (timestamp)
- `stage` (text) - "phone_screen", "first_round", "second_round", "final_round"
- `outcome` (text) - "pending", "passed", "failed", "offer_received"
- `source` (text) - "referral", "warm_intro", "cold_outreach"
- `xpAwarded`, `osAwarded` (integers)

**OS Calculation**:
- Referral: +10 OS
- Warm intro: +5 OS
- Offer received: +20 OS

---

#### `xpLogs`
**Purpose**: Transaction log for all XP/OS changes.

**Key Fields**:
- `id`, `userId`
- `reason` (text) - "message_sent", "interview_confirmed", "streak_bonus"
- `xpAmount`, `osAmount` (integers)
- `metadata` (JSON) - Additional context (contact_id, interaction_id, etc.)
- `createdAt` (timestamp)

**Use Cases**:
- Audit trail of all XP/OS changes
- Display XP feed in UI (not implemented yet)
- Analytics for game balance tuning

---

#### `badges`
**Purpose**: Achievement badges.

**Key Fields**:
- `id`, `userId`
- `type` (text) - "intel_gathered", "persistence", "network_effect", etc.
- `name` (text) - Display name
- `description` (text)
- `earnedAt` (timestamp)

**Current Badge Types**:
- `first_contact`: First interaction logged
- `networker`: 100 total XP
- `conversationalist`: 500 total XP
- `streak_3`, `streak_7`, `streak_14`: Streak milestones
- `opportunity_scout`: 10 OS (relationship quality)
- `interview_ace`: 50 OS (high relationship quality)

---

#### `selectedQuests` (New Quest System)
**Purpose**: Flexible daily quest tracking.

**Key Fields**:
- `id`, `userId`
- `date` (date)
- `questType` (text) - "send_emails", "have_conversation", "add_contacts", etc.
- `questLabel` (text) - Display label
- `xpReward` (integer) - Bonus XP for completion
- `targetCount` (integer) - Goal (e.g., send 3 emails)
- `currentCount` (integer) - Progress (e.g., sent 1 email)
- `isCompleted` (boolean)

**Quest Flow**:
1. User selects quests for the day (`POST /api/quests/select`)
2. User takes actions (send email, log call, etc.)
3. Quest progress incremented (`POST /api/quests/:id/increment`)
4. When `currentCount >= targetCount`, `isCompleted` set to true
5. Bonus XP awarded

**Legacy Table**: `dailyQuests` (3 fixed quests per day, deprecated in favor of `selectedQuests`)

---

#### `templates`
**Purpose**: Email/script templates for outreach.

**Key Fields**:
- `id`, `userId`
- `name`, `type` (text) - "email", "linkedin_dm", "call_script"
- `subject`, `body` (text)
- `isDefault` (boolean) - System templates vs user-created

**Default Templates** (seeded via `script/seed-templates.ts`):
1. Initial Outreach Email
2. Follow-up #1 (Add Value)
3. Follow-up #2 (Direct)
4. Follow-up #3 (Final)
5. Ask for Introduction
6. Call Conversation Script
7. LinkedIn Connection Request
8. LinkedIn Follow-up Message

---

#### `playbookActions`
**Purpose**: Structured outreach sequence per contact.

**Key Fields**:
- `id`, `userId`, `contactId`
- `actionType` (text) - "initial_outreach", "follow_up_1", "schedule_call", etc.
- `actionLabel` (text) - Display text
- `actionOrder` (integer) - Sequence order (1-7)
- `templateId` (foreign key to `templates`)
- `status` (text) - "pending", "completed", "skipped"
- `dueDate` (date)
- `completedAt` (timestamp)
- `interactionId` (foreign key to `interactions`) - Links action to interaction

**Playbook Flow**:
1. User creates contact
2. `generatePlaybookForContact()` creates 7 actions with due dates
3. User sees next pending action on dashboard
4. User completes action (e.g., sends email)
5. Interaction logged → playbook action marked completed
6. Next action becomes active

---

## API Endpoints (29 total)

### Authentication
```
POST   /api/auth/register          - Create new user
POST   /api/auth/login             - Start session
POST   /api/auth/logout            - Destroy session
GET    /api/auth/me                - Get current user
```

### Dashboard
```
GET    /api/dashboard              - Dashboard data (stats, next action, quests)
```

### Contacts
```
GET    /api/contacts               - List all contacts
POST   /api/contacts               - Create contact (auto-generates playbook)
PATCH  /api/contacts/:id           - Update contact
DELETE /api/contacts/:id           - Delete contact (cascade to interactions/playbook)
GET    /api/contacts/:id/detail    - Get contact with interactions + playbook
```

### Interactions
```
POST   /api/interactions           - Log interaction (awards XP/OS, updates playbook)
GET    /api/follow-ups             - Get follow-ups due/overdue
```

### Opportunities
```
GET    /api/opportunities          - List opportunities
POST   /api/opportunities          - Create opportunity
```

### Interviews
```
POST   /api/interviews             - Schedule interview (awards XP/OS)
```

### Playbook
```
GET    /api/playbook/next-action   - Get next pending action for user
GET    /api/playbook/contact/:contactId - Get all actions for contact
POST   /api/playbook/:actionId/complete - Mark action completed (requires interactionId)
POST   /api/playbook/:actionId/skip - Skip action
```

### Quests
```
GET    /api/quests/options         - Available quest types
GET    /api/quests/today           - Today's selected quests
POST   /api/quests/select          - Select daily quests
POST   /api/quests/:questId/increment - Increment quest progress
```

### Templates
```
GET    /api/templates              - List templates
GET    /api/templates/:id          - Get single template
POST   /api/templates              - Create template
PUT    /api/templates/:id          - Update template
DELETE /api/templates/:id          - Delete template
```

### Achievements
```
GET    /api/badges                 - Get user badges
```

### Outcomes
```
GET    /api/outcomes               - List all outcomes with contact info
POST   /api/outcomes               - Create outcome (auto-calculates interaction count & duration)
GET    /api/outcomes/analytics     - Get revenue analytics (by source, by type, total)
GET    /api/contacts/:id/detail    - Includes outcomes array for contact
```

**Authentication**: All endpoints except `/api/auth/register` and `/api/auth/login` require session authentication via `authMiddleware`.

---

## Game Mechanics

### Dual-Currency System

**XP (Experience Points)**:
- **Purpose**: Measures momentum and activity volume
- **Awarded for**: Sending emails, making calls, attending coffee chats, logging interactions
- **Level progression**: Cumulative XP determines current level (not implemented in UI yet)
- **Display**: Progress bar on dashboard

**OS (Outreach Score)**:
- **Purpose**: Measures relationship quality and real outcomes
- **Awarded for**: Referrals, intros, interviews, offers
- **Not awarded for**: Cold outreach or follow-ups without outcomes
- **Display**: Ring on dashboard

**Philosophy**: XP rewards effort (motivating ADHD users with immediate feedback), OS rewards results (aligning incentives with job search outcomes).

---

### XP Rewards (server/game-engine.ts)

**Base Interaction Rewards**:
| Action | XP |
|--------|---|
| Email | 5 |
| LinkedIn DM | 5 |
| Comment | 3 |
| Call | 15 |
| Coffee | 25 |
| Physical Letter | 10 |

**Outcome Bonuses**:
| Outcome | XP | OS |
|---------|-----|-----|
| Response Received | +5 | 0 |
| Intel Gathered | +5 | 0 |
| Intro Obtained | +15 | +8 |
| Referral Obtained | +20 | +10 |

**Follow-up Penalty**:
- Each follow-up: -2 XP (discourages spam, encourages new contacts)

**Total Calculation**:
```typescript
xp = baseXP + outcomeBonus - (followUpCount * 2)
os = outcomeOS
```

---

### Interview Rewards (server/game-engine.ts)

**Stage XP**:
| Stage | XP |
|-------|---|
| Phone Screen | 30 |
| First Round | 40 |
| Second Round | 50 |
| Final Round | 60 |

**Outcome Bonuses**:
| Outcome | XP | OS |
|---------|-----|-----|
| Passed | +10 | 0 |
| Offer Received | +50 | +20 |

**Source OS Bonuses**:
| Source | OS |
|--------|---|
| Referral | +10 |
| Warm Intro | +5 |
| Cold Outreach | 0 |

**Philosophy**: Referrals and warm intros have higher OS value, incentivizing relationship-building over mass cold applications.

---

### Streak System (server/game-engine.ts)

**Tracking**:
- `lastActiveDate` updated daily when user logs interaction
- `currentStreak` incremented if activity on consecutive days
- `currentStreak` reset to 1 if gap > 1 day
- `bestStreak` updated if `currentStreak` exceeds it

**Streak Multiplier** (not implemented yet in plan, but designed for):
- Days 1-6: 1x XP
- Days 7-13: 1.5x XP
- Days 14+: 2x XP

**UI Display**: Streak counter with fire emoji on dashboard.

---

### Badge System (server/game-engine.ts)

**Badge Awarding Logic** (`checkAndAwardBadges`):

```typescript
if (totalXP >= 5 && !hasBadge('first_contact')) {
  awardBadge('first_contact', 'First Contact', 'Logged your first interaction');
}

if (totalXP >= 100 && !hasBadge('networker')) {
  awardBadge('networker', 'Networker', 'Reached 100 XP');
}

if (totalXP >= 500 && !hasBadge('conversationalist')) {
  awardBadge('conversationalist', 'Conversationalist', 'Reached 500 XP');
}

if (currentStreak >= 3 && !hasBadge('streak_3')) {
  awardBadge('streak_3', '3-Day Streak', 'Active for 3 consecutive days');
}

if (currentStreak >= 7 && !hasBadge('streak_7')) {
  awardBadge('streak_7', '7-Day Streak', 'Active for 7 consecutive days');
}

if (currentStreak >= 14 && !hasBadge('streak_14')) {
  awardBadge('streak_14', '14-Day Streak', 'Active for 14 consecutive days');
}

if (totalOS >= 10 && !hasBadge('opportunity_scout')) {
  awardBadge('opportunity_scout', 'Opportunity Scout', 'Reached 10 OS');
}

if (totalOS >= 50 && !hasBadge('interview_ace')) {
  awardBadge('interview_ace', 'Interview Ace', 'Reached 50 OS');
}
```

**Badge Deduplication**: `checkBadgeExists(userId, type)` prevents duplicate badges.

---

## Build & Deployment

### Development Workflow

**Start Dev Server**:
```bash
npm run dev
# Runs: NODE_ENV=development tsx server/index.ts
# - Vite HMR on frontend
# - Auto-reload on server changes (via tsx watch)
# - Listens on http://localhost:5000
```

**Type Checking**:
```bash
npm run check
# Runs: tsc (no output, just type checking)
```

**Database Migration**:
```bash
npm run db:push
# Runs: drizzle-kit push
# - Reads shared/schema.ts
# - Connects to DATABASE_URL
# - Applies schema changes to PostgreSQL
# - Outputs migration SQL to migrations/
```

---

### Production Build (`script/build.ts`)

**Build Process**:

1. **Clean dist folder**
2. **Build client** (Vite):
   - Input: `client/src/`
   - Output: `dist/public/`
   - Creates: `index.html`, `assets/index-[hash].js`, `assets/index-[hash].css`

3. **Build server** (esbuild):
   - Input: `server/index.ts`
   - Output: `dist/index.cjs`
   - Bundle: All dependencies except `pg`, `express`, `drizzle-orm`
   - Format: CommonJS
   - Minified: Yes
   - Sourcemap: Yes

**Build Command**:
```bash
npm run build
# Runs: tsx script/build.ts
```

**Start Production Server**:
```bash
npm run start
# Runs: NODE_ENV=production node dist/index.cjs
# - Serves static files from dist/public
# - API routes on same origin
# - Listens on PORT (default 5000, Render sets 10000)
```

---

### Deployment Platforms

#### Render (Primary)

**Configuration** (`render.yaml`):
```yaml
services:
  - type: web
    name: job-quest
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: DATABASE_URL
        sync: false  # Set in Render dashboard
      - key: SESSION_SECRET
        sync: false  # Set in Render dashboard
      - key: NODE_ENV
        value: production
```

**Deployment Steps**:
1. Connect GitHub repo to Render
2. Create PostgreSQL database on Render
3. Set `DATABASE_URL` and `SESSION_SECRET` in environment
4. Run `npm run db:push` via Render Shell
5. Render auto-deploys on git push

**Render Service URL**: `https://[app-name].onrender.com`

---

#### Replit (Alternative)

**Configuration** (`.replit`):
```toml
modules = ["nodejs-20", "web", "postgresql-16"]

[deployment]
run = ["node", "./dist/index.cjs"]
deploymentTarget = "autoscale"

[[ports]]
localPort = 5000
externalPort = 80
```

**Deployment Steps**:
1. Fork repo to Replit
2. Set environment variables in Replit Secrets
3. Run `npm run db:push` in Replit Shell
4. Click "Deploy" in Replit dashboard

---

## Session & Authentication

### Session Storage

**Current Implementation**:
- **Store**: MemoryStore (default express-session)
- **Problem**: Sessions lost on server restart
- **Cookie**: `connect.sid` (httpOnly, 7-day expiry)

**Session Schema**:
```typescript
interface SessionData {
  userId: string;
}
```

**Future Improvement** (not in scope):
- Use `connect-pg-simple` to store sessions in PostgreSQL
- Requires creating `user_sessions` table
- Survives server restarts

---

### Password Security

**Hashing** (`server/auth.ts:hashPassword`):
- Algorithm: scrypt (Node.js crypto)
- Salt: 16 random bytes
- Key length: 64 bytes
- Format: `salt:hash` (hex-encoded)

**Verification** (`server/auth.ts:comparePasswords`):
- Timing-safe comparison via `crypto.timingSafeEqual`
- Prevents timing attacks

---

## Frontend Architecture

### Routing (Wouter)

**Why Wouter?**
- Lightweight (1.7KB vs React Router 14KB)
- Simple API (`<Route>`, `<Switch>`, `useLocation()`, `useParams()`)
- Client-side only (no SSR needed)

**Route Table**:
```typescript
<Switch>
  <Route path="/" component={Dashboard} />
  <Route path="/contacts" component={Contacts} />
  <Route path="/contacts/:id" component={ContactDetail} />
  <Route path="/follow-ups" component={FollowUps} />
  <Route path="/opportunities" component={Opportunities} />
  <Route path="/outcomes" component={Outcomes} />
  <Route path="/achievements" component={Achievements} />
  <Route path="/templates" component={Templates} />
  <Route component={NotFound} />
</Switch>
```

---

### State Management (React Query)

**Configuration** (`client/src/lib/queryClient.ts`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
```

**Query Pattern**:
```typescript
const { data: contacts, isLoading } = useQuery({
  queryKey: ['/api/contacts'],
  queryFn: () => apiRequest('/api/contacts'),
});
```

**Mutation Pattern**:
```typescript
const createContactMutation = useMutation({
  mutationFn: (data) => apiRequest('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  },
});
```

---

### UI Components (shadcn/ui)

**Library**: Radix UI primitives with Tailwind styling

**43 Components** in `client/src/components/ui/`:
- Layout: card, sheet, sidebar, separator
- Forms: input, textarea, select, checkbox, switch, radio-group, slider
- Overlays: dialog, alert-dialog, popover, tooltip, hover-card
- Navigation: breadcrumb, dropdown-menu, navigation-menu, menubar, tabs
- Feedback: toast, alert, skeleton, progress
- Data: table, calendar, chart, carousel
- Primitives: button, badge, avatar, aspect-ratio

**Theming**: CSS variables in `client/src/index.css` (HSL color palette).

---

## Critical File Paths

### Server
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/server/index.ts` - Express initialization
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/server/routes.ts` - All API routes
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/server/db.ts` - Database connection
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/server/auth.ts` - Authentication
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/server/storage.ts` - Data access layer
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/server/game-engine.ts` - Game mechanics

### Client
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/client/src/App.tsx` - Root component
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/client/src/lib/auth.tsx` - Auth context
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/client/src/lib/queryClient.ts` - React Query config
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/client/src/pages/dashboard.tsx` - Main dashboard

### Shared
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/shared/schema.ts` - Database schema + validators

### Config
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/package.json` - Dependencies
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/vite.config.ts` - Vite build config
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/drizzle.config.ts` - Database migrations
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/render.yaml` - Render deployment
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/.replit` - Replit deployment

### Build
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/script/build.ts` - Production build script
- `/Users/thisishowigotrich/Documents/Obi Apps/Job Quest Local/job-quest/script/seed-templates.ts` - Template seeding

---

## What NOT to Touch

### Core Game Logic
- **DO NOT** modify XP/OS calculation formulas in `server/game-engine.ts` without understanding game balance implications
- Changing rewards affects user progression and may break existing users' expectations
- If changes needed, consider versioning or grandfather clause

### Session Middleware
- **DO NOT** change session secret in production (invalidates all active sessions)
- **DO NOT** modify cookie settings without testing logout/login flow
- Session store swap (MemoryStore → PgStore) requires careful migration

### Database Schema
- **DO NOT** run `drizzle-kit push` in production without backup
- **DO NOT** delete columns with user data (migrations must be additive)
- Use `drizzle-kit generate` for migration SQL, then review before applying

### Build Configuration
- **DO NOT** change esbuild bundle settings without testing production build
- **DO NOT** remove bundled dependencies (may break cold start optimization)
- **DO NOT** modify Vite alias paths (breaks imports across codebase)

### Playbook Template
- **DO NOT** modify `PLAYBOOK_TEMPLATE` in `server/routes.ts` for existing users (breaks their in-flight playbooks)
- Changes only affect new contacts created after deploy
- Consider making template editable per-user if customization needed

---

## Additional Notes

### Missing Features (From Plan)

See `FEATURE-PARITY.md` for detailed comparison to original plan.

**High-level gaps**:
- AI integration (Claude/OpenAI for message drafting) - not implemented
- Email sending (Postmark/Gmail API) - not implemented
- Campaign builder - not implemented
- Opportunity map visualization - not implemented
- Level progression UI - basic XP bar exists, no level-up animations
- Streak multiplier - logic exists in game-engine.ts but not applied

### Performance Considerations

**Database**:
- No connection pooling limits set (uses pg defaults: max 10)
- No query optimization (all queries use Drizzle ORM defaults)
- No indexes on frequently queried fields (except primary keys)
- Recommend adding indexes on: `interactions.isFollowUpDue`, `playbookActions.status`, `selectedQuests.date`

**Frontend**:
- No lazy loading of routes or components
- All 43 UI components loaded upfront
- No image optimization (no images in app currently)
- React Query cache keeps data for 5 minutes (may grow memory over time)

**Server**:
- No rate limiting
- No request logging
- No monitoring/error tracking (Sentry, etc.)
- No API response caching

---

## Appendix: File Counts

- **Total TypeScript files**: 89
- **Server files**: 8
- **Client pages**: 9
- **Client components**: 55 (43 UI primitives + 12 custom)
- **Shared files**: 1 (schema.ts)
- **Config files**: 7
- **Build scripts**: 2
