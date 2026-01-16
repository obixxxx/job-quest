# Game Design Issues & Balance Concerns

This document tracks game design decisions and balance issues that need to be addressed in a dedicated game design session. These are not bugs, but rather design questions about XP values, progression, and game mechanics.

## Status: Pending Game Design Review

---

## Issue #2: XP Balance for Referrals vs Intel Gathering

### Current State
From testing feedback:
> "gathered intel is 20 XP, and got a referral is 50 XP. So getting a referral, which is huge, is only like 30 XP more than just getting information that doesn't seem accurate from a game perspective."

**Current XP Values:**
| Outcome | XP | OS | Notes |
|---------|----|----|-------|
| No response yet | 10 | 0 | Minimal effort logged |
| Got a response | 15 | 5 | Basic engagement |
| Gathered intel | 20 | 10 | Information gathering |
| Got an intro | 30 | 15 | New connection obtained |
| Got a referral | 50 | 25 | Major milestone |

### The Problem
- Gathering intel (20 XP) vs Getting a referral (50 XP) feels too close in value
- A referral is a significantly more valuable outcome than just gathering information
- The 2.5x multiplier doesn't feel impactful enough for such a major achievement

### Design Questions to Address
1. **Should the gap be wider?**
   - Option A: Increase referral XP (e.g., 75-100 XP)
   - Option B: Decrease intel gathering XP (e.g., 10-15 XP)
   - Option C: Create tier system with more granular rewards

2. **What's the progression philosophy?**
   - Should early actions (email sent, response received) feel more rewarding to encourage engagement?
   - Should major milestones (referral, intro) feel significantly more valuable?
   - What's the target XP-per-week for an active job seeker?

3. **Does Outcome Strength (OS) balance this?**
   - Referral gives 25 OS vs 10 OS for intel
   - Is OS the primary differentiator, with XP being more about activity volume?
   - What role does OS play in overall progression?

### Related Considerations
- How does this fit with quest rewards?
- What's the relationship between interaction XP and outcome XP?
- Should there be streak bonuses for consistent referral gathering?

---

## Future Game Design Topics

### Interaction Types & Coffee Chat Direction
From Issue #1 resolution: Added "mutual" direction option for coffee chats and calls.

**Design Question:** Should different interaction types have different XP values?
- Email (async, low effort) vs Coffee chat (high effort, time investment)
- Should mutual interactions be worth more since both parties invested time?

### Playbook Completion Rewards
**Design Question:** Should completing an entire playbook sequence award bonus XP?
- Currently: XP per action completed
- Consideration: Bonus for completing all 7 steps with one contact?

### Daily Quest Balance
**Design Question:** Review daily quest difficulty and rewards
- Are quest goals achievable for typical users?
- Do quest rewards feel worthwhile?
- Should there be weekly/monthly quest tiers?

---

## Action Items for Game Design Session

1. [ ] Map out player journey: Week 1 → Week 4 → Month 3
2. [ ] Calculate expected XP gains per week for:
   - Passive user (1-2 interactions/week)
   - Active user (5-10 interactions/week)
   - Power user (20+ interactions/week)
3. [ ] Define level progression curve
4. [ ] Balance XP values against level curve
5. [ ] Test with real user scenarios
6. [ ] Document final XP values and rationale

---

## Notes from Testing (2025-01-16)

> "So getting a referral, which is huge, is only like 30 XP more than just getting information that doesn't seem accurate from a game perspective."

This feedback suggests the psychological gap between "gathered intel" and "got a referral" needs to feel more significant. In real job hunting, a referral is a major breakthrough moment - the gamification should reflect that excitement.

---

## Methodology for Game Design Session

When addressing these issues:

1. **Start with player goals:** What behavior are we encouraging?
2. **Define progression rate:** How fast should players level up?
3. **Balance effort vs reward:** Time investment should match XP gain
4. **Test with scenarios:** Walk through real-world usage patterns
5. **Iterate based on feel:** Numbers on paper ≠ fun in practice
