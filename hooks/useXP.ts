"use client";

import { useApp } from "@/context/AppContext";
import { xpProgress, xpToNextLevel } from "@/lib/xp-system";

export function useXP() {
  const { user, addXP } = useApp();
  return {
    xp: user.xp,
    level: user.level,
    progress: xpProgress(user.xp),
    xpToNext: xpToNextLevel(user.xp),
    addXP,
  };
}
