import type { World } from "@/types/world";

export const WORLDS: World[] = [
  {
    id: "cosmic",
    name: "COSMIC",
    tagline: "Universum & stjärnor",
    emoji: "🌌",
    accent: "#a855f7",
    glowColor: "#a855f744",
    bg: "#0f0520",
    petRoomBg: "linear-gradient(180deg, #0f0520 0%, #1a0840 100%)",
    petRoomEmojis: ["⭐", "🪐", "🌙", "✨", "🔭", "🛸"],
  },
  {
    id: "nature",
    name: "NATURE",
    tagline: "Skog & natur",
    emoji: "🌿",
    accent: "#22c55e",
    glowColor: "#22c55e44",
    bg: "#0a1a0a",
    petRoomBg: "linear-gradient(180deg, #0a2010 0%, #142a14 100%)",
    petRoomEmojis: ["🌳", "🍄", "🌸", "🦋", "🌱", "🍃"],
  },
  {
    id: "city",
    name: "CITY",
    tagline: "Neon city vibes",
    emoji: "🏙️",
    accent: "#00e5ff",
    glowColor: "#00e5ff44",
    bg: "#001a2a",
    petRoomBg: "linear-gradient(180deg, #001a2a 0%, #002a3a 100%)",
    petRoomEmojis: ["🏙️", "🚕", "💡", "📡", "🎵", "🌉"],
  },
  {
    id: "pixel",
    name: "PIXEL",
    tagline: "8-bit retro pixel",
    emoji: "🎮",
    accent: "#ff6b35",
    glowColor: "#ff6b3544",
    bg: "#1a0a00",
    petRoomBg: "linear-gradient(180deg, #1a0a00 0%, #2a1200 100%)",
    petRoomEmojis: ["🎮", "👾", "🕹️", "💾", "🏆", "⚡"],
  },
];

export const WORLD_STORAGE_KEY = "karma_world_v1";

export function getWorld(id: string): World {
  return WORLDS.find(w => w.id === id) ?? WORLDS[2];
}
