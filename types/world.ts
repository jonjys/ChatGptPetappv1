export type WorldId = "cosmic" | "nature" | "city" | "pixel" | "ocean" | "volcano" | "sky" | "neon" | "crystal" | "shadow";

export type World = {
  id: WorldId;
  name: string;
  tagline: string;
  emoji: string;
  accent: string;
  glowColor: string;
  bg: string;
  petRoomBg: string;
  petRoomEmojis: string[];
};
