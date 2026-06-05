import type { PetClass, PetEvolution, PetMood } from "@/types/pet";

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
