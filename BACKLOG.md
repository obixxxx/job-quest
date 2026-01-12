# Job Quest - Feature Backlog

**Purpose**: Track all bugs, enhancements, and feature ideas mentioned in conversations. Items here are NOT commitments - they're captured for review and prioritization.

**Status Key**:
- 🆕 **New** - Just captured, needs review
- 🔍 **Under Review** - Being evaluated for fit
- ✅ **Accepted** - Approved for implementation (move to a plan)
- ❌ **Rejected** - Not aligned with vision/priorities
- ✔️ **Completed** - Done and shipped

---

## Review & Triage Process

**When to update this backlog:**
1. After completing a major feature implementation
2. After brainstorming/planning sessions
3. When stepping back to review the big picture
4. During code review discussions
5. When user reports bugs or suggests features

**How to triage:**
1. Review items marked 🆕 New
2. Decide: Does this align with Job Quest's vision?
3. Update status: ✅ Accepted, ❌ Rejected, or 🔍 Under Review
4. If Accepted: Add priority (P0-Critical, P1-High, P2-Medium, P3-Low)
5. Create implementation plan for P0/P1 items

---

## Bugs 🐛

### UI/Display Issues

#### XP Tracker in Sidebar - Always Looks the Same
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: The XP progress bar in the sidebar doesn't update when XP is earned
- **Source**: User feedback during outcomes testing
- **Notes**: May be a React Query cache issue or missing invalidation

#### OS Points on Dashboard - Never Changes
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: OS (Outreach Score) ring/display on dashboard doesn't update when OS is earned
- **Source**: User feedback during outcomes testing
- **Notes**: Similar to XP tracker issue - likely cache/state problem

#### Days Streak - Never Changes
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: Streak counter doesn't update when logging interactions on consecutive days
- **Source**: User feedback during outcomes testing
- **Notes**: Need to verify streak calculation logic in game-engine.ts

#### Daily Quests Sidebar - Doesn't Do Anything
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: Daily quests widget in sidebar appears non-functional
- **Source**: User feedback during outcomes testing
- **Notes**: May need to check quest increment logic and UI bindings

### Functional Issues

#### Contact Card - Long Action Labels Push Button Out of Card
- **Status**: ✔️ Completed
- **Completed**: 2026-01-12
- **Description**: When playbook action labels are long, they overflow and push the complete button outside the card boundaries
- **Source**: User feedback during outcomes testing
- **Notes**: This is a known CSS issue but deferred - playbook is now optional so less impact

#### Contact Card - Becomes Weird When Browser Window Smaller
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: Contact cards have layout issues at smaller viewport sizes
- **Source**: User feedback during outcomes testing
- **Notes**: Responsive design needs work - test at tablet/mobile breakpoints

#### Log Button on Contacts Page - Not Responsive
- **Status**: ✔️ Completed
- **Completed**: 2026-01-12
- **Description**: "Log interaction" button on the contacts list page doesn't respond to clicks
- **Source**: User feedback during outcomes testing
- **Fix**: Created InteractionFormModal and wired up onClick handler

#### Follow-ups Page - Shows Nothing
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: Follow-ups page loads but displays no follow-up items even when follow-ups exist
- **Source**: User feedback during outcomes testing
- **Notes**: API returns data but UI doesn't render it - check component logic

#### Complete Playbook Action - "Failed to Complete Action, Cannot Read Properties"
- **Status**: 🆕 New
- **Reported**: 2026-01-11 conversation
- **Description**: When marking a playbook action as complete, error: "cannot read properties of undefined"
- **Source**: User feedback during outcomes testing
- **Notes**: Likely trying to access a property on undefined data - needs null checking

### Data Issues

#### "How Did You Meet" vs "Source" - Same Content
- **Status**: ✔️ Completed
- **Completed**: 2026-01-12
- **Description**: The "How did you meet" field and "Source" field appear to show the same data
- **Source**: User feedback during outcomes testing
- **Fix**: Renamed to "How You Met" and expanded options to include existing relationships

---

## Recently Completed ✅

### Flexible Playbook System (2026-01-12)
- Added "Use playbook?" checkbox to contact creation
- Playbook generation now conditional based on contact preference
- Supports both structured outreach (cold) and freestyle tracking (warm/hot)

### Standalone Interaction Logging (2026-01-12)
- Fixed "Log" button on contacts page
- Created InteractionFormModal for quick logging from list view
- No longer requires playbook to log interactions

### Expanded Source Options (2026-01-12)
- Added "Existing Friend/Family", "Former Colleague", and other relationship types
- Renamed field from "Source" to "How You Met" for clarity
- Consistent options across contact form and outcomes form

### Introduction Tracking (2026-01-12)
- Contact linking for "Introduction Made" outcomes
- Shows "→ Introduced to [Name]" on contact detail page
- Clickable links to navigate introduction chains

---

## Enhancements 📈

### Outcomes Feature Enhancements

#### Add Charts for Revenue Visualization
- **Status**: 🆕 New
- **Source**: Outcomes plan "Next Steps" section (lines 1302-1307)
- **Description**: Use Recharts to visualize revenue trends over time, by source, by type
- **Priority**: TBD
- **Notes**: Would show ROI of networking efforts visually

#### Add Filtering to Outcomes Timeline
- **Status**: 🆕 New
- **Source**: Outcomes plan "Next Steps" section
- **Description**: Filter outcomes by type (job_offer, client_project, etc.), source (referral, cold_outreach, etc.), and date range
- **Priority**: TBD
- **Notes**: Improves usability as outcome count grows

#### Add "View Journey" Modal Per Contact
- **Status**: 🆕 New
- **Source**: Outcomes plan "Next Steps" section
- **Description**: Modal showing detailed timeline of all interactions → outcomes for a specific contact
- **Priority**: TBD
- **Notes**: Tells the story of how a relationship developed

#### Enhance Analytics with Conversion Rates
- **Status**: 🆕 New
- **Source**: Outcomes plan "Next Steps" section
- **Description**: Calculate and display metrics like "interactions per outcome", "average time to outcome", "conversion rate by source"
- **Priority**: TBD
- **Notes**: Helps identify what networking strategies are most effective

#### Add Export Functionality (CSV/PDF)
- **Status**: 🆕 New
- **Source**: Outcomes plan "Next Steps" section
- **Description**: Allow exporting outcomes data to CSV or PDF for external analysis/reporting
- **Priority**: TBD
- **Notes**: Useful for tracking job search progress over time

### Game Mechanics Enhancements

#### Level Progression UI
- **Status**: 🆕 New
- **Source**: ARCHITECTURE.md missing features, original plan
- **Description**: Add level-up animations, level badges, level requirements display
- **Priority**: TBD
- **Notes**: XP bar exists but no visual feedback when leveling up

#### Streak Multiplier
- **Status**: 🆕 New
- **Source**: ARCHITECTURE.md "Streak System" (lines 780-785)
- **Description**: Apply XP multipliers based on streak length (1x for 1-6 days, 1.5x for 7-13 days, 2x for 14+ days)
- **Priority**: TBD
- **Notes**: Logic exists in game-engine.ts but not applied - needs implementation

#### Complete Badge System
- **Status**: 🆕 New
- **Source**: HANDOFF.md "Medium-Term Enhancements" #6
- **Description**: Add missing badges (intel_gathered, persistence, mailer, network_effect, etc.)
- **Priority**: TBD
- **Estimated Effort**: 1 day
- **Notes**: Only 7 badges currently implemented, many more were planned

### UI/UX Enhancements

#### Micro-Task Timers
- **Status**: 🆕 New
- **Source**: Original plan Phase 7 (ADHD features)
- **Description**: Add countdown timers for focused work sessions (e.g., "Draft 3 emails in 15 minutes")
- **Priority**: TBD
- **Notes**: ADHD-friendly feature to create urgency and focus

#### Opportunity Map Visualization
- **Status**: 🆕 New
- **Source**: Original plan Phase 6, ARCHITECTURE.md missing features
- **Description**: Visual map showing contacts, relationships, and opportunity flows
- **Priority**: TBD
- **Notes**: Helps visualize networking strategy and identify gaps

#### Analytics/Charts
- **Status**: 🆕 New
- **Source**: HANDOFF.md "Medium-Term Enhancements" #5
- **Description**: XP history chart (Recharts), opportunity funnel visualization, template performance metrics
- **Priority**: TBD
- **Estimated Effort**: 2-3 days

---

## Features 🚀

### AI Integration

#### AI Assistant Implementation
- **Status**: ✅ Accepted
- **Source**: AI Assistant Plan (docs/plans/2026-01-10-ai-assistant.md)
- **Description**: Claude-powered chat assistant with context awareness, message drafting, reply parsing, customizable prompts
- **Priority**: P1 - High (recommended next major feature)
- **Estimated Effort**: 2-3 days
- **Notes**: 14-task implementation plan exists and is ready to execute

#### AI Integration for Outcomes (Task 8)
- **Status**: 🆕 New
- **Source**: Outcomes tracking plan Task 8
- **Description**: When AI infrastructure exists, enhance it with outcomes data (add to context, include in suggestions, update prompts)
- **Priority**: P2 - Medium (depends on AI Assistant being built first)
- **Notes**: Deferred until AI infrastructure is in place

### Email Integration

#### Postmark Email Sending
- **Status**: 🆕 New
- **Source**: Original plan Phase 5, HANDOFF.md "Immediate Priorities" #2
- **Description**: Integrate Postmark API for automated email sending, add "Send & Log" button, track delivery status
- **Priority**: P1 - High
- **Estimated Effort**: 1-2 days
- **Notes**: Critical for plan completeness, requires API key and setup

#### Gmail Integration
- **Status**: 🆕 New
- **Source**: Original plan Phase 5, HANDOFF.md "Long-Term Features" #8
- **Description**: OAuth2 flow, Gmail API integration, manual send fallback
- **Priority**: P2 - Medium
- **Estimated Effort**: 3-5 days
- **Notes**: Alternative to Postmark, more complex setup

### Campaign Builder

#### Bulk Outreach Sequences
- **Status**: 🆕 New
- **Source**: Original plan Phase 6, HANDOFF.md "Long-Term Features" #7
- **Description**: Create campaigns for bulk outreach, A/B test templates, track campaign performance
- **Priority**: P2 - Medium
- **Estimated Effort**: 1 week
- **Notes**: Useful for scaling outreach efforts

### Opportunity System

#### Opportunity Unlocks & Slot System
- **Status**: 🆕 New
- **Source**: HANDOFF.md "Medium-Term Enhancements" #4
- **Description**: Add cold outreach slot system, enforce slot limits on interactions, display available slots on dashboard
- **Priority**: P2 - Medium
- **Estimated Effort**: 1 day
- **Notes**: Part of the gamification to encourage warm intros over cold outreach

---

## Technical Debt 🔧

### Session Store Migration

#### Switch to PostgreSQL Session Store
- **Status**: 🆕 New
- **Source**: HANDOFF.md "Immediate Priorities" #1
- **Description**: Replace MemoryStore with connect-pg-simple to persist sessions across server restarts
- **Priority**: P0 - Critical
- **Estimated Effort**: 2 hours
- **Impact**: Users currently get logged out on server restart
- **Notes**: See KNOWN-GAPS.md #1 for implementation details

### Database Optimization

#### Add Database Indexes
- **Status**: 🆕 New
- **Source**: ARCHITECTURE.md "Performance Considerations" (lines 1148-1150)
- **Description**: Add indexes on frequently queried fields: interactions.isFollowUpDue, playbookActions.status, selectedQuests.date
- **Priority**: P2 - Medium
- **Estimated Effort**: 1 hour
- **Impact**: Would improve query performance as data grows

---

## Ideas / Future Exploration 💡

### Integration Ideas

#### Calendar Integration
- **Status**: 🆕 New
- **Source**: Not yet discussed in detail
- **Description**: Sync scheduled interactions with Google Calendar, add calendar view of follow-ups
- **Priority**: TBD
- **Notes**: Could help with time management and follow-up planning

#### LinkedIn Integration
- **Status**: 🆕 New
- **Source**: Not yet discussed in detail
- **Description**: Auto-import LinkedIn connections, track LinkedIn message sends
- **Priority**: TBD
- **Notes**: Would reduce manual data entry for contacts

### Gamification Ideas

#### Leaderboards (Optional Multiplayer)
- **Status**: 🆕 New
- **Source**: Not yet discussed in detail
- **Description**: Compare XP/OS with other users, friendly competition
- **Priority**: TBD
- **Notes**: Could add social motivation, but may conflict with "solo-play" design

#### Achievements System (Beyond Badges)
- **Status**: 🆕 New
- **Source**: Not yet discussed in detail
- **Description**: Unlock special rewards (themes, features, power-ups) based on milestones
- **Priority**: TBD
- **Notes**: Could enhance long-term engagement

---

## Checkpoint Process

**After completing major features, run this checklist:**

- [ ] Review conversation for new bugs reported
- [ ] Review conversation for enhancement ideas mentioned
- [ ] Review conversation for feature requests discussed
- [ ] Add all items to BACKLOG.md with 🆕 New status
- [ ] Schedule triage session to review 🆕 items
- [ ] Update status (✅ Accepted, ❌ Rejected, 🔍 Under Review)
- [ ] For ✅ Accepted items, assign priority (P0-P3)
- [ ] Create implementation plans for P0/P1 items
- [ ] Commit BACKLOG.md updates

**Last Updated**: 2026-01-12
**Last Review**: 2026-01-12 (after flexible playbook implementation)
**Next Review**: After implementing next major feature (AI Assistant or Email Integration)

---

## Archive

*Completed or rejected items will be moved here for historical reference*

<!-- Template for new items:

#### [Item Title]
- **Status**: 🆕 New
- **Source**: [Where it was mentioned]
- **Description**: [What it is]
- **Priority**: TBD
- **Estimated Effort**: [If known]
- **Notes**: [Additional context]

-->
