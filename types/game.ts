export type GameId = "runner" | "slots" | "memory" | "battle" | "blitz" | "fishing" | "cases" | "breaker";

export type GameMeta = {
  id: GameId;
  name: string;
  emoji: string;
  tagline: string;
  accentColor: string;
  bgColor: string;
  rewardDesc: string;
  cost?: number;
};

export type GameScores = {
  runner: number;
  slots: number;
  memory: number;
  battle: number;
  blitz: number;
  fishing: number;
  cases: number;
  breaker: number;
};

export type BattleAbility = {
  name: string;
  emoji: string;
  damage: [number, number]; // min, max
  effect?: string;
};

export type BattleEnemy = {
  id: string;
  name: string;
  emoji: string;
  petEmoji: string;
  level: number;
  hp: number;
  petClass: "Grinder Beast" | "Influencer Spirit" | "Merchant King";
  abilities: BattleAbility[];
};

export type Story = {
  id: string;
  userId: string;
  username: string;
  avatarEmoji: string;
  bgColor: string;
  content: string;
  seen: boolean;
};

export type Friend = {
  id: string;
  username: string;
  emoji: string;
  level: number;
  petEmoji: string;
  petName: string;
  online: boolean;
  lastActivity: string;
  currentGame?: string;
};

export type Follower = {
  id: string;
  username: string;
  emoji: string;
  level: number;
  class: string;
  followedAt: string;
  isNew: boolean;
  mutual: boolean;
  youFollowBack: boolean;
};
