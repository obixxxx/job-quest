import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { hashPassword, comparePasswords, authMiddleware } from "./auth";
import {
  calculateInteractionRewards,
  calculateInterviewRewards,
  updateStreak,
  awardXP,
  checkAndAwardBadges,
} from "./game-engine";
import { loginSchema, registerSchema, insertContactSchema, insertInteractionSchema, insertOpportunitySchema, insertInterviewSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware
  app.use(
    session({
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
      
      res.json({ user: { ...user, passwordHash: undefined } });
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
      
      res.json({ user: { ...user, passwordHash: undefined } });
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
      
      // Find next action (contact that needs attention)
      let nextAction = null;
      if (allContacts.length > 0) {
        // Find contact with oldest/no interaction
        const contactInteractions = new Map<string, Date>();
        allInteractions.forEach(int => {
          const existing = contactInteractions.get(int.contactId);
          if (!existing || new Date(int.createdAt) > existing) {
            contactInteractions.set(int.contactId, new Date(int.createdAt));
          }
        });
        
        const sortedContacts = [...allContacts].sort((a, b) => {
          const aDate = contactInteractions.get(a.id);
          const bDate = contactInteractions.get(b.id);
          if (!aDate) return -1;
          if (!bDate) return 1;
          return aDate.getTime() - bDate.getTime();
        });
        
        if (sortedContacts.length > 0) {
          const contact = sortedContacts[0];
          const lastInteraction = await storage.getLastInteraction(contact.id);
          nextAction = { contact, lastInteraction };
        }
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
      
      // Daily quests placeholder
      const dailyQuests = {
        quests: [
          { type: "send_message", label: "Send a message", completed: false, xp: 10 },
          { type: "log_interaction", label: "Log an interaction", completed: allInteractions.some(i => {
            const today = new Date().toISOString().split('T')[0];
            return i.createdAt.toISOString().split('T')[0] === today;
          }), xp: 15 },
          { type: "add_contact", label: "Add a new contact", completed: allContacts.some(c => {
            const today = new Date().toISOString().split('T')[0];
            return c.createdAt.toISOString().split('T')[0] === today;
          }), xp: 10 },
        ],
        bonusXP: 25,
        allCompleted: false,
      };
      dailyQuests.allCompleted = dailyQuests.quests.every(q => q.completed);
      
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
      
      const contactsWithInteractions = await Promise.all(
        contacts.map(async (contact) => {
          const lastInteraction = await storage.getLastInteraction(contact.id);
          return { contact, lastInteraction };
        })
      );
      
      res.json(contactsWithInteractions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", authMiddleware, async (req, res) => {
    try {
      const userId = req.userId!;
      const data = insertContactSchema.parse({ ...req.body, userId });
      
      const contact = await storage.createContact(data);
      
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

  return httpServer;
}
