export type PetClass = "Grinder Beast" | "Influencer Spirit" | "Merchant King";
export type PetEvolution = "egg" | "baby" | "teen" | "adult" | "legendary";
export type PetMood = "happy" | "excited" | "neutral" | "hungry" | "sad" | "sleeping";
export type PetPersonality = "bold" | "calm" | "wild" | "mystic";
export type PetRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type PetStats = { action: number; social: number; commerce: number };

export type PetNeeds = {
  hunger: number;    // 0-100
  happiness: number; // 0-100
  energy: number;    // 0-100
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
  needs: PetNeeds;
  lastFed: string;
  streak: number;
  totalBountiesCompleted: number;
  unlockedAbilities: string[];
  skinId: string;
  bondLevel: number;      // 0–100
  personality: PetPersonality;
  rarity: PetRarity;
  stamina: number;        // 0–100
  totalTaps: number;
};
