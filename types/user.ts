export type Badge = {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  level: number;
  xp: number;
  karma: number;
  streak: number;
  rank: number;
  bio: string;
  petClass: "Grinder Beast" | "Influencer Spirit" | "Merchant King";
  badges: Badge[];
  bountiesCompleted: number;
  joinedAt: string;
};
