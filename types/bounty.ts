export type BountyDifficulty = "easy" | "medium" | "hard" | "legendary";
export type BountyCategory =
  | "community"
  | "fitness"
  | "learning"
  | "creative"
  | "social"
  | "commerce"
  | "eco";

export type Bounty = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  karmaReward: number;
  difficulty: BountyDifficulty;
  category: BountyCategory;
  categoryEmoji: string;
  claimedBy?: string;
  expiresAt: string;
  location?: string;
  distance?: string;
  completions: number;
  maxCompletions: number;
  createdBy: string;
  isActive: boolean;
};
