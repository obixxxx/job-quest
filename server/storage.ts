import {
  users, contacts, interactions, opportunities, interviews, xpLogs, badges, dailyQuests,
  type User, type InsertUser,
  type Contact, type InsertContact,
  type Interaction, type InsertInteraction,
  type Opportunity, type InsertOpportunity,
  type Interview, type InsertInterview,
  type XPLog, type InsertXPLog,
  type Badge, type InsertBadge,
  type DailyQuest, type InsertDailyQuest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, lte, gte } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
