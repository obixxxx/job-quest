import {
  users, contacts, interactions, opportunities, interviews, xpLogs, badges, dailyQuests,
  templates, playbookActions, selectedQuests,
  type User, type InsertUser,
  type Contact, type InsertContact,
  type Interaction, type InsertInteraction,
  type Opportunity, type InsertOpportunity,
  type Interview, type InsertInterview,
  type XPLog, type InsertXPLog,
  type Badge, type InsertBadge,
  type DailyQuest, type InsertDailyQuest,
  type Template, type InsertTemplate,
  type PlaybookAction, type InsertPlaybookAction,
  type SelectedQuest, type InsertSelectedQuest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, isNull, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Contacts
  getContacts(userId: string): Promise<Contact[]>;
  getContact(id: string, userId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, userId: string, updates: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string, userId: string): Promise<boolean>;

  // Interactions
  getInteractions(userId: string, contactId?: string): Promise<Interaction[]>;
  getInteraction(id: string, userId: string): Promise<Interaction | undefined>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  updateInteraction(id: string, userId: string, updates: Partial<Interaction>): Promise<Interaction | undefined>;
  getFollowUps(userId: string): Promise<Interaction[]>;
  getLastInteraction(contactId: string): Promise<Interaction | undefined>;

  // Opportunities
  getOpportunities(userId: string): Promise<Opportunity[]>;
  getOpportunity(id: string, userId: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: string, userId: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined>;

  // Interviews
  getInterviews(userId: string): Promise<Interview[]>;
  createInterview(interview: InsertInterview): Promise<Interview>;

  // XP Logs
  createXPLog(log: InsertXPLog): Promise<XPLog>;
  getXPLogs(userId: string): Promise<XPLog[]>;

  // Badges
  getBadges(userId: string): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  hasBadge(userId: string, type: string): Promise<boolean>;

  // Daily Quests
  getDailyQuest(userId: string, date: string): Promise<DailyQuest | undefined>;
  createOrUpdateDailyQuest(quest: InsertDailyQuest): Promise<DailyQuest>;

  // Templates
  getTemplates(userId?: string): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateByName(name: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;

  // Playbook Actions
  getPlaybookActions(userId: string, contactId: string): Promise<PlaybookAction[]>;
  getPendingPlaybookActions(userId: string): Promise<(PlaybookAction & { contactName: string; contactCompany: string | null })[]>;
  getNextAction(userId: string): Promise<(PlaybookAction & { contactName: string; contactCompany: string | null; contactEmail: string | null }) | null>;
  createPlaybookAction(action: InsertPlaybookAction): Promise<PlaybookAction>;
  updatePlaybookAction(id: string, userId: string, updates: Partial<PlaybookAction>): Promise<PlaybookAction | undefined>;
  completePlaybookAction(id: string, userId: string, interactionId?: string): Promise<PlaybookAction | undefined>;
  skipPlaybookAction(id: string, userId: string): Promise<PlaybookAction | undefined>;

  // Selected Quests
  getSelectedQuests(userId: string, date: string): Promise<SelectedQuest[]>;
  createSelectedQuest(quest: InsertSelectedQuest): Promise<SelectedQuest>;
  updateSelectedQuest(id: string, userId: string, updates: Partial<SelectedQuest>): Promise<SelectedQuest | undefined>;
  incrementQuestProgress(userId: string, date: string, questType: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string, userId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
    return contact || undefined;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: string, userId: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const [contact] = await db.update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    return contact || undefined;
  }

  async deleteContact(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
    return true;
  }

  // Interactions
  async getInteractions(userId: string, contactId?: string): Promise<Interaction[]> {
    if (contactId) {
      return db.select().from(interactions)
        .where(and(eq(interactions.userId, userId), eq(interactions.contactId, contactId)))
        .orderBy(desc(interactions.createdAt));
    }
    return db.select().from(interactions)
      .where(eq(interactions.userId, userId))
      .orderBy(desc(interactions.createdAt));
  }

  async getInteraction(id: string, userId: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(interactions)
      .where(and(eq(interactions.id, id), eq(interactions.userId, userId)));
    return interaction || undefined;
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async updateInteraction(id: string, userId: string, updates: Partial<Interaction>): Promise<Interaction | undefined> {
    const [interaction] = await db.update(interactions)
      .set(updates)
      .where(and(eq(interactions.id, id), eq(interactions.userId, userId)))
      .returning();
    return interaction || undefined;
  }

  async getFollowUps(userId: string): Promise<Interaction[]> {
    return db.select().from(interactions)
      .where(and(
        eq(interactions.userId, userId),
        eq(interactions.isFollowUpDue, true)
      ))
      .orderBy(interactions.followUpDate);
  }

  async getLastInteraction(contactId: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(interactions)
      .where(eq(interactions.contactId, contactId))
      .orderBy(desc(interactions.createdAt))
      .limit(1);
    return interaction || undefined;
  }

  // Opportunities
  async getOpportunities(userId: string): Promise<Opportunity[]> {
    return db.select().from(opportunities)
      .where(eq(opportunities.userId, userId))
      .orderBy(desc(opportunities.createdAt));
  }

  async getOpportunity(id: string, userId: string): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities)
      .where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)));
    return opportunity || undefined;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: string, userId: string, updates: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const [opportunity] = await db.update(opportunities)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)))
      .returning();
    return opportunity || undefined;
  }

  // Interviews
  async getInterviews(userId: string): Promise<Interview[]> {
    return db.select().from(interviews)
      .where(eq(interviews.userId, userId))
      .orderBy(desc(interviews.scheduledDate));
  }

  async createInterview(interview: InsertInterview): Promise<Interview> {
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }

  // XP Logs
  async createXPLog(log: InsertXPLog): Promise<XPLog> {
    const [newLog] = await db.insert(xpLogs).values(log).returning();
    return newLog;
  }

  async getXPLogs(userId: string): Promise<XPLog[]> {
    return db.select().from(xpLogs)
      .where(eq(xpLogs.userId, userId))
      .orderBy(desc(xpLogs.createdAt));
  }

  // Badges
  async getBadges(userId: string): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.userId, userId));
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [newBadge] = await db.insert(badges).values(badge).returning();
    return newBadge;
  }

  async hasBadge(userId: string, type: string): Promise<boolean> {
    const [badge] = await db.select().from(badges)
      .where(and(eq(badges.userId, userId), eq(badges.type, type)));
    return !!badge;
  }

  // Daily Quests
  async getDailyQuest(userId: string, date: string): Promise<DailyQuest | undefined> {
    const [quest] = await db.select().from(dailyQuests)
      .where(and(eq(dailyQuests.userId, userId), eq(dailyQuests.date, date)));
    return quest || undefined;
  }

  async createOrUpdateDailyQuest(quest: InsertDailyQuest): Promise<DailyQuest> {
    const [newQuest] = await db.insert(dailyQuests)
      .values(quest)
      .onConflictDoUpdate({
        target: [dailyQuests.userId, dailyQuests.date],
        set: quest,
      })
      .returning();
    return newQuest;
  }

  // Templates
  async getTemplates(userId?: string): Promise<Template[]> {
    // Get default templates + user's custom templates
    if (userId) {
      return db.select().from(templates)
        .where(or(eq(templates.isDefault, true), eq(templates.userId, userId)))
        .orderBy(templates.name);
    }
    return db.select().from(templates)
      .where(eq(templates.isDefault, true))
      .orderBy(templates.name);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getTemplateByName(name: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.name, name));
    return template || undefined;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  // Playbook Actions
  async getPlaybookActions(userId: string, contactId: string): Promise<PlaybookAction[]> {
    return db.select().from(playbookActions)
      .where(and(eq(playbookActions.userId, userId), eq(playbookActions.contactId, contactId)))
      .orderBy(asc(playbookActions.actionOrder));
  }

  async getPendingPlaybookActions(userId: string): Promise<(PlaybookAction & { contactName: string; contactCompany: string | null })[]> {
    const results = await db.select({
      id: playbookActions.id,
      userId: playbookActions.userId,
      contactId: playbookActions.contactId,
      actionType: playbookActions.actionType,
      actionLabel: playbookActions.actionLabel,
      actionOrder: playbookActions.actionOrder,
      templateId: playbookActions.templateId,
      status: playbookActions.status,
      completedAt: playbookActions.completedAt,
      interactionId: playbookActions.interactionId,
      dueDate: playbookActions.dueDate,
      createdAt: playbookActions.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
      .from(playbookActions)
      .innerJoin(contacts, eq(playbookActions.contactId, contacts.id))
      .where(and(
        eq(playbookActions.userId, userId),
        eq(playbookActions.status, "pending")
      ))
      .orderBy(asc(playbookActions.dueDate), asc(playbookActions.actionOrder));
    
    return results;
  }

  async getNextAction(userId: string): Promise<(PlaybookAction & { contactName: string; contactCompany: string | null; contactEmail: string | null }) | null> {
    const today = new Date().toISOString().split('T')[0];
    
    // Priority: overdue first, then by action order
    const results = await db.select({
      id: playbookActions.id,
      userId: playbookActions.userId,
      contactId: playbookActions.contactId,
      actionType: playbookActions.actionType,
      actionLabel: playbookActions.actionLabel,
      actionOrder: playbookActions.actionOrder,
      templateId: playbookActions.templateId,
      status: playbookActions.status,
      completedAt: playbookActions.completedAt,
      interactionId: playbookActions.interactionId,
      dueDate: playbookActions.dueDate,
      createdAt: playbookActions.createdAt,
      contactName: contacts.name,
      contactCompany: contacts.company,
      contactEmail: contacts.email,
    })
      .from(playbookActions)
      .innerJoin(contacts, eq(playbookActions.contactId, contacts.id))
      .where(and(
        eq(playbookActions.userId, userId),
        eq(playbookActions.status, "pending")
      ))
      .orderBy(
        sql`CASE WHEN ${playbookActions.dueDate} < ${today} THEN 0 ELSE 1 END`,
        asc(playbookActions.dueDate),
        asc(playbookActions.actionOrder)
      )
      .limit(1);
    
    return results[0] || null;
  }

  async createPlaybookAction(action: InsertPlaybookAction): Promise<PlaybookAction> {
    const [newAction] = await db.insert(playbookActions).values(action).returning();
    return newAction;
  }

  async updatePlaybookAction(id: string, userId: string, updates: Partial<PlaybookAction>): Promise<PlaybookAction | undefined> {
    const [action] = await db.update(playbookActions)
      .set(updates)
      .where(and(eq(playbookActions.id, id), eq(playbookActions.userId, userId)))
      .returning();
    return action || undefined;
  }

  async completePlaybookAction(id: string, userId: string, interactionId?: string): Promise<PlaybookAction | undefined> {
    const [action] = await db.update(playbookActions)
      .set({ 
        status: "completed", 
        completedAt: new Date(),
        interactionId: interactionId || null
      })
      .where(and(eq(playbookActions.id, id), eq(playbookActions.userId, userId)))
      .returning();
    return action || undefined;
  }

  async skipPlaybookAction(id: string, userId: string): Promise<PlaybookAction | undefined> {
    const [action] = await db.update(playbookActions)
      .set({ status: "skipped" })
      .where(and(eq(playbookActions.id, id), eq(playbookActions.userId, userId)))
      .returning();
    return action || undefined;
  }

  // Selected Quests
  async getSelectedQuests(userId: string, date: string): Promise<SelectedQuest[]> {
    return db.select().from(selectedQuests)
      .where(and(eq(selectedQuests.userId, userId), eq(selectedQuests.date, date)));
  }

  async createSelectedQuest(quest: InsertSelectedQuest): Promise<SelectedQuest> {
    const [newQuest] = await db.insert(selectedQuests).values(quest).returning();
    return newQuest;
  }

  async updateSelectedQuest(id: string, userId: string, updates: Partial<SelectedQuest>): Promise<SelectedQuest | undefined> {
    const [quest] = await db.update(selectedQuests)
      .set(updates)
      .where(and(eq(selectedQuests.id, id), eq(selectedQuests.userId, userId)))
      .returning();
    return quest || undefined;
  }

  async incrementQuestProgress(userId: string, date: string, questType: string): Promise<void> {
    // Find matching quest and increment progress
    const quests = await db.select().from(selectedQuests)
      .where(and(
        eq(selectedQuests.userId, userId),
        eq(selectedQuests.date, date),
        eq(selectedQuests.questType, questType),
        eq(selectedQuests.isCompleted, false)
      ));
    
    for (const quest of quests) {
      const newCount = quest.currentCount + 1;
      const isCompleted = newCount >= quest.targetCount;
      await db.update(selectedQuests)
        .set({ currentCount: newCount, isCompleted })
        .where(eq(selectedQuests.id, quest.id));
    }
  }
}

export const storage = new DatabaseStorage();
