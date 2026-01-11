# AI Assistant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a context-aware AI assistant that helps users draft messages and parse replies using Claude API, with customizable prompts and optional opt-in.

**Architecture:** Smart global assistant with chat panel that reads full context (contact info, interaction history, playbook status, form state) and sends to Claude API with user-customizable system prompts. Frontend uses React context for state, backend integrates Anthropic SDK.

**Tech Stack:** Anthropic Claude SDK (@anthropic-ai/sdk), React Context API, shadcn/ui components (Dialog, Textarea, Button), Drizzle ORM for settings storage.

---

## Phase 1: Database Schema & Settings Storage

### Task 1: Add user_settings Table to Schema

**Files:**
- Modify: `shared/schema.ts` (append to end of file)

**Step 1: Add user_settings table definition**

Add after the last table definition (around line 300+):

```typescript
// User settings for AI and other preferences
export const userSettings = pgTable("user_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // AI assistant settings
  aiEnabled: boolean("ai_enabled").default(false).notNull(),
  aiTonePrompt: text("ai_tone_prompt"),
  aiSystemInstructions: text("ai_system_instructions"),
  aiCapabilitiesPrompt: text("ai_capabilities_prompt"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));
```

**Step 2: Add to users relations**

Find `usersRelations` (around line 34) and add to the `many` or `one` section:

```typescript
export const usersRelations = relations(users, ({ many, one }) => ({
  // ... existing relations ...
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
}));
```

**Step 3: Add Zod schema for settings**

Add after all table definitions (around line 350+):

```typescript
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const updateUserSettingsSchema = insertUserSettingsSchema.partial();
```

**Step 4: Push schema to database**

```bash
npm run db:push
```

Expected: "✓ Pushing schema changes" and tables created.

**Step 5: Verify table exists**

```bash
psql $DATABASE_URL -c "\d user_settings"
```

Expected: Table structure shows with all columns.

**Step 6: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(db): add user_settings table for AI configuration"
```

---

### Task 2: Add Storage Methods for Settings

**Files:**
- Modify: `server/storage.ts` (add methods to DatabaseStorage class)

**Step 1: Add getUserSettings method**

Add after existing methods (around line 500+):

```typescript
async getUserSettings(userId: string) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  // Return settings or defaults if none exist
  return settings || {
    userId,
    aiEnabled: false,
    aiTonePrompt: null,
    aiSystemInstructions: null,
    aiCapabilitiesPrompt: null,
  };
}
```

**Step 2: Add createOrUpdateUserSettings method**

```typescript
async createOrUpdateUserSettings(userId: string, data: {
  aiEnabled?: boolean;
  aiTonePrompt?: string | null;
  aiSystemInstructions?: string | null;
  aiCapabilitiesPrompt?: string | null;
}) {
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const [updated] = await db
      .update(userSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updated;
  } else {
    // Create new
    const [created] = await db
      .insert(userSettings)
      .values({ userId, ...data })
      .returning();
    return created;
  }
}
```

**Step 3: Add import for userSettings table**

At top of file, find schema imports (around line 4) and add:

```typescript
import {
  // ... existing imports ...
  userSettings
} from "@shared/schema";
```

**Step 4: Test manually (optional)**

Start dev server and test in Postman/browser console:
```bash
npm run dev
```

**Step 5: Commit**

```bash
git add server/storage.ts
git commit -m "feat(storage): add getUserSettings and createOrUpdateUserSettings methods"
```

---

## Phase 2: Backend AI Integration

### Task 3: Install Anthropic SDK

**Files:**
- Modify: `package.json`

**Step 1: Install @anthropic-ai/sdk**

```bash
npm install @anthropic-ai/sdk
```

**Step 2: Verify installation**

```bash
npm list @anthropic-ai/sdk
```

Expected: Shows version installed (e.g., `@anthropic-ai/sdk@0.27.3`)

**Step 3: Add ANTHROPIC_API_KEY to .env.example**

Modify `.env.example`:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
SESSION_SECRET=your-session-secret-here
NODE_ENV=production
PORT=5000
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat(deps): add @anthropic-ai/sdk for AI assistant"
```

---

### Task 4: Create server/ai.ts Module

**Files:**
- Create: `server/ai.ts`

**Step 1: Create file with Anthropic client**

Create `server/ai.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client (only if API key is set)
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export function isAIEnabled(): boolean {
  return !!anthropic;
}
```

**Step 2: Add type definitions for context**

```typescript
export interface AIContext {
  page: string;
  contactId?: string;
  contact?: {
    name: string;
    company?: string;
    role?: string;
    email?: string;
    warmthLevel: string;
    notes?: string;
  };
  interactions?: Array<{
    type: string;
    direction: string;
    messageContent?: string;
    outcome?: string;
    outcomeDetails?: string;
    createdAt: string;
  }>;
  playbookActions?: Array<{
    actionLabel: string;
    status: string;
    dueDate?: string;
  }>;
  interactionFormState?: {
    type?: string;
    messageContent?: string;
    responseContent?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  isError?: boolean;
  contentToInsert?: {
    field: 'messageContent' | 'outcomeDetails' | 'notes';
    value: string;
  };
}
```

**Step 3: Add system prompt builder**

```typescript
function buildSystemPrompt(
  context: AIContext,
  userSettings: {
    aiTonePrompt?: string | null;
    aiSystemInstructions?: string | null;
    aiCapabilitiesPrompt?: string | null;
  }
): string {
  const parts: string[] = [];

  // System instructions (user-customizable)
  parts.push(
    userSettings.aiSystemInstructions ||
    "You are an AI assistant for Job Quest, a job search networking app. Be helpful and conversational."
  );

  // User's communication style
  if (userSettings.aiTonePrompt) {
    parts.push(`\nUSER'S COMMUNICATION STYLE:\n${userSettings.aiTonePrompt}`);
  }

  // Current context
  if (context.contact) {
    parts.push(`\nCURRENT CONTEXT:`);
    parts.push(`- Contact: ${context.contact.name}${context.contact.role ? ` (${context.contact.role}` : ''}${context.contact.company ? ` at ${context.contact.company})` : ')'}`);
    parts.push(`- Warmth Level: ${context.contact.warmthLevel}`);
    if (context.contact.notes) {
      parts.push(`- How you know them: ${context.contact.notes}`);
    }
  }

  // Interaction history
  if (context.interactions && context.interactions.length > 0) {
    parts.push(`\nINTERACTION HISTORY (${context.interactions.length} interactions):`);
    context.interactions.forEach((int, idx) => {
      const date = new Date(int.createdAt).toLocaleDateString();
      parts.push(`${idx + 1}. ${date} - ${int.type} (${int.direction})${int.outcome ? ` → ${int.outcome}` : ''}`);
      if (int.messageContent) {
        parts.push(`   Message: ${int.messageContent.slice(0, 100)}${int.messageContent.length > 100 ? '...' : ''}`);
      }
      if (int.outcomeDetails) {
        parts.push(`   Response: ${int.outcomeDetails.slice(0, 100)}${int.outcomeDetails.length > 100 ? '...' : ''}`);
      }
    });
  } else if (context.contact) {
    parts.push(`\nINTERACTION HISTORY: No interactions yet (new contact)`);
  }

  // Playbook status
  if (context.playbookActions && context.playbookActions.length > 0) {
    const nextAction = context.playbookActions.find(a => a.status === 'pending');
    if (nextAction) {
      parts.push(`\nPLAYBOOK STATUS:`);
      parts.push(`Next action: ${nextAction.actionLabel}${nextAction.dueDate ? ` (due: ${nextAction.dueDate})` : ''}`);
    }
  }

  // Current activity
  if (context.interactionFormState) {
    parts.push(`\nUSER IS CURRENTLY:`);
    if (context.interactionFormState.type) {
      parts.push(`- Logging a ${context.interactionFormState.type} interaction`);
    }
    if (context.interactionFormState.messageContent) {
      parts.push(`- Has started typing a message`);
    }
    if (context.interactionFormState.responseContent) {
      parts.push(`- Has a response to parse`);
    }
  }

  // Capabilities (user-customizable)
  parts.push(
    `\n${userSettings.aiCapabilitiesPrompt ||
      "YOU CAN HELP WITH:\n1. Drafting messages (email, LinkedIn, call scripts)\n2. Parsing replies to extract outcomes\n3. Suggesting next steps based on playbook and history"}`
  );

  return parts.join('\n');
}
```

**Step 4: Add main chat handler**

```typescript
export async function handleAIChat(
  context: AIContext,
  userMessage: string | null,
  conversationHistory: ChatMessage[],
  userSettings: {
    aiTonePrompt?: string | null;
    aiSystemInstructions?: string | null;
    aiCapabilitiesPrompt?: string | null;
  }
): Promise<AIResponse> {
  if (!anthropic) {
    return {
      message: "⚠️ AI assistant is not configured. Add ANTHROPIC_API_KEY to your environment variables.",
      isError: true
    };
  }

  try {
    const systemPrompt = buildSystemPrompt(context, userSettings);

    const messages: ChatMessage[] = [...conversationHistory];
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages as any, // Type coercion for Anthropic SDK
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return {
        message: content.text,
        isError: false
      };
    }

    return {
      message: "I encountered an unexpected response format.",
      isError: true
    };
  } catch (error: any) {
    // Handle specific API errors
    if (error.status === 429) {
      return {
        message: "⚠️ Rate limit exceeded. You've hit Claude's API rate limit. Wait 60 seconds and try again, or upgrade your Anthropic plan.",
        isError: true
      };
    } else if (error.status === 401) {
      return {
        message: "⚠️ Authentication failed. Your ANTHROPIC_API_KEY is invalid or expired. Check your environment variables.",
        isError: true
      };
    } else if (error.status === 402) {
      return {
        message: "⚠️ Payment required. Your Anthropic account has insufficient credits. Add credits at console.anthropic.com/settings/billing",
        isError: true
      };
    } else if (error.name === 'TimeoutError') {
      return {
        message: "⚠️ Request timed out. The AI took too long to respond. Try again with a simpler request.",
        isError: true
      };
    } else {
      return {
        message: `⚠️ Error: ${error.message}. Check the console for details.`,
        isError: true
      };
    }
  }
}
```

**Step 5: Commit**

```bash
git add server/ai.ts
git commit -m "feat(ai): create AI module with Claude API integration"
```

---

### Task 5: Add API Routes for AI and Settings

**Files:**
- Modify: `server/routes.ts`

**Step 1: Import AI module and types**

Add to imports at top (around line 1-15):

```typescript
import { handleAIChat, isAIEnabled, type AIContext, type ChatMessage } from "./ai";
```

**Step 2: Add GET /api/settings route**

Add after existing routes (around line 700+):

```typescript
// Settings routes
app.get("/api/settings", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const settings = await storage.getUserSettings(userId!);

    res.json({
      settings: {
        aiEnabled: settings.aiEnabled,
        aiTonePrompt: settings.aiTonePrompt,
        aiSystemInstructions: settings.aiSystemInstructions,
        aiCapabilitiesPrompt: settings.aiCapabilitiesPrompt,
      },
      aiAvailable: isAIEnabled() // Whether API key is set
    });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});
```

**Step 3: Add PUT /api/settings route**

```typescript
app.put("/api/settings", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const data = req.body;

    const updated = await storage.createOrUpdateUserSettings(userId!, {
      aiEnabled: data.aiEnabled,
      aiTonePrompt: data.aiTonePrompt,
      aiSystemInstructions: data.aiSystemInstructions,
      aiCapabilitiesPrompt: data.aiCapabilitiesPrompt,
    });

    res.json({ settings: updated });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});
```

**Step 4: Add POST /api/ai/chat route**

```typescript
// AI routes
app.post("/api/ai/chat", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.session;
    const { context, message, conversationHistory } = req.body as {
      context: AIContext;
      message: string | null;
      conversationHistory: ChatMessage[];
    };

    // Check if user has AI enabled
    const settings = await storage.getUserSettings(userId!);
    if (!settings.aiEnabled) {
      return res.status(403).json({
        error: "AI assistant is disabled. Enable it in Settings."
      });
    }

    if (!isAIEnabled()) {
      return res.status(503).json({
        error: "AI assistant is not configured on the server."
      });
    }

    const response = await handleAIChat(
      context,
      message,
      conversationHistory || [],
      settings
    );

    res.json(response);
  } catch (error: any) {
    console.error("Error in AI chat:", error);
    res.status(500).json({ error: "AI chat failed" });
  }
});
```

**Step 5: Test routes with curl (optional)**

```bash
# Get settings (requires valid session)
curl -X GET http://localhost:5000/api/settings -H "Cookie: connect.sid=..."

# Update settings
curl -X PUT http://localhost:5000/api/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"aiEnabled":true,"aiTonePrompt":"Be casual and friendly"}'
```

**Step 6: Commit**

```bash
git add server/routes.ts
git commit -m "feat(api): add /api/settings and /api/ai/chat routes"
```

---

## Phase 3: Frontend - AI Context Provider

### Task 6: Create AI Context Provider

**Files:**
- Create: `client/src/lib/ai-context.tsx`

**Step 1: Create AIContext with provider**

Create `client/src/lib/ai-context.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from './auth';
import { apiRequest } from './queryClient';

export interface AIContext {
  page: string;
  contactId?: string;
  contact?: {
    name: string;
    company?: string;
    role?: string;
    email?: string;
    warmthLevel: string;
    notes?: string;
  };
  interactions?: Array<{
    type: string;
    direction: string;
    messageContent?: string;
    outcome?: string;
    outcomeDetails?: string;
    createdAt: string;
  }>;
  playbookActions?: Array<{
    actionLabel: string;
    status: string;
    dueDate?: string;
  }>;
  interactionFormState?: {
    type?: string;
    messageContent?: string;
    responseContent?: string;
  };
}

interface AIContextValue {
  context: AIContext;
  setFormState: (state: AIContext['interactionFormState']) => void;
  isAIEnabled: boolean;
  isAIAvailable: boolean;
}

const AIContextContext = createContext<AIContextValue | null>(null);

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [formState, setFormState] = useState<AIContext['interactionFormState']>();
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(false);

  // Fetch AI settings on mount
  useEffect(() => {
    if (user) {
      apiRequest('/api/settings')
        .then((data: any) => {
          setIsAIEnabled(data.settings.aiEnabled);
          setIsAIAvailable(data.aiAvailable);
        })
        .catch(() => {
          setIsAIEnabled(false);
          setIsAIAvailable(false);
        });
    }
  }, [user]);

  // Build context based on current location
  const context: AIContext = {
    page: location.replace('/', '') || 'dashboard',
    interactionFormState: formState,
  };

  // TODO: In later tasks, we'll populate contact, interactions, playbookActions
  // based on the current page and data from React Query

  const value: AIContextValue = {
    context,
    setFormState,
    isAIEnabled,
    isAIAvailable,
  };

  return (
    <AIContextContext.Provider value={value}>
      {children}
    </AIContextContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIContextContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider');
  }
  return context;
}
```

**Step 2: Wrap App with AIContextProvider**

Modify `client/src/App.tsx`:

Find the return statement (around line 20-30) and wrap with AIContextProvider:

```typescript
import { AIContextProvider } from './lib/ai-context';

// In the return statement, wrap the content:
return (
  <AIContextProvider>
    <SidebarProvider>
      {/* ... existing content ... */}
    </SidebarProvider>
  </AIContextProvider>
);
```

**Step 3: Commit**

```bash
git add client/src/lib/ai-context.tsx client/src/App.tsx
git commit -m "feat(ai): add AIContextProvider for tracking user context"
```

---

## Phase 4: Frontend - AI Assistant UI

### Task 7: Create AI Assistant Button

**Files:**
- Create: `client/src/components/ai/ai-assistant-button.tsx`

**Step 1: Create AI button component**

Create `client/src/components/ai/ai-assistant-button.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAIContext } from '@/lib/ai-context';

interface AIAssistantButtonProps {
  onClick: () => void;
}

export function AIAssistantButton({ onClick }: AIAssistantButtonProps) {
  const { isAIEnabled, isAIAvailable } = useAIContext();

  // Don't show button if AI is not available or not enabled
  if (!isAIAvailable || !isAIEnabled) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
      aria-label="Open AI Assistant"
    >
      <Sparkles className="h-6 w-6" />
    </Button>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ai/ai-assistant-button.tsx
git commit -m "feat(ai): create AI assistant floating button"
```

---

### Task 8: Create AI Chat Panel

**Files:**
- Create: `client/src/components/ai/ai-chat-panel.tsx`

**Step 1: Create chat panel component**

Create `client/src/components/ai/ai-chat-panel.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Settings } from 'lucide-react';
import { useAIContext } from '@/lib/ai-context';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const { context } = useAIContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Send initial context message when panel opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage(null); // null = just opening, get greeting
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (userMessage: string | null) => {
    setIsLoading(true);

    // Add user message to UI if provided
    if (userMessage) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setInput('');
    }

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await apiRequest('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          message: userMessage,
          conversationHistory
        })
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        isError: response.isError
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">AI Assistant</h2>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.isError
                    ? 'bg-destructive/10 text-destructive border border-destructive'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ai/ai-chat-panel.tsx
git commit -m "feat(ai): create AI chat panel component"
```

---

### Task 9: Wire AI Button and Panel into App

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Add state for chat panel**

In `client/src/App.tsx`, add imports and state:

```typescript
import { useState } from 'react';
import { AIAssistantButton } from '@/components/ai/ai-assistant-button';
import { AIChatPanel } from '@/components/ai/ai-chat-panel';

function App() {
  const { user, loading } = useAuth();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // ... rest of component
}
```

**Step 2: Render button and panel**

Add before the closing tags (after sidebar content):

```typescript
return (
  <AIContextProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* ... routes ... */}
      </SidebarInset>

      {/* AI Assistant */}
      <AIAssistantButton onClick={() => setIsAIChatOpen(true)} />
      <AIChatPanel isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </SidebarProvider>
  </AIContextProvider>
);
```

**Step 3: Test in browser**

```bash
npm run dev
```

Visit http://localhost:5000, log in, and verify:
- AI button appears in bottom-right if AI is enabled in settings
- Clicking opens chat panel
- Chat panel can be closed

**Step 4: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(ai): wire AI button and chat panel into app"
```

---

## Phase 5: Settings Page

### Task 10: Create Settings Page

**Files:**
- Create: `client/src/pages/settings.tsx`

**Step 1: Create settings page**

Create `client/src/pages/settings.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
  });

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiTonePrompt, setAiTonePrompt] = useState('');
  const [aiSystemInstructions, setAiSystemInstructions] = useState('');
  const [aiCapabilitiesPrompt, setAiCapabilitiesPrompt] = useState('');

  useEffect(() => {
    if (data?.settings) {
      setAiEnabled(data.settings.aiEnabled || false);
      setAiTonePrompt(data.settings.aiTonePrompt || '');
      setAiSystemInstructions(data.settings.aiSystemInstructions || '');
      setAiCapabilitiesPrompt(data.settings.aiCapabilitiesPrompt || '');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (settings: any) =>
      apiRequest('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: 'Settings saved successfully' });
      // Reload to update AI button visibility
      window.location.reload();
    },
    onError: () => {
      toast({
        title: 'Failed to save settings',
        variant: 'destructive'
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      aiEnabled,
      aiTonePrompt: aiTonePrompt || null,
      aiSystemInstructions: aiSystemInstructions || null,
      aiCapabilitiesPrompt: aiCapabilitiesPrompt || null,
    });
  };

  if (isLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  const aiAvailable = data?.aiAvailable;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* AI Assistant Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
          <CardDescription>
            Configure your AI assistant powered by Claude
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!aiAvailable && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ AI assistant is not available. Add <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">ANTHROPIC_API_KEY</code> to your environment variables to enable AI features.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AI Assistant</Label>
              <p className="text-sm text-muted-foreground">
                Show AI assistant button and enable AI features
              </p>
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
              disabled={!aiAvailable}
            />
          </div>

          {aiEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tone">Communication Style</Label>
                <Textarea
                  id="tone"
                  value={aiTonePrompt}
                  onChange={(e) => setAiTonePrompt(e.target.value)}
                  placeholder="Example: Write like a friendly peer, be concise, avoid corporate jargon, use contractions"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  This will be applied to all AI-generated drafts. You can refine further in the chat.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">System Instructions</Label>
                <Textarea
                  id="instructions"
                  value={aiSystemInstructions}
                  onChange={(e) => setAiSystemInstructions(e.target.value)}
                  placeholder="Default: You are an AI assistant for Job Quest, a job search networking app. Be helpful and conversational."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  How Claude should behave overall. Leave blank to use default.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capabilities">Capabilities Description</Label>
                <Textarea
                  id="capabilities"
                  value={aiCapabilitiesPrompt}
                  onChange={(e) => setAiCapabilitiesPrompt(e.target.value)}
                  placeholder="Default: 1. Draft messages&#10;2. Parse replies&#10;3. Suggest next steps"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  What tasks Claude can help with. Leave blank to use default.
                </p>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Account Section (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            More settings coming soon
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
```

**Step 2: Add Settings route**

Modify `client/src/App.tsx`, add route in the Switch:

```typescript
<Route path="/settings" component={Settings} />
```

**Step 3: Add Settings to sidebar**

Modify `client/src/components/app-sidebar.tsx`, add Settings nav item:

```typescript
import { Settings as SettingsIcon } from 'lucide-react';

// In the nav items array:
{
  title: "Settings",
  url: "/settings",
  icon: SettingsIcon,
}
```

**Step 4: Test in browser**

1. Navigate to /settings
2. Toggle AI on (if API key is set)
3. Fill in tone prompt
4. Save
5. Verify AI button appears

**Step 5: Commit**

```bash
git add client/src/pages/settings.tsx client/src/App.tsx client/src/components/app-sidebar.tsx
git commit -m "feat(settings): create settings page with AI configuration"
```

---

## Phase 6: Context Enhancement (Optional)

### Task 11: Populate Full Context in AIContextProvider

**Files:**
- Modify: `client/src/lib/ai-context.tsx`

**Note:** This task enhances the context provider to fetch contact details, interactions, and playbook actions. This is optional for MVP but recommended for full functionality.

**Step 1: Add contact detail fetching**

Modify `AIContextProvider` to use React Query to fetch contact data when on contact detail page:

```typescript
import { useQuery } from '@tanstack/react-query';

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [formState, setFormState] = useState<AIContext['interactionFormState']>();
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(false);

  // Fetch AI settings on mount
  useEffect(() => {
    if (user) {
      apiRequest('/api/settings')
        .then((data: any) => {
          setIsAIEnabled(data.settings.aiEnabled);
          setIsAIAvailable(data.aiAvailable);
        })
        .catch(() => {
          setIsAIEnabled(false);
          setIsAIAvailable(false);
        });
    }
  }, [user]);

  // Fetch contact detail if on contact detail page
  const contactId = location.startsWith('/contacts/') ? params.id : undefined;

  const { data: contactDetail } = useQuery({
    queryKey: [`/api/contacts/${contactId}/detail`],
    queryFn: () => apiRequest(`/api/contacts/${contactId}/detail`),
    enabled: !!contactId,
  });

  // Build context based on current location
  const context: AIContext = {
    page: location.replace('/', '') || 'dashboard',
    contactId,
    contact: contactDetail?.contact ? {
      name: contactDetail.contact.name,
      company: contactDetail.contact.company,
      role: contactDetail.contact.role,
      email: contactDetail.contact.email,
      warmthLevel: contactDetail.contact.warmthLevel,
      notes: contactDetail.contact.notes,
    } : undefined,
    interactions: contactDetail?.interactions || [],
    playbookActions: contactDetail?.playbookActions || [],
    interactionFormState: formState,
  };

  const value: AIContextValue = {
    context,
    setFormState,
    isAIEnabled,
    isAIAvailable,
  };

  return (
    <AIContextContext.Provider value={value}>
      {children}
    </AIContextContext.Provider>
  );
}
```

**Step 2: Test context in AI chat**

1. Go to a contact detail page
2. Open AI chat
3. Verify AI greets you with contact name and context

**Step 3: Commit**

```bash
git add client/src/lib/ai-context.tsx
git commit -m "feat(ai): populate full context with contact and interaction data"
```

---

## Testing & Documentation

### Task 12: Manual Testing Checklist

**Test AI Assistant:**

1. **Settings Page:**
   - [ ] Navigate to /settings
   - [ ] If no API key: See warning, AI toggle disabled
   - [ ] If API key set: Can toggle AI on/off
   - [ ] Can set tone prompt and save
   - [ ] After saving with AI on, AI button appears

2. **AI Button:**
   - [ ] Button appears bottom-right when AI enabled
   - [ ] Clicking opens chat panel

3. **AI Chat:**
   - [ ] Chat opens with greeting based on context
   - [ ] Can type message and get response
   - [ ] Response appears in chat
   - [ ] Settings gear icon links to /settings
   - [ ] Close button closes panel

4. **Context Awareness:**
   - [ ] On dashboard: Generic greeting
   - [ ] On contact detail: Mentions contact name
   - [ ] AI sees interaction history (if Task 11 done)

5. **Error Handling:**
   - [ ] If API key invalid: Shows authentication error
   - [ ] If rate limited: Shows rate limit error
   - [ ] If API key removed: Shows configuration error

### Task 13: Update Documentation

**Files:**
- Modify: `docs/ENVIRONMENT.md`
- Modify: `HANDOFF.md`

**Step 1: Document ANTHROPIC_API_KEY in ENVIRONMENT.md**

Add to environment variables section:

```markdown
### 5. `ANTHROPIC_API_KEY` (Optional for AI features)

**Purpose**: API key for Claude AI integration.

**Where it's used**:
- `server/ai.ts` - Claude API calls

**Format**:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**How to get**:
1. Sign up at https://console.anthropic.com
2. Go to Settings → API Keys
3. Create new key
4. Copy and add to `.env`

**Behavior if missing**:
- AI assistant features are disabled
- Settings page shows warning
- AI button does not appear
```

**Step 2: Update HANDOFF.md**

Add AI assistant to features list:

```markdown
## New Features

**AI Assistant (Just Added):**
- Context-aware chat assistant powered by Claude
- Customizable prompts (tone, system instructions, capabilities)
- Optional feature (requires ANTHROPIC_API_KEY)
- Enable/disable in Settings page
- Cost: ~$0.50/day for normal usage (~15 messages)
```

**Step 3: Commit**

```bash
git add docs/ENVIRONMENT.md HANDOFF.md
git commit -m "docs: add AI assistant setup instructions"
```

---

## Final Steps

### Task 14: Integration Test & Commit

**Step 1: Full integration test**

1. Start fresh (clear database if needed)
2. Register new account
3. Go to Settings, enable AI (with valid API key)
4. Create a contact
5. Log interaction
6. Open AI chat from contact detail
7. Ask AI to draft a message
8. Verify AI sees contact info and interaction history
9. Close chat, disable AI in settings
10. Verify AI button disappears

**Step 2: Final commit**

```bash
git add .
git commit -m "feat(ai): complete AI assistant implementation with context awareness"
```

**Step 3: Push to remote**

```bash
git push origin main
```

---

## Implementation Complete!

**What was built:**
- ✅ Database schema for user settings
- ✅ Backend AI integration with Claude API
- ✅ API routes for chat and settings
- ✅ AI context provider tracking user state
- ✅ AI assistant button and chat panel UI
- ✅ Settings page with AI configuration
- ✅ Error handling with specific messages
- ✅ Optional feature (requires API key + user opt-in)

**Next steps:**
1. Implement Outcomes Tracking feature (separate plan)
2. Enhance AI with content insertion logic
3. Add AI-suggested quick actions
4. Monitor API costs and optimize prompts

**Total estimated time:** 2-3 days for experienced developer

---

**Plan saved to:** `docs/plans/2026-01-10-ai-assistant.md`
