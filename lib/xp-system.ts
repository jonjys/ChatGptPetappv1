export function calculateLevel(xp: number) {
  if (xp < 500) return 1;
  if (xp < 1200) return 2;
  if (xp < 2500) return 3;

  return 4;
}

export function rewardXP(currentXP: number, reward: number) {
  return currentXP + reward;
}
