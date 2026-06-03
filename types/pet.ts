export type PetClass = "Grinder Beast" | "Influencer Spirit" | "Merchant King";
export type PetEvolution = "egg" | "baby" | "teen" | "adult" | "legendary";
export type PetMood = "happy" | "excited" | "neutral" | "hungry" | "sad";

export type PetStats = {
  action: number;
  social: number;
  commerce: number;
};

export type Pet = {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  evolution: PetEvolution;
  class: PetClass;
  stats: PetStats;
  mood: PetMood;
  lastFed: string;
  streak: number;
  totalBountiesCompleted: number;
  unlockedAbilities: string[];
};
