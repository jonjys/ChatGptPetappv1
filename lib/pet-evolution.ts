import type { PetClass, PetEvolution, PetMood, PetPersonality, PetRarity } from "@/types/pet";

export function getPetClass(action: number, social: number, commerce: number): PetClass {
  if (action >= social && action >= commerce) return "Grinder Beast";
  if (social >= action && social >= commerce) return "Influencer Spirit";
  return "Merchant King";
}

export function getEvolutionByLevel(level: number): PetEvolution {
  if (level <= 2) return "egg";
  if (level <= 5) return "baby";
  if (level <= 10) return "teen";
  if (level <= 20) return "adult";
  return "legendary";
}

export function getPetEmoji(evolution: PetEvolution, petClass: PetClass): string {
  const map: Record<PetEvolution, Record<PetClass, string>> = {
    egg: { "Grinder Beast": "🥚", "Influencer Spirit": "🥚", "Merchant King": "🥚" },
    baby: { "Grinder Beast": "🐣", "Influencer Spirit": "🐣", "Merchant King": "🐣" },
    teen: { "Grinder Beast": "🦊", "Influencer Spirit": "🐱", "Merchant King": "🦝" },
    adult: { "Grinder Beast": "🦁", "Influencer Spirit": "🦋", "Merchant King": "🐲" },
    legendary: { "Grinder Beast": "🌋", "Influencer Spirit": "⭐", "Merchant King": "💎" },
  };
  return map[evolution][petClass];
}

export function getMoodEmoji(mood: PetMood): string {
  const map: Record<PetMood, string> = {
    happy: "😊",
    excited: "🤩",
    neutral: "😐",
    hungry: "😮",
    sad: "😢",
    sleeping: "😴",
  };
  return map[mood];
}

export function getPetClassColor(petClass: PetClass): string {
  const map: Record<PetClass, string> = {
    "Grinder Beast": "#ff6b35",
    "Influencer Spirit": "#ff2d8d",
    "Merchant King": "#c8ff00",
  };
  return map[petClass];
}

export function getEvolutionLabel(evolution: PetEvolution): string {
  const map: Record<PetEvolution, string> = {
    egg: "EGG",
    baby: "BABY",
    teen: "TEEN",
    adult: "ADULT",
    legendary: "LEGENDARY",
  };
  return map[evolution];
}

export function getPetAbilities(petClass: PetClass, level: number): string[] {
  const base: Record<PetClass, string[]> = {
    "Grinder Beast": ["Iron Will", "Double XP Rush", "Bounty Radar", "Unstoppable Force", "Titan Mode"],
    "Influencer Spirit": ["Charm Aura", "Social Boost", "Viral Wave", "Empathy Shield", "Star Power"],
    "Merchant King": ["Trade Sense", "Karma Harvest", "Deal Finder", "Golden Touch", "Market Mastery"],
  };
  return base[petClass].slice(0, Math.max(1, Math.floor(level / 3)));
}

export function getPetPersonalityEmoji(personality: PetPersonality): string {
  const map: Record<PetPersonality, string> = { bold: "🔥", calm: "🌿", wild: "⚡", mystic: "🔮" };
  return map[personality];
}

export function getPetPersonalityColor(personality: PetPersonality): string {
  const map: Record<PetPersonality, string> = { bold: "#ff6b35", calm: "#22c55e", wild: "#c8ff00", mystic: "#a855f7" };
  return map[personality];
}

export function getPetPersonalityLabel(personality: PetPersonality): string {
  const map: Record<PetPersonality, string> = { bold: "BOLD", calm: "CALM", wild: "WILD", mystic: "MYSTIC" };
  return map[personality];
}

export function getPetRarityColor(rarity: PetRarity): string {
  const map: Record<PetRarity, string> = { common: "#888888", rare: "#4488ff", epic: "#a855f7", legendary: "#ffde00", mythic: "#ff2d8d" };
  return map[rarity];
}

export function getPetRarityLabel(rarity: PetRarity): string {
  const map: Record<PetRarity, string> = { common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY", mythic: "MYTHIC" };
  return map[rarity];
}

export function getPetRarityGlow(rarity: PetRarity): string {
  const map: Record<PetRarity, string> = { common: "#88888822", rare: "#4488ff33", epic: "#a855f744", legendary: "#ffde0055", mythic: "#ff2d8d66" };
  return map[rarity];
}

export function getBondLabel(bondLevel: number): string {
  if (bondLevel >= 100) return "SOUL BOND";
  if (bondLevel >= 75)  return "BEST FRIEND";
  if (bondLevel >= 50)  return "COMPANION";
  if (bondLevel >= 25)  return "FRIEND";
  return "STRANGER";
}

export function getBondColor(bondLevel: number): string {
  if (bondLevel >= 100) return "#ff2d8d";
  if (bondLevel >= 75)  return "#a855f7";
  if (bondLevel >= 50)  return "#ffde00";
  if (bondLevel >= 25)  return "#22c55e";
  return "#444444";
}
