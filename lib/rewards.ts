export type RewardType = "xp" | "karma" | "item" | "badge";

export type Reward = {
  type: RewardType;
  amount?: number;
  itemId?: string;
  badgeId?: string;
  label: string;
};

export function buildBountyRewards(xp: number, karma: number): Reward[] {
  return [
    { type: "xp", amount: xp, label: `+${xp} XP` },
    { type: "karma", amount: karma, label: `+${karma} KARMA` },
  ];
}

export function formatRewardLabel(reward: Reward): string {
  return reward.label;
}
