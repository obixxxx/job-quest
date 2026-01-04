# Job Quest

## Overview

Job Quest is a gamified job search tracker web application that transforms outreach activities into an engaging game-like experience. Users earn XP (experience points) for momentum-building actions and OS (Opportunity Score) points for real outcomes like responses, referrals, and interviews. The app features streak tracking with multipliers, daily quests, badges, and a follow-up queue system designed to keep job seekers motivated and organized during their search.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for auth
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API under /api/* prefix
- **Session Management**: express-session with in-memory store (cookie-based auth)
- **Password Security**: scrypt hashing with timing-safe comparison

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: shared/schema.ts (shared between frontend and backend)
- **Migrations**: Drizzle Kit with push command (db:push)

### Game Engine
The game mechanics are implemented in server/game-engine.ts:
- XP rewards vary by interaction type (email: 10, call: 15, coffee: 25, etc.)
- OS rewards based on outcomes (referral: 25 OS, intro: 15 OS, etc.)
- Streak multipliers: 3 days = 1.25x, 7 days = 1.5x, 14 days = 2x
- Level progression: Each level requires level * 100 XP
- Badge system for milestones

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components (game/, contacts/, dashboard/, ui/)
    pages/        # Route pages (dashboard, contacts, follow-ups, etc.)
    lib/          # Utilities (auth, queryClient)
    hooks/        # Custom React hooks
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database access layer
  game-engine.ts  # Game mechanics calculations
  auth.ts         # Authentication middleware
shared/           # Shared code
  schema.ts       # Drizzle database schema + Zod validation
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via DATABASE_URL environment variable
- **Drizzle ORM**: Type-safe database queries with schema defined in shared/schema.ts

### Authentication
- **express-session**: Cookie-based session management
- **SESSION_SECRET**: Environment variable for session encryption

### UI Framework
- **Radix UI**: Accessible component primitives (dialog, dropdown, select, etc.)
- **shadcn/ui**: Pre-built component library using Radix + Tailwind
- **Lucide React**: Icon library

### Fonts (Google Fonts)
- DM Sans, Inter: UI text
- JetBrains Mono, Fira Code, Geist Mono: Monospace for game stats
- Plus Jakarta Sans: Serif headings
- Architects Daughter: Display font

### Development Tools
- **Vite**: Frontend build and dev server with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Full-stack type safety