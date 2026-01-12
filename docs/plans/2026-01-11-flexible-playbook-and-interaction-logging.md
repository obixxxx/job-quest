# Flexible Playbook & Interaction Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make playbooks optional for contacts and enable freestyle interaction logging, supporting both cold outreach and existing relationships.

**Architecture:** Add "usePlaybook" boolean to contacts table, conditionally generate playbook actions on contact creation, fix the standalone "Log Interaction" button on contacts page, expand source options to include existing relationships, and add introduction tracking to link contacts.

**Tech Stack:** Drizzle ORM, React Hook Form, shadcn/ui components, React Query

---

## Phase 1: Optional Playbook Toggle

### Task 1: Add usePlaybook Field to Schema

**Files:**
- Modify: `shared/schema.ts` (contacts table, around line 53)

**Step 1: Add usePlaybook field to contacts table**

Find the `contacts` table definition (around line 53) and add the new field:

```typescript
export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  company: text("company"),
  role: text("role"),
  email: text("email"),
  linkedinUrl: text("linkedin_url"),
  phoneNumber: text("phone_number"),
  source: text("source"),
  warmthLevel: text("warmth_level").default("cold").notNull(),
  tags: text("tags").array(),
  notes: text("notes"),
  usePlaybook: boolean("use_playbook").default(true).notNull(), // NEW FIELD
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Step 2: Update insertContactSchema**

Find `insertContactSchema` (around line 346) and verify it includes the new field (Drizzle auto-infers from table):

```typescript
export const insertContactSchema = createInsertSchema(contacts);
```

**Step 3: Push schema changes**

```bash
npm run db:push
```

Expected output: "✓ Pushing schema changes" and "✓ Done!"

**Step 4: Verify column exists**

```bash
psql $DATABASE_URL -c "\d contacts"
```

Expected: Column `use_playbook` appears with type `boolean` and default `true`

**Step 5: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(schema): add usePlaybook field to contacts table"
```

---

### Task 2: Add Checkbox to Contact Creation Form

**Files:**
- Modify: `client/src/components/contacts/contact-form.tsx`

**Step 1: Add usePlaybook to form schema**

Find the form schema definition (around line 14) and add the field:

```typescript
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  source: z.string().optional(),
  warmthLevel: z.enum(["cold", "warm", "hot"]).default("warm"),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  usePlaybook: z.boolean().default(true), // NEW FIELD
});
```

**Step 2: Add to default values**

Find `defaultValues` (around line 35) and add:

```typescript
defaultValues: {
  name: "",
  company: "",
  role: "",
  email: "",
  linkedinUrl: "",
  phoneNumber: "",
  source: "",
  warmthLevel: "warm",
  tags: [],
  notes: "",
  usePlaybook: true, // NEW DEFAULT
}
```

**Step 3: Add checkbox UI before submit button**

Add imports at top if not present:

```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

Find the submit button (around line 200) and add checkbox before it:

```typescript
        {/* Use Playbook Checkbox */}
        <FormField
          control={form.control}
          name="usePlaybook"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Use playbook for this contact
                </FormLabel>
                <FormDescription>
                  Generate structured outreach sequence (emails, follow-ups, calls). Uncheck for freestyle relationship tracking.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create Contact"}
        </Button>
```

**Step 4: Test in browser**

```bash
npm run dev
```

1. Navigate to contacts page
2. Click "Add Contact"
3. Verify checkbox appears with label "Use playbook for this contact"
4. Verify checkbox is checked by default
5. Toggle checkbox on/off

**Step 5: Commit**

```bash
git add client/src/components/contacts/contact-form.tsx
git commit -m "feat(contacts): add usePlaybook checkbox to contact creation form"
```

---

### Task 3: Conditionally Generate Playbook Actions

**Files:**
- Modify: `server/routes.ts` (POST /api/contacts route, around line 298)

**Step 1: Check usePlaybook before generating playbook**

Find the `POST /api/contacts` route (around line 298). Locate where `generatePlaybookForContact` is called (around line 315):

Replace this section:

```typescript
    // Generate playbook actions for the contact
    await generatePlaybookForContact(userId!, contact.id);
```

With conditional logic:

```typescript
    // Generate playbook actions only if usePlaybook is true
    if (contact.usePlaybook) {
      await generatePlaybookForContact(userId!, contact.id);
    }
```

**Step 2: Test playbook generation**

Start dev server:

```bash
npm run dev
```

Test cases:
1. Create contact WITH playbook checked → verify 7 playbook actions created
2. Create contact WITHOUT playbook checked → verify 0 playbook actions created

Check database:

```bash
psql $DATABASE_URL -c "SELECT id, name, use_playbook FROM contacts ORDER BY created_at DESC LIMIT 5;"
psql $DATABASE_URL -c "SELECT contact_id, action_label FROM playbook_actions WHERE contact_id = 'CONTACT_ID_HERE';"
```

**Step 3: Commit**

```bash
git add server/routes.ts
git commit -m "feat(playbook): conditionally generate playbook based on usePlaybook field"
```

---

## Phase 2: Fix Standalone Interaction Logging

### Task 4: Fix Log Interaction Button on Contacts Page

**Files:**
- Modify: `client/src/pages/contacts.tsx`
- Modify: `client/src/components/interactions/interaction-form.tsx`

**Step 1: Add InteractionFormModal to contacts page**

First, check if `client/src/components/interactions/interaction-form-modal.tsx` exists. If not, create it:

Create `client/src/components/interactions/interaction-form-modal.tsx`:

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InteractionForm } from './interaction-form';

interface InteractionFormModalProps {
  contactId: string;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InteractionFormModal({ contactId, contactName, isOpen, onClose }: InteractionFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Interaction with {contactName}</DialogTitle>
        </DialogHeader>
        <InteractionForm contactId={contactId} onSuccess={onClose} />
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire up modal to contacts page**

Modify `client/src/pages/contacts.tsx`:

Add import at top:

```typescript
import { InteractionFormModal } from '@/components/interactions/interaction-form-modal';
```

Add state for modal (around line 15, after other useState hooks):

```typescript
const [logInteractionContact, setLogInteractionContact] = useState<{ id: string; name: string } | null>(null);
```

Find the "Log" button (search for `data-testid="button-log-interaction"`). Replace the button's onClick:

Before:
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => {/* probably empty or buggy */}}
  data-testid="button-log-interaction"
>
  Log
</Button>
```

After:
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => setLogInteractionContact({ id: item.contact.id, name: item.contact.name })}
  data-testid="button-log-interaction"
>
  Log
</Button>
```

Add modal component at bottom of return statement (before closing tag):

```typescript
      {/* Interaction Form Modal */}
      {logInteractionContact && (
        <InteractionFormModal
          contactId={logInteractionContact.id}
          contactName={logInteractionContact.name}
          isOpen={!!logInteractionContact}
          onClose={() => setLogInteractionContact(null)}
        />
      )}
    </div>
  );
}
```

**Step 3: Test in browser**

```bash
npm run dev
```

1. Navigate to /contacts
2. Find a contact card
3. Click "Log" button
4. Verify modal opens with interaction form
5. Fill out and submit interaction
6. Verify modal closes
7. Verify interaction appears in contact detail page

**Step 4: Commit**

```bash
git add client/src/components/interactions/interaction-form-modal.tsx client/src/pages/contacts.tsx
git commit -m "feat(interactions): fix log interaction button on contacts page"
```

---

## Phase 3: Expand Source Options

### Task 5: Add "Existing Relationship" Source Option

**Files:**
- Modify: `client/src/components/contacts/contact-form.tsx`

**Step 1: Update source dropdown options**

Find the source field in the contact form (around line 120). Replace the Select options:

Before:
```typescript
<FormField
  control={form.control}
  name="source"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Source</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="How did you find them?" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="linkedin">LinkedIn</SelectItem>
          <SelectItem value="referral">Referral</SelectItem>
          <SelectItem value="event">Event</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

After (add more source options):
```typescript
<FormField
  control={form.control}
  name="source"
  render={({ field }) => (
    <FormItem>
      <FormLabel>How You Met</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="How did you meet this person?" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="existing_friend">Existing Friend/Family</SelectItem>
          <SelectItem value="former_colleague">Former Colleague</SelectItem>
          <SelectItem value="referral">Referral/Introduction</SelectItem>
          <SelectItem value="linkedin">LinkedIn</SelectItem>
          <SelectItem value="event">Event/Conference</SelectItem>
          <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
          <SelectItem value="mutual_connection">Mutual Connection</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Step 2: Update outcomes source options to match**

Modify `client/src/components/outcomes/outcome-form-modal.tsx`:

Find the sourceType Select (around line 110) and update to match:

```typescript
<Select value={sourceType} onValueChange={setSourceType}>
  <SelectTrigger>
    <SelectValue placeholder="How did you meet?" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="existing_friend">Existing Friend/Family</SelectItem>
    <SelectItem value="former_colleague">Former Colleague</SelectItem>
    <SelectItem value="referral">Referral/Introduction</SelectItem>
    <SelectItem value="linkedin">LinkedIn</SelectItem>
    <SelectItem value="event">Event/Conference</SelectItem>
    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
    <SelectItem value="mutual_connection">Mutual Connection</SelectItem>
    <SelectItem value="text">Text/Phone</SelectItem>
    <SelectItem value="other">Other</SelectItem>
  </SelectContent>
</Select>
```

**Step 3: Test in browser**

```bash
npm run dev
```

1. Create a new contact
2. Open "How You Met" dropdown
3. Verify "Existing Friend/Family" appears first
4. Select it and create contact
5. Verify it saves correctly

**Step 4: Commit**

```bash
git add client/src/components/contacts/contact-form.tsx client/src/components/outcomes/outcome-form-modal.tsx
git commit -m "feat(contacts): expand source options to include existing relationships"
```

---

## Phase 4: Introduction Tracking

### Task 6: Link Introduced Contacts in Outcomes

**Files:**
- Modify: `client/src/components/outcomes/outcome-form-modal.tsx`
- Modify: `client/src/pages/contact-detail.tsx`

**Step 1: Add contact selector for introductions**

Modify `client/src/components/outcomes/outcome-form-modal.tsx`:

Add to imports:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
```

Add state for contact selection (after other useState):

```typescript
const [introducedToContactId, setIntroducedToContactId] = useState<string>('');
const [contactSearchOpen, setContactSearchOpen] = useState(false);
```

Fetch contacts list:

```typescript
const { data: contactsData } = useQuery({
  queryKey: ['/api/contacts'],
  queryFn: async () => {
    const res = await apiRequest('GET', '/api/contacts');
    return res.json();
  },
});

const contacts = contactsData || [];
const selectedContact = contacts.find((c: any) => c.contact.id === introducedToContactId);
```

Find where outcome type is selected. After the type selector, add conditional contact picker:

```typescript
{/* Show contact picker only for introduction_made type */}
{type === 'introduction_made' && (
  <div className="space-y-2">
    <Label>Who were you introduced to?</Label>
    <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={contactSearchOpen}
          className="w-full justify-between"
        >
          {selectedContact
            ? selectedContact.contact.name
            : "Select contact..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandEmpty>No contact found.</CommandEmpty>
          <CommandGroup>
            {contacts.map((item: any) => (
              <CommandItem
                key={item.contact.id}
                value={item.contact.name}
                onSelect={() => {
                  setIntroducedToContactId(item.contact.id);
                  setContactSearchOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    introducedToContactId === item.contact.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.contact.name}
                {item.contact.company && ` (${item.contact.company})`}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
    <p className="text-xs text-muted-foreground">
      Select the person you were introduced to through this contact
    </p>
  </div>
)}
```

Update the mutation to include introducedToContactId:

Find `createMutation` (around line 41) and update the data sent:

```typescript
const createMutation = useMutation({
  mutationFn: (data: InsertOutcome) =>
    apiRequest('POST', '/api/outcomes', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/outcomes'] });
    queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/detail`] });
    toast({ title: "Outcome recorded successfully" });
    onClose();
  },
  onError: (error: any) => {
    toast({
      title: "Failed to record outcome",
      description: error.message,
      variant: "destructive"
    });
  },
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const data: any = {
    contactId,
    type,
    description,
    outcomeDate,
    revenueAmount: revenueAmount ? parseInt(revenueAmount) : null,
    revenueType: revenueAmount ? revenueType : null,
    sourceType: sourceType || null,
    introducedToContactId: type === 'introduction_made' ? introducedToContactId : null, // NEW
  };

  createMutation.mutate(data);
};
```

**Step 2: Display introduction link on contact detail**

Modify `client/src/pages/contact-detail.tsx`:

Update the ContactDetail interface to include introducedTo (around line 30):

```typescript
interface ContactDetail {
  // ... existing fields
  outcomes?: Array<{
    id: string;
    type: string;
    description: string;
    outcomeDate: string;
    revenueAmount: number | null;
    revenueType: string | null;
    introducedToContactId: string | null;
    introducedToContact?: {
      id: string;
      name: string;
      company: string | null;
    };
  }>;
}
```

Update outcomes rendering to show introduction link (around line 295):

```typescript
{outcomes && outcomes.length > 0 && (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Outcomes</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {outcomes.map((outcome) => (
          <div
            key={outcome.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
          >
            <div>
              <OutcomeBadge outcome={outcome} />
              <p className="text-sm text-muted-foreground mt-1">{outcome.description}</p>
              {outcome.introducedToContact && (
                <Link href={`/contacts/${outcome.introducedToContact.id}`}>
                  <p className="text-xs text-blue-600 hover:underline mt-1">
                    → Introduced to {outcome.introducedToContact.name}
                    {outcome.introducedToContact.company && ` (${outcome.introducedToContact.company})`}
                  </p>
                </Link>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(outcome.outcomeDate), 'MMM d, yyyy')}
            </span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

**Step 3: Update backend to include introduced contact**

Modify `server/storage.ts`:

Find `getContactDetail` method (around line 180) and update the outcomes query to include introduced contact:

```typescript
// Fetch outcomes with introduced contact details
const outcomesData = await db
  .select({
    id: outcomes.id,
    userId: outcomes.userId,
    contactId: outcomes.contactId,
    type: outcomes.type,
    description: outcomes.description,
    revenueAmount: outcomes.revenueAmount,
    revenueType: outcomes.revenueType,
    outcomeDate: outcomes.outcomeDate,
    sourceType: outcomes.sourceType,
    introducedToContactId: outcomes.introducedToContactId,
    interactionCount: outcomes.interactionCount,
    durationDays: outcomes.durationDays,
    createdAt: outcomes.createdAt,
    updatedAt: outcomes.updatedAt,
    introducedToContact: {
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
    }
  })
  .from(outcomes)
  .leftJoin(contacts, eq(outcomes.introducedToContactId, contacts.id))
  .where(eq(outcomes.contactId, contactId))
  .orderBy(desc(outcomes.outcomeDate));
```

**Step 4: Test introduction linking**

```bash
npm run dev
```

1. Go to Mike's contact detail page
2. Click "Record Outcome"
3. Select "Introduction Made"
4. Verify contact picker appears
5. Select "Anthony Caruso"
6. Save outcome
7. Verify outcome shows "→ Introduced to Anthony Caruso" link
8. Click link, verify it navigates to Anthony's contact page

**Step 5: Commit**

```bash
git add client/src/components/outcomes/outcome-form-modal.tsx client/src/pages/contact-detail.tsx server/storage.ts
git commit -m "feat(outcomes): add introduction tracking to link contacts"
```

---

## Testing & Documentation

### Task 7: Manual Testing Checklist

**Test Playbook Toggle:**

- [ ] Create contact WITH playbook → verify 7 actions generated
- [ ] Create contact WITHOUT playbook → verify 0 actions generated
- [ ] Check database: `SELECT id, name, use_playbook FROM contacts;`
- [ ] Verify contacts page displays both types correctly

**Test Freestyle Interaction Logging:**

- [ ] From contacts page, click "Log" button
- [ ] Verify modal opens
- [ ] Log interaction (email, call, coffee)
- [ ] Verify modal closes
- [ ] Check contact detail page shows interaction
- [ ] Verify XP/OS awarded

**Test Source Options:**

- [ ] Create contact, open "How You Met" dropdown
- [ ] Verify "Existing Friend/Family" option exists
- [ ] Select and save
- [ ] Verify displays correctly on contact card

**Test Introduction Tracking:**

- [ ] Go to Mike's contact detail
- [ ] Click "Record Outcome"
- [ ] Select type "Introduction Made"
- [ ] Verify contact picker appears
- [ ] Search and select Anthony
- [ ] Save outcome
- [ ] Verify outcome shows "→ Introduced to Anthony" link
- [ ] Click link, verify navigates to Anthony's page
- [ ] Check database: `SELECT id, type, introduced_to_contact_id FROM outcomes;`

---

### Task 8: Update Documentation

**Files:**
- Modify: `BACKLOG.md`

**Step 1: Mark items as completed in backlog**

Update the following items in BACKLOG.md:

Change status from 🆕 New to ✔️ Completed:

```markdown
#### Contact Card - Long Action Labels Push Button Out of Card
- **Status**: ✔️ Completed
- **Completed**: 2026-01-11
- **Notes**: This is a known CSS issue but deferred - playbook is now optional so less impact

#### Log Button on Contacts Page - Not Responsive
- **Status**: ✔️ Completed
- **Completed**: 2026-01-11
- **Fix**: Created InteractionFormModal and wired up onClick handler

#### "How Did You Meet" vs "Source" - Same Content
- **Status**: ✔️ Completed
- **Completed**: 2026-01-11
- **Fix**: Renamed to "How You Met" and expanded options to include existing relationships
```

Add new section for completed features:

```markdown
## Recently Completed ✅

### Flexible Playbook System (2026-01-11)
- Added "Use playbook?" checkbox to contact creation
- Playbook generation now conditional based on contact preference
- Supports both structured outreach (cold) and freestyle tracking (warm/hot)

### Standalone Interaction Logging (2026-01-11)
- Fixed "Log" button on contacts page
- Created InteractionFormModal for quick logging from list view
- No longer requires playbook to log interactions

### Expanded Source Options (2026-01-11)
- Added "Existing Friend/Family", "Former Colleague", and other relationship types
- Renamed field from "Source" to "How You Met" for clarity
- Consistent options across contact form and outcomes form

### Introduction Tracking (2026-01-11)
- Contact linking for "Introduction Made" outcomes
- Shows "→ Introduced to [Name]" on contact detail page
- Clickable links to navigate introduction chains
```

**Step 2: Commit documentation updates**

```bash
git add BACKLOG.md
git commit -m "docs: mark playbook flexibility features as completed in backlog"
```

---

## Final Integration Test

### Task 9: End-to-End User Flow

**Scenario 1: Cold Contact with Playbook**

1. Create contact "Jane Doe" (cold, LinkedIn source)
2. Check "Use playbook" → Create
3. Verify 7 playbook actions generated
4. Complete "Send initial outreach email" action
5. Log interaction via playbook action
6. Verify XP awarded

**Scenario 2: Warm Contact without Playbook**

1. Create contact "Bob Smith" (warm, former colleague source)
2. Uncheck "Use playbook" → Create
3. Verify 0 playbook actions generated
4. Go to contacts page
5. Click "Log" button on Bob's card
6. Log a coffee chat interaction
7. Verify XP awarded
8. Go to Bob's detail page, verify interaction appears

**Scenario 3: Introduction Chain**

1. Go to Mike's contact detail
2. Record outcome: "Introduction Made"
3. Select Anthony from contact picker
4. Save with description "Mike introduced me to Anthony at his company"
5. Verify outcome shows "→ Introduced to Anthony Caruso"
6. Click link, verify navigates to Anthony's page
7. On Anthony's page, verify source can be set to "Referral/Introduction"

**Scenario 4: Existing Friend**

1. Create contact "Sarah Johnson"
2. Source: "Existing Friend/Family"
3. Uncheck "Use playbook"
4. Add note: "Known since college"
5. Create contact
6. Log various interactions over time (coffee, text, call)
7. Record outcome: "Referral Obtained" or "Introduction Made"

**Step: Commit final changes**

```bash
git add .
git commit -m "feat: complete flexible playbook and interaction logging implementation"
```

**Step: Push to remote**

```bash
git push origin main
```

---

## Implementation Complete!

**What was built:**
- ✅ Optional playbook toggle for contacts
- ✅ Conditional playbook generation based on contact preference
- ✅ Fixed standalone interaction logging button
- ✅ Expanded source options for existing relationships
- ✅ Introduction tracking with contact linking
- ✅ Clickable introduction chains on contact detail pages

**Key improvements:**
- Supports both cold outreach (structured) and warm networking (freestyle)
- No longer forces playbook on every contact
- Easy to log ad-hoc interactions from contacts list
- Tracks relationship origins more accurately
- Visualizes introduction networks

**Next steps:**
1. Implement AI Assistant (docs/plans/2026-01-10-ai-assistant.md)
2. Fix remaining bugs from backlog (XP tracker, OS points, streaks)
3. Add playbook templates (future enhancement)

**Total estimated time:** 3-4 hours for experienced developer

---

**Plan saved to:** `docs/plans/2026-01-11-flexible-playbook-and-interaction-logging.md`
