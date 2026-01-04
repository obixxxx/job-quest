import { storage } from "./storage";

// XP rewards for different actions
const XP_REWARDS = {
  email: 10,
  linkedin_dm: 10,
  call: 15,
  coffee: 25,
  physical_letter: 20,
  comment: 5,
};

// OS rewards for different outcomes
const OUTCOME_REWARDS = {
  no_response: { xp: 10, os: 0 },
  response_received: { xp: 15, os: 5 },
  intel_gathered: { xp: 20, os: 10 },
  intro_obtained: { xp: 30, os: 15 },
  referral_obtained: { xp: 50, os: 25 },
};

// Interview rewards based on source
const INTERVIEW_REWARDS = {
  cold_outreach: { xp: 75, os: 30 },
  warm_intro: { xp: 100, os: 40 },
  referral: { xp: 150, os: 50 },
};

export function getStreakMultiplier(streak: number): number {
  if (streak >= 14) return 2.0;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.25;
  return 1.0;
}

export function calculateXPForLevel(level: number): number {
  return level * 100;
}

export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  let xpRequired = 100;
  let accumulatedXP = 0;
  
  while (accumulatedXP + xpRequired <= totalXP) {
    accumulatedXP += xpRequired;
    level++;
    xpRequired = level * 100;
  }
  
  return level;
}

interface InteractionRewardResult {
  xpAwarded: number;
  osAwarded: number;
  newWarmthLevel?: "cold" | "warm" | "hot";
}

export function calculateInteractionRewards(
  type: string,
  outcome: string | undefined,
  currentStreak: number
): InteractionRewardResult {
  const baseXP = XP_REWARDS[type as keyof typeof XP_REWARDS] || 10;
  const outcomeReward = outcome ? OUTCOME_REWARDS[outcome as keyof typeof OUTCOME_REWARDS] : { xp: 0, os: 0 };
  
  const multiplier = getStreakMultiplier(currentStreak);
  
  const xpAwarded = Math.floor((baseXP + outcomeReward.xp) * multiplier);
  const osAwarded = outcomeReward.os;
  
  // Determine warmth level change
  let newWarmthLevel: "cold" | "warm" | "hot" | undefined;
  if (outcome === "response_received" || outcome === "intel_gathered") {
    newWarmthLevel = "warm";
  } else if (outcome === "intro_obtained" || outcome === "referral_obtained") {
    newWarmthLevel = "hot";
  }
  
  return { xpAwarded, osAwarded, newWarmthLevel };
}

export function calculateInterviewRewards(source: string): { xpAwarded: number; osAwarded: number } {
  const reward = INTERVIEW_REWARDS[source as keyof typeof INTERVIEW_REWARDS] || INTERVIEW_REWARDS.cold_outreach;
  return { xpAwarded: reward.xp, osAwarded: reward.os };
}

export async function updateStreak(userId: string): Promise<{ currentStreak: number; bestStreak: number }> {
  const user = await storage.getUser(userId);
  if (!user) return { currentStreak: 0, bestStreak: 0 };
  
  const today = new Date().toISOString().split('T')[0];
  const lastActive = user.lastActiveDate;
  
  let newStreak = user.currentStreak;
  
  if (!lastActive) {
    // First activity
    newStreak = 1;
  } else if (lastActive === today) {
    // Already active today, no change
    newStreak = user.currentStreak;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastActive === yesterdayStr) {
      // Consecutive day
      newStreak = user.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }
  
  const newBestStreak = Math.max(newStreak, user.bestStreak);
  
  await storage.updateUser(userId, {
    currentStreak: newStreak,
    bestStreak: newBestStreak,
    lastActiveDate: today,
  });
  
  return { currentStreak: newStreak, bestStreak: newBestStreak };
}

export async function awardXP(
  userId: string,
  xpAmount: number,
  osAmount: number,
  reason: string,
  metadata?: any
): Promise<{ totalXP: number; totalOS: number; level: number }> {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");
  
  const newTotalXP = user.totalXP + xpAmount;
  const newTotalOS = user.totalOS + osAmount;
  const newLevel = getLevelFromXP(newTotalXP);
  
  await storage.updateUser(userId, {
    totalXP: newTotalXP,
    totalOS: newTotalOS,
    currentLevel: newLevel,
  });
  
  await storage.createXPLog({
    userId,
    reason,
    xpAmount,
    osAmount,
    metadata,
  });
  
  return { totalXP: newTotalXP, totalOS: newTotalOS, level: newLevel };
}

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awardedBadges: string[] = [];
  
  // Check for first_contact badge
  const contacts = await storage.getContacts(userId);
  if (contacts.length >= 1 && !(await storage.hasBadge(userId, "first_contact"))) {
    await storage.createBadge({
      userId,
      type: "first_contact",
      name: "First Contact",
      description: "Added your first contact",
    });
    awardedBadges.push("first_contact");
  }
  
  if (contacts.length >= 10 && !(await storage.hasBadge(userId, "networker"))) {
    await storage.createBadge({
      userId,
      type: "networker",
      name: "Networker",
      description: "Added 10 contacts",
    });
    awardedBadges.push("networker");
  }
  
  // Check streak badges
  const user = await storage.getUser(userId);
  if (user) {
    if (user.currentStreak >= 3 && !(await storage.hasBadge(userId, "streak_3"))) {
      await storage.createBadge({
        userId,
        type: "streak_3",
        name: "3-Day Streak",
        description: "Maintained a 3-day streak",
      });
      awardedBadges.push("streak_3");
    }
    
    if (user.currentStreak >= 7 && !(await storage.hasBadge(userId, "streak_7"))) {
      await storage.createBadge({
        userId,
        type: "streak_7",
        name: "7-Day Streak",
        description: "Maintained a 7-day streak",
      });
      awardedBadges.push("streak_7");
    }
    
    if (user.currentStreak >= 14 && !(await storage.hasBadge(userId, "streak_14"))) {
      await storage.createBadge({
        userId,
        type: "streak_14",
        name: "14-Day Streak",
        description: "Maintained a 14-day streak",
      });
      awardedBadges.push("streak_14");
    }
  }
  
  return awardedBadges;
}
