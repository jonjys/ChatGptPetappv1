export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_karma",     emoji: "⚡", name: "First Spark",    description: "Earn your first karma" },
  { id: "karma_1000",      emoji: "💰", name: "Karma Rich",     description: "Accumulate 1,000 karma" },
  { id: "karma_5000",      emoji: "👑", name: "Karma King",     description: "Accumulate 5,000 karma" },
  { id: "level_5",         emoji: "🌟", name: "Rising Star",    description: "Reach level 5" },
  { id: "level_8",         emoji: "💫", name: "Veteran",        description: "Reach level 8" },
  { id: "games_5",         emoji: "🎮", name: "Arcade Legend",  description: "Play 5 different games" },
  { id: "first_fish",      emoji: "🎣", name: "Fisher",         description: "Catch your first fish" },
  { id: "legendary_unbox", emoji: "🌠", name: "The Legend",     description: "Unbox a legendary item" },
  { id: "streak_3",        emoji: "🔥", name: "On Fire",        description: "3-day login streak" },
  { id: "quest_complete",  emoji: "📋", name: "Quest Master",   description: "Complete a daily quest" },
  { id: "all_quests",      emoji: "🏅", name: "Completionist",  description: "Complete all 5 daily quests" },
  { id: "pet_max_happy",   emoji: "🐾", name: "Best Friend",    description: "Max out pet happiness" },
  { id: "karma_10000",   emoji: "💎", name: "Karma Lord",     description: "Accumulate 10,000 karma" },
  { id: "level_10",      emoji: "🔥", name: "Champion",       description: "Reach level 10" },
  { id: "level_20",      emoji: "🌠", name: "Legend",         description: "Reach level 20" },
  { id: "bond_25",       emoji: "💚", name: "Friend",         description: "Reach Friend bond level" },
  { id: "bond_50",       emoji: "💛", name: "Companion",      description: "Reach Companion bond level" },
  { id: "bond_100",      emoji: "💜", name: "Soul Bond",      description: "Reach Soul Bond level" },
  { id: "streak_7",      emoji: "🌟", name: "Week Warrior",   description: "7-day login streak" },
  { id: "streak_30",     emoji: "👑", name: "Monthly Master", description: "30-day login streak" },
];
