# Test Results - Flexible Playbook Feature

**Date**: January 16, 2026
**Tester**: Obi
**Overall Result**: ❌ FAILED (partial pass - critical issues found)

---

## ✅ What Worked

1. **Playbook Toggle** - PASS
   - Checkbox appears and works correctly
   - Contacts with playbook checked generate 7 actions
   - Contacts without playbook generate 0 actions
   - Database correctly stores `use_playbook` value

2. **Log Button Opens Modal** - PASS
   - "Log" button on contacts page works
   - Modal opens with correct title
   - Interaction can be logged

3. **Source Options Expanded** - PASS
   - All 8 new source options present
   - Options are in correct order
   - Can select and save different sources

4. **Introduction Links Navigate** - PARTIAL PASS
   - Links appear after page refresh
   - Clicking link navigates to introduced contact
   - Works for both old and new introductions

---

## ❌ Critical Issues Found

### 1. **Interaction Form Fields Don't Match Testing Instructions**
**Severity**: High
**Location**: InteractionForm component

**Expected fields** (from test):
- Type
- Outcome (positive/negative)
- Notes
- Date

**Actual fields**:
- Interaction Type (email, call, coffee, etc.)
- Direction (I reached out / They reached out)
- Status (completed, scheduled, cancelled)
- Outcome (got response, got referral, got intro, gathered intel, no response yet)
- Notes (optional, but appears to be required)

**Issues**:
- No "coffee" type - user had to pick something else
- No "positive/negative" outcome - doesn't match test expectations
- "Direction" field is confusing for mutual interactions (coffee chat has no direction)
- Notes marked "optional" but form validation says "message required"
- No visible date picker

**User Quote**:
> "We had a coffee chat. Is there a direction there? It's just an interaction, right? Not every interaction is like a reach out."

---

### 2. **XP Balance Issues**
**Severity**: Medium
**Location**: Game engine / XP calculation

**Issue**: "Gathered intel" (20 XP) vs "Got a referral" (50 XP) - only 30 XP difference seems too small

**User Quote**:
> "Getting a referral, which is huge, is only like 30 XP more than just getting information - that doesn't seem accurate from a game perspective."

**Impact**: Game mechanics don't properly incentivize high-value outcomes

---

### 3. **Outcomes Don't Appear Until Page Refresh**
**Severity**: High
**Location**: Contact detail page, outcomes section

**Steps to Reproduce**:
1. Record an outcome on a contact
2. Modal closes, returns to contact page
3. Outcome is NOT visible
4. Refresh page
5. Outcome now appears

**User Quote**:
> "After I clicked record the outcome, it takes me back to that contact page or the dialog box closes and I'm back on the page but it doesn't show anything until I refresh"

**Root Cause**: React Query cache not invalidating properly after outcome creation

---

### 4. **Source Not Visible on Contact Pages**
**Severity**: Medium
**Location**: Contact card and contact detail page

**Issue**: After setting source (e.g., "Existing Friend/Family"), it's not displayed anywhere

**User Quote**:
> "The hover or detail view neither of them show the source. Like if I click into Sarah's details, it doesn't show anything other than playbook interaction history."

**Impact**: Users can't see how they met a contact after creating them

---

### 5. **Introduction Tracking Only Shows Forward Chain, Not Backward**
**Severity**: High
**Location**: Outcomes display on contact detail page

**Issue**:
- Can see "Introduced to Sarah Johnson" on Mike's page ✅
- CANNOT see "Introduced by Mike" on Sarah's page ❌

**User Quote**:
> "So, yeah, I can follow the chain forward, but I can't follow the chain backward. Right? So, if I go Bob Smith, I don't see that I was introduced by Sarah Johnson. I can't go backwards. You know, which I think is important."

**Impact**: Can't see who introduced you to a contact - breaks the introduction chain visualization

---

### 6. **Validation Error Wrong for Introduction Tracking**
**Severity**: Medium
**Location**: Outcome form validation

**Expected**: "Contact required" when submitting introduction without selecting contact
**Actual**: "Description is required"

**Issue**: Our validation fix (Task 6) runs AFTER the description validation, so user sees wrong error first

---

### 7. **"Edit Contact" Button Location Confusing**
**Severity**: Low - UX Issue
**Location**: Contact detail page

**Issue**:
- Test says "Click Edit Contact on detail page"
- Button doesn't exist on detail page
- Button only exists on contacts list (three-dots menu)

**User Quote**:
> "On Sarah Johnson's page, there is nothing that says edit. There's no edit contact... if I go to the contacts page on her mini contact page, there is the three dots, and if I click that, there is an edit contact."

---

### 8. **"How You Met" Field Appears on Outcome Form**
**Severity**: Medium - UX Issue
**Location**: Outcome form modal

**Issue**: When recording outcome (job offer, referral, etc.), form shows "How you met (optional)" field

**User Quote**:
> "I put 'referral obtained', and then yeah, you say 'description' - Emma referred me to her hiring manager. It still says 'how you met' which is optional, but it's kind of weird."

**Impact**: Confusing - "how you met" is a contact property, not an outcome property

---

### 9. **Revenue Type Only Appears After Entering Amount**
**Severity**: Low - UX Issue
**Location**: Outcome form - revenue fields

**Issue**: Revenue Type dropdown is hidden until you start typing in Revenue Amount

**User Quote**:
> "None of them show 'revenue type' that's not a thing... Okay, so when I start clicking 'Revenue amount', then 'revenue type' shows up"

**Impact**: User doesn't know they can specify revenue type (salary vs one-time vs recurring)

---

### 10. **Outcomes Timeline Order Incorrect**
**Severity**: Medium
**Location**: /outcomes page

**Issue**: Most recent outcome doesn't appear at top - appears in middle of timeline

**User Quote**:
> "It shows up in the middle, and you know I made a bunch of things that happened today. It should be the most current one. It should show up at the top right?"

**Impact**: Can't easily see most recent outcomes

---

### 11. **XP Popup Is "Boring"**
**Severity**: Low - UX Enhancement
**Location**: XP popup component

**User Quote**:
> "I think that could be better. It's just a white box that pops up... I was just like playing with Duolingo with some of these other games, and they make it very visual... Maybe there's confetti or some shit."

**Impact**: Gamification feedback isn't exciting enough

---

### 12. **Can't Log Interaction from Playbook Action**
**Severity**: Critical - BLOCKER
**Location**: Playbook action logging

**Steps to Reproduce**:
1. Create contact with playbook
2. Go to detail page, see 7 playbook actions
3. Click on "Send initial outreach email" action
4. Fill in form: Type: email, Direction: I reached out, Status: completed, Outcome: no response yet
5. Add notes: "Sent LinkedIn message about open role"
6. Click "Log Interaction"
7. **ERROR**: "Fail to log interaction: 400 message required"

**User Quote**:
> "For some reason, it won't let me do it. It says 'fail to log interaction 400 message required', but I did put in the message, I put in sent LinkedIn message and the notes, and it still won't let me continue."

**Impact**: COMPLETELY BLOCKS the playbook workflow - users can't complete playbook actions

**Root Cause**: Backend expecting different field name than frontend is sending (probably `message` vs `notes`)

---

## Summary by Severity

### 🔴 Critical (Blockers):
1. Can't log interaction from playbook actions (Issue #12)

### 🟠 High Priority:
1. Outcomes don't appear until refresh (Issue #3)
2. Introduction tracking only shows forward chain (Issue #5)
3. Interaction form fields mismatch (Issue #1)

### 🟡 Medium Priority:
1. Source not visible on contact pages (Issue #4)
2. XP balance issues (Issue #2)
3. Wrong validation error for introductions (Issue #6)
4. "How you met" on outcome form is confusing (Issue #8)
5. Outcomes timeline order incorrect (Issue #10)

### 🟢 Low Priority:
1. Edit contact button location (Issue #7)
2. Revenue type hidden until amount entered (Issue #9)
3. XP popup visual design (Issue #11)

---

## Recommendations

### Immediate Fixes Required (Before Merge):
1. **Fix playbook action logging** (Issue #12) - BLOCKER
2. **Fix outcomes cache invalidation** (Issue #3) - High impact
3. **Add backward introduction links** (Issue #5) - Core feature incomplete

### Should Fix Soon:
4. Display source on contact cards and detail pages (Issue #4)
5. Fix interaction form field names/validation (Issue #1)

### Can Defer:
- XP balancing (Issue #2) - needs game design review
- UX improvements (Issues #7, #9, #11)

---

## Next Steps

1. **Fix Critical Issues**: Address Issue #12 (blocker) immediately
2. **Fix High Priority Issues**: Issues #3, #5, #1
3. **Re-test**: Run through test scenarios again
4. **Update Backlog**: Add all issues to BACKLOG.md with priorities
5. **Consider**: Whether to merge with known medium/low issues or fix first

---

**Test Duration**: ~45 minutes
**Browser**: Chrome on macOS
**Server**: Local (port 3001)
**Database**: Neon PostgreSQL
