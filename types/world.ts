export type WorldId = "cosmic" | "nature" | "city" | "pixel";

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
