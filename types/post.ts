import type { Bounty } from "./bounty";

export type PostType = "achievement" | "story" | "bounty_complete" | "level_up";

export type Post = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorEmoji: string;
  authorLevel: number;
  type: PostType;
  content: string;
  xpEarned?: number;
  bounty?: Bounty;
  likes: number;
  comments: number;
  liked: boolean;
  location?: string;
  createdAt: string;
  badge?: string;
};
