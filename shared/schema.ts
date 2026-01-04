import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with game state
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  
  // Game state
  totalXP: integer("total_xp").default(0).notNull(),
  currentLevel: integer("current_level").default(1).notNull(),
  totalOS: integer("total_os").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  bestStreak: integer("best_streak").default(0).notNull(),
  lastActiveDate: date("last_active_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts),
  interactions: many(interactions),
  opportunities: many(opportunities),
  interviews: many(interviews),
  xpLogs: many(xpLogs),
  badges: many(badges),
  dailyQuests: many(dailyQuests),
  templates: many(templates),
  playbookActions: many(playbookActions),
  selectedQuests: many(selectedQuests),
}));

// Contacts table
export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  company: text("company"),
  role: text("role"),
  email: text("email"),
  linkedinUrl: text("linkedin_url"),
  phoneNumber: text("phone_number"),
  
  source: text("source"), // "LinkedIn", "Referral", "Event", etc.
  warmthLevel: text("warmth_level").default("cold").notNull(), // "cold", "warm", "hot"
  tags: text("tags").array().default(sql`'{}'::text[]`),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  interactions: many(interactions),
  playbookActions: many(playbookActions),
}));

// Interactions table
export const interactions = pgTable("interactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => contacts.id, { onDelete: "cascade" }),
  
  type: text("type").notNull(), // "email", "linkedin_dm", "call", "coffee", "comment", "physical_letter"
  direction: text("direction").default("outbound").notNull(), // "outbound", "inbound"
  messageContent: text("message_content"),
  
  outcome: text("outcome"), // "response_received", "referral_obtained", "intro_obtained", "intel_gathered", "no_response"
  outcomeDetails: text("outcome_details"),
  
  followUpDate: timestamp("follow_up_date"),
  followUpCount: integer("follow_up_count").default(0).notNull(),
  isFollowUpDue: boolean("is_follow_up_due").default(false).notNull(),
  
  xpAwarded: integer("xp_awarded").default(0).notNull(),
  osAwarded: integer("os_awarded").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interactionsRelations = relations(interactions, ({ one }) => ({
  user: one(users, { fields: [interactions.userId], references: [users.id] }),
  contact: one(contacts, { fields: [interactions.contactId], references: [contacts.id] }),
}));

// Opportunities table
export const opportunities = pgTable("opportunities", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  role: text("role").notNull(),
  company: text("company").notNull(),
  postingUrl: text("posting_url"),
  status: text("status").default("prospect").notNull(), // "prospect", "engaged", "interviewing", "offer", "rejected", "accepted"
  
  hiringManagerId: varchar("hiring_manager_id", { length: 36 }).references(() => contacts.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  user: one(users, { fields: [opportunities.userId], references: [users.id] }),
  hiringManager: one(contacts, { fields: [opportunities.hiringManagerId], references: [contacts.id] }),
  interviews: many(interviews),
}));

// Interviews table
export const interviews = pgTable("interviews", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  opportunityId: varchar("opportunity_id", { length: 36 }).notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id", { length: 36 }).references(() => contacts.id),
  
  scheduledDate: timestamp("scheduled_date").notNull(),
  stage: text("stage").notNull(), // "phone_screen", "first_round", "second_round", "final_round"
  outcome: text("outcome"), // "pending", "passed", "failed", "offer_received"
  source: text("source").notNull(), // "referral", "warm_intro", "cold_outreach"
  
  xpAwarded: integer("xp_awarded").default(0).notNull(),
  osAwarded: integer("os_awarded").default(0).notNull(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interviewsRelations = relations(interviews, ({ one }) => ({
  user: one(users, { fields: [interviews.userId], references: [users.id] }),
  opportunity: one(opportunities, { fields: [interviews.opportunityId], references: [opportunities.id] }),
  contact: one(contacts, { fields: [interviews.contactId], references: [contacts.id] }),
}));

// XP Logs table
export const xpLogs = pgTable("xp_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  reason: text("reason").notNull(), // "message_sent", "interview_confirmed", "streak_bonus", etc.
  xpAmount: integer("xp_amount").default(0).notNull(),
  osAmount: integer("os_amount").default(0).notNull(),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const xpLogsRelations = relations(xpLogs, ({ one }) => ({
  user: one(users, { fields: [xpLogs.userId], references: [users.id] }),
}));

// Badges table
export const badges = pgTable("badges", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  type: text("type").notNull(), // "intel_gathered", "persistence", "network_effect", "mailer", "campaigner"
  name: text("name").notNull(),
  description: text("description"),
  
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const badgesRelations = relations(badges, ({ one }) => ({
  user: one(users, { fields: [badges.userId], references: [users.id] }),
}));

// Daily Quests table
export const dailyQuests = pgTable("daily_quests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  date: date("date").notNull(),
  
  quest1Type: text("quest_1_type"),
  quest1Completed: boolean("quest_1_completed").default(false).notNull(),
  quest2Type: text("quest_2_type"),
  quest2Completed: boolean("quest_2_completed").default(false).notNull(),
  quest3Type: text("quest_3_type"),
  quest3Completed: boolean("quest_3_completed").default(false).notNull(),
  
  bonusXP: integer("bonus_xp").default(0).notNull(),
  allCompleted: boolean("all_completed").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyQuestsRelations = relations(dailyQuests, ({ one }) => ({
  user: one(users, { fields: [dailyQuests.userId], references: [users.id] }),
}));

// Templates table for outreach/scripts
export const templates = pgTable("templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  type: text("type").notNull(), // 'email', 'script', 'follow_up'
  subject: text("subject"), // for email templates only
  body: text("body").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, { fields: [templates.userId], references: [users.id] }),
}));

// Playbook actions table - tracks actions for each contact
export const playbookActions = pgTable("playbook_actions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => contacts.id, { onDelete: "cascade" }),
  
  actionType: text("action_type").notNull(), // 'initial_outreach', 'follow_up_1', etc.
  actionLabel: text("action_label").notNull(), // human-readable label
  actionOrder: integer("action_order").notNull(), // 1, 2, 3... for sequencing
  
  templateId: varchar("template_id", { length: 36 }).references(() => templates.id),
  status: text("status").default("pending").notNull(), // 'pending', 'completed', 'skipped'
  completedAt: timestamp("completed_at"),
  interactionId: varchar("interaction_id", { length: 36 }).references(() => interactions.id),
  dueDate: date("due_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playbookActionsRelations = relations(playbookActions, ({ one }) => ({
  user: one(users, { fields: [playbookActions.userId], references: [users.id] }),
  contact: one(contacts, { fields: [playbookActions.contactId], references: [contacts.id] }),
  template: one(templates, { fields: [playbookActions.templateId], references: [templates.id] }),
  interaction: one(interactions, { fields: [playbookActions.interactionId], references: [interactions.id] }),
}));

// Selected daily quests table (new flexible structure)
export const selectedQuests = pgTable("selected_quests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  date: date("date").notNull(),
  questType: text("quest_type").notNull(), // 'playbook', 'outreach', 'follow_up', 'new_contacts', 'calls'
  questLabel: text("quest_label").notNull(),
  xpReward: integer("xp_reward").default(0).notNull(),
  targetCount: integer("target_count").default(1).notNull(),
  currentCount: integer("current_count").default(0).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectedQuestsRelations = relations(selectedQuests, ({ one }) => ({
  user: one(users, { fields: [selectedQuests.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  totalXP: true,
  currentLevel: true,
  totalOS: true,
  currentStreak: true,
  bestStreak: true,
  lastActiveDate: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  earnedAt: true,
});

export const insertDailyQuestSchema = createInsertSchema(dailyQuests).omit({
  id: true,
  createdAt: true,
});

export const insertXpLogSchema = createInsertSchema(xpLogs).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaybookActionSchema = createInsertSchema(playbookActions).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export const insertSelectedQuestSchema = createInsertSchema(selectedQuests).omit({
  id: true,
  createdAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Server-side register schema only needs email and password
// (confirmPassword validation is handled client-side)
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type XPLog = typeof xpLogs.$inferSelect;
export type InsertXPLog = z.infer<typeof insertXpLogSchema>;
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type DailyQuest = typeof dailyQuests.$inferSelect;
export type InsertDailyQuest = z.infer<typeof insertDailyQuestSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type PlaybookAction = typeof playbookActions.$inferSelect;
export type InsertPlaybookAction = z.infer<typeof insertPlaybookActionSchema>;
export type SelectedQuest = typeof selectedQuests.$inferSelect;
export type InsertSelectedQuest = z.infer<typeof insertSelectedQuestSchema>;
