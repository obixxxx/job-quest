# Outcomes Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an outcomes tracking system that records relationship milestones (interviews, jobs, clients, intros, referrals, dead ends) with revenue tracking and analytics, integrated with AI context.

**Architecture:** New `outcomes` table linked to contacts, updated `interactions` table with "text" type and "status" field for scheduled events, new `/outcomes` page with timeline and revenue analytics, contact cards show outcome badges, AI context enhanced with outcome data.

**Tech Stack:** Drizzle ORM, Recharts for analytics charts, shadcn/ui components (Badge, Card, Chart), date-fns for date formatting.

---

## Phase 1: Database Schema Updates

### Task 1: Add Outcomes Table to Schema

**Files:**
- Modify: `shared/schema.ts` (append to end)

**Step 1: Add outcomes table definition**

Add after `userSettings` table (around line 380+):

```typescript
// Outcomes - major milestones in relationships
export const outcomes = pgTable("outcomes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => contacts.id, { onDelete: "cascade" }),

  // Outcome details
  type: text("type").notNull(), // "job_offer", "client_project", "introduction_made", "referral_obtained", "interview", "dead_end", "other"
  description: text("description").notNull(),

  // Revenue tracking (optional)
  revenueAmount: integer("revenue_amount"), // In dollars
  revenueType: text("revenue_type"), // "salary", "one_time", "monthly_recurring", "yearly_recurring"

  // When & how
  outcomeDate: date("outcome_date").notNull(),
  sourceType: text("source_type"), // "cold_outreach", "warm_intro", "referral", "event", "linkedin", "mutual_connection", "text"

  // For introductions: who were you introduced to?
  introducedToContactId: varchar("introduced_to_contact_id", { length: 36 }).references(() => contacts.id),

  // Auto-calculated metrics
  interactionCount: integer("interaction_count"), // How many interactions led to this
  durationDays: integer("duration_days"), // Days from first contact to outcome

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const outcomesRelations = relations(outcomes, ({ one }) => ({
  user: one(users, { fields: [outcomes.userId], references: [users.id] }),
  contact: one(contacts, { fields: [outcomes.contactId], references: [contacts.id] }),
  introducedToContact: one(contacts, { fields: [outcomes.introducedToContactId], references: [contacts.id] }),
}));
```

**Step 2: Update interactions table with new fields**

Find `interactions` table definition (around line 64) and modify the `type` field and add `status` field:

```typescript
export const interactions = pgTable("interactions", {
  // ... existing fields ...

  type: text("type").notNull(), // "email", "linkedin_dm", "call", "coffee", "text", "comment", "physical_letter"

  // Add new status field after type
  status: text("status").default("completed").notNull(), // "scheduled", "completed", "cancelled"

  // ... rest of fields ...
});
```

**Step 3: Update users relations**

Find `usersRelations` and add outcomes:

```typescript
export const usersRelations = relations(users, ({ many, one }) => ({
  // ... existing relations ...
  outcomes: many(outcomes),
  // ...
}));
```

**Step 4: Update contacts relations**

Find `contactsRelations` and add outcomes:

```typescript
export const contactsRelations = relations(contacts, ({ one, many }) => ({
  // ... existing relations ...
  outcomes: many(outcomes),
  // ...
}));
```

**Step 5: Add Zod schemas**

Add after all table definitions:

```typescript
export const insertOutcomeSchema = createInsertSchema(outcomes);
export const updateOutcomeSchema = insertOutcomeSchema.partial();
```

**Step 6: Push schema to database**

```bash
npm run db:push
```

Expected: "✓ Pushing schema changes" showing outcomes table created.

**Step 7: Verify tables**

```bash
psql $DATABASE_URL -c "\d outcomes"
psql $DATABASE_URL -c "\d interactions" # verify status column added
```

**Step 8: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(db): add outcomes table and update interactions with text type and status"
```

---

## Phase 2: Backend - Outcomes Storage & API

### Task 2: Add Outcomes Storage Methods

**Files:**
- Modify: `server/storage.ts`

**Step 1: Add import for outcomes table**

At top of file (around line 4), add to imports:

```typescript
import {
  // ... existing imports ...
  outcomes,
  insertOutcomeSchema
} from "@shared/schema";
```

**Step 2: Add createOutcome method**

Add after existing methods (around line 550+):

```typescript
async createOutcome(data: {
  userId: string;
  contactId: string;
  type: string;
  description: string;
  revenueAmount?: number | null;
  revenueType?: string | null;
  outcomeDate: string;
  sourceType?: string | null;
  introducedToContactId?: string | null;
}) {
  // Get contact's first interaction date for duration calculation
  const firstInteraction = await db
    .select({ createdAt: interactions.createdAt })
    .from(interactions)
    .where(eq(interactions.contactId, data.contactId))
    .orderBy(asc(interactions.createdAt))
    .limit(1);

  // Count interactions with this contact
  const interactionCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(interactions)
    .where(eq(interactions.contactId, data.contactId));

  const interactionCount = interactionCountResult[0]?.count || 0;

  // Calculate duration (days from first interaction to outcome)
  let durationDays: number | null = null;
  if (firstInteraction.length > 0) {
    const firstDate = new Date(firstInteraction[0].createdAt);
    const outcomeDate = new Date(data.outcomeDate);
    durationDays = Math.floor((outcomeDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const [outcome] = await db
    .insert(outcomes)
    .values({
      ...data,
      interactionCount,
      durationDays,
    })
    .returning();

  return outcome;
}
```

**Step 3: Add getOutcomesByContact method**

```typescript
async getOutcomesByContact(contactId: string) {
  return await db
    .select()
    .from(outcomes)
    .where(eq(outcomes.contactId, contactId))
    .orderBy(desc(outcomes.outcomeDate));
}
```

**Step 4: Add getAllOutcomes method**

```typescript
async getAllOutcomes(userId: string) {
  const result = await db
    .select({
      outcome: outcomes,
      contact: {
        id: contacts.id,
        name: contacts.name,
        company: contacts.company,
        role: contacts.role,
      },
    })
    .from(outcomes)
    .leftJoin(contacts, eq(outcomes.contactId, contacts.id))
    .where(eq(outcomes.userId, userId))
    .orderBy(desc(outcomes.outcomeDate));

  return result;
}
```

**Step 5: Add getOutcomesAnalytics method**

```typescript
async getOutcomesAnalytics(userId: string) {
  // Total revenue
  const revenueResult = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(revenue_amount), 0)`,
    })
    .from(outcomes)
    .where(eq(outcomes.userId, userId));

  // Revenue by source type
  const bySource = await db
    .select({
      sourceType: outcomes.sourceType,
      totalRevenue: sql<number>`COALESCE(SUM(revenue_amount), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(outcomes)
    .where(and(eq(outcomes.userId, userId), isNotNull(outcomes.revenueAmount)))
    .groupBy(outcomes.sourceType);

  // Revenue by outcome type
  const byType = await db
    .select({
      type: outcomes.type,
      totalRevenue: sql<number>`COALESCE(SUM(revenue_amount), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(outcomes)
    .where(and(eq(outcomes.userId, userId), isNotNull(outcomes.revenueAmount)))
    .groupBy(outcomes.type);

  return {
    totalRevenue: revenueResult[0]?.totalRevenue || 0,
    bySource,
    byType,
  };
}
```

**Step 6: Commit**

```bash
git add server/storage.ts
git commit -m "feat(storage): add outcomes CRUD and analytics methods"
```

---

### Task 3: Add Outcomes API Routes

**Files:**
- Modify: `server/routes.ts`

**Step 1: Add POST /api/outcomes route**

Add after existing routes (around line 750+):

```typescript
// Outcomes routes
app.post("/api/outcomes", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const data = req.body;

    const outcome = await storage.createOutcome({
      userId: userId!,
      contactId: data.contactId,
      type: data.type,
      description: data.description,
      revenueAmount: data.revenueAmount || null,
      revenueType: data.revenueType || null,
      outcomeDate: data.outcomeDate,
      sourceType: data.sourceType || null,
      introducedToContactId: data.introducedToContactId || null,
    });

    // If this is an introduction, update the introduced contact's source
    if (data.type === 'introduction_made' && data.introducedToContactId) {
      await storage.updateContact(data.introducedToContactId, {
        source: 'referral',
        notes: `Referred by ${data.contactName || 'contact'}`,
      });
    }

    res.json({ outcome });
  } catch (error: any) {
    console.error("Error creating outcome:", error);
    res.status(500).json({ error: "Failed to create outcome" });
  }
});
```

**Step 2: Add GET /api/outcomes route**

```typescript
app.get("/api/outcomes", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const outcomes = await storage.getAllOutcomes(userId!);
    res.json({ outcomes });
  } catch (error: any) {
    console.error("Error fetching outcomes:", error);
    res.status(500).json({ error: "Failed to fetch outcomes" });
  }
});
```

**Step 3: Add GET /api/outcomes/analytics route**

```typescript
app.get("/api/outcomes/analytics", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const analytics = await storage.getOutcomesAnalytics(userId!);
    res.json(analytics);
  } catch (error: any) {
    console.error("Error fetching outcomes analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});
```

**Step 4: Update GET /api/contacts/:id/detail to include outcomes**

Find the existing contact detail route (around line 250) and modify to include outcomes:

```typescript
app.get("/api/contacts/:id/detail", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const { id } = req.params;

    // ... existing code to fetch contact, interactions, playbookActions ...

    const outcomes = await storage.getOutcomesByContact(id);

    res.json({
      contact,
      interactions,
      playbookActions,
      outcomes, // Add outcomes
    });
  } catch (error: any) {
    console.error("Error fetching contact detail:", error);
    res.status(500).json({ error: "Failed to fetch contact detail" });
  }
});
```

**Step 5: Test routes with curl (optional)**

```bash
# Create outcome
curl -X POST http://localhost:5000/api/outcomes \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"contactId":"...","type":"interview","description":"Phone screen","outcomeDate":"2026-01-10"}'

# Get all outcomes
curl -X GET http://localhost:5000/api/outcomes \
  -H "Cookie: connect.sid=..."

# Get analytics
curl -X GET http://localhost:5000/api/outcomes/analytics \
  -H "Cookie: connect.sid=..."
```

**Step 6: Commit**

```bash
git add server/routes.ts
git commit -m "feat(api): add outcomes routes (POST, GET, analytics)"
```

---

## Phase 3: Frontend - Outcomes Page

### Task 4: Create Outcomes Page

**Files:**
- Create: `client/src/pages/outcomes.tsx`

**Step 1: Create outcomes page with summary cards**

Create `client/src/pages/outcomes.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { DollarSign, Briefcase, Users, TrendingUp } from 'lucide-react';

export default function Outcomes() {
  const { data: outcomesData, isLoading: outcomesLoading } = useQuery({
    queryKey: ['/api/outcomes'],
    queryFn: () => apiRequest('/api/outcomes'),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/outcomes/analytics'],
    queryFn: () => apiRequest('/api/outcomes/analytics'),
  });

  if (outcomesLoading || analyticsLoading) {
    return <div className="p-8">Loading outcomes...</div>;
  }

  const outcomes = outcomesData?.outcomes || [];

  // Calculate summary stats
  const jobOffers = outcomes.filter((o: any) => o.outcome.type === 'job_offer').length;
  const clientProjects = outcomes.filter((o: any) => o.outcome.type === 'client_project').length;
  const totalRevenue = analytics?.totalRevenue || 0;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Outcomes & Results</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Job Offers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobOffers}</div>
            <p className="text-xs text-muted-foreground">Offers received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Client Projects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientProjects}</div>
            <p className="text-xs text-muted-foreground">Projects landed</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Outcome Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p className="text-muted-foreground">No outcomes recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {outcomes.map((item: any) => {
                const outcome = item.outcome;
                const contact = item.contact;

                return (
                  <div key={outcome.id} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getOutcomeBadgeVariant(outcome.type)}>
                            {outcome.type.replace('_', ' ')}
                          </Badge>
                          <span className="font-semibold">{contact.name}</span>
                          {contact.company && (
                            <span className="text-muted-foreground">• {contact.company}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(outcome.outcomeDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {outcome.revenueAmount && (
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            ${outcome.revenueAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {outcome.revenueType?.replace('_', ' ')}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm">{outcome.description}</p>
                    {outcome.interactionCount !== null && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {outcome.interactionCount} interactions over {outcome.durationDays} days
                        {outcome.sourceType && ` • Source: ${outcome.sourceType.replace('_', ' ')}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getOutcomeBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case 'job_offer':
      return 'default';
    case 'client_project':
      return 'default';
    case 'interview':
      return 'secondary';
    case 'introduction_made':
    case 'referral_obtained':
      return 'outline';
    case 'dead_end':
      return 'destructive';
    default:
      return 'outline';
  }
}
```

**Step 2: Add Outcomes route**

Modify `client/src/App.tsx`, add route:

```typescript
<Route path="/outcomes" component={Outcomes} />
```

**Step 3: Add Outcomes to sidebar**

Modify `client/src/components/app-sidebar.tsx`:

```typescript
import { Trophy } from 'lucide-react';

// Add to nav items:
{
  title: "Outcomes",
  url: "/outcomes",
  icon: Trophy,
}
```

**Step 4: Test in browser**

1. Navigate to /outcomes
2. Verify summary cards show zeros
3. Verify "No outcomes recorded yet" message

**Step 5: Commit**

```bash
git add client/src/pages/outcomes.tsx client/src/App.tsx client/src/components/app-sidebar.tsx
git commit -m "feat(outcomes): create outcomes page with timeline and summary cards"
```

---

## Phase 4: Outcome Logging UI

### Task 5: Create Outcome Form Modal

**Files:**
- Create: `client/src/components/outcomes/outcome-form-modal.tsx`

**Step 1: Create outcome form modal component**

Create `client/src/components/outcomes/outcome-form-modal.tsx`:

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OutcomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
}

export function OutcomeFormModal({ isOpen, onClose, contactId, contactName }: OutcomeFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [type, setType] = useState('interview');
  const [description, setDescription] = useState('');
  const [outcomeDate, setOutcomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [revenueAmount, setRevenueAmount] = useState('');
  const [revenueType, setRevenueType] = useState('one_time');
  const [sourceType, setSourceType] = useState('cold_outreach');

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outcomes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/outcomes/analytics'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/detail`] });
      toast({ title: 'Outcome recorded successfully' });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({ title: 'Failed to record outcome', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setType('interview');
    setDescription('');
    setOutcomeDate(new Date().toISOString().split('T')[0]);
    setRevenueAmount('');
    setRevenueType('one_time');
    setSourceType('cold_outreach');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({ title: 'Description is required', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      contactId,
      contactName, // For referral notes
      type,
      description: description.trim(),
      outcomeDate,
      revenueAmount: revenueAmount ? parseInt(revenueAmount) : null,
      revenueType: revenueAmount ? revenueType : null,
      sourceType,
    });
  };

  const showRevenueFields = type === 'job_offer' || type === 'client_project';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Outcome</DialogTitle>
          <DialogDescription>
            Log a major milestone with {contactName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Outcome Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="job_offer">Job Offer</SelectItem>
                <SelectItem value="client_project">Client Project</SelectItem>
                <SelectItem value="introduction_made">Introduction Made</SelectItem>
                <SelectItem value="referral_obtained">Referral Obtained</SelectItem>
                <SelectItem value="dead_end">Dead End</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Phone screen for Senior Engineer role"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={outcomeDate}
              onChange={(e) => setOutcomeDate(e.target.value)}
            />
          </div>

          {showRevenueFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="revenue">Revenue Amount (optional)</Label>
                <Input
                  id="revenue"
                  type="number"
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              {revenueAmount && (
                <div className="space-y-2">
                  <Label htmlFor="revenueType">Revenue Type</Label>
                  <Select value={revenueType} onValueChange={setRevenueType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Salary (annual)</SelectItem>
                      <SelectItem value="one_time">One-time project</SelectItem>
                      <SelectItem value="monthly_recurring">Monthly recurring</SelectItem>
                      <SelectItem value="yearly_recurring">Yearly recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="source">How did you meet?</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                <SelectItem value="warm_intro">Warm Introduction</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="event">Event/Conference</SelectItem>
                <SelectItem value="mutual_connection">Mutual Connection</SelectItem>
                <SelectItem value="text">Text/SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Record Outcome'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/outcomes/outcome-form-modal.tsx
git commit -m "feat(outcomes): create outcome form modal component"
```

---

### Task 6: Add Outcome Button to Contact Detail Page

**Files:**
- Modify: `client/src/pages/contact-detail.tsx`

**Step 1: Add outcome button and modal**

Modify `client/src/pages/contact-detail.tsx`:

Add imports:

```typescript
import { useState } from 'react';
import { OutcomeFormModal } from '@/components/outcomes/outcome-form-modal';
import { Trophy } from 'lucide-react';
```

Add state:

```typescript
const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
```

Add button in the header (near "Log Interaction" button):

```typescript
<Button onClick={() => setIsOutcomeModalOpen(true)} variant="outline">
  <Trophy className="h-4 w-4 mr-2" />
  Record Outcome
</Button>
```

Add modal before closing tag:

```typescript
<OutcomeFormModal
  isOpen={isOutcomeModalOpen}
  onClose={() => setIsOutcomeModalOpen(false)}
  contactId={id}
  contactName={contactDetail?.contact.name || ''}
/>
```

**Step 2: Test in browser**

1. Go to a contact detail page
2. Click "Record Outcome"
3. Fill in form (interview, description, date)
4. Submit
5. Verify outcome appears in /outcomes page

**Step 3: Commit**

```bash
git add client/src/pages/contact-detail.tsx
git commit -m "feat(outcomes): add outcome button to contact detail page"
```

---

## Phase 5: Contact Card Enhancements

### Task 7: Add Outcome Badges to Contact Cards

**Files:**
- Modify: `client/src/components/contacts/contact-card.tsx`
- Modify: `client/src/pages/contact-detail.tsx`

**Step 1: Create outcome badge component**

Create `client/src/components/outcomes/outcome-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, Users, PhoneCall, XCircle } from 'lucide-react';

interface OutcomeBadgeProps {
  outcome: {
    type: string;
    description: string;
    revenueAmount?: number | null;
  };
}

export function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  const icons = {
    job_offer: Briefcase,
    client_project: DollarSign,
    interview: PhoneCall,
    introduction_made: Users,
    referral_obtained: Users,
    dead_end: XCircle,
    other: Briefcase,
  };

  const Icon = icons[outcome.type as keyof typeof icons] || Briefcase;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {outcome.type.replace('_', ' ')}
      </Badge>
      {outcome.revenueAmount && (
        <Badge variant="default" className="bg-green-600">
          ${outcome.revenueAmount.toLocaleString()}
        </Badge>
      )}
    </div>
  );
}
```

**Step 2: Display latest outcome in contact detail**

Modify `client/src/pages/contact-detail.tsx`:

Add import:

```typescript
import { OutcomeBadge } from '@/components/outcomes/outcome-badge';
```

Add outcomes section after interactions (in the UI):

```typescript
{/* Outcomes Section */}
{contactDetail?.outcomes && contactDetail.outcomes.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Outcomes</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {contactDetail.outcomes.map((outcome: any) => (
          <div key={outcome.id} className="flex items-center justify-between">
            <div>
              <OutcomeBadge outcome={outcome} />
              <p className="text-sm text-muted-foreground mt-1">{outcome.description}</p>
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

**Step 3: Test in browser**

1. Record an outcome on a contact
2. View contact detail
3. Verify outcome badge appears

**Step 4: Commit**

```bash
git add client/src/components/outcomes/outcome-badge.tsx client/src/pages/contact-detail.tsx
git commit -m "feat(outcomes): display outcome badges on contact detail"
```

---

## Phase 6: AI Integration

### Task 8: Add Outcomes to AI Context

**Files:**
- Modify: `client/src/lib/ai-context.tsx`
- Modify: `server/ai.ts`

**Step 1: Add outcomes to AIContext type**

Modify `client/src/lib/ai-context.tsx` and `server/ai.ts`:

Add to `AIContext` interface:

```typescript
export interface AIContext {
  // ... existing fields ...

  outcomes?: Array<{
    type: string;
    description: string;
    outcomeDate: string;
    revenueAmount?: number | null;
    revenueType?: string | null;
  }>;

  totalRevenueFromContact?: number;
}
```

**Step 2: Populate outcomes in context provider**

Modify `AIContextProvider` in `client/src/lib/ai-context.tsx`:

```typescript
const context: AIContext = {
  page: location.replace('/', '') || 'dashboard',
  contactId,
  contact: contactDetail?.contact ? {
    // ... existing contact fields ...
  } : undefined,
  interactions: contactDetail?.interactions || [],
  playbookActions: contactDetail?.playbookActions || [],
  outcomes: contactDetail?.outcomes || [],
  totalRevenueFromContact: contactDetail?.outcomes?.reduce(
    (sum: number, o: any) => sum + (o.revenueAmount || 0),
    0
  ) || 0,
  interactionFormState: formState,
};
```

**Step 3: Update AI system prompt to include outcomes**

Modify `buildSystemPrompt` in `server/ai.ts`:

Add after interaction history section:

```typescript
// Outcomes
if (context.outcomes && context.outcomes.length > 0) {
  parts.push(`\nOUTCOMES (${context.outcomes.length} milestones):`);
  context.outcomes.forEach((outcome, idx) => {
    const date = new Date(outcome.outcomeDate).toLocaleDateString();
    parts.push(`${idx + 1}. ${date} - ${outcome.type}: ${outcome.description}`);
    if (outcome.revenueAmount) {
      parts.push(`   Revenue: $${outcome.revenueAmount.toLocaleString()} (${outcome.revenueType})`);
    }
  });

  if (context.totalRevenueFromContact && context.totalRevenueFromContact > 0) {
    parts.push(`\nTotal revenue from this contact: $${context.totalRevenueFromContact.toLocaleString()}`);
  }
}
```

**Step 4: Test AI with outcomes**

1. Add an outcome to a contact (with revenue)
2. Open AI chat on that contact's page
3. Ask AI: "Summarize my relationship with this person"
4. Verify AI mentions the outcome and revenue

**Step 5: Commit**

```bash
git add client/src/lib/ai-context.tsx server/ai.ts
git commit -m "feat(ai): add outcomes and revenue to AI context"
```

---

## Phase 7: Scheduled Interactions Support

### Task 9: Add Status Field UI for Interactions

**Files:**
- Modify: `client/src/components/interactions/interaction-form.tsx`

**Step 1: Add status field to interaction form**

Modify the interaction form to include a status select:

Add to form state (if using controlled components):

```typescript
const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('completed');
```

Add UI field after interaction type:

```typescript
<div className="space-y-2">
  <Label htmlFor="status">Status</Label>
  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="completed">Completed (already happened)</SelectItem>
      <SelectItem value="scheduled">Scheduled (future)</SelectItem>
      <SelectItem value="cancelled">Cancelled (didn't happen)</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Include `status` in the submission data.

**Step 2: Display scheduled interactions differently**

Modify contact detail to show scheduled interactions with a badge:

```typescript
<Badge variant={interaction.status === 'scheduled' ? 'secondary' : 'outline'}>
  {interaction.status}
</Badge>
```

**Step 3: Test scheduled interaction flow**

1. Log interaction with status="scheduled"
2. Verify it shows as "scheduled" in interaction list
3. Later, edit it to mark as "completed"

**Step 4: Commit**

```bash
git add client/src/components/interactions/interaction-form.tsx client/src/pages/contact-detail.tsx
git commit -m "feat(interactions): add status field for scheduled/completed/cancelled"
```

---

## Testing & Documentation

### Task 10: Manual Testing Checklist

**Test Outcomes Tracking:**

1. **Create Outcomes:**
   - [ ] Record interview outcome (no revenue)
   - [ ] Record client project outcome (with revenue: $5000 one-time)
   - [ ] Record job offer outcome (with salary: $120000)
   - [ ] Record introduction made outcome
   - [ ] Record dead end outcome

2. **Outcomes Page:**
   - [ ] Navigate to /outcomes
   - [ ] Verify total revenue shows correctly
   - [ ] Verify job offers and client projects count correctly
   - [ ] Verify timeline shows all outcomes chronologically
   - [ ] Verify revenue badges appear on outcomes with money

3. **Contact Detail:**
   - [ ] Contact with outcomes shows outcome badges
   - [ ] Outcome badge shows correct icon and type
   - [ ] Revenue badge appears if outcome has money
   - [ ] Clicking "Record Outcome" opens modal

4. **AI Integration:**
   - [ ] Open AI chat on contact with outcomes
   - [ ] AI mentions outcomes in context
   - [ ] AI knows total revenue from contact
   - [ ] AI can reference outcomes when suggesting next steps

5. **Scheduled Interactions:**
   - [ ] Log interaction with status="scheduled"
   - [ ] Verify it shows differently in list
   - [ ] Edit to mark as completed
   - [ ] Verify status updates

### Task 11: Update Documentation

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `HANDOFF.md`

**Step 1: Document outcomes table in ARCHITECTURE.md**

Add to data model section:

```markdown
#### `outcomes`
**Purpose**: Major relationship milestones and results.

**Key Fields**:
- `type` - job_offer, client_project, introduction_made, referral_obtained, interview, dead_end, other
- `revenueAmount` - Dollar amount (nullable)
- `revenueType` - salary, one_time, monthly_recurring, yearly_recurring
- `outcomeDate` - When outcome occurred
- `sourceType` - How you met (cold_outreach, warm_intro, referral, etc.)
- `introducedToContactId` - If introduction_made, who were you introduced to
- `interactionCount` - Auto-calculated: number of interactions that led to this
- `durationDays` - Auto-calculated: days from first interaction to outcome

**Relations**:
- Many-to-one: user, contact
- One-to-one (optional): introducedToContact
```

**Step 2: Update HANDOFF.md with outcomes feature**

Add to features section:

```markdown
## New Features

**Outcomes Tracking (Just Added):**
- Record relationship milestones (interviews, jobs, clients, intros, referrals)
- Revenue tracking with analytics
- Timeline view showing complete journey
- Contact cards show outcome badges
- AI context includes outcomes for smarter suggestions
- Scheduled interaction support (mark calls/meetings as scheduled/completed/cancelled)
```

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md HANDOFF.md
git commit -m "docs: add outcomes tracking feature documentation"
```

---

## Final Steps

### Task 12: Integration Test & Final Commit

**Step 1: Full integration test**

1. Create 3 contacts
2. Log interactions with each
3. Record outcomes (1 interview, 1 client project $5K, 1 dead end)
4. Go to /outcomes page
5. Verify analytics show correct total revenue
6. Verify timeline shows all 3 outcomes
7. Open AI chat on contact with client project
8. Ask AI to summarize relationship
9. Verify AI mentions the $5K project

**Step 2: Final commit**

```bash
git add .
git commit -m "feat(outcomes): complete outcomes tracking with revenue analytics and AI integration"
```

**Step 3: Push to remote**

```bash
git push origin main
```

---

## Implementation Complete!

**What was built:**
- ✅ Database schema for outcomes tracking
- ✅ Outcomes CRUD API endpoints
- ✅ Outcomes page with timeline and revenue analytics
- ✅ Outcome logging UI (modal form)
- ✅ Contact cards show outcome badges
- ✅ AI context enhanced with outcomes and revenue data
- ✅ Scheduled interaction support (status field)
- ✅ Revenue breakdown by source and type

**Next steps:**
1. Add charts (Recharts) for revenue visualization
2. Add filtering to outcomes timeline (by type, by source, by date range)
3. Add "View Journey" modal showing detailed timeline for each contact
4. Enhance analytics with conversion rates (interactions → outcomes)
5. Add export functionality (CSV/PDF of outcomes)

**Total estimated time:** 2-3 days for experienced developer

---

**Plan saved to:** `docs/plans/2026-01-10-outcomes-tracking.md`
