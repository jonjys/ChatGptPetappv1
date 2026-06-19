export const XP_THRESHOLDS = [
  0, 500, 1200, 2500, 4500, 7500, 12000, 19000, 28000, 40000,
  55000, 73000, 95000, 121000, 151000, 185000, 224000, 268000, 317000, 371000,
  430000, 495000, 566000, 643000, 726000, 815000, 910000, 1012000, 1121000, 1237000,
];

export function calculateLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function xpToNextLevel(currentXP: number): number {
  const level = calculateLevel(currentXP);
  const nextThreshold = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return nextThreshold;
}

export function xpProgress(currentXP: number): number {
  const level = calculateLevel(currentXP);
  const currentThreshold = XP_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = XP_THRESHOLDS[level] ?? currentThreshold + 10000;
  const range = nextThreshold - currentThreshold;
  const progress = currentXP - currentThreshold;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function rewardXP(currentXP: number, reward: number): number {
  return currentXP + reward;
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return String(xp);
}
