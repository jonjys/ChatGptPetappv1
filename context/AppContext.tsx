"use client";

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Pet, PetNeeds } from "@/types/pet";
import type { User } from "@/types/user";
import type { GameScores } from "@/types/game";
import type { WorldId } from "@/types/world";
import { CURRENT_USER, MY_PET } from "@/lib/mock-data";
import { WORLD_STORAGE_KEY, getWorld } from "@/lib/worlds";
import { calculateLevel } from "@/lib/xp-system";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { type Lang, LANG_STORAGE_KEY } from "@/lib/i18n";

// ─── Toast ───────────────────────────────────────────────────────────────────
export type KarmaToast = {
  id: string;
  text: string;
  value?: number;
  color: string;
  icon?: string;
};

// ─── Activity ─────────────────────────────────────────────────────────────────
export type Activity = {
  id: string;
  emoji: string;
  title: string;
  detail?: string;
  karma?: number;
  xp?: number;
  source: string;
  timestamp: number;
  rarity?: string;
};

// ─── Context type ─────────────────────────────────────────────────────────────
type AppContextType = {
  user: User;
  pet: Pet;
  gameScores: GameScores;
  worldId: WorldId;
  activities: Activity[];
  toasts: KarmaToast[];
  streak: number;
  achievements: string[];
  questProgress: Record<string, number>;
  questClaimed: string[];
  setWorldId: (id: WorldId) => void;
  addXP: (amount: number) => void;
  addKarma: (amount: number, source?: string) => void;
  spendKarma: (amount: number) => boolean;
  feedPet: (type: "basic" | "premium") => boolean;
  playWithPet: () => void;
  restPet: () => void;
  healPet: () => boolean;
  updateScore: (game: keyof GameScores, score: number) => void;
  addActivity: (a: Omit<Activity, "id" | "timestamp">) => void;
  showToast: (text: string, value?: number, color?: string, icon?: string) => void;
  unlockAchievement: (id: string) => void;
  tickQuest: (key: string, amount?: number) => void;
  claimQuest: (questId: string, karmaReward: number, xpReward: number) => void;
  petMoodComputed: Pet["mood"];
  lang: Lang;
  setLang: (l: Lang) => void;
};

const AppContext = createContext<AppContextType | null>(null);

// ─── Mood derivation ──────────────────────────────────────────────────────────
function deriveMood(needs: PetNeeds): Pet["mood"] {
  if (needs.hunger < 15) return "hungry";
  if (needs.energy < 10) return "sleeping";
  if (needs.happiness > 80 && needs.hunger > 60 && needs.energy > 50) return "excited";
  if (needs.happiness > 60 && needs.hunger > 40) return "happy";
  if (needs.happiness < 30 || needs.hunger < 30) return "sad";
  return "neutral";
}

// ─── Toast overlay ────────────────────────────────────────────────────────────
function ToastOverlay({ toasts }: { toasts: KarmaToast[] }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              background: "#0a0a0a", border: `2.5px solid ${t.color}`,
              borderRadius: 14, padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: `0 0 16px ${t.color}44, 3px 3px 0px #000`,
              minWidth: 140, maxWidth: 220,
            }}
          >
            {t.icon && <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>}
            {t.value !== undefined && (
              <span style={{ fontSize: 15, fontWeight: 700, color: t.color }}>+{t.value}</span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: "#ddd", flex: 1 }}>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Level-Up Overlay ─────────────────────────────────────────────────────────
function LevelUpOverlay({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const particles = Array.from({ length: 14 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {/* Particle burst */}
      {particles.map((_, i) => (
        <motion.div key={i}
          style={{ position: "absolute", left: "50%", top: "50%", fontSize: "1.4rem", pointerEvents: "none" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: Math.cos((i / particles.length) * Math.PI * 2) * (110 + (i % 3) * 30),
            y: Math.sin((i / particles.length) * Math.PI * 2) * (110 + (i % 3) * 30),
            opacity: 0, scale: 1.8,
          }}
          transition={{ duration: 1.4, delay: 0.15 + i * 0.04, ease: "easeOut" }}
        >
          {["⭐", "✨", "💫", "🌟", "⚡", "🎉", "🎊"][i % 7]}
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0.3, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 12, delay: 0.08 }}
        style={{ textAlign: "center", padding: "0 32px" }}
      >
        <motion.div
          animate={{ rotate: [0, -15, 15, -8, 8, 0], scale: [1, 1.4, 0.9, 1.2, 1] }}
          transition={{ duration: 0.9, delay: 0.35 }}
          style={{ fontSize: "5rem", marginBottom: 8 }}
        >⭐</motion.div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "#c8ff00", letterSpacing: "0.28em", marginBottom: 6 }}>
          LEVEL UP!
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 180 }}
          style={{
            fontSize: "7rem", fontWeight: 900, color: "#fff", lineHeight: 1,
            textShadow: "0 0 50px #c8ff00, 0 0 20px #c8ff0088",
          }}
        >{level}</motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 20, background: "#c8ff0022", border: "2px solid #c8ff00",
            borderRadius: 12, padding: "8px 20px", display: "inline-block",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "#c8ff00" }}>New powers unlocked 🚀</span>
        </motion.div>

        <div style={{ fontSize: 12, color: "#444", marginTop: 20 }}>Tap to continue</div>
      </motion.div>
    </motion.div>
  );
}

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORE = {
  karma:        "karma_user_karma_v2",
  xp:           "karma_user_xp_v2",
  needs:        "karma_pet_needs_v2",
  scores:       "karma_scores_v2",
  acts:         "karma_activities_v2",
  achievements: "karma_achievements_v1",
  streak:       "karma_streak_v1",
  lastPlay:     "karma_last_play_v1",
  qProgress:    "karma_qp_v1",
  qClaimed:     "karma_qclaimed_v1",
  qDate:        "karma_qdate_v1",
};

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User>(CURRENT_USER);
  const [pet, setPet]             = useState<Pet>(MY_PET);
  const [gameScores, setGameScores] = useState<GameScores>({
    runner: 0, slots: 0, memory: 0, battle: 0, blitz: 0,
    fishing: 0, cases: 0, breaker: 0,
  });
  const [worldId, setWorldIdState] = useState<WorldId>("city");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [toasts, setToasts]         = useState<KarmaToast[]>([]);
  const [streak, setStreak]         = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [questProgress, setQuestProgress] = useState<Record<string, number>>({});
  const [questClaimed, setQuestClaimed]   = useState<string[]>([]);
  const [levelUpOverlay, setLevelUpOverlay] = useState<number | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const toastIdRef = useRef(0);

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    const savedKarma  = load<number>(STORE.karma,  CURRENT_USER.karma);
    const savedXp     = load<number>(STORE.xp,     CURRENT_USER.xp);
    const savedNeeds  = load<PetNeeds>(STORE.needs, MY_PET.needs);
    const savedScores = load<Partial<GameScores>>(STORE.scores, {});
    const savedActs   = load<Activity[]>(STORE.acts, []);
    const savedWorld  = localStorage.getItem(WORLD_STORAGE_KEY) as WorldId | null;
    const savedAch    = load<string[]>(STORE.achievements, []);

    setUser(u => ({ ...u, karma: savedKarma, xp: savedXp }));
    setPet(p => ({ ...p, needs: savedNeeds, mood: deriveMood(savedNeeds) }));
    setGameScores(s => ({ ...s, ...savedScores }));
    setActivities(savedActs);
    if (savedWorld) setWorldIdState(savedWorld);
    setAchievements(savedAch);
    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (savedLang === "sv" || savedLang === "en") setLangState(savedLang);

    // Streak tracking
    const today    = new Date().toDateString();
    const lastPlay = localStorage.getItem(STORE.lastPlay) ?? "";
    const savedStr = load<number>(STORE.streak, 0);
    if (!lastPlay) {
      setStreak(1);
      localStorage.setItem(STORE.streak, "1");
    } else if (lastPlay === today) {
      setStreak(savedStr);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const newStr = lastPlay === yesterday.toDateString() ? savedStr + 1 : 1;
      setStreak(newStr);
      localStorage.setItem(STORE.streak, String(newStr));
    }
    localStorage.setItem(STORE.lastPlay, today);

    // Quest state — reset if new day
    const savedQDate = localStorage.getItem(STORE.qDate) ?? "";
    if (savedQDate !== today) {
      setQuestProgress({});
      setQuestClaimed([]);
      localStorage.setItem(STORE.qProgress, JSON.stringify({}));
      localStorage.setItem(STORE.qClaimed,  JSON.stringify([]));
      localStorage.setItem(STORE.qDate, today);
    } else {
      setQuestProgress(load<Record<string, number>>(STORE.qProgress, {}));
      setQuestClaimed(load<string[]>(STORE.qClaimed, []));
    }
  }, []);

  // ── Pet needs decay (every 45s) ────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setPet(p => {
        const needs: PetNeeds = {
          hunger:    Math.max(0, p.needs.hunger    - 0.6),
          energy:    Math.max(0, p.needs.energy    - 0.35),
          happiness: Math.max(0, p.needs.happiness - 0.25),
        };
        localStorage.setItem(STORE.needs, JSON.stringify(needs));
        return { ...p, needs, mood: deriveMood(needs) };
      });
    }, 45_000);
    return () => clearInterval(interval);
  }, []);

  // ── Achievement watchers ───────────────────────────────────────────────────
  const showToast = useCallback((text: string, value?: number, color = "#c8ff00", icon?: string) => {
    const id = String(++toastIdRef.current);
    setToasts(ts => [...ts.slice(-3), { id, text, value, color, icon }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 2800);
  }, []);

  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(STORE.achievements, JSON.stringify(next));
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) showToast(`${ach.name} unlocked!`, undefined, "#ffcc00", ach.emoji);
      return next;
    });
  }, [showToast]);

  // Watch karma milestones
  useEffect(() => {
    if (user.karma > 0)    unlockAchievement("first_karma");
    if (user.karma >= 1000) unlockAchievement("karma_1000");
    if (user.karma >= 5000) unlockAchievement("karma_5000");
  }, [user.karma, unlockAchievement]);

  // Watch game diversity
  useEffect(() => {
    const played = Object.values(gameScores).filter(s => s > 0).length;
    if (played >= 5) unlockAchievement("games_5");
  }, [gameScores, unlockAchievement]);

  // Watch streak
  useEffect(() => {
    if (streak >= 3) unlockAchievement("streak_3");
  }, [streak, unlockAchievement]);

  // ── Quest helpers ──────────────────────────────────────────────────────────
  const tickQuest = useCallback((key: string, amount = 1) => {
    setQuestProgress(prev => {
      const next = { ...prev, [key]: (prev[key] ?? 0) + amount };
      localStorage.setItem(STORE.qProgress, JSON.stringify(next));
      return next;
    });
  }, []);

  const claimQuest = useCallback((questId: string, karmaReward: number, xpReward: number) => {
    setQuestClaimed(prev => {
      const next = [...prev, questId];
      localStorage.setItem(STORE.qClaimed, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Activity ───────────────────────────────────────────────────────────────
  const addActivity = useCallback((a: Omit<Activity, "id" | "timestamp">) => {
    const act: Activity = { ...a, id: `act_${Date.now()}_${Math.random()}`, timestamp: Date.now() };
    setActivities(prev => {
      const next = [act, ...prev].slice(0, 50);
      localStorage.setItem(STORE.acts, JSON.stringify(next));
      return next;
    });
    // Tick quests based on source
    const gameSources = ["runner","slots","memory","battle","blitz","fishing","cases","breaker"];
    if (gameSources.includes(a.source)) tickQuest("games_played");
    if (a.source === "fishing")         tickQuest("fish_caught");
    if (a.source === "cases")           tickQuest("cases_opened");
    if (a.source === "runner")          tickQuest("runner_played");
    tickQuest("activities_added");
    // Achievements from activity
    if (a.source === "fishing")             unlockAchievement("first_fish");
    if (a.rarity === "legendary")           unlockAchievement("legendary_unbox");
  }, [tickQuest, unlockAchievement]);

  const petMoodComputed = deriveMood(pet.needs);

  const setWorldId = useCallback((id: WorldId) => {
    localStorage.setItem(WORLD_STORAGE_KEY, id);
    setWorldIdState(id);
  }, []);

  const addXP = useCallback((amount: number) => {
    setUser(u => {
      const oldLevel = calculateLevel(u.xp);
      const nx = u.xp + amount;
      const newLevel = calculateLevel(nx);
      localStorage.setItem(STORE.xp, String(nx));
      if (newLevel > oldLevel) {
        setLevelUpOverlay(newLevel);
        if (newLevel >= 5) unlockAchievement("level_5");
        if (newLevel >= 8) unlockAchievement("level_8");
      }
      return { ...u, xp: nx };
    });
    setPet(p => ({ ...p, xp: p.xp + amount }));
  }, [unlockAchievement]);

  const addKarma = useCallback((amount: number, source?: string) => {
    setUser(u => {
      const nk = u.karma + amount;
      localStorage.setItem(STORE.karma, String(nk));
      return { ...u, karma: nk };
    });
    if (amount > 0) {
      showToast(source ?? "Karma earned", amount, "#c8ff00", "⚡");
      tickQuest("karma_earned", amount);
    }
  }, [showToast, tickQuest]);

  const spendKarma = useCallback((amount: number): boolean => {
    if (user.karma < amount) return false;
    setUser(u => {
      const nk = u.karma - amount;
      localStorage.setItem(STORE.karma, String(nk));
      return { ...u, karma: nk };
    });
    return true;
  }, [user.karma]);

  const feedPet = useCallback((type: "basic" | "premium"): boolean => {
    const cost = type === "basic" ? 50 : 150;
    let ok = false;
    setUser(u => {
      if (u.karma < cost) return u;
      ok = true;
      const nk = u.karma - cost;
      localStorage.setItem(STORE.karma, String(nk));
      return { ...u, karma: nk };
    });
    if (!ok) return false;
    setPet(p => {
      const needs: PetNeeds = {
        hunger:    Math.min(100, p.needs.hunger    + (type === "basic" ? 30 : 65)),
        happiness: Math.min(100, p.needs.happiness + (type === "premium" ? 20 : 0)),
        energy:    p.needs.energy,
      };
      localStorage.setItem(STORE.needs, JSON.stringify(needs));
      const newPet = { ...p, needs, mood: deriveMood(needs), lastFed: new Date().toISOString() };
      if (needs.happiness >= 100) unlockAchievement("pet_max_happy");
      return newPet;
    });
    showToast(type === "premium" ? "Premium feast!" : "Pet fed!", undefined, "#ff6b35", "🍖");
    addActivity({ emoji: type === "premium" ? "🥩" : "🍖", title: `Fed ${pet.name}`, detail: type === "premium" ? "Premium feast" : "Basic meal", source: "pet" });
    tickQuest("pet_fed");
    return true;
  }, [pet.name, showToast, addActivity, tickQuest, unlockAchievement]);

  const playWithPet = useCallback(() => {
    setPet(p => {
      const needs: PetNeeds = {
        hunger:    Math.max(0,   p.needs.hunger    - 5),
        happiness: Math.min(100, p.needs.happiness + 28),
        energy:    Math.max(0,   p.needs.energy    - 18),
      };
      localStorage.setItem(STORE.needs, JSON.stringify(needs));
      return { ...p, needs, mood: deriveMood(needs) };
    });
    addXP(10);
    showToast("Played with pet!", 10, "#ff2d8d", "🎾");
    addActivity({ emoji: "🎾", title: `Played with ${pet.name}`, detail: "+28 happiness", source: "pet" });
  }, [addXP, showToast, addActivity, pet.name]);

  const restPet = useCallback(() => {
    setPet(p => {
      const needs: PetNeeds = {
        hunger:    Math.max(0,   p.needs.hunger    - 3),
        happiness: Math.max(0,   p.needs.happiness - 8),
        energy:    Math.min(100, p.needs.energy    + 45),
      };
      localStorage.setItem(STORE.needs, JSON.stringify(needs));
      return { ...p, needs, mood: deriveMood(needs) };
    });
    showToast(`${pet.name} is resting...`, undefined, "#00e5ff", "😴");
  }, [pet.name, showToast]);

  const healPet = useCallback((): boolean => {
    let ok = false;
    setUser(u => {
      if (u.karma < 100) return u;
      ok = true;
      const nk = u.karma - 100;
      localStorage.setItem(STORE.karma, String(nk));
      return { ...u, karma: nk };
    });
    if (!ok) return false;
    setPet(p => {
      const needs: PetNeeds = {
        hunger:    Math.min(100, p.needs.hunger    + 20),
        happiness: Math.min(100, p.needs.happiness + 30),
        energy:    Math.min(100, p.needs.energy    + 30),
      };
      localStorage.setItem(STORE.needs, JSON.stringify(needs));
      return { ...p, needs, mood: deriveMood(needs) };
    });
    showToast("Pet healed!", undefined, "#44ff88", "💊");
    return true;
  }, [showToast]);

  const updateScore = useCallback((game: keyof GameScores, score: number) => {
    setGameScores(s => {
      const next = { ...s, [game]: Math.max(s[game] ?? 0, score) };
      localStorage.setItem(STORE.scores, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      user, pet, gameScores, worldId, activities, toasts,
      streak, achievements, questProgress, questClaimed,
      setWorldId, addXP, addKarma, spendKarma,
      feedPet, playWithPet, restPet, healPet,
      updateScore, addActivity, showToast,
      unlockAchievement, tickQuest, claimQuest,
      petMoodComputed,
      lang, setLang: (l: Lang) => { setLangState(l); localStorage.setItem(LANG_STORAGE_KEY, l); },
    }}>
      {children}
      <ToastOverlay toasts={toasts} />
      <AnimatePresence>
        {levelUpOverlay !== null && (
          <LevelUpOverlay level={levelUpOverlay} onDismiss={() => setLevelUpOverlay(null)} />
        )}
      </AnimatePresence>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
