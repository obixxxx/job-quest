import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { hashPassword, comparePasswords, authMiddleware } from "./auth";
import {
  calculateInteractionRewards,
  calculateInterviewRewards,
  updateStreak,
  awardXP,
  checkAndAwardBadges,
} from "./game-engine";
import { loginSchema, registerSchema, insertContactSchema, insertInteractionSchema, insertOpportunitySchema, insertInterviewSchema, insertSelectedQuestSchema } from "@shared/schema";
import { z } from "zod";

// Playbook template definition
const PLAYBOOK_TEMPLATE = [
  { actionType: 'initial_outreach', label: 'Send initial outreach email', order: 1, templateName: 'Initial Outreach Email', dueDaysFromNow: 0 },
  { actionType: 'follow_up_1', label: 'Send Follow-up #1 (Add Value)', order: 2, templateName: 'Follow-up #1 (Add Value)', dueDaysFromNow: 3 },
  { actionType: 'follow_up_2', label: 'Send Follow-up #2 (Direct)', order: 3, templateName: 'Follow-up #2 (Direct)', dueDaysFromNow: 7 },
  { actionType: 'follow_up_3', label: 'Send Follow-up #3 (Final)', order: 4, templateName: 'Follow-up #3 (Final)', dueDaysFromNow: 14 },
  { actionType: 'schedule_call', label: 'Schedule a call', order: 5, templateName: null, dueDaysFromNow: null },
  { actionType: 'execute_call', label: 'During call: pivot to opportunities', order: 6, templateName: 'Call Conversation Script', dueDaysFromNow: null },
  { actionType: 'ask_for_intro', label: 'Ask for introductions', order: 7, templateName: 'Ask for Introduction', dueDaysFromNow: null },
];

// Generate playbook for a new contact
async function generatePlaybookForContact(userId: string, contactId: string) {
  for (const item of PLAYBOOK_TEMPLATE) {
    let templateId: string | null = null;
    if (item.templateName) {
      const template = await storage.getTemplateByName(item.templateName);
      templateId = template?.id || null;
    }
    
    let dueDate: string | null = null;
    if (item.dueDaysFromNow !== null) {
      const date = new Date();
      date.setDate(date.getDate() + item.dueDaysFromNow);
      dueDate = date.toISOString().split('T')[0];
    }
    
    await storage.createPlaybookAction({
      userId,
      contactId,
      actionType: item.actionType,
      actionLabel: item.label,
      actionOrder: item.order,
      templateId,
      status: 'pending',
      dueDate,
    });
  }
}

// Auto-detect which playbook action an interaction satisfies
function detectPlaybookActionType(interactionType: string, direction: string, outcome?: string | null): string | null {
  if (interactionType === 'email' && direction === 'outbound') {
    // Could match initial_outreach, follow_up_1, follow_up_2, or follow_up_3
    return 'email_outbound';
  }
  
  if (interactionType === 'call') {
    return 'execute_call';
  }
  
  if (outcome === 'referral_obtained' || outcome === 'intro_obtained') {
    return 'ask_for_intro';
  }
  
  return null;
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware with PostgreSQL store
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: 'session',
        // Table is managed by Drizzle schema, not by connect-pg-simple
      }),
      secret: process.env.SESSION_SECRET || "job-quest-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // DIAGNOSTIC: Log session state after session middleware
  app.use((req, res, next) => {
    console.log('[SESSION LAYER]', req.method, req.path, {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      userId: req.session?.userId,
      cookie: req.session?.cookie,
    });
    next();
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        email: data.email,
        passwordHash,
      });

      req.session.userId = user.id;

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('[REGISTER] Session save error:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        res.json({ user: { ...user, passwordHash: undefined } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const isValid = await comparePasswords(data.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('[LOGIN] Session save error:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        console.log('[LOGIN] Session saved successfully, userId:', user.id, 'sessionID:', req.sessionID);
        res.json({ user: { ...user, passwordHash: undefined } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json({ user: { ...user, passwordHash: undefined } });
  });

  // Dashboard route
  app.get("/api/dashboard", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      
      const allContacts = await storage.getContacts(userId);
      const allInteractions = await storage.getInteractions(userId);
      const followUps = await storage.getFollowUps(userId);
      const interviews = await storage.getInterviews(userId);
      
      // Get next action from playbook priority queue
      const playbookNextAction = await storage.getNextAction(userId);
      let nextAction = null;
      
      if (playbookNextAction) {
        // Get template if available
        let template = null;
        if (playbookNextAction.templateId) {
          template = await storage.getTemplate(playbookNextAction.templateId);
        }
        
        // Get last interaction for this contact
        const lastInteraction = await storage.getLastInteraction(playbookNextAction.contactId);
        
        // Calculate days since last contact
        let daysSinceContact = null;
        if (lastInteraction) {
          const lastDate = new Date(lastInteraction.createdAt);
          const today = new Date();
          daysSinceContact = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Check if overdue
        let isOverdue = false;
        let daysOverdue = 0;
        if (playbookNextAction.dueDate) {
          const today = new Date().toISOString().split('T')[0];
          if (playbookNextAction.dueDate < today) {
            isOverdue = true;
            const dueDate = new Date(playbookNextAction.dueDate);
            const todayDate = new Date();
            daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        
        nextAction = {
          ...playbookNextAction,
          template,
          lastInteraction,
          daysSinceContact,
          isOverdue,
          daysOverdue,
        };
      }
      
      // Build follow-ups with contact info
      const followUpItems = await Promise.all(
        followUps.slice(0, 10).map(async (interaction) => {
          const contact = await storage.getContact(interaction.contactId, userId);
          return contact ? { interaction, contact } : null;
        })
      );
      
      // Calculate stats
      const upcomingInterviews = interviews.filter(i => new Date(i.scheduledDate) >= new Date());
      const responsesReceived = allInteractions.filter(i => 
        i.outcome === "response_received" || 
        i.outcome === "intro_obtained" || 
        i.outcome === "referral_obtained"
      ).length;
      const responseRate = allInteractions.length > 0 
        ? Math.round((responsesReceived / allInteractions.length) * 100) 
        : 0;
      
      // Get selected quests for today
      const today = new Date().toISOString().split('T')[0];
      const selectedQuestsToday = await storage.getSelectedQuests(userId, today);
      const allQuestsComplete = selectedQuestsToday.length > 0 && selectedQuestsToday.every(q => q.isCompleted);
      
      const dailyQuests = {
        quests: selectedQuestsToday.map(q => ({
          id: q.id,
          type: q.questType,
          label: q.questLabel,
          completed: q.isCompleted,
          xp: q.xpReward,
          current: q.currentCount,
          target: q.targetCount,
        })),
        bonusXP: 25,
        allCompleted: allQuestsComplete,
        hasSelectedQuests: selectedQuestsToday.length > 0,
      };
      
      res.json({
        nextAction,
        followUps: followUpItems.filter(Boolean),
        stats: {
          interviewsScheduled: upcomingInterviews.length,
          activeConversations: allContacts.filter(c => c.warmthLevel === "warm" || c.warmthLevel === "hot").length,
          totalContacts: allContacts.length,
          responseRate,
        },
        dailyQuests,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  // Contacts routes
  app.get("/api/contacts", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const contacts = await storage.getContacts(userId);

      const contactsWithData = await Promise.all(
        contacts.map(async (contact) => {
          const lastInteraction = await storage.getLastInteraction(contact.id);

          // Get next playbook action for this contact
          const playbookActions = await storage.getPlaybookActions(userId, contact.id);
          const nextAction = playbookActions.find(a => a.status === 'pending');

          return { contact, lastInteraction, nextAction };
        })
      );

      res.json(contactsWithData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", authMiddleware, async (req, res) => {
    try {
      console.log('[POST /api/contacts] Entered route handler', {
        hasSession: !!req.session,
        userId: req.userId,
        sessionUserId: req.session?.userId,
      });

      const userId = req.userId!;
      const data = insertContactSchema.parse({ ...req.body, userId });
      
      const contact = await storage.createContact(data);

      // Generate playbook for the new contact
      await generatePlaybookForContact(userId, contact.id);

      // Award XP for adding a new contact
      await awardXP(userId, 10, 0, "contact_added", { contactId: contact.id });

      // Update quest progress for new_contacts
      const today = new Date().toISOString().split('T')[0];
      await storage.incrementQuestProgress(userId, today, 'new_contacts');

      // Check for badges
      await checkAndAwardBadges(userId);

      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const contact = await storage.updateContact(req.params.id, userId, req.body);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      await storage.deleteContact(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Interactions routes
  app.post("/api/interactions", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Calculate rewards
      const { xpAwarded, osAwarded, newWarmthLevel } = calculateInteractionRewards(
        req.body.type,
        req.body.outcome,
        user.currentStreak
      );
      
      // Set follow-up date (3 days from now if no response)
      let followUpDate = null;
      let isFollowUpDue = false;
      if (req.body.outcome === "no_response" || req.body.outcome === "response_received") {
        followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3);
        isFollowUpDue = true;
      }
      
      const data = insertInteractionSchema.parse({
        ...req.body,
        userId,
        followUpDate,
        isFollowUpDue,
      });
      
      const interaction = await storage.createInteraction({
        ...data,
        xpAwarded,
        osAwarded,
      });
      
      // Update contact warmth level if needed
      if (newWarmthLevel) {
        await storage.updateContact(req.body.contactId, userId, { warmthLevel: newWarmthLevel });
      }

      // Award XP and update streak
      await awardXP(userId, xpAwarded, osAwarded, "interaction_logged", { interactionId: interaction.id });
      await updateStreak(userId);
      await checkAndAwardBadges(userId);

      // Update quest progress based on interaction type
      const today = new Date().toISOString().split('T')[0];
      const interactionType = req.body.type?.toLowerCase() || '';
      const direction = req.body.direction?.toLowerCase() || '';

      if (interactionType === 'email' && direction === 'outbound') {
        await storage.incrementQuestProgress(userId, today, 'outreach_5');
      } else if (interactionType === 'call') {
        await storage.incrementQuestProgress(userId, today, 'calls');
      } else if (interactionType === 'linkedin' || interactionType.includes('linkedin')) {
        await storage.incrementQuestProgress(userId, today, 'linkedin');
      }

      res.json({ ...interaction, xpAwarded, osAwarded });
    } catch (error) {
      console.error("Interaction error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to log interaction" });
    }
  });

  // Follow-ups route
  app.get("/api/follow-ups", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const followUps = await storage.getFollowUps(userId);
      
      const followUpItems = await Promise.all(
        followUps.map(async (interaction) => {
          const contact = await storage.getContact(interaction.contactId, userId);
          return contact ? { interaction, contact } : null;
        })
      );
      
      res.json(followUpItems.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch follow-ups" });
    }
  });

  // Opportunities routes
  app.get("/api/opportunities", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const opportunities = await storage.getOpportunities(userId);
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.post("/api/opportunities", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const data = insertOpportunitySchema.parse({ ...req.body, userId });
      const opportunity = await storage.createOpportunity(data);
      res.json(opportunity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create opportunity" });
    }
  });

  // Interviews routes
  app.post("/api/interviews", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { xpAwarded, osAwarded } = calculateInterviewRewards(req.body.source);
      
      const data = insertInterviewSchema.parse({ ...req.body, userId });
      const interview = await storage.createInterview({
        ...data,
        xpAwarded,
        osAwarded,
      });
      
      // Award big XP for interview
      await awardXP(userId, xpAwarded, osAwarded, "interview_scheduled", { interviewId: interview.id });
      await updateStreak(userId);
      
      res.json({ ...interview, xpAwarded, osAwarded });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to log interview" });
    }
  });

  // Badges route
  app.get("/api/badges", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const badges = await storage.getBadges(userId);
      res.json(badges);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Templates routes
  app.get("/api/templates", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", authMiddleware, async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  const templateValidationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["email", "call_script", "follow_up"]),
    subject: z.string().nullable().optional(),
    body: z.string().min(1, "Body is required"),
  });

  app.post("/api/templates", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const validated = templateValidationSchema.parse(req.body);
      
      const template = await storage.createTemplate({
        ...validated,
        userId,
        isDefault: false,
      });
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put("/api/templates/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const validated = templateValidationSchema.parse(req.body);
      
      // Check if template exists and is owned by user (not a default)
      const existing = await storage.getTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (existing.isDefault) {
        return res.status(403).json({ message: "Cannot edit default templates" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this template" });
      }
      
      const template = await storage.updateTemplate(req.params.id, userId, validated);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const success = await storage.deleteTemplate(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Template not found or cannot delete default" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Playbook routes
  app.get("/api/playbook/next-action", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const nextAction = await storage.getNextAction(userId);
      
      if (nextAction && nextAction.templateId) {
        const template = await storage.getTemplate(nextAction.templateId);
        return res.json({ ...nextAction, template });
      }
      
      res.json(nextAction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch next action" });
    }
  });

  app.get("/api/playbook/contact/:contactId", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const actions = await storage.getPlaybookActions(userId, req.params.contactId);
      
      // Fetch templates for each action
      const actionsWithTemplates = await Promise.all(
        actions.map(async (action) => {
          if (action.templateId) {
            const template = await storage.getTemplate(action.templateId);
            return { ...action, template };
          }
          return { ...action, template: null };
        })
      );
      
      res.json(actionsWithTemplates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch playbook" });
    }
  });

  app.post("/api/playbook/:actionId/complete", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { interactionId } = req.body;
      
      const action = await storage.completePlaybookAction(req.params.actionId, userId, interactionId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      
      // Update quest progress for playbook actions
      const today = new Date().toISOString().split('T')[0];
      await storage.incrementQuestProgress(userId, today, 'playbook_actions');
      
      // Also check if it was a follow-up action
      if (['follow_up_1', 'follow_up_2', 'follow_up_3'].includes(action.actionType)) {
        await storage.incrementQuestProgress(userId, today, 'follow_ups');
      }
      
      res.json(action);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete action" });
    }
  });

  app.post("/api/playbook/:actionId/skip", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const action = await storage.skipPlaybookAction(req.params.actionId, userId);
      if (!action) {
        return res.status(404).json({ message: "Action not found" });
      }
      res.json(action);
    } catch (error) {
      res.status(500).json({ message: "Failed to skip action" });
    }
  });

  // Get contact with playbook and interactions
  app.get("/api/contacts/:id/detail", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const contact = await storage.getContact(req.params.id, userId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const playbookActions = await storage.getPlaybookActions(userId, req.params.id);
      const interactions = await storage.getInteractions(userId, req.params.id);
      const outcomes = await storage.getOutcomesByContact(req.params.id);

      // Fetch templates for playbook actions
      const actionsWithTemplates = await Promise.all(
        playbookActions.map(async (action) => {
          if (action.templateId) {
            const template = await storage.getTemplate(action.templateId);
            return { ...action, template };
          }
          return { ...action, template: null };
        })
      );

      // Find next action (first pending action)
      const nextAction = actionsWithTemplates.find(a => a.status === 'pending');

      res.json({
        contact,
        playbookActions: actionsWithTemplates,
        interactions,
        outcomes,
        nextAction,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact detail" });
    }
  });

  // Selected Quests routes
  const QUEST_OPTIONS = [
    { questType: 'playbook_actions', label: 'Complete 3 playbook actions', xpReward: 50, targetCount: 3 },
    { questType: 'outreach_5', label: 'Send 5 outreach messages', xpReward: 75, targetCount: 5 },
    { questType: 'follow_ups', label: 'Follow up with 3 contacts', xpReward: 50, targetCount: 3 },
    { questType: 'new_contacts', label: 'Add 2 new contacts', xpReward: 30, targetCount: 2 },
    { questType: 'calls', label: 'Schedule or complete 1 call', xpReward: 40, targetCount: 1 },
    { questType: 'research', label: 'Research 3 target companies', xpReward: 35, targetCount: 3 },
    { questType: 'linkedin', label: 'Engage on LinkedIn (5 interactions)', xpReward: 25, targetCount: 5 },
  ];

  app.get("/api/quests/options", authMiddleware, async (req, res) => {
    res.json(QUEST_OPTIONS);
  });

  app.get("/api/quests/today", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const today = new Date().toISOString().split('T')[0];
      const quests = await storage.getSelectedQuests(userId, today);
      
      // Check if all quests are complete for bonus
      const allComplete = quests.length > 0 && quests.every(q => q.isCompleted);
      
      res.json({ quests, allComplete, bonusXP: allComplete ? 25 : 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's quests" });
    }
  });

  app.post("/api/quests/select", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const { quests } = req.body as { quests: { questType: string }[] };
      const today = new Date().toISOString().split('T')[0];
      
      // Validate all quest types exist in server-side options BEFORE making changes
      const validQuestTypes = new Set(QUEST_OPTIONS.map(q => q.questType));
      const invalidQuests = quests.filter(q => !validQuestTypes.has(q.questType));
      if (invalidQuests.length > 0) {
        return res.status(400).json({ message: "Invalid quest types provided" });
      }
      
      // Validate 3-5 quests selected
      if (quests.length < 3 || quests.length > 5) {
        return res.status(400).json({ message: "Please select 3-5 quests" });
      }
      
      // Clear existing quests for today
      await storage.clearSelectedQuests(userId, today);
      
      // Create selected quests using server-side quest definitions (ignoring client-sent xp/targetCount)
      const createdQuests = [];
      for (const questData of quests) {
        const option = QUEST_OPTIONS.find(q => q.questType === questData.questType)!;
        const quest = await storage.createSelectedQuest({
          userId,
          date: today,
          questType: option.questType,
          questLabel: option.label,
          xpReward: option.xpReward,
          targetCount: option.targetCount,
          currentCount: 0,
          isCompleted: false,
        });
        createdQuests.push(quest);
      }
      
      res.json(createdQuests);
    } catch (error) {
      console.error("Quest select error:", error);
      res.status(500).json({ message: "Failed to select quests" });
    }
  });

  app.post("/api/quests/:questId/increment", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const quest = await storage.incrementQuestById(req.params.questId, userId);

      if (!quest) {
        return res.status(404).json({ message: "Quest not found" });
      }

      // Check if quest was just completed
      if (quest.isCompleted && quest.currentCount === quest.targetCount) {
        // Award quest XP
        await awardXP(userId, quest.xpReward, 0, "quest_completed", { questId: quest.id });
      }

      res.json(quest);
    } catch (error) {
      res.status(500).json({ message: "Failed to increment quest" });
    }
  });

  // Outcomes routes
  app.post("/api/outcomes", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const data = req.body;

      const outcome = await storage.createOutcome({
        userId: userId,
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
        await storage.updateContact(data.introducedToContactId, userId, {
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

  app.get("/api/outcomes", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const outcomes = await storage.getAllOutcomes(userId);
      res.json({ outcomes });
    } catch (error: any) {
      console.error("Error fetching outcomes:", error);
      res.status(500).json({ error: "Failed to fetch outcomes" });
    }
  });

  app.get("/api/outcomes/analytics", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const analytics = await storage.getOutcomesAnalytics(userId);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching outcomes analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
