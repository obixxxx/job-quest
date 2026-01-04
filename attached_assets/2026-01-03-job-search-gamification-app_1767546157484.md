# Job Search Gamification App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a solo-play web app that gamifies job search outreach based on "The Reverse Job Search Method" book, using dual-currency system (XP for momentum, OS for real outcomes) to maximize interviews and opportunity abundance.

**Architecture:** React frontend with TypeScript, Express.js backend, PostgreSQL database, AI agent integration (Claude/OpenAI) for message drafting and reply parsing, Postmark for email delivery (Gmail as manual fallback). Optimized for ADHD users with immediate feedback, micro-tasks, and visual progress tracking.

**Tech Stack:**
- **Frontend:** React 18, TypeScript, Tailwind CSS, Recharts (for visualizations), Framer Motion (animations)
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **AI Integration:** Anthropic Claude API (primary), OpenAI API (fallback)
- **Email:** Postmark API (automated), Gmail API (manual option)
- **Deployment:** Replit-ready (or Vercel frontend + Railway backend)

---

## Implementation Overview

**Phase 1: Core Infrastructure & Database** (Tasks 1-5)
- Project scaffolding
- Database schema with Prisma
- Basic API structure
- Authentication (simple, no social login initially)

**Phase 2: Contact & Interaction System** (Tasks 6-12)
- Contact CRUD operations
- Interaction logging
- Follow-up queue logic
- Warmth level tracking

**Phase 3: XP & OS Engine** (Tasks 13-18)
- Dual-currency calculation engine
- Level progression system
- Streak tracking
- Daily quest system

**Phase 4: AI Integration** (Tasks 19-24)
- Message drafting with templates
- Reply parsing (extract outcomes)
- Intel gathering prompts
- Value Pack generation

**Phase 5: Email System** (Tasks 25-28)
- Postmark integration
- Gmail manual fallback
- Template management
- Send tracking

**Phase 6: Dashboard & UX** (Tasks 29-38)
- Main dashboard (OS ring, interview count, streak)
- Contact cards with next-action suggestions
- Follow-up queue UI
- Campaign builder
- Opportunity map visualization

**Phase 7: ADHD-Friendly Features** (Tasks 39-42)
- Micro-task timers
- Persistent streak counter
- Next-action recommendations
- Reframing mechanics ("Intel Gathered" badges)

**Phase 8: Testing & Deployment** (Tasks 43-45)
- End-to-end tests for critical flows
- Seeding realistic test data
- Deployment to Replit/Vercel

---

## Phase 1: Core Infrastructure & Database

### Task 1: Project Scaffolding

**Files:**
- Create: `job-search-game/` (root directory)
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Initialize project directory**

```bash
mkdir job-search-game
cd job-search-game
npm init -y
```

**Step 2: Install core dependencies**

```bash
npm install express cors dotenv
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon
npm install -D eslint prettier
```

**Step 3: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

**Step 5: Update package.json scripts**

Modify `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  }
}
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: initialize project with TypeScript and Express"
```

---

### Task 2: Database Schema Design with Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env`

**Step 1: Install Prisma**

```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**Step 2: Configure database connection**

Edit `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/jobsearch_game?schema=public"
```

**Step 3: Write Prisma schema**

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Game state
  totalXP       Int      @default(0)
  currentLevel  Int      @default(1)
  totalOS       Int      @default(0)
  currentStreak Int      @default(0)
  bestStreak    Int      @default(0)
  lastActiveDate DateTime?

  contacts      Contact[]
  interactions  Interaction[]
  opportunities Opportunity[]
  interviews    Interview[]
  xpLogs        XPLog[]
  badges        Badge[]
  dailyQuests   DailyQuest[]
}

model Contact {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Contact info
  name        String
  company     String?
  role        String?
  email       String?
  linkedinUrl String?
  phoneNumber String?

  // Tracking
  source      String?  // "LinkedIn", "Referral", "Event", etc.
  warmthLevel String   @default("cold") // "cold", "warm", "hot"
  tags        String[] // ["hiring_manager", "recruiter", "peer"]
  notes       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  interactions Interaction[]
  opportunities Opportunity[]
  interviews    Interview[]

  @@index([userId])
}

model Interaction {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  contactId       String
  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  // Interaction details
  type            String   // "email", "linkedin_dm", "call", "coffee", "comment", "physical_letter"
  direction       String   // "outbound", "inbound"
  templateUsed    String?
  messageContent  String?

  // Outcomes
  outcome         String?  // "response_received", "referral_obtained", "intro_obtained", "intel_gathered", "no_response"
  outcomeDetails  String?  // Free-form notes about what happened

  // Follow-up tracking
  followUpDate    DateTime?
  followUpCount   Int      @default(0)
  isFollowUpDue   Boolean  @default(false)

  // XP/OS tracking
  xpAwarded       Int      @default(0)
  osAwarded       Int      @default(0)

  timestamp       DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([contactId])
  @@index([isFollowUpDue])
}

model Opportunity {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Opportunity details
  role              String
  company           String
  postingUrl        String?
  postedDate        DateTime?
  status            String   @default("prospect") // "prospect", "engaged", "interviewing", "offer", "rejected", "accepted"

  // Relationships
  hiringManagerId   String?
  hiringManager     Contact? @relation(fields: [hiringManagerId], references: [id])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  interviews        Interview[]

  @@index([userId])
  @@index([hiringManagerId])
}

model Interview {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunityId   String
  opportunity     Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  contactId       String?
  contact         Contact?    @relation(fields: [contactId], references: [id])

  // Interview details
  scheduledDate   DateTime
  stage           String   // "phone_screen", "first_round", "second_round", "final_round"
  outcome         String?  // "pending", "passed", "failed", "offer_received"
  source          String   // "referral", "warm_intro", "cold_outreach"

  // Scoring
  xpAwarded       Int      @default(0)
  osAwarded       Int      @default(0)

  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([opportunityId])
}

model XPLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  reason    String   // "message_sent", "interview_confirmed", "streak_bonus", etc.
  xpAmount  Int
  osAmount  Int      @default(0)

  metadata  Json?    // Additional context (contact_id, interaction_id, etc.)

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}

model Badge {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        String   // "intel_gathered", "persistence", "network_effect", "mailer", "campaigner"
  name        String
  description String?
  iconUrl     String?

  earnedAt    DateTime @default(now())

  @@index([userId])
}

model DailyQuest {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  date        DateTime @db.Date

  // Quest selection (user picks from menu)
  highImpact1 String?  // e.g., "have_conversation"
  highImpact2 String?
  mediumImpact1 String?
  mediumImpact2 String?
  momentum1   String?

  // Completion tracking
  completed   Boolean  @default(false)
  bonusXP     Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId])
}
```

**Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created successfully, database tables generated.

**Step 5: Generate Prisma client**

```bash
npx prisma generate
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add database schema with Prisma"
```

---

### Task 3: Basic Express Server Setup

**Files:**
- Create: `src/server.ts`
- Create: `src/lib/prisma.ts`
- Create: `src/middleware/errorHandler.ts`

**Step 1: Create Prisma client instance**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

**Step 2: Create error handler middleware**

Create `src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
```

**Step 3: Create basic Express server**

Create `src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import prisma from './lib/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});
```

**Step 4: Test server startup**

Run:
```bash
npm run dev
```

Expected: Server starts on port 3000, logs "🚀 Server running..."

**Step 5: Test health endpoints**

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

Expected: Both return `{"status":"ok",...}`

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add basic Express server with health checks"
```

---

### Task 4: Authentication System (Simple JWT)

**Files:**
- Create: `src/middleware/auth.ts`
- Create: `src/routes/auth.ts`
- Create: `src/utils/jwt.ts`
- Create: `src/utils/password.ts`

**Step 1: Install dependencies**

```bash
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

**Step 2: Add JWT secret to .env**

Edit `.env`:

```
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
```

**Step 3: Create JWT utilities**

Create `src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

**Step 4: Create password utilities**

Create `src/utils/password.ts`:

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

**Step 5: Create auth middleware**

Create `src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { AppError } from './errorHandler';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};
```

**Step 6: Create auth routes**

Create `src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        totalXP: true,
        currentLevel: true,
        totalOS: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          totalXP: user.totalXP,
          currentLevel: user.currentLevel,
          totalOS: user.totalOS,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user (protected route test)
router.get('/me', async (req, res, next) => {
  try {
    // This will be protected by authenticate middleware
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        totalXP: true,
        currentLevel: true,
        totalOS: true,
        currentStreak: true,
        bestStreak: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 7: Register auth routes in server**

Modify `src/server.ts`:

```typescript
// Add after middleware
import authRoutes from './routes/auth';
import { authenticate } from './middleware/auth';

// Routes
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/auth/me', authenticate, authRoutes);
```

**Step 8: Test auth flow**

Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected: Returns user object and JWT token.

Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected: Returns user and token.

**Step 9: Commit**

```bash
git add .
git commit -m "feat: add JWT authentication system"
```

---

### Task 5: Frontend Scaffolding with React

**Files:**
- Create: `client/` directory
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/src/App.tsx`
- Create: `client/index.html`

**Step 1: Create React app with Vite**

```bash
npm create vite@latest client -- --template react-ts
cd client
npm install
```

**Step 2: Install additional dependencies**

```bash
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Configure Tailwind**

Edit `client/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#ec4899',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
```

**Step 4: Add Tailwind to CSS**

Edit `client/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Step 5: Create basic App structure**

Edit `client/src/App.tsx`:

```typescript
import { useState } from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Job Search Game
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
          <p className="text-gray-600">
            Your gamified job search journey starts here.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 6: Configure Vite proxy for API**

Edit `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

**Step 7: Test frontend**

From `client/` directory:
```bash
npm run dev
```

Expected: Vite dev server starts on port 5173, app renders in browser.

**Step 8: Commit**

```bash
cd ..
git add .
git commit -m "feat: add React frontend with Vite and Tailwind"
```

---

## Phase 2: Contact & Interaction System

### Task 6: Contact CRUD API Routes

**Files:**
- Create: `src/routes/contacts.ts`
- Create: `src/services/contactService.ts`

**Step 1: Create contact service layer**

Create `src/services/contactService.ts`:

```typescript
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export interface CreateContactInput {
  name: string;
  company?: string;
  role?: string;
  email?: string;
  linkedinUrl?: string;
  phoneNumber?: string;
  source?: string;
  warmthLevel?: 'cold' | 'warm' | 'hot';
  tags?: string[];
  notes?: string;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {
  id: string;
}

export const contactService = {
  async create(userId: string, data: CreateContactInput) {
    return prisma.contact.create({
      data: {
        ...data,
        userId,
      },
    });
  },

  async findById(userId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      include: {
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
        interviews: {
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    return contact;
  },

  async findAll(userId: string, filters?: {
    warmthLevel?: string;
    tags?: string[];
    search?: string;
  }) {
    const where: any = { userId };

    if (filters?.warmthLevel) {
      where.warmthLevel = filters.warmthLevel;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { role: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });
  },

  async update(userId: string, contactId: string, data: Partial<CreateContactInput>) {
    // Verify ownership
    await this.findById(userId, contactId);

    return prisma.contact.update({
      where: { id: contactId },
      data,
    });
  },

  async delete(userId: string, contactId: string) {
    // Verify ownership
    await this.findById(userId, contactId);

    return prisma.contact.delete({
      where: { id: contactId },
    });
  },
};
```

**Step 2: Create contact routes**

Create `src/routes/contacts.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { contactService } from '../services/contactService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes are protected
router.use(authenticate);

// Create contact
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const contact = await contactService.create(userId, req.body);

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// Get all contacts
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { warmthLevel, tags, search } = req.query;

    const filters = {
      warmthLevel: warmthLevel as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      search: search as string | undefined,
    };

    const contacts = await contactService.findAll(userId, filters);

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
});

// Get single contact
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const contact = await contactService.findById(userId, req.params.id);

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// Update contact
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const contact = await contactService.update(userId, req.params.id, req.body);

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

// Delete contact
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    await contactService.delete(userId, req.params.id);

    res.json({
      success: true,
      message: 'Contact deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes in server**

Modify `src/server.ts` (add after auth routes):

```typescript
import contactRoutes from './routes/contacts';

app.use('/api/contacts', contactRoutes);
```

**Step 4: Test contact CRUD**

Create contact:
```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Sarah Johnson",
    "company": "TechCorp",
    "role": "Engineering Manager",
    "email": "sarah@techcorp.com",
    "source": "LinkedIn",
    "warmthLevel": "cold"
  }'
```

Expected: Returns created contact with ID.

List contacts:
```bash
curl http://localhost:3000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns array of contacts.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add contact CRUD API"
```

---

### Task 7: Interaction Logging System

**Files:**
- Create: `src/routes/interactions.ts`
- Create: `src/services/interactionService.ts`
- Create: `src/services/scoringEngine.ts`

**Step 1: Create scoring engine (core game logic)**

Create `src/services/scoringEngine.ts`:

```typescript
// XP and OS calculation based on action types
export interface ScoringResult {
  xp: number;
  os: number;
  reason: string;
}

export const scoringEngine = {
  // Interaction scoring
  calculateInteractionScore(
    type: string,
    outcome?: string,
    followUpCount?: number
  ): ScoringResult {
    let xp = 0;
    let os = 0;
    let reason = '';

    // Base scoring by interaction type
    switch (type) {
      case 'email':
        xp = outcome ? 30 : 30;
        os = 10;
        reason = 'Personalized outreach sent';
        break;
      case 'linkedin_dm':
        xp = 25;
        os = 10;
        reason = 'LinkedIn DM sent';
        break;
      case 'call':
      case 'coffee':
        xp = 200;
        os = 100;
        reason = 'Strategic conversation';
        break;
      case 'comment':
        xp = 20;
        os = 5;
        reason = 'LinkedIn warm-up comment';
        break;
      case 'physical_letter':
        xp = 250;
        os = 30;
        reason = 'Value Pack sent';
        break;
      default:
        xp = 15;
        os = 5;
    }

    // Outcome bonuses
    if (outcome === 'referral_obtained') {
      xp += 600;
      os += 1200;
      reason = 'Referral to hiring manager obtained!';
    } else if (outcome === 'intro_obtained') {
      xp += 200;
      os += 400;
      reason = 'Warm intro obtained';
    } else if (outcome === 'intel_gathered') {
      xp += 100;
      os += 50;
      reason = 'Intel gathered from conversation';
    } else if (outcome === 'response_received') {
      // Variable ratio reward (slot machine effect)
      const randomBonus = Math.floor(Math.random() * 50) + 50;
      xp += randomBonus;
      os += 20;
      reason = 'Response received';
    }

    // Persistence bonus (3rd/4th follow-up)
    if (followUpCount && followUpCount >= 3) {
      xp += 150;
      os += 15;
      reason += ' (persistence bonus)';
    }

    return { xp, os, reason };
  },

  // Interview scoring
  calculateInterviewScore(
    stage: string,
    source: 'referral' | 'warm_intro' | 'cold_outreach'
  ): ScoringResult {
    let baseOS = 0;
    let xp = 0;

    // Base score by stage
    switch (stage) {
      case 'phone_screen':
        baseOS = 750;
        xp = 2000;
        break;
      case 'first_round':
        baseOS = 1000;
        xp = 3000;
        break;
      case 'second_round':
        baseOS = 1500;
        xp = 4000;
        break;
      case 'final_round':
        baseOS = 2500;
        xp = 5000;
        break;
      default:
        baseOS = 750;
        xp = 2000;
    }

    // Source multiplier
    let osMultiplier = 1.0;
    let xpMultiplier = 1.0;

    switch (source) {
      case 'referral':
        osMultiplier = 1.5;
        xpMultiplier = 1.5;
        break;
      case 'warm_intro':
        osMultiplier = 1.2;
        xpMultiplier = 1.2;
        break;
      case 'cold_outreach':
        osMultiplier = 1.0;
        xpMultiplier = 1.0;
        break;
    }

    const finalOS = Math.floor(baseOS * osMultiplier);
    const finalXP = Math.floor(xp * xpMultiplier);

    return {
      xp: finalXP,
      os: finalOS,
      reason: `Interview (${stage}) from ${source}`,
    };
  },

  // Calculate level from XP
  calculateLevel(totalXP: number): number {
    // Simple formula: level = sqrt(XP / 1000) + 1
    return Math.floor(Math.sqrt(totalXP / 1000)) + 1;
  },

  // Calculate XP needed for next level
  xpForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 1000;
  },

  // Calculate Opportunity Abundance level
  getOpportunityLevel(totalOS: number): {
    level: string;
    min: number;
    max: number;
    progress: number;
  } {
    const levels = [
      { level: 'Seed', min: 0, max: 999 },
      { level: 'Sprout', min: 1000, max: 2999 },
      { level: 'Budding', min: 3000, max: 4999 },
      { level: 'Orbit', min: 5000, max: 7999 },
      { level: 'Abundant', min: 8000, max: 11999 },
      { level: 'Overflow', min: 12000, max: Infinity },
    ];

    const currentLevel = levels.find(
      (l) => totalOS >= l.min && totalOS <= l.max
    ) || levels[0];

    const progress = currentLevel.max === Infinity
      ? 100
      : Math.floor(((totalOS - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100);

    return {
      ...currentLevel,
      progress,
    };
  },
};
```

**Step 2: Create interaction service**

Create `src/services/interactionService.ts`:

```typescript
import prisma from '../lib/prisma';
import { scoringEngine } from './scoringEngine';
import { AppError } from '../middleware/errorHandler';

export interface CreateInteractionInput {
  contactId: string;
  type: string;
  direction: 'outbound' | 'inbound';
  templateUsed?: string;
  messageContent?: string;
  outcome?: string;
  outcomeDetails?: string;
  followUpDate?: Date;
}

export const interactionService = {
  async create(userId: string, data: CreateInteractionInput) {
    // Verify contact ownership
    const contact = await prisma.contact.findFirst({
      where: { id: data.contactId, userId },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    // Get follow-up count for this contact
    const followUpCount = await prisma.interaction.count({
      where: {
        contactId: data.contactId,
        type: data.type,
      },
    });

    // Calculate XP/OS
    const scoring = scoringEngine.calculateInteractionScore(
      data.type,
      data.outcome,
      followUpCount
    );

    // Create interaction with XP/OS
    const interaction = await prisma.interaction.create({
      data: {
        ...data,
        userId,
        followUpCount,
        xpAwarded: scoring.xp,
        osAwarded: scoring.os,
      },
    });

    // Award XP/OS to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: scoring.xp },
        totalOS: { increment: scoring.os },
      },
    });

    // Log XP gain
    await prisma.xPLog.create({
      data: {
        userId,
        reason: scoring.reason,
        xpAmount: scoring.xp,
        osAmount: scoring.os,
        metadata: {
          interactionId: interaction.id,
          contactId: data.contactId,
        },
      },
    });

    // Update warmth level based on outcome
    if (data.outcome === 'response_received' || data.outcome === 'intro_obtained') {
      await prisma.contact.update({
        where: { id: data.contactId },
        data: { warmthLevel: 'warm' },
      });
    } else if (data.outcome === 'referral_obtained') {
      await prisma.contact.update({
        where: { id: data.contactId },
        data: { warmthLevel: 'hot' },
      });
    }

    return interaction;
  },

  async findAll(userId: string, contactId?: string) {
    const where: any = { userId };

    if (contactId) {
      where.contactId = contactId;
    }

    return prisma.interaction.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });
  },

  async update(userId: string, interactionId: string, data: Partial<CreateInteractionInput>) {
    // Verify ownership
    const interaction = await prisma.interaction.findFirst({
      where: { id: interactionId, userId },
    });

    if (!interaction) {
      throw new AppError('Interaction not found', 404);
    }

    return prisma.interaction.update({
      where: { id: interactionId },
      data,
    });
  },
};
```

**Step 3: Create interaction routes**

Create `src/routes/interactions.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { interactionService } from '../services/interactionService';

const router = Router();
router.use(authenticate);

// Create interaction (awards XP/OS immediately)
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const interaction = await interactionService.create(userId, req.body);

    res.status(201).json({
      success: true,
      data: interaction,
      message: `+${interaction.xpAwarded} XP, +${interaction.osAwarded} OS`,
    });
  } catch (error) {
    next(error);
  }
});

// Get all interactions (optionally filtered by contact)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { contactId } = req.query;

    const interactions = await interactionService.findAll(
      userId,
      contactId as string | undefined
    );

    res.json({
      success: true,
      data: interactions,
    });
  } catch (error) {
    next(error);
  }
});

// Update interaction (e.g., mark outcome after reply)
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const interaction = await interactionService.update(userId, req.params.id, req.body);

    res.json({
      success: true,
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 4: Register routes**

Modify `src/server.ts`:

```typescript
import interactionRoutes from './routes/interactions';

app.use('/api/interactions', interactionRoutes);
```

**Step 5: Test interaction logging**

Create interaction:
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contactId": "CONTACT_ID_HERE",
    "type": "email",
    "direction": "outbound",
    "messageContent": "Quick question about marketing...",
    "followUpDate": "2026-01-10T10:00:00Z"
  }'
```

Expected: Returns interaction + XP/OS awarded message.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add interaction logging with XP/OS scoring"
```

---

### Task 8: Follow-Up Queue Logic

**Files:**
- Create: `src/routes/followups.ts`
- Create: `src/services/followUpService.ts`
- Create: `src/jobs/followUpQueue.ts` (background job)

**Step 1: Create follow-up service**

Create `src/services/followUpService.ts`:

```typescript
import prisma from '../lib/prisma';

export const followUpService = {
  async getQueue(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all interactions where follow-up is due
    const dueFollowUps = await prisma.interaction.findMany({
      where: {
        userId,
        followUpDate: {
          lte: new Date(),
        },
        outcome: null, // No outcome yet
      },
      include: {
        contact: true,
      },
      orderBy: {
        followUpDate: 'asc',
      },
    });

    return dueFollowUps;
  },

  async markFollowUpComplete(userId: string, interactionId: string, outcome: string) {
    // Update interaction with outcome
    return prisma.interaction.update({
      where: { id: interactionId },
      data: {
        outcome,
        followUpDate: null,
      },
    });
  },

  async scheduleFollowUp(userId: string, interactionId: string, followUpDate: Date) {
    return prisma.interaction.update({
      where: { id: interactionId },
      data: {
        followUpDate,
        followUpCount: { increment: 1 },
      },
    });
  },

  // Background job: mark interactions as due
  async updateFollowUpFlags() {
    const now = new Date();

    await prisma.interaction.updateMany({
      where: {
        followUpDate: {
          lte: now,
        },
        isFollowUpDue: false,
      },
      data: {
        isFollowUpDue: true,
      },
    });
  },
};
```

**Step 2: Create follow-up routes**

Create `src/routes/followups.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { followUpService } from '../services/followUpService';

const router = Router();
router.use(authenticate);

// Get follow-up queue
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const queue = await followUpService.getQueue(userId);

    res.json({
      success: true,
      data: queue,
    });
  } catch (error) {
    next(error);
  }
});

// Schedule a follow-up
router.post('/schedule', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { interactionId, followUpDate } = req.body;

    const interaction = await followUpService.scheduleFollowUp(
      userId,
      interactionId,
      new Date(followUpDate)
    );

    res.json({
      success: true,
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
});

// Mark follow-up complete
router.post('/complete', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { interactionId, outcome } = req.body;

    const interaction = await followUpService.markFollowUpComplete(
      userId,
      interactionId,
      outcome
    );

    res.json({
      success: true,
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import followUpRoutes from './routes/followups';

app.use('/api/followups', followUpRoutes);
```

**Step 4: Test follow-up queue**

Get queue:
```bash
curl http://localhost:3000/api/followups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns array of interactions due for follow-up.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add follow-up queue system"
```

---

### Task 9: Warmth Level Auto-Update

**Files:**
- Modify: `src/services/interactionService.ts`

**Step 1: Add warmth progression logic**

Edit `src/services/interactionService.ts` (this logic already exists in Task 7, verify it's working):

The warmth update logic is already in place:
```typescript
// Update warmth level based on outcome
if (data.outcome === 'response_received' || data.outcome === 'intro_obtained') {
  await prisma.contact.update({
    where: { id: data.contactId },
    data: { warmthLevel: 'warm' },
  });
} else if (data.outcome === 'referral_obtained') {
  await prisma.contact.update({
    where: { id: data.contactId },
    data: { warmthLevel: 'hot' },
  });
}
```

**Step 2: Test warmth progression**

Create a cold contact, then log interaction with outcome `response_received`:

```bash
# Create contact (warmth: cold)
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Contact","warmthLevel":"cold"}'

# Log interaction with response
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contactId":"CONTACT_ID",
    "type":"email",
    "direction":"outbound",
    "outcome":"response_received"
  }'

# Check contact warmth
curl http://localhost:3000/api/contacts/CONTACT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Contact warmth is now "warm".

**Step 3: Commit**

```bash
git add .
git commit -m "test: verify warmth level auto-update"
```

---

### Task 10: Interview Tracking

**Files:**
- Create: `src/routes/interviews.ts`
- Create: `src/services/interviewService.ts`

**Step 1: Create interview service**

Create `src/services/interviewService.ts`:

```typescript
import prisma from '../lib/prisma';
import { scoringEngine } from './scoringEngine';
import { AppError } from '../middleware/errorHandler';

export interface CreateInterviewInput {
  opportunityId: string;
  contactId?: string;
  scheduledDate: Date;
  stage: 'phone_screen' | 'first_round' | 'second_round' | 'final_round';
  source: 'referral' | 'warm_intro' | 'cold_outreach';
  notes?: string;
}

export const interviewService = {
  async create(userId: string, data: CreateInterviewInput) {
    // Verify opportunity ownership
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: data.opportunityId, userId },
    });

    if (!opportunity) {
      throw new AppError('Opportunity not found', 404);
    }

    // Calculate XP/OS for interview
    const scoring = scoringEngine.calculateInterviewScore(data.stage, data.source);

    // Create interview
    const interview = await prisma.interview.create({
      data: {
        ...data,
        userId,
        outcome: 'pending',
        xpAwarded: scoring.xp,
        osAwarded: scoring.os,
      },
    });

    // Award XP/OS to user (MASSIVE gain)
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: scoring.xp },
        totalOS: { increment: scoring.os },
      },
    });

    // Log XP gain
    await prisma.xPLog.create({
      data: {
        userId,
        reason: scoring.reason,
        xpAmount: scoring.xp,
        osAmount: scoring.os,
        metadata: {
          interviewId: interview.id,
          opportunityId: data.opportunityId,
        },
      },
    });

    // Update opportunity status
    await prisma.opportunity.update({
      where: { id: data.opportunityId },
      data: { status: 'interviewing' },
    });

    return interview;
  },

  async findAll(userId: string) {
    return prisma.interview.findMany({
      where: { userId },
      orderBy: { scheduledDate: 'desc' },
      include: {
        opportunity: true,
        contact: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });
  },

  async update(userId: string, interviewId: string, data: Partial<CreateInterviewInput> & { outcome?: string }) {
    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    return prisma.interview.update({
      where: { id: interviewId },
      data,
    });
  },
};
```

**Step 2: Create interview routes**

Create `src/routes/interviews.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { interviewService } from '../services/interviewService';

const router = Router();
router.use(authenticate);

// Create interview (awards MASSIVE XP/OS)
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const interview = await interviewService.create(userId, req.body);

    res.status(201).json({
      success: true,
      data: interview,
      message: `🎉 INTERVIEW! +${interview.xpAwarded} XP, +${interview.osAwarded} OS`,
    });
  } catch (error) {
    next(error);
  }
});

// Get all interviews
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const interviews = await interviewService.findAll(userId);

    res.json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    next(error);
  }
});

// Update interview (e.g., mark outcome)
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const interview = await interviewService.update(userId, req.params.id, req.body);

    res.json({
      success: true,
      data: interview,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import interviewRoutes from './routes/interviews';

app.use('/api/interviews', interviewRoutes);
```

**Step 4: Create opportunity routes (needed for interviews)**

Create `src/routes/opportunities.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// Create opportunity
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const opportunity = await prisma.opportunity.create({
      data: {
        ...req.body,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
});

// Get all opportunities
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const opportunities = await prisma.opportunity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        interviews: true,
        hiringManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: opportunities,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

Modify `src/server.ts`:

```typescript
import opportunityRoutes from './routes/opportunities';

app.use('/api/opportunities', opportunityRoutes);
```

**Step 5: Test interview creation**

Create opportunity first:
```bash
curl -X POST http://localhost:3000/api/opportunities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "role":"Senior Product Manager",
    "company":"StartupCo",
    "status":"prospect"
  }'
```

Then create interview:
```bash
curl -X POST http://localhost:3000/api/interviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "opportunityId":"OPPORTUNITY_ID",
    "scheduledDate":"2026-01-15T14:00:00Z",
    "stage":"phone_screen",
    "source":"referral"
  }'
```

Expected: Returns interview + celebration message with HUGE XP/OS gain.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add interview tracking with massive XP/OS rewards"
```

---

### Task 11: Next-Action Recommendation Logic

**Files:**
- Create: `src/services/recommendationService.ts`
- Modify: `src/routes/contacts.ts`

**Step 1: Create recommendation engine**

Create `src/services/recommendationService.ts`:

```typescript
import prisma from '../lib/prisma';

export interface NextAction {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  template?: string;
}

export const recommendationService = {
  async getNextAction(userId: string, contactId: string): Promise<NextAction> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      include: {
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 3,
        },
      },
    });

    if (!contact) {
      return {
        action: 'Contact not found',
        reason: '',
        priority: 'low',
      };
    }

    const lastInteraction = contact.interactions[0];
    const interactionCount = contact.interactions.length;

    // No interactions yet
    if (interactionCount === 0) {
      return {
        action: 'Send initial outreach',
        reason: 'No contact yet with this person',
        priority: 'high',
        template: 'quick_question',
      };
    }

    // Check if follow-up is due
    if (lastInteraction?.followUpDate && new Date(lastInteraction.followUpDate) <= new Date()) {
      return {
        action: `Send follow-up #${lastInteraction.followUpCount + 1}`,
        reason: 'Follow-up is due',
        priority: 'high',
        template: 'follow_up',
      };
    }

    // Check warmth and suggest next step
    switch (contact.warmthLevel) {
      case 'cold':
        if (interactionCount >= 3) {
          return {
            action: 'Try different channel or send Value Pack',
            reason: '3 attempts with no response',
            priority: 'medium',
            template: 'value_pack',
          };
        }
        return {
          action: 'Send follow-up',
          reason: 'No response yet, persistence pays off',
          priority: 'medium',
          template: 'follow_up',
        };

      case 'warm':
        if (lastInteraction?.outcome === 'response_received') {
          return {
            action: 'Schedule call or ask for intro',
            reason: 'Contact is responsive',
            priority: 'high',
            template: 'bait_and_switch',
          };
        }
        return {
          action: 'Continue conversation',
          reason: 'Build relationship',
          priority: 'medium',
        };

      case 'hot':
        return {
          action: 'Ask for referral to hiring manager',
          reason: 'Contact is engaged - go for the ask',
          priority: 'high',
          template: 'referral_request',
        };

      default:
        return {
          action: 'Review contact history',
          reason: '',
          priority: 'low',
        };
    }
  },

  async getBulkRecommendations(userId: string, limit = 10) {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        interactions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const recommendations = await Promise.all(
      contacts.map(async (contact) => ({
        contact,
        nextAction: await this.getNextAction(userId, contact.id),
      }))
    );

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.nextAction.priority] - priorityOrder[b.nextAction.priority];
    });
  },
};
```

**Step 2: Add recommendation endpoint to contacts route**

Modify `src/routes/contacts.ts` (add before export):

```typescript
import { recommendationService } from '../services/recommendationService';

// Get next action for a contact
router.get('/:id/next-action', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const nextAction = await recommendationService.getNextAction(userId, req.params.id);

    res.json({
      success: true,
      data: nextAction,
    });
  } catch (error) {
    next(error);
  }
});

// Get bulk recommendations (top contacts to act on)
router.get('/recommendations/all', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await recommendationService.getBulkRecommendations(userId, limit);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
});
```

**Step 3: Test recommendations**

Get next action for contact:
```bash
curl http://localhost:3000/api/contacts/CONTACT_ID/next-action \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns recommended next action with reason and priority.

Get bulk recommendations:
```bash
curl http://localhost:3000/api/contacts/recommendations/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns sorted list of contacts with next actions.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add next-action recommendation engine"
```

---

### Task 12: User Stats & Game State API

**Files:**
- Create: `src/routes/stats.ts`
- Create: `src/services/statsService.ts`

**Step 1: Create stats service**

Create `src/services/statsService.ts`:

```typescript
import prisma from '../lib/prisma';
import { scoringEngine } from './scoringEngine';

export const statsService = {
  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
        currentLevel: true,
        totalOS: true,
        currentStreak: true,
        bestStreak: true,
        lastActiveDate: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate level and XP progress
    const level = scoringEngine.calculateLevel(user.totalXP);
    const xpForNext = scoringEngine.xpForNextLevel(level);
    const xpProgress = ((user.totalXP % 1000) / 1000) * 100;

    // Calculate Opportunity Abundance
    const opportunityLevel = scoringEngine.getOpportunityLevel(user.totalOS);

    // Count interviews
    const interviewCount = await prisma.interview.count({
      where: { userId },
    });

    // Count referrals
    const referralCount = await prisma.interaction.count({
      where: {
        userId,
        outcome: 'referral_obtained',
      },
    });

    // Count active conversations
    const activeConversations = await prisma.contact.count({
      where: {
        userId,
        warmthLevel: { in: ['warm', 'hot'] },
      },
    });

    // Recent XP gains (last 10)
    const recentXP = await prisma.xPLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      xp: {
        total: user.totalXP,
        level,
        xpForNextLevel: xpForNext,
        progress: Math.floor(xpProgress),
      },
      opportunityScore: {
        total: user.totalOS,
        level: opportunityLevel.level,
        progress: opportunityLevel.progress,
        min: opportunityLevel.min,
        max: opportunityLevel.max,
      },
      interviews: interviewCount,
      referrals: referralCount,
      activeConversations,
      streak: {
        current: user.currentStreak,
        best: user.bestStreak,
      },
      recentActivity: recentXP,
    };
  },
};
```

**Step 2: Create stats routes**

Create `src/routes/stats.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { statsService } from '../services/statsService';

const router = Router();
router.use(authenticate);

// Get user game stats
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const stats = await statsService.getUserStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import statsRoutes from './routes/stats';

app.use('/api/stats', statsRoutes);
```

**Step 4: Test stats endpoint**

```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns complete game state with XP, OS, level, interviews, etc.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add user stats and game state API"
```

---

## Phase 3: XP & OS Engine

### Task 13: Streak Tracking System

**Files:**
- Create: `src/services/streakService.ts`
- Modify: `src/services/interactionService.ts`
- Modify: `src/services/interviewService.ts`

**Step 1: Create streak service**

Create `src/services/streakService.ts`:

```typescript
import prisma from '../lib/prisma';

export const streakService = {
  async updateStreak(userId: string): Promise<{
    currentStreak: number;
    bestStreak: number;
    streakMultiplier: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastActiveDate: true,
        currentStreak: true,
        bestStreak: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }

    let newStreak = user.currentStreak;
    let newBestStreak = user.bestStreak;

    if (!lastActive) {
      // First activity ever
      newStreak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no change
        newStreak = user.currentStreak;
      } else if (daysDiff === 1) {
        // Consecutive day
        newStreak = user.currentStreak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    // Update best streak
    if (newStreak > newBestStreak) {
      newBestStreak = newStreak;
    }

    // Calculate multiplier
    let multiplier = 1.0;
    if (newStreak >= 14) {
      multiplier = 2.0;
    } else if (newStreak >= 7) {
      multiplier = 1.5;
    } else if (newStreak >= 3) {
      multiplier = 1.25;
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastActiveDate: new Date(),
      },
    });

    return {
      currentStreak: newStreak,
      bestStreak: newBestStreak,
      streakMultiplier: multiplier,
    };
  },

  getStreakMultiplier(currentStreak: number): number {
    if (currentStreak >= 14) return 2.0;
    if (currentStreak >= 7) return 1.5;
    if (currentStreak >= 3) return 1.25;
    return 1.0;
  },
};
```

**Step 2: Apply streak multiplier to interaction scoring**

Modify `src/services/interactionService.ts` (update the `create` function):

```typescript
// Add after calculating base scoring
const scoring = scoringEngine.calculateInteractionScore(
  data.type,
  data.outcome,
  followUpCount
);

// Update streak and get multiplier
const streakData = await streakService.updateStreak(userId);

// Apply streak multiplier to XP (not OS)
const finalXP = Math.floor(scoring.xp * streakData.streakMultiplier);
const finalOS = scoring.os;

// Create interaction with multiplied XP
const interaction = await prisma.interaction.create({
  data: {
    ...data,
    userId,
    followUpCount,
    xpAwarded: finalXP,
    osAwarded: finalOS,
  },
});

// Award XP/OS to user
await prisma.user.update({
  where: { id: userId },
  data: {
    totalXP: { increment: finalXP },
    totalOS: { increment: finalOS },
  },
});

// Log XP gain (include multiplier in reason)
let reason = scoring.reason;
if (streakData.streakMultiplier > 1.0) {
  reason += ` (${streakData.streakMultiplier}x streak bonus)`;
}

await prisma.xPLog.create({
  data: {
    userId,
    reason,
    xpAmount: finalXP,
    osAmount: finalOS,
    metadata: {
      interactionId: interaction.id,
      contactId: data.contactId,
      streakMultiplier: streakData.streakMultiplier,
    },
  },
});
```

**Step 3: Add import at top of interactionService.ts**

Add to imports:
```typescript
import { streakService } from './streakService';
```

**Step 4: Apply streak multiplier to interviews too**

Modify `src/services/interviewService.ts` (update the `create` function similarly):

```typescript
// Add after calculating base scoring
const scoring = scoringEngine.calculateInterviewScore(data.stage, data.source);

// Update streak and get multiplier
const streakData = await streakService.updateStreak(userId);

// Apply streak multiplier to XP
const finalXP = Math.floor(scoring.xp * streakData.streakMultiplier);
const finalOS = scoring.os;

// Create interview with multiplied XP
const interview = await prisma.interview.create({
  data: {
    ...data,
    userId,
    outcome: 'pending',
    xpAwarded: finalXP,
    osAwarded: finalOS,
  },
});

// Award XP/OS to user
await prisma.user.update({
  where: { id: userId },
  data: {
    totalXP: { increment: finalXP },
    totalOS: { increment: finalOS },
  },
});

// Log with multiplier
let reason = scoring.reason;
if (streakData.streakMultiplier > 1.0) {
  reason += ` (${streakData.streakMultiplier}x streak bonus!)`;
}

await prisma.xPLog.create({
  data: {
    userId,
    reason,
    xpAmount: finalXP,
    osAmount: finalOS,
    metadata: {
      interviewId: interview.id,
      opportunityId: data.opportunityId,
      streakMultiplier: streakData.streakMultiplier,
    },
  },
});
```

Add import:
```typescript
import { streakService } from './streakService';
```

**Step 5: Test streak system**

Log interaction on consecutive days:

Day 1:
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"contactId":"CONTACT_ID","type":"email","direction":"outbound"}'
```

Day 3:
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"contactId":"CONTACT_ID","type":"email","direction":"outbound"}'
```

Check stats:
```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: After 3 consecutive days, streak = 3, and XP has 1.25x multiplier.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add streak tracking with XP multipliers"
```

---

### Task 14: Daily Quest System

**Files:**
- Create: `src/routes/quests.ts`
- Create: `src/services/questService.ts`

**Step 1: Create quest service**

Create `src/services/questService.ts`:

```typescript
import prisma from '../lib/prisma';

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  category: 'high_impact' | 'medium_impact' | 'momentum';
  bonusXP: number;
  bonusOS: number;
  progressCheck: (userId: string) => Promise<{ completed: boolean; progress: number; total: number }>;
}

// Quest catalog
export const availableQuests: QuestDefinition[] = [
  // High Impact
  {
    id: 'have_conversation',
    name: 'Strategic Conversation',
    description: 'Have 1 call or coffee chat',
    category: 'high_impact',
    bonusXP: 200,
    bonusOS: 50,
    progressCheck: async (userId: string) => {
      const count = await prisma.interaction.count({
        where: {
          userId,
          type: { in: ['call', 'coffee'] },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 1, progress: count, total: 1 };
    },
  },
  {
    id: 'send_value_pack',
    name: 'High-Effort Outreach',
    description: 'Send 1 Value Pack (physical letter)',
    category: 'high_impact',
    bonusXP: 150,
    bonusOS: 30,
    progressCheck: async (userId: string) => {
      const count = await prisma.interaction.count({
        where: {
          userId,
          type: 'physical_letter',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 1, progress: count, total: 1 };
    },
  },
  {
    id: 'get_referral',
    name: 'Referral Hunter',
    description: 'Get 1 referral or warm intro',
    category: 'high_impact',
    bonusXP: 300,
    bonusOS: 100,
    progressCheck: async (userId: string) => {
      const count = await prisma.interaction.count({
        where: {
          userId,
          outcome: { in: ['referral_obtained', 'intro_obtained'] },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 1, progress: count, total: 1 };
    },
  },
  {
    id: 'complete_4th_followup',
    name: 'Persistence Pays',
    description: 'Complete 4th follow-up on a cold lead',
    category: 'high_impact',
    bonusXP: 100,
    bonusOS: 20,
    progressCheck: async (userId: string) => {
      const count = await prisma.interaction.count({
        where: {
          userId,
          followUpCount: { gte: 4 },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 1, progress: count, total: 1 };
    },
  },

  // Medium Impact
  {
    id: 'find_hiring_managers',
    name: 'Research Sprint',
    description: 'Find 3 hiring manager emails',
    category: 'medium_impact',
    bonusXP: 100,
    bonusOS: 15,
    progressCheck: async (userId: string) => {
      const count = await prisma.contact.count({
        where: {
          userId,
          tags: { has: 'hiring_manager' },
          email: { not: null },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 3, progress: count, total: 3 };
    },
  },
  {
    id: 'send_personalized_outreach',
    name: 'Personalized Outreach',
    description: 'Send 3 personalized emails or DMs',
    category: 'medium_impact',
    bonusXP: 80,
    bonusOS: 15,
    progressCheck: async (userId: string) => {
      const count = await prisma.interaction.count({
        where: {
          userId,
          type: { in: ['email', 'linkedin_dm'] },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 3, progress: count, total: 3 };
    },
  },
  {
    id: 'advance_contacts',
    name: 'Pipeline Progression',
    description: 'Advance 2 contacts to next stage',
    category: 'medium_impact',
    bonusXP: 120,
    bonusOS: 25,
    progressCheck: async (userId: string) => {
      // Count contacts where warmth changed today OR outcome obtained today
      const count = await prisma.interaction.count({
        where: {
          userId,
          outcome: { not: null },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 2, progress: count, total: 2 };
    },
  },

  // Momentum
  {
    id: 'add_contacts',
    name: 'Network Expansion',
    description: 'Add 5 new contacts with research',
    category: 'momentum',
    bonusXP: 50,
    bonusOS: 10,
    progressCheck: async (userId: string) => {
      const count = await prisma.contact.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 5, progress: count, total: 5 };
    },
  },
  {
    id: 'complete_followups',
    name: 'Follow-Up Blitz',
    description: 'Complete 5 follow-ups from queue',
    category: 'momentum',
    bonusXP: 60,
    bonusOS: 10,
    progressCheck: async (userId: string) => {
      const count = await prisma.interaction.count({
        where: {
          userId,
          followUpCount: { gte: 1 },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      return { completed: count >= 5, progress: count, total: 5 };
    },
  },
];

export const questService = {
  async getTodaysQuests(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's quest selection
    let dailyQuest = await prisma.dailyQuest.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!dailyQuest) {
      // Create new daily quest (no selections yet)
      dailyQuest = await prisma.dailyQuest.create({
        data: {
          userId,
          date: today,
        },
      });
    }

    return dailyQuest;
  },

  async selectQuests(
    userId: string,
    selections: {
      highImpact1?: string;
      highImpact2?: string;
      mediumImpact1?: string;
      mediumImpact2?: string;
      momentum1?: string;
    }
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate selections exist in catalog
    const allSelections = Object.values(selections).filter(Boolean);
    for (const questId of allSelections) {
      const quest = availableQuests.find((q) => q.id === questId);
      if (!quest) {
        throw new Error(`Invalid quest ID: ${questId}`);
      }
    }

    // Update daily quest
    const dailyQuest = await prisma.dailyQuest.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: selections,
      create: {
        userId,
        date: today,
        ...selections,
      },
    });

    return dailyQuest;
  },

  async checkProgress(userId: string) {
    const dailyQuest = await this.getTodaysQuests(userId);

    const selectedQuestIds = [
      dailyQuest.highImpact1,
      dailyQuest.highImpact2,
      dailyQuest.mediumImpact1,
      dailyQuest.mediumImpact2,
      dailyQuest.momentum1,
    ].filter(Boolean) as string[];

    const progress = await Promise.all(
      selectedQuestIds.map(async (questId) => {
        const quest = availableQuests.find((q) => q.id === questId);
        if (!quest) return null;

        const result = await quest.progressCheck(userId);
        return {
          quest,
          ...result,
        };
      })
    );

    const validProgress = progress.filter(Boolean);
    const allCompleted = validProgress.every((p) => p?.completed);

    // Award bonus if all completed and not already awarded
    if (allCompleted && !dailyQuest.completed && validProgress.length > 0) {
      const totalBonusXP = validProgress.reduce((sum, p) => sum + (p?.quest.bonusXP || 0), 0);
      const totalBonusOS = validProgress.reduce((sum, p) => sum + (p?.quest.bonusOS || 0), 0);

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalXP: { increment: totalBonusXP },
          totalOS: { increment: totalBonusOS },
        },
      });

      await prisma.xPLog.create({
        data: {
          userId,
          reason: 'Daily quests completed!',
          xpAmount: totalBonusXP,
          osAmount: totalBonusOS,
          metadata: { questIds: selectedQuestIds },
        },
      });

      await prisma.dailyQuest.update({
        where: { id: dailyQuest.id },
        data: {
          completed: true,
          bonusXP: totalBonusXP,
        },
      });

      return {
        completed: true,
        progress: validProgress,
        bonusAwarded: { xp: totalBonusXP, os: totalBonusOS },
      };
    }

    return {
      completed: allCompleted,
      progress: validProgress,
      bonusAwarded: dailyQuest.completed ? { xp: dailyQuest.bonusXP, os: 0 } : null,
    };
  },

  getQuestCatalog() {
    return {
      highImpact: availableQuests.filter((q) => q.category === 'high_impact'),
      mediumImpact: availableQuests.filter((q) => q.category === 'medium_impact'),
      momentum: availableQuests.filter((q) => q.category === 'momentum'),
    };
  },
};
```

**Step 2: Create quest routes**

Create `src/routes/quests.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { questService } from '../services/questService';

const router = Router();
router.use(authenticate);

// Get quest catalog (available quests to choose from)
router.get('/catalog', async (req, res, next) => {
  try {
    const catalog = questService.getQuestCatalog();

    res.json({
      success: true,
      data: catalog,
    });
  } catch (error) {
    next(error);
  }
});

// Get today's selected quests
router.get('/today', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const quests = await questService.getTodaysQuests(userId);

    res.json({
      success: true,
      data: quests,
    });
  } catch (error) {
    next(error);
  }
});

// Select today's quests
router.post('/select', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const selections = req.body;

    const dailyQuest = await questService.selectQuests(userId, selections);

    res.json({
      success: true,
      data: dailyQuest,
    });
  } catch (error) {
    next(error);
  }
});

// Check quest progress
router.get('/progress', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const progress = await questService.checkProgress(userId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import questRoutes from './routes/quests';

app.use('/api/quests', questRoutes);
```

**Step 4: Test daily quests**

Get catalog:
```bash
curl http://localhost:3000/api/quests/catalog \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Select quests:
```bash
curl -X POST http://localhost:3000/api/quests/select \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "highImpact1": "have_conversation",
    "highImpact2": "send_value_pack",
    "mediumImpact1": "find_hiring_managers",
    "mediumImpact2": "send_personalized_outreach",
    "momentum1": "add_contacts"
  }'
```

Check progress:
```bash
curl http://localhost:3000/api/quests/progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns completion status and awards bonus XP when all completed.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add daily quest system with bonus XP/OS"
```

---

### Task 15: Badge System

**Files:**
- Create: `src/services/badgeService.ts`
- Modify: `src/services/interactionService.ts`

**Step 1: Create badge service**

Create `src/services/badgeService.ts`:

```typescript
import prisma from '../lib/prisma';

export interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export const badgeDefinitions: Record<string, BadgeDefinition> = {
  intel_gathered: {
    type: 'intel_gathered',
    name: 'Intel Gatherer',
    description: 'Got valuable info from a conversation (side quest completed!)',
    iconUrl: '/badges/intel.svg',
  },
  persistence_3rd: {
    type: 'persistence_3rd',
    name: 'Persistent',
    description: 'Completed 3rd follow-up',
    iconUrl: '/badges/persistence.svg',
  },
  persistence_4th: {
    type: 'persistence_4th',
    name: 'Relentless',
    description: 'Completed 4th follow-up (book says this is when it pays off!)',
    iconUrl: '/badges/relentless.svg',
  },
  network_effect: {
    type: 'network_effect',
    name: 'Network Effect',
    description: 'Second-order benefit: contact introduced you to someone new',
    iconUrl: '/badges/network.svg',
  },
  mailer_25: {
    type: 'mailer_25',
    name: 'Mailer',
    description: 'Sent 25 physical letters',
    iconUrl: '/badges/mailer.svg',
  },
  campaigner_50: {
    type: 'campaigner_50',
    name: 'Campaigner',
    description: 'Sent 50 physical letters',
    iconUrl: '/badges/campaigner.svg',
  },
  saturation_75: {
    type: 'saturation_75',
    name: 'Saturation',
    description: 'Sent 75 physical letters (book target!)',
    iconUrl: '/badges/saturation.svg',
  },
  first_interview: {
    type: 'first_interview',
    name: 'Interview Unlocked',
    description: 'Landed your first interview!',
    iconUrl: '/badges/first-interview.svg',
  },
  orbit_reached: {
    type: 'orbit_reached',
    name: 'Orbit Achieved',
    description: 'Reached Orbit level (5+ interviews)',
    iconUrl: '/badges/orbit.svg',
  },
  abundant_reached: {
    type: 'abundant_reached',
    name: 'Abundance Unlocked',
    description: 'Reached Abundant level (8+ interviews) - negotiating from power!',
    iconUrl: '/badges/abundant.svg',
  },
  streak_7: {
    type: 'streak_7',
    name: '7-Day Streak',
    description: 'Stayed active for 7 consecutive days',
    iconUrl: '/badges/streak-7.svg',
  },
  streak_14: {
    type: 'streak_14',
    name: '14-Day Streak',
    description: 'Stayed active for 14 consecutive days',
    iconUrl: '/badges/streak-14.svg',
  },
};

export const badgeService = {
  async awardBadge(userId: string, badgeType: string): Promise<void> {
    const definition = badgeDefinitions[badgeType];
    if (!definition) {
      throw new Error(`Unknown badge type: ${badgeType}`);
    }

    // Check if user already has this badge
    const existing = await prisma.badge.findFirst({
      where: {
        userId,
        type: badgeType,
      },
    });

    if (existing) {
      return; // Already awarded
    }

    // Award badge
    await prisma.badge.create({
      data: {
        userId,
        type: definition.type,
        name: definition.name,
        description: definition.description,
        iconUrl: definition.iconUrl,
      },
    });

    // Log XP for badge (small bonus)
    await prisma.xPLog.create({
      data: {
        userId,
        reason: `Badge earned: ${definition.name}`,
        xpAmount: 50,
        osAmount: 0,
        metadata: { badgeType },
      },
    });

    // Award XP
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: 50 },
      },
    });
  },

  async checkAndAwardBadges(userId: string): Promise<void> {
    // Check for badge-worthy achievements

    // Intel gatherer badge
    const intelCount = await prisma.interaction.count({
      where: {
        userId,
        outcome: 'intel_gathered',
      },
    });
    if (intelCount >= 1) {
      await this.awardBadge(userId, 'intel_gathered');
    }

    // Persistence badges
    const persistence3 = await prisma.interaction.count({
      where: {
        userId,
        followUpCount: { gte: 3 },
      },
    });
    if (persistence3 >= 1) {
      await this.awardBadge(userId, 'persistence_3rd');
    }

    const persistence4 = await prisma.interaction.count({
      where: {
        userId,
        followUpCount: { gte: 4 },
      },
    });
    if (persistence4 >= 1) {
      await this.awardBadge(userId, 'persistence_4th');
    }

    // Mailer badges
    const physicalLetters = await prisma.interaction.count({
      where: {
        userId,
        type: 'physical_letter',
      },
    });
    if (physicalLetters >= 25) {
      await this.awardBadge(userId, 'mailer_25');
    }
    if (physicalLetters >= 50) {
      await this.awardBadge(userId, 'campaigner_50');
    }
    if (physicalLetters >= 75) {
      await this.awardBadge(userId, 'saturation_75');
    }

    // Interview badges
    const interviewCount = await prisma.interview.count({
      where: { userId },
    });
    if (interviewCount >= 1) {
      await this.awardBadge(userId, 'first_interview');
    }

    // Opportunity level badges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalOS: true },
    });
    if (user) {
      if (user.totalOS >= 5000) {
        await this.awardBadge(userId, 'orbit_reached');
      }
      if (user.totalOS >= 8000) {
        await this.awardBadge(userId, 'abundant_reached');
      }
    }

    // Streak badges
    const userStreak = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true },
    });
    if (userStreak) {
      if (userStreak.currentStreak >= 7) {
        await this.awardBadge(userId, 'streak_7');
      }
      if (userStreak.currentStreak >= 14) {
        await this.awardBadge(userId, 'streak_14');
      }
    }
  },

  async getUserBadges(userId: string) {
    return prisma.badge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });
  },
};
```

**Step 2: Trigger badge checks after key actions**

Modify `src/services/interactionService.ts` (add at end of create function):

```typescript
// Check for badge awards
await badgeService.checkAndAwardBadges(userId);
```

Add import:
```typescript
import { badgeService } from './badgeService';
```

**Step 3: Modify interviewService.ts similarly**

Add to end of `create` function in `src/services/interviewService.ts`:

```typescript
// Check for badge awards
await badgeService.checkAndAwardBadges(userId);
```

Add import:
```typescript
import { badgeService } from './badgeService';
```

**Step 4: Create badge routes**

Create `src/routes/badges.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { badgeService } from '../services/badgeService';

const router = Router();
router.use(authenticate);

// Get user's badges
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const badges = await badgeService.getUserBadges(userId);

    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 5: Register routes**

Modify `src/server.ts`:

```typescript
import badgeRoutes from './routes/badges';

app.use('/api/badges', badgeRoutes);
```

**Step 6: Test badge system**

Log interaction with intel_gathered outcome:
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contactId":"CONTACT_ID",
    "type":"call",
    "direction":"outbound",
    "outcome":"intel_gathered",
    "outcomeDetails":"Got intro to her brother"
  }'
```

Get badges:
```bash
curl http://localhost:3000/api/badges \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns "Intel Gatherer" badge.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add badge system with auto-awards"
```

---

### Task 16: Level-Up Calculation Update

**Files:**
- Modify: `src/services/statsService.ts`

**Step 1: Fix XP progress calculation**

Modify `src/services/statsService.ts` (fix progress calculation):

```typescript
// Calculate level and XP progress
const level = scoringEngine.calculateLevel(user.totalXP);
const xpForNext = scoringEngine.xpForNextLevel(level);
const currentLevelMin = scoringEngine.xpForNextLevel(level - 1);
const xpInCurrentLevel = user.totalXP - currentLevelMin;
const xpNeededForLevel = xpForNext - currentLevelMin;
const xpProgress = Math.floor((xpInCurrentLevel / xpNeededForLevel) * 100);
```

**Step 2: Test level progression**

```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns accurate level, XP, and progress percentage.

**Step 3: Commit**

```bash
git add .
git commit -m "fix: correct XP level progress calculation"
```

---

### Task 17: Opportunity Abundance Unlocks

**Files:**
- Create: `src/services/unlockService.ts`
- Modify: `src/services/statsService.ts`

**Step 1: Create unlock service**

Create `src/services/unlockService.ts`:

```typescript
export interface Unlock {
  name: string;
  description: string;
  osRequired: number;
  unlocked: boolean;
}

export const unlockService = {
  getUnlocks(totalOS: number): Unlock[] {
    return [
      {
        name: 'Intro Request Template',
        description: 'One-click ask for warm intro',
        osRequired: 3000,
        unlocked: totalOS >= 3000,
      },
      {
        name: 'Interview Prep AI',
        description: 'Claude analyzes contact history, suggests talking points',
        osRequired: 5000,
        unlocked: totalOS >= 5000,
      },
      {
        name: 'Negotiation Mode',
        description: 'Track competing offers, calculate leverage',
        osRequired: 8000,
        unlocked: totalOS >= 8000,
      },
      {
        name: 'Victory Lap',
        description: 'Export network map + strategy report',
        osRequired: 12000,
        unlocked: totalOS >= 12000,
      },
    ];
  },
};
```

**Step 2: Add unlocks to stats response**

Modify `src/services/statsService.ts` (add to return object):

```typescript
import { unlockService } from './unlockService';

// Add to return statement
return {
  xp: { ... },
  opportunityScore: { ... },
  interviews: interviewCount,
  referrals: referralCount,
  activeConversations,
  streak: { ... },
  recentActivity: recentXP,
  unlocks: unlockService.getUnlocks(user.totalOS), // Add this
};
```

**Step 3: Test unlocks**

```bash
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns unlocks array showing which features are unlocked.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add Opportunity Abundance unlocks"
```

---

### Task 18: XP Feed (Recent Activity)

**Files:**
- Create: `src/routes/feed.ts`

**Step 1: Create feed route**

Create `src/routes/feed.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// Get XP activity feed
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    const feed = await prisma.xPLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: feed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 2: Register routes**

Modify `src/server.ts`:

```typescript
import feedRoutes from './routes/feed';

app.use('/api/feed', feedRoutes);
```

**Step 3: Test feed**

```bash
curl http://localhost:3000/api/feed?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns recent XP gains with reasons.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add XP activity feed endpoint"
```

---

## Phase 4: AI Integration

### Task 19: AI Service Setup (Claude/OpenAI)

**Files:**
- Create: `src/services/aiService.ts`
- Create: `src/lib/anthropic.ts`
- Modify: `.env`

**Step 1: Install AI SDKs**

```bash
npm install @anthropic-ai/sdk openai
```

**Step 2: Add API keys to .env**

Edit `.env`:

```
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
AI_PROVIDER="anthropic"  # or "openai"
```

**Step 3: Create Anthropic client**

Create `src/lib/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default anthropic;
```

**Step 4: Create AI service abstraction**

Create `src/services/aiService.ts`:

```typescript
import anthropic from '../lib/anthropic';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic';

export const aiService = {
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const maxTokens = options?.maxTokens || 1000;
    const temperature = options?.temperature || 0.7;

    if (AI_PROVIDER === 'anthropic') {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      throw new Error('Unexpected response format');
    } else if (AI_PROVIDER === 'openai') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      return response.choices[0].message.content || '';
    }

    throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
  },
};
```

**Step 5: Test AI service**

Create a simple test route to verify AI is working:

```bash
curl -X POST http://localhost:3000/api/test-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt":"Say hello"}'
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add AI service with Claude/OpenAI support"
```

---

### Task 20: Message Template System

**Files:**
- Create: `src/services/templateService.ts`
- Create: `src/routes/templates.ts`

**Step 1: Create template service with book-based templates**

Create `src/services/templateService.ts`:

```typescript
import { aiService } from './aiService';

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  scenario: string;
  basePrompt: string;
}

// Templates from "The Reverse Job Search Method"
export const messageTemplates: MessageTemplate[] = [
  {
    id: 'quick_question',
    name: 'Quick Question',
    description: 'Initial cold outreach (book template)',
    scenario: 'First contact with someone you don\'t know',
    basePrompt: `You are helping draft a professional cold outreach email based on "The Reverse Job Search Method" book.

The "Quick Question" template is designed to:
- Be short (3-4 sentences max)
- Reference something specific about them or their work
- Ask a genuine, thoughtful question about their domain
- NOT ask for a job or meeting upfront
- Sound curious and respectful of their time

Generate a personalized email following this structure:
1. Brief intro (who you are in 1 sentence)
2. Specific reference to their work/post/achievement
3. Genuine question about their domain/expertise
4. Thank them for their time

Keep it under 100 words. Be warm but professional.`,
  },
  {
    id: 'value_letter',
    name: 'Value Letter',
    description: 'Demonstrate your value (book template)',
    scenario: 'When you want to show what you can offer',
    basePrompt: `You are helping draft a "Value Letter" based on "The Reverse Job Search Method" book.

A Value Letter should:
- Open with why you're reaching out (specific role or company interest)
- Demonstrate you've researched them (mention specific challenges/initiatives)
- Provide 2-3 concrete ideas or insights that would help them
- Show expertise without being arrogant
- End with a soft ask (15-min conversation)

Structure:
1. Opening: Why this company/role excites you
2. Research: Show you understand their challenges
3. Value: 2-3 actionable ideas/insights
4. Soft close: Ask for brief conversation

Keep it under 300 words. Be confident but humble.`,
  },
  {
    id: 'bait_and_switch',
    name: 'Bait and Switch',
    description: 'Turn informational call into interview discussion (book technique)',
    scenario: 'During or after an informational conversation',
    basePrompt: `You are helping craft a "Bait and Switch" transition based on "The Reverse Job Search Method" book.

This technique is used during/after an informational conversation to pivot to job opportunities.

The phrasing should:
- Acknowledge the conversation has been helpful
- Naturally transition with something like: "I wonder if there might be ways I could add value to your team?"
- Be genuine and not pushy
- Open the door without demanding

Generate a natural transition message that:
1. Thanks them for the conversation/insights
2. Mentions something specific you discussed
3. Uses the "I wonder..." framing to ask about opportunities
4. Offers to share more about your background if helpful

Keep it conversational and genuine (50-75 words).`,
  },
  {
    id: 'follow_up',
    name: 'Follow-Up',
    description: 'Gentle persistence after no response (book emphasizes 3-4 follow-ups)',
    scenario: 'No response to initial outreach',
    basePrompt: `You are helping draft a follow-up email based on "The Reverse Job Search Method" book.

The book emphasizes that success often comes after the 3rd or 4th follow-up.

Follow-up should:
- Be brief (2-3 sentences)
- Not be apologetic or desperate
- Add new value (recent article, new insight, update)
- Make it easy to respond
- Assume they're busy, not ignoring

Generate a follow-up that:
1. Brief reference to previous email (no guilt trip)
2. Add something new (insight, article, relevant update)
3. Simple question or easy response option

Keep it under 75 words. Stay professional and value-focused.`,
  },
  {
    id: 'referral_request',
    name: 'Referral Request',
    description: 'Ask warm contact for referral to hiring manager',
    scenario: 'When contact is engaged and relationship is warm',
    basePrompt: `You are helping draft a referral request based on "The Reverse Job Search Method" book.

The book says referrals carry significantly more weight than applications.

Referral request should:
- Only ask when relationship is warm
- Be specific about the role/team you're interested in
- Make it easy for them (provide language they can use)
- Show you've done your homework
- Express genuine gratitude

Generate a referral request that:
1. Mentions your previous conversation(s)
2. Specific role/team you're targeting
3. Brief why you're a fit (1-2 sentences)
4. Easy ask: "Would you be comfortable introducing me to [Name]?"
5. Offer to provide any materials they need

Keep it under 150 words. Make it easy for them to say yes.`,
  },
  {
    id: 'intro_request',
    name: 'Introduction Request',
    description: 'Ask for intro to someone in their network',
    scenario: 'When you need to expand your network through existing contacts',
    basePrompt: `You are helping draft an introduction request.

Introduction requests should:
- Be specific about who and why
- Explain the connection/mutual benefit
- Make it easy to forward
- Respect their social capital

Generate an intro request that:
1. Reference your relationship with them
2. Specific person you'd like to meet and why
3. What you hope to discuss (NOT "I want a job")
4. Easy forwarding language

Keep it under 100 words.`,
  },
];

export const templateService = {
  getTemplates(): MessageTemplate[] {
    return messageTemplates;
  },

  getTemplate(templateId: string): MessageTemplate | undefined {
    return messageTemplates.find((t) => t.id === templateId);
  },

  async generateMessage(
    templateId: string,
    context: {
      contactName: string;
      contactCompany?: string;
      contactRole?: string;
      userBackground?: string;
      specificContext?: string; // User can provide custom context
      targetRole?: string;
    }
  ): Promise<string> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const contextPrompt = `
Contact Information:
- Name: ${context.contactName}
${context.contactCompany ? `- Company: ${context.contactCompany}` : ''}
${context.contactRole ? `- Role: ${context.contactRole}` : ''}

Your Background:
${context.userBackground || 'Professional seeking opportunities in this field'}

${context.specificContext ? `Additional Context:\n${context.specificContext}` : ''}

${context.targetRole ? `Target Role: ${context.targetRole}` : ''}

Generate the message following the template guidelines above.
`;

    const message = await aiService.generateText(
      template.basePrompt,
      contextPrompt,
      { maxTokens: 500, temperature: 0.7 }
    );

    return message;
  },
};
```

**Step 2: Create template routes**

Create `src/routes/templates.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { templateService } from '../services/templateService';

const router = Router();
router.use(authenticate);

// Get all templates
router.get('/', async (req, res, next) => {
  try {
    const templates = templateService.getTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

// Generate message from template
router.post('/generate', async (req, res, next) => {
  try {
    const { templateId, context } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'templateId required',
      });
    }

    const message = await templateService.generateMessage(templateId, context);

    res.json({
      success: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import templateRoutes from './routes/templates';

app.use('/api/templates', templateRoutes);
```

**Step 4: Test template generation**

Get templates:
```bash
curl http://localhost:3000/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Generate message:
```bash
curl -X POST http://localhost:3000/api/templates/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "templateId": "quick_question",
    "context": {
      "contactName": "Sarah Johnson",
      "contactCompany": "TechCorp",
      "contactRole": "Engineering Manager",
      "userBackground": "Software engineer with 5 years experience in React and Node.js",
      "specificContext": "I saw her post about scaling microservices on LinkedIn"
    }
  }'
```

Expected: Returns AI-generated personalized message.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add message template system with AI generation"
```

---

### Task 21: Reply Parsing (Extract Outcomes)

**Files:**
- Create: `src/services/replyParserService.ts`
- Create: `src/routes/parse.ts`

**Step 1: Create reply parser service**

Create `src/services/replyParserService.ts`:

```typescript
import { aiService } from './aiService';

export interface ParsedReply {
  outcome: 'referral_obtained' | 'intro_obtained' | 'intel_gathered' | 'response_received' | 'no_interest' | 'unclear';
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedFollowUpDate?: string; // ISO date
  extractedInfo: {
    newContactNames?: string[];
    insights?: string[];
    nextSteps?: string[];
  };
  confidence: number; // 0-100
}

export const replyParserService = {
  async parseReply(
    originalMessage: string,
    replyMessage: string,
    contactName: string
  ): Promise<ParsedReply> {
    const systemPrompt = `You are an AI assistant that analyzes email/message replies to classify outcomes for a job search tracking system.

Your job is to:
1. Determine the outcome type (referral, intro, intel, general response, or no interest)
2. Assess sentiment
3. Extract actionable information (new contacts, insights, next steps)
4. Suggest follow-up timing if applicable
5. Rate your confidence

Return ONLY valid JSON with this exact structure:
{
  "outcome": "referral_obtained" | "intro_obtained" | "intel_gathered" | "response_received" | "no_interest" | "unclear",
  "sentiment": "positive" | "neutral" | "negative",
  "suggestedFollowUpDate": "YYYY-MM-DD" or null,
  "extractedInfo": {
    "newContactNames": ["name1", "name2"] or [],
    "insights": ["insight1", "insight2"] or [],
    "nextSteps": ["step1", "step2"] or []
  },
  "confidence": 0-100
}

Outcome definitions:
- "referral_obtained": They offered to introduce you to a hiring manager or refer you for a role
- "intro_obtained": They offered to introduce you to someone else (not hiring manager)
- "intel_gathered": They shared valuable information, advice, or industry insights
- "response_received": They responded but no clear outcome (keeping conversation going)
- "no_interest": Clear decline or lack of interest
- "unclear": Response is ambiguous or needs human review

For suggestedFollowUpDate:
- If they said they'll get back to you: estimate based on their timeline
- If positive but no clear next step: suggest 3-5 days
- If no interest: return null
- Format: "YYYY-MM-DD"`;

    const userPrompt = `Original message I sent to ${contactName}:
"""
${originalMessage}
"""

Their reply:
"""
${replyMessage}
"""

Analyze this reply and return the JSON classification.`;

    const response = await aiService.generateText(systemPrompt, userPrompt, {
      maxTokens: 800,
      temperature: 0.3, // Lower temperature for more consistent parsing
    });

    // Parse JSON response
    try {
      const parsed = JSON.parse(response);
      return parsed as ParsedReply;
    } catch (error) {
      // Fallback if AI doesn't return valid JSON
      return {
        outcome: 'unclear',
        sentiment: 'neutral',
        extractedInfo: {},
        confidence: 0,
      };
    }
  },
};
```

**Step 2: Create parse routes**

Create `src/routes/parse.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { replyParserService } from '../services/replyParserService';

const router = Router();
router.use(authenticate);

// Parse a reply
router.post('/reply', async (req, res, next) => {
  try {
    const { originalMessage, replyMessage, contactName } = req.body;

    if (!originalMessage || !replyMessage || !contactName) {
      return res.status(400).json({
        success: false,
        error: 'originalMessage, replyMessage, and contactName required',
      });
    }

    const parsed = await replyParserService.parseReply(
      originalMessage,
      replyMessage,
      contactName
    );

    res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import parseRoutes from './routes/parse';

app.use('/api/parse', parseRoutes);
```

**Step 4: Test reply parsing**

```bash
curl -X POST http://localhost:3000/api/parse/reply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contactName": "Sarah Johnson",
    "originalMessage": "Hi Sarah, I saw your post about scaling microservices. Quick question: how do you approach database migrations in a distributed system?",
    "replyMessage": "Great question! We use a phased rollout approach. Happy to chat more about this. I can also introduce you to my colleague Tom who leads our platform team if you want to learn more about our architecture."
  }'
```

Expected: Returns parsed outcome (likely "intro_obtained"), positive sentiment, and extracted info.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add AI-powered reply parsing"
```

---

### Task 22: Value Pack Generator

**Files:**
- Create: `src/services/valuePackService.ts`
- Create: `src/routes/valuePack.ts`

**Step 1: Create Value Pack generator service**

Create `src/services/valuePackService.ts`:

```typescript
import { aiService } from './aiService';
import prisma from '../lib/prisma';

export interface ValuePackInput {
  targetCompany: string;
  targetRole?: string;
  contactName?: string;
  userBackground: string;
  researchNotes?: string; // What user learned about company
  targetDepartment?: string;
}

export interface ValuePackOutput {
  valueLetter: string;
  resumeSummary: string;
  coverLetterSummary: string;
  suggestedIdeas: string[]; // 2-3 actionable ideas to include
}

export const valuePackService = {
  async generateValuePack(input: ValuePackInput): Promise<ValuePackOutput> {
    // Generate Value Letter
    const valueLetterPrompt = `You are helping create a "Value Pack" based on "The Reverse Job Search Method" book.

A Value Pack includes:
1. Value Letter (demonstrates what you can offer)
2. Tailored resume summary
3. Cover letter summary

Generate a compelling Value Letter for:

Target Company: ${input.targetCompany}
${input.targetRole ? `Target Role: ${input.targetRole}` : ''}
${input.contactName ? `Contact: ${input.contactName}` : ''}
${input.targetDepartment ? `Department: ${input.targetDepartment}` : ''}

User Background:
${input.userBackground}

${input.researchNotes ? `Research/Context:\n${input.researchNotes}` : ''}

The Value Letter should:
1. Open with specific interest in the company (mention recent news/initiatives)
2. Show you understand their challenges
3. Provide 2-3 concrete, actionable ideas that would help them
4. Connect your background to their needs
5. End with soft ask for conversation

Write a professional, confident but humble Value Letter (250-300 words).`;

    const valueLetter = await aiService.generateText(
      'You are a professional career advisor specializing in job search strategy.',
      valueLetterPrompt,
      { maxTokens: 800, temperature: 0.7 }
    );

    // Generate 2-3 actionable ideas
    const ideasPrompt = `Based on this context, generate 2-3 specific, actionable ideas this person could implement at ${input.targetCompany} ${input.targetRole ? `for the ${input.targetRole} role` : ''}.

User Background: ${input.userBackground}
${input.researchNotes ? `Research: ${input.researchNotes}` : ''}

Return ONLY a JSON array of strings (2-3 concrete ideas):
["Idea 1", "Idea 2", "Idea 3"]`;

    const ideasResponse = await aiService.generateText(
      'You are a strategic business consultant.',
      ideasPrompt,
      { maxTokens: 400, temperature: 0.8 }
    );

    let suggestedIdeas: string[] = [];
    try {
      suggestedIdeas = JSON.parse(ideasResponse);
    } catch {
      suggestedIdeas = ['Unable to generate ideas - add manually'];
    }

    // Generate resume summary
    const resumeSummaryPrompt = `Generate a brief resume summary (3-4 sentences) tailored for ${input.targetCompany} ${input.targetRole ? `(${input.targetRole})` : ''}.

User Background: ${input.userBackground}

Focus on:
- Relevant experience
- Key achievements with numbers
- Skills that match the role
- Why they're a strong fit

Keep it concise and achievement-focused (75-100 words).`;

    const resumeSummary = await aiService.generateText(
      'You are a professional resume writer.',
      resumeSummaryPrompt,
      { maxTokens: 300, temperature: 0.6 }
    );

    // Generate cover letter summary
    const coverLetterPrompt = `Generate a brief cover letter summary (2-3 paragraphs) for ${input.targetCompany} ${input.targetRole ? `(${input.targetRole})` : ''}.

User Background: ${input.userBackground}
${input.researchNotes ? `Company Research: ${input.researchNotes}` : ''}

Structure:
1. Why this company/role excites you
2. Relevant experience and achievements
3. Enthusiasm for contributing

Keep it genuine and concise (150-200 words).`;

    const coverLetterSummary = await aiService.generateText(
      'You are a professional resume writer.',
      coverLetterPrompt,
      { maxTokens: 500, temperature: 0.7 }
    );

    return {
      valueLetter,
      resumeSummary,
      coverLetterSummary,
      suggestedIdeas,
    };
  },
};
```

**Step 2: Create Value Pack routes**

Create `src/routes/valuePack.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { valuePackService } from '../services/valuePackService';

const router = Router();
router.use(authenticate);

// Generate Value Pack
router.post('/generate', async (req, res, next) => {
  try {
    const input = req.body;

    if (!input.targetCompany || !input.userBackground) {
      return res.status(400).json({
        success: false,
        error: 'targetCompany and userBackground required',
      });
    }

    const valuePack = await valuePackService.generateValuePack(input);

    res.json({
      success: true,
      data: valuePack,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import valuePackRoutes from './routes/valuePack';

app.use('/api/value-pack', valuePackRoutes);
```

**Step 4: Test Value Pack generation**

```bash
curl -X POST http://localhost:3000/api/value-pack/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "targetCompany": "TechCorp",
    "targetRole": "Senior Product Manager",
    "userBackground": "Product manager with 7 years experience scaling SaaS products from 0 to 100k users. Led cross-functional teams of 15+. Expert in user research, A/B testing, and growth metrics.",
    "researchNotes": "TechCorp just raised Series B and is expanding into enterprise market. They mentioned challenges with onboarding enterprise customers on their blog."
  }'
```

Expected: Returns complete Value Pack with letter, resume summary, cover letter, and actionable ideas.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add AI-powered Value Pack generator"
```

---

### Task 23: Interview Prep AI (Unlocked at Orbit)

**Files:**
- Create: `src/services/interviewPrepService.ts`
- Create: `src/routes/interviewPrep.ts`

**Step 1: Create interview prep service**

Create `src/services/interviewPrepService.ts`:

```typescript
import { aiService } from './aiService';
import prisma from '../lib/prisma';

export const interviewPrepService = {
  async generatePrepMaterial(
    userId: string,
    interviewId: string
  ): Promise<{
    talkingPoints: string[];
    questionsToAsk: string[];
    companyInsights: string;
    connectionNotes: string;
  }> {
    // Get interview details
    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, userId },
      include: {
        opportunity: true,
        contact: {
          include: {
            interactions: {
              orderBy: { timestamp: 'desc' },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new Error('Interview not found');
    }

    // Get all interactions with this company
    const companyInteractions = await prisma.interaction.findMany({
      where: {
        userId,
        contact: {
          company: interview.opportunity.company,
        },
      },
      include: {
        contact: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    // Build context from contact history
    const contactContext = interview.contact
      ? `
Previous conversations with ${interview.contact.name}:
${interview.contact.interactions
  .map(
    (i) =>
      `- ${i.timestamp.toISOString().split('T')[0]}: ${i.type} (${i.outcome || 'no outcome yet'})`
  )
  .slice(0, 5)
  .join('\n')}

Notes: ${interview.contact.notes || 'No notes'}
`
      : 'No previous contact history';

    const companyContext = `
Company: ${interview.opportunity.company}
Role: ${interview.opportunity.role}
Interview Stage: ${interview.stage}
How you got here: ${interview.source}

Other interactions with ${interview.opportunity.company}:
${companyInteractions
  .map((i) => `- ${i.contact.name} (${i.contact.role || 'Unknown role'}): ${i.outcome || 'ongoing'}`)
  .slice(0, 5)
  .join('\n')}
`;

    const prompt = `You are helping prepare for a job interview.

${companyContext}

${contactContext}

Generate interview prep material:
1. 5-7 talking points (specific achievements, relevant experience to highlight)
2. 5-7 thoughtful questions to ask the interviewer
3. Company insights based on interaction history
4. Notes on connections/warm introductions to mention

Return ONLY valid JSON:
{
  "talkingPoints": ["point1", "point2", ...],
  "questionsToAsk": ["question1", "question2", ...],
  "companyInsights": "string of insights",
  "connectionNotes": "string about who you know there"
}`;

    const response = await aiService.generateText(
      'You are an expert interview coach and career strategist.',
      prompt,
      { maxTokens: 1500, temperature: 0.7 }
    );

    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      return {
        talkingPoints: ['Review your background', 'Prepare STAR stories'],
        questionsToAsk: ['What are the team priorities?', 'What does success look like?'],
        companyInsights: 'Unable to generate insights',
        connectionNotes: 'Review your contact history manually',
      };
    }
  },
};
```

**Step 2: Create interview prep routes**

Create `src/routes/interviewPrep.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { interviewPrepService } from '../services/interviewPrepService';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// Generate interview prep (requires Orbit level)
router.post('/:interviewId', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { interviewId } = req.params;

    // Check if user has unlocked this feature (Orbit = 5000 OS)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalOS: true },
    });

    if (!user || user.totalOS < 5000) {
      throw new AppError('Interview Prep AI unlocks at Orbit level (5000 OS)', 403);
    }

    const prepMaterial = await interviewPrepService.generatePrepMaterial(userId, interviewId);

    res.json({
      success: true,
      data: prepMaterial,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import interviewPrepRoutes from './routes/interviewPrep';

app.use('/api/interview-prep', interviewPrepRoutes);
```

**Step 4: Test interview prep (requires Orbit level)**

```bash
curl -X POST http://localhost:3000/api/interview-prep/INTERVIEW_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: If OS >= 5000, returns personalized prep material. Otherwise, returns 403 error.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Interview Prep AI (unlocks at Orbit)"
```

---

### Task 24: Smart Contact Research Helper

**Files:**
- Create: `src/services/researchService.ts`
- Create: `src/routes/research.ts`

**Step 1: Create research helper service**

Create `src/services/researchService.ts`:

```typescript
import { aiService } from './aiService';

export interface ResearchInput {
  contactName: string;
  company?: string;
  role?: string;
  linkedinUrl?: string;
  additionalContext?: string;
}

export interface ResearchOutput {
  outreachStrategy: string;
  conversationStarters: string[];
  commonGround: string[];
  suggestedTemplate: string; // Which template to use
}

export const researchService = {
  async generateOutreachStrategy(input: ResearchInput): Promise<ResearchOutput> {
    const prompt = `You are helping plan outreach to a professional contact.

Contact Information:
- Name: ${input.contactName}
${input.company ? `- Company: ${input.company}` : ''}
${input.role ? `- Role: ${input.role}` : ''}
${input.linkedinUrl ? `- LinkedIn: ${input.linkedinUrl}` : ''}
${input.additionalContext ? `- Context: ${input.additionalContext}` : ''}

Generate an outreach strategy:
1. Best approach (what angle to take)
2. 3-5 conversation starters (specific things to reference or ask about)
3. Potential common ground (shared interests, background, connections)
4. Recommended template (quick_question, value_letter, or intro_request)

Return ONLY valid JSON:
{
  "outreachStrategy": "string explaining recommended approach",
  "conversationStarters": ["starter1", "starter2", ...],
  "commonGround": ["item1", "item2", ...],
  "suggestedTemplate": "quick_question" | "value_letter" | "intro_request"
}`;

    const response = await aiService.generateText(
      'You are a networking and outreach strategist.',
      prompt,
      { maxTokens: 800, temperature: 0.7 }
    );

    try {
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      return {
        outreachStrategy: 'Start with a thoughtful question about their work',
        conversationStarters: ['Reference a recent post or achievement'],
        commonGround: ['Professional interest in the field'],
        suggestedTemplate: 'quick_question',
      };
    }
  },
};
```

**Step 2: Create research routes**

Create `src/routes/research.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { researchService } from '../services/researchService';

const router = Router();
router.use(authenticate);

// Generate outreach strategy
router.post('/strategy', async (req, res, next) => {
  try {
    const input = req.body;

    if (!input.contactName) {
      return res.status(400).json({
        success: false,
        error: 'contactName required',
      });
    }

    const strategy = await researchService.generateOutreachStrategy(input);

    res.json({
      success: true,
      data: strategy,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 3: Register routes**

Modify `src/server.ts`:

```typescript
import researchRoutes from './routes/research';

app.use('/api/research', researchRoutes);
```

**Step 4: Test research helper**

```bash
curl -X POST http://localhost:3000/api/research/strategy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contactName": "Sarah Johnson",
    "company": "TechCorp",
    "role": "VP of Engineering",
    "additionalContext": "She recently posted about microservices architecture challenges on LinkedIn"
  }'
```

Expected: Returns outreach strategy with conversation starters and recommended template.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add AI-powered contact research helper"
```

---

## Phase 5: Email System

### Task 25: Postmark Integration

**Files:**
- Create: `src/services/emailService.ts`
- Create: `src/lib/postmark.ts`
- Modify: `.env`

**Step 1: Install Postmark SDK**

```bash
npm install postmark
```

**Step 2: Add Postmark credentials to .env**

```
POSTMARK_API_KEY="your-postmark-server-token"
POSTMARK_FROM_EMAIL="you@yourdomain.com"
```

**Step 3: Create Postmark client**

Create `src/lib/postmark.ts`:

```typescript
import postmark from 'postmark';

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY || '');

export default client;
```

**Step 4: Create email service**

Create `src/services/emailService.ts`:

```typescript
import postmarkClient from '../lib/postmark';
import prisma from '../lib/prisma';

export const emailService = {
  async sendEmail(
    userId: string,
    contactId: string,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<{ messageId: string; success: boolean }> {
    // Get contact email
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!contact || !contact.email) {
      throw new Error('Contact email not found');
    }

    // Send via Postmark
    const response = await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL!,
      To: contact.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
    });

    // Log as interaction
    await prisma.interaction.create({
      data: {
        userId,
        contactId,
        type: 'email',
        direction: 'outbound',
        messageContent: textBody,
      },
    });

    return {
      messageId: response.MessageID,
      success: true,
    };
  },
};
```

**Step 5: Create email routes**

Create `src/routes/email.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { emailService } from '../services/emailService';

const router = Router();
router.use(authenticate);

router.post('/send', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { contactId, subject, htmlBody, textBody } = req.body;

    const result = await emailService.sendEmail(userId, contactId, subject, htmlBody, textBody);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Step 6: Register routes & commit**

```bash
# In src/server.ts
import emailRoutes from './routes/email';
app.use('/api/email', emailRoutes);

git add .
git commit -m "feat: add Postmark email integration"
```

---

### Task 26: Gmail Manual Fallback

**Files:**
- Modify: `src/services/emailService.ts`
- Create: `src/routes/gmailDraft.ts`

**Step 1: Create Gmail draft helper**

```typescript
// Add to emailService.ts
async createGmailDraft(
  contactId: string,
  subject: string,
  body: string
): Promise<{ draftUrl: string }> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { draftUrl: gmailUrl };
}
```

**Step 2: Create route**

```typescript
router.post('/draft/gmail', async (req, res, next) => {
  const { contactId, subject, body } = req.body;
  const draft = await emailService.createGmailDraft(contactId, subject, body);
  res.json({ success: true, data: draft });
});
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add Gmail draft fallback"
```

---

### Task 27: Email Send Tracking

**Files:**
- Create: `src/routes/webhooks.ts` (Postmark webhooks)
- Modify: Database schema to track email events

**Step 1: Add webhook handler**

Create `src/routes/webhooks.ts`:

```typescript
import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.post('/postmark', async (req, res) => {
  const event = req.body;

  // Handle open/click events
  if (event.RecordType === 'Open') {
    // Track email opened
  } else if (event.RecordType === 'Click') {
    // Track link clicked
  }

  res.status(200).send('OK');
});

export default router;
```

**Step 2: Register & commit**

```bash
git add .
git commit -m "feat: add email tracking webhooks"
```

---

### Task 28: Send History & Templates

**Files:**
- Create: `src/routes/emailHistory.ts`

**Step 1: Create history endpoint**

```typescript
router.get('/history/:contactId', authenticate, async (req, res, next) => {
  const { contactId } = req.params;
  const userId = req.user!.userId;

  const emails = await prisma.interaction.findMany({
    where: {
      userId,
      contactId,
      type: 'email',
    },
    orderBy: { timestamp: 'desc' },
  });

  res.json({ success: true, data: emails });
});
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add email send history"
```

---

## Phase 6: Dashboard & UX (Frontend)

### Task 29-34: React Frontend Components

**Key Components to Build:**

1. **Dashboard** (`client/src/pages/Dashboard.tsx`)
   - OS ring visualization (Recharts)
   - Interview counter (big number)
   - Streak display with fire emoji
   - Next-up contact card
   - Quick actions

2. **Contact List** (`client/src/pages/Contacts.tsx`)
   - Filterable table (warmth, tags, search)
   - Contact cards with next-action badges
   - Quick add modal

3. **Contact Detail** (`client/src/pages/ContactDetail.tsx`)
   - Interaction timeline
   - AI message drafting
   - Send email button
   - Next-action recommendation

4. **Follow-Up Queue** (`client/src/pages/FollowUps.tsx`)
   - Sorted by urgency
   - One-click templates
   - Bulk actions

5. **Interview Tracker** (`client/src/pages/Interviews.tsx`)
   - Calendar view
   - Interview prep button (if unlocked)

6. **Stats Dashboard** (`client/src/pages/Stats.tsx`)
   - XP progress bar
   - OS ring
   - Weekly charts (Recharts)
   - Badge showcase

**Installation:**

```bash
cd client
npm install recharts framer-motion react-query axios date-fns
npm install -D @types/node
```

**Commit after each component:**

```bash
git add .
git commit -m "feat: add [Component Name]"
```

---

## Phase 7: ADHD-Friendly Features

### Task 35-38: UX Enhancements

**Task 35: Micro-Task Timers**

```typescript
// client/src/components/TaskTimer.tsx
// 15-minute Pomodoro-style timer for tasks
// Visual progress, sound on completion
```

**Task 36: Persistent Streak Counter**

```typescript
// Always visible in header
// Shows current streak + fire emoji
// Daily reminder notification
```

**Task 37: Next-Action Cards**

```typescript
// client/src/components/NextActionCard.tsx
// Pre-filled action based on recommendation
// One-click execution
// Reduces decision friction
```

**Task 38: Celebration Animations**

```typescript
// Framer Motion animations for:
// - XP gains (float up with number)
// - Level ups (full-screen celebration)
// - Interview logged (confetti)
// - Badge earned (badge reveal animation)
```

**Commit:**

```bash
git add .
git commit -m "feat: add ADHD-friendly UX features"
```

---

## Phase 8: Testing & Deployment

### Task 39-42: Production Readiness

**Task 39: Seed Test Data**

Create `prisma/seed.ts`:

```typescript
import prisma from '../src/lib/prisma';

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: 'hashed',
      totalXP: 5000,
      totalOS: 3000,
    },
  });

  // Create sample contacts
  for (let i = 0; i < 10; i++) {
    await prisma.contact.create({
      data: {
        userId: user.id,
        name: `Contact ${i}`,
        company: 'TechCorp',
        warmthLevel: i % 3 === 0 ? 'warm' : 'cold',
      },
    });
  }
}

main();
```

Run: `npx ts-node prisma/seed.ts`

**Task 40: Environment Config for Deployment**

Create `replit.nix` or `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install && cd client && npm install"
}
```

**Task 41: Production Build**

```bash
# Backend
npm run build

# Frontend
cd client
npm run build
```

**Task 42: Deploy to Replit/Vercel**

- Backend: Replit or Railway
- Frontend: Vercel
- Database: Railway PostgreSQL

```bash
git add .
git commit -m "chore: production deployment config"
git push
```

---

## Implementation Summary

**Total Tasks:** 42
**Estimated Lines of Code:** ~8,000-10,000
**Database Tables:** 9 (User, Contact, Interaction, Opportunity, Interview, XPLog, Badge, DailyQuest)

**Tech Stack:**
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend: React 18, TypeScript, Tailwind, Recharts, Framer Motion
- AI: Anthropic Claude / OpenAI
- Email: Postmark (primary), Gmail (fallback)

**Core Game Mechanics:**
- XP: Momentum currency (levels, streaks)
- OS: Outcome currency (abundance levels)
- Dual-currency prevents grinding low-value actions
- Interview = 150 messages in expected value

**Key Features:**
- AI message drafting (6 templates)
- Reply parsing (auto-extract outcomes)
- Interview Prep AI (unlocks at Orbit)
- Daily quests (choose your focus)
- Badge system (12+ badges)
- Streak multipliers (1.25x → 2x)
- Next-action recommendations
- Follow-up queue

---

## Next Steps

The plan is complete and saved to `docs/plans/2026-01-03-job-search-gamification-app.md`.

**Ready to implement?**

