# Manual Testing Checklist - Flexible Playbook Feature

**Feature**: Flexible Playbook & Interaction Logging
**Tasks**: 7 & 9 from implementation plan
**Estimated Time**: 30-45 minutes

---

## Prerequisites

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Ensure DATABASE_URL is configured** in your `.env` file

3. **Open browser** to http://localhost:5000

4. **Log in or create test account**

---

## Task 7: Component Testing

### Test 1: Playbook Toggle

**Goal**: Verify the "Use playbook?" checkbox works correctly

1. Navigate to Contacts page
2. Click "Add Contact" button
3. **Verify**: Checkbox labeled "Use playbook for this contact" appears near bottom of form
4. **Verify**: Checkbox is checked by default
5. Fill in contact details:
   - Name: "Test Cold Contact"
   - Company: "Test Corp"
   - Source: "LinkedIn"
   - Warmth: "cold"
6. **Leave checkbox CHECKED** → Click "Create Contact"
7. Go to contact detail page
8. **Verify**: 7 playbook actions appear (Initial outreach, Follow-up 1, etc.)
9. Go back to Contacts page
10. Click "Add Contact" again
11. Fill in contact details:
    - Name: "Test Warm Contact"
    - Company: "Warm Corp"
    - Source: "Former Colleague"
    - Warmth: "warm"
12. **UNCHECK the "Use playbook" checkbox** → Click "Create Contact"
13. Go to contact detail page
14. **Verify**: 0 playbook actions (section should not appear)

**Database Verification**:
```bash
psql $DATABASE_URL -c "SELECT id, name, use_playbook FROM contacts WHERE name LIKE 'Test%';"
```
**Expected**:
- "Test Cold Contact" has `use_playbook = true`
- "Test Warm Contact" has `use_playbook = false`

✅ **Pass Criteria**: Both contacts created correctly, playbook appears only for cold contact

---

### Test 2: Freestyle Interaction Logging

**Goal**: Verify the "Log" button on contacts page works

1. Go to Contacts page (/)
2. Find "Test Warm Contact" card
3. **Verify**: Card has a "Log" button
4. Click the "Log" button
5. **Verify**: Modal opens with title "Log Interaction with Test Warm Contact"
6. **Verify**: Form has fields for Type, Outcome, Follow-up, Notes, Date
7. Fill in interaction:
   - Type: "coffee"
   - Outcome: "positive"
   - Notes: "Great coffee chat about job opportunities"
   - Leave Date as today
8. Click "Log Interaction" button
9. **Verify**: Modal closes
10. **Verify**: XP popup appears showing "+10 XP" (or similar)
11. Go to "Test Warm Contact" detail page
12. **Verify**: Interaction appears in timeline with "coffee" badge

✅ **Pass Criteria**: Modal opens, interaction logs successfully, XP awarded, appears on detail page

---

### Test 3: Source Options

**Goal**: Verify new relationship source options appear

1. Go to Contacts page
2. Click "Add Contact"
3. Click on "How You Met" dropdown
4. **Verify**: Following options appear IN THIS ORDER:
   - Existing Friend/Family
   - Former Colleague
   - Referral/Introduction
   - Mutual Connection
   - LinkedIn
   - Event/Conference
   - Cold Outreach
   - Other
5. Select "Existing Friend/Family"
6. Fill in:
   - Name: "Sarah Johnson"
   - Notes: "Known since college"
7. Uncheck "Use playbook"
8. Click "Create Contact"
9. Go to Contacts page
10. **Verify**: Sarah's contact card shows source (check hover or detail view)

✅ **Pass Criteria**: All 8 source options present in correct order, selection saves correctly

---

### Test 4: Introduction Tracking

**Goal**: Verify contact linking for introductions works

1. Go to Contacts page
2. Find or create a contact named "Mike" (or any existing contact)
3. Click on Mike's card to go to detail page
4. Click "Record Outcome" button
5. Select outcome type: "Introduction Made"
6. **Verify**: Contact picker appears with label "Who were you introduced to?"
7. **Verify**: Picker shows searchable dropdown
8. Click the dropdown
9. **Verify**: List shows your other contacts (e.g., "Test Cold Contact", "Test Warm Contact", "Sarah Johnson")
10. Search for "Sarah" or select "Sarah Johnson" from list
11. **Verify**: Checkmark appears next to selected contact
12. Fill in:
    - Description: "Mike introduced me to Sarah at coffee shop"
    - Date: Today
13. Click "Save" or "Record Outcome"
14. **Verify**: Outcome appears on Mike's detail page
15. **Verify**: Below the outcome, you see: "→ Introduced to Sarah Johnson"
16. **Verify**: The introduction line is blue and underlined on hover
17. Click the "→ Introduced to Sarah Johnson" link
18. **Verify**: Page navigates to Sarah Johnson's detail page

**Validation Test**:
19. Go back to Mike's page
20. Click "Record Outcome" again
21. Select "Introduction Made"
22. **DO NOT select a contact** (leave picker empty)
23. Try to submit
24. **Verify**: Error toast appears: "Contact required - Please select who you were introduced to"

**Database Verification**:
```bash
psql $DATABASE_URL -c "SELECT id, contact_id, type, description, introduced_to_contact_id FROM outcomes WHERE type = 'introduction_made';"
```
**Expected**: Shows outcome with `introduced_to_contact_id` populated

✅ **Pass Criteria**: Contact picker works, validation prevents empty submission, link displays and navigates correctly

---

## Task 9: End-to-End User Flows

### Scenario 1: Cold Contact with Playbook

**Goal**: Verify complete cold outreach workflow

1. Create contact "Jane Doe":
   - Name: "Jane Doe"
   - Company: "Tech Startup Inc"
   - Role: "Engineering Manager"
   - Source: "LinkedIn"
   - Warmth: "cold"
   - ✅ Keep "Use playbook" CHECKED
2. Click "Create Contact"
3. Go to Jane's detail page
4. **Verify**: 7 playbook actions visible
5. Find action "Send initial outreach email"
6. Click the action
7. **Verify**: Interaction form appears
8. Fill in:
   - Type: "email"
   - Outcome: "sent"
   - Notes: "Sent LinkedIn message about open role"
9. Click "Log Interaction"
10. **Verify**: XP popup appears
11. **Verify**: Action status changes to "completed" or gets checkmark
12. **Verify**: Interaction appears in timeline

✅ **Pass Criteria**: Playbook actions guide user through cold outreach, logging works, XP awarded

---

### Scenario 2: Warm Contact without Playbook

**Goal**: Verify freestyle tracking for existing relationships

1. Create contact "Bob Smith":
   - Name: "Bob Smith"
   - Company: "Former Workplace"
   - Source: "Former Colleague"
   - Warmth: "warm"
   - ❌ UNCHECK "Use playbook"
2. Click "Create Contact"
3. **Verify**: No playbook actions on detail page
4. Go to Contacts page (/)
5. Find Bob's contact card
6. Click "Log" button on the card
7. Log a coffee interaction:
   - Type: "coffee"
   - Outcome: "positive"
   - Notes: "Caught up over coffee, discussed job search"
8. Click "Log Interaction"
9. **Verify**: Modal closes
10. **Verify**: XP popup appears
11. Go to Bob's detail page
12. **Verify**: Coffee interaction appears in timeline

✅ **Pass Criteria**: Warm contact works without playbook, freestyle logging from contacts page works

---

### Scenario 3: Introduction Chain

**Goal**: Verify contact linking creates navigable introduction chains

1. Go to Mike's contact detail
2. Record outcome "Introduction Made" to Sarah Johnson
3. Description: "Mike introduced me to Sarah at his company"
4. **Verify**: Shows "→ Introduced to Sarah Johnson"
5. Click the link
6. **Verify**: Navigates to Sarah's page
7. On Sarah's page, click "Edit Contact" (or check current source)
8. **Verify**: Source can be changed to "Referral/Introduction"
9. Update Sarah's source to "Referral/Introduction"
10. Save changes
11. Go to Sarah's detail page
12. Record outcome "Introduction Made" to another contact (e.g., "Test Cold Contact")
13. **Verify**: Sarah's page now shows "→ Introduced to Test Cold Contact"
14. **Verify**: You can follow the chain: Mike → Sarah → Test Cold Contact

✅ **Pass Criteria**: Introduction chains are clickable and navigable in both directions

---

### Scenario 4: Existing Friend

**Goal**: Verify tracking for pre-existing relationships

1. Create contact "Emma Wilson":
   - Name: "Emma Wilson"
   - Source: "Existing Friend/Family"
   - Warmth: "hot"
   - Notes: "Known since college, works in tech recruiting"
   - ❌ UNCHECK "Use playbook"
2. Click "Create Contact"
3. Go to Contacts page
4. Click "Log" on Emma's card
5. Log a text interaction:
   - Type: "text"
   - Outcome: "positive"
   - Notes: "Texted about job openings at her company"
6. Repeat logging several more interactions over time:
   - Coffee chat
   - Phone call
   - Email exchange
7. Go to Emma's detail page
8. **Verify**: All interactions appear in timeline
9. Click "Record Outcome"
10. Select "Referral Obtained"
11. Fill in:
    - Description: "Emma referred me to hiring manager at her company"
    - Revenue: "$120,000" (if this was for a job)
    - Revenue Type: "salary"
12. Click "Save"
13. **Verify**: Outcome appears with revenue badge/info

✅ **Pass Criteria**: Existing friend workflow supports multiple freestyle interactions and outcome tracking

---

## Final Verification

After completing all tests:

### Check Database State
```bash
# Verify contacts have correct use_playbook values
psql $DATABASE_URL -c "SELECT name, use_playbook, source FROM contacts ORDER BY created_at DESC LIMIT 10;"

# Verify introductions are linked
psql $DATABASE_URL -c "SELECT c.name as contact, o.description, ic.name as introduced_to FROM outcomes o JOIN contacts c ON o.contact_id = c.id LEFT JOIN contacts ic ON o.introduced_to_contact_id = ic.id WHERE o.type = 'introduction_made';"

# Verify interactions were logged
psql $DATABASE_URL -c "SELECT COUNT(*) as total_interactions FROM interactions;"
```

### Check XP Logs
```bash
psql $DATABASE_URL -c "SELECT reason, xp_amount, os_amount FROM xp_logs ORDER BY created_at DESC LIMIT 10;"
```

**Expected**: Multiple log entries showing XP awarded for interactions

---

## Issues to Watch For

### Known Good Behaviors:
- ✅ XP popup appears after logging interactions
- ✅ Badge components display for outcomes
- ✅ Contact picker is searchable
- ✅ Validation prevents empty introduction submissions

### Potential Issues to Report:
- ❌ Modal doesn't close after submission
- ❌ XP popup doesn't appear
- ❌ Introduction link doesn't navigate
- ❌ Playbook appears when checkbox is unchecked
- ❌ Source options missing or in wrong order

---

## Completion Checklist

- [ ] Test 1: Playbook Toggle (contacts with/without playbook)
- [ ] Test 2: Freestyle Interaction Logging (Log button works)
- [ ] Test 3: Source Options (all 8 options present and ordered)
- [ ] Test 4: Introduction Tracking (picker, validation, links)
- [ ] Scenario 1: Cold contact with playbook workflow
- [ ] Scenario 2: Warm contact without playbook workflow
- [ ] Scenario 3: Introduction chain navigation
- [ ] Scenario 4: Existing friend freestyle tracking
- [ ] Database verification queries run successfully
- [ ] No critical bugs found

---

## After Testing

If all tests pass:
```bash
# Mark as complete
git add .
git commit -m "test: verified flexible playbook and interaction logging features"
```

If issues found:
- Document issues in BACKLOG.md
- Create GitHub issues for tracking
- Decide if blockers or can proceed

---

**Testing completed by**: _________________
**Date**: _________________
**Result**: ✅ Pass / ❌ Fail (with notes)
**Notes**:
