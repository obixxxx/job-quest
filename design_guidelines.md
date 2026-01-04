# Job Quest Design Guidelines

## Design Approach

**Selected Approach:** Design System + Reference Hybrid
- **Primary System:** Linear's modern SaaS aesthetic (clean, purposeful, high-contrast)
- **Reference Influences:** Todoist (task clarity), Duolingo (gamification feedback)
- **Justification:** This is a productivity tool requiring efficiency and clarity, but with emotional engagement through gamification. The hybrid approach balances utility with motivation.

## Core Design Principles

**ADHD-Optimized Hierarchy:**
- Single focal point per screen - no competing priorities
- Immediate visual feedback for all actions
- Progress always visible
- Next action always obvious

**Gamification Without Chaos:**
- Celebrations are impactful but brief (1-2 seconds max)
- Visual rewards don't obstruct workflow
- Progress indicators are persistent, not intrusive

## Typography

**Font System:**
- **Primary:** Inter (via Google Fonts) - UI text, stats, labels
- **Display:** Cal Sans or Clash Display (via Google Fonts) - Dashboard headings, celebration moments
- **Monospace:** JetBrains Mono - XP/OS numbers, streak counters

**Type Scale:**
- Hero numbers (XP, OS): text-6xl, font-bold
- Dashboard heading: text-4xl, font-semibold
- Next Action card: text-2xl, font-medium
- Contact cards: text-lg, font-medium
- Body text: text-base
- Labels/metadata: text-sm, text-xs

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Card padding: p-6 or p-8
- Section spacing: space-y-8 or space-y-12
- Button padding: px-6 py-3
- Compact elements: gap-2 or gap-4

**Dashboard Grid:**
```
Desktop: 3-column layout (8:3:3 ratio)
- Left: Next Action + Follow-up Queue (8 units wide)
- Middle: Stats/Streaks (3 units)
- Right: Daily Quests (3 units)

Mobile: Single column, Next Action first
```

**Max Widths:**
- Full dashboard: max-w-7xl
- Contact cards: max-w-md
- Form inputs: max-w-lg

## Component Library

### Navigation
- **Top Bar:** Fixed header with app logo, current streak (fire emoji + number), XP progress bar
- **Sidebar (Desktop):** Vertical nav with Dashboard, Contacts, Follow-ups, Opportunities, Insights icons
- **Mobile:** Bottom tab bar with 5 primary actions

### Core Components

**Next Action Card (Hero Element):**
- Large, elevated card with subtle shadow
- Contact photo/avatar (left)
- Action text (bold, prominent)
- Overdue indicator (red badge if applicable)
- One-click action button (large, primary)
- "Skip" or "Snooze" secondary options

**Contact Cards:**
- Avatar + name + company
- Warmth indicator (cold/warm/hot via colored dot)
- Last interaction timestamp
- Suggested next action (small, actionable text)
- Quick-log button

**Progress Indicators:**
- **XP Bar:** Horizontal progress bar showing level advancement (green gradient)
- **OS Ring:** Circular progress indicator (Duolingo-style, gold/orange)
- **Streak Counter:** Fire emoji with number, subtle pulse animation on active streak

**Follow-up Queue:**
- List view with compact cards
- Due date prominently displayed
- Color-coded urgency (green = today, yellow = soon, red = overdue)
- Checkbox for quick completion

**Interaction Logging Modal:**
- Dropdown for interaction type (with icons)
- Outcome selector (radio buttons with outcome descriptions)
- Quick notes field
- XP/OS preview before submitting
- Celebration trigger on submit

**Celebration Animations:**
- **XP Gained:** Number floats up from action location, fades out (green text)
- **OS Gained:** Gold coin animation or sparkle effect
- **Streak Continue:** Fire emoji pulse + subtle screen shake
- **Interview Logged:** Confetti burst (3-second duration)
- **Side Quest Complete:** Badge slide-in from right with satisfying "pop"

### Forms & Inputs
- Labels above fields
- Input borders with focus ring (Linear-style)
- Dropdown selects with icons for contact types
- Date pickers for follow-ups
- Tag inputs with pill-style removable tags

### Data Displays
- **Stats Grid:** 2x2 or 1x4 grid showing key metrics (interviews scheduled, active conversations, response rate)
- **Warmth Progression:** Visual pipeline (cold → warm → hot) with contact counts in each stage
- **Level Display:** Large level number with progress bar beneath
- **Opportunity Map:** Card grid showing active opportunities with status badges

## Visual Hierarchy Rules

**Priority Levels:**
1. **Immediate Action:** Next Action card (60% visual weight)
2. **Upcoming Actions:** Follow-up queue (20% visual weight)
3. **Progress Feedback:** Stats/streaks/quests (20% visual weight)

**Contrast Strategy:**
- High contrast for primary actions (dark buttons, bold text)
- Medium contrast for secondary info (muted text colors)
- Low contrast for background elements

## Animations

**Micro-interactions:**
- Button hover: subtle scale (1.02) + shadow increase
- Card hover: lift effect (shadow elevation)
- Checkbox: checkmark draw animation
- Toggle switches: smooth slide transition

**Feedback Animations:**
- Action completion: check icon with bounce
- Error states: shake animation (brief)
- Loading states: skeleton screens (not spinners)

**Celebration Triggers:**
- Use Framer Motion for orchestrated sequences
- Exit animations complete before new screen loads
- Haptic feedback consideration (if mobile web supports)

## Images

**Hero Section:** Not applicable - this is a dashboard-first application, not a marketing site

**Avatars/Photos:**
- Contact avatars: Circular, 40px × 40px (cards), 80px × 80px (detail views)
- Placeholder avatars: Use initials on colored background (automated)
- User profile photo: 48px × 48px in top navigation

**Illustrations:**
- Empty states: Friendly illustrations for "No contacts yet" or "Follow-up queue clear"
- Badge icons: Custom designed icons for achievement badges (Intel Gatherer, Persistence, etc.)
- Daily quest icons: Simple line icons representing quest types

**Visual Style for Illustrations:**
- Modern, geometric style (similar to Storyset or unDraw)
- Minimal color palette matching brand colors
- Light, encouraging tone

## Accessibility

- All interactive elements have visible focus states
- Color is never the only indicator (use icons + text)
- Minimum touch target size: 44px × 44px
- Form validation shows both color and text errors
- Celebration animations can be reduced via prefers-reduced-motion

## Unique Design Features

**"Side Quest" Reframing:**
- When logging "intel gathered" or "intro obtained" (not full referral), trigger special badge animation
- Use game terminology: "Side Quest Complete!" instead of "No direct outcome"
- Visual distinction: Purple accent vs. gold (referral) or green (response)

**Streak Multiplier Visualization:**
- At 3, 7, 14 day milestones, XP numbers show multiplier badge (1.25×, 1.5×, 2×)
- Streak counter includes visual tier indicators (bronze/silver/gold background)

**Overdue Compassion:**
- Red indicators for overdue items, but messaging is encouraging ("Sarah's waiting to hear from you!") not punitive