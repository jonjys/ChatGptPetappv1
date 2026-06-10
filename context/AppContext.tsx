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
  petMoodComputed: Pet["mood"];
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

// ─── Toast overlay (rendered inside provider) ─────────────────────────────────
function ToastOverlay({ toasts }: { toasts: KarmaToast[] }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              background: "#0a0a0a",
              border: `2.5px solid ${t.color}`,
              borderRadius: 14,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 0 16px ${t.color}44, 3px 3px 0px #000`,
              minWidth: 140,
              maxWidth: 220,
            }}
          >
            {t.icon && <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>}
            {t.value !== undefined && (
              <span style={{ fontSize: 15, fontWeight: 700, color: t.color }}>
                +{t.value}
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: "#ddd", flex: 1 }}>
              {t.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORE = {
  karma: "karma_user_karma_v2",
  xp:    "karma_user_xp_v2",
  needs: "karma_pet_needs_v2",
  scores:"karma_scores_v2",
  acts:  "karma_activities_v2",
};

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User>(CURRENT_USER);
  const [pet, setPet]       = useState<Pet>(MY_PET);
  const [gameScores, setGameScores] = useState<GameScores>({
    runner: 0, slots: 0, memory: 0, battle: 0, blitz: 0,
    fishing: 0, cases: 0, breaker: 0,
  });
  const [worldId, setWorldIdState] = useState<WorldId>("city");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [toasts, setToasts]         = useState<KarmaToast[]>([]);
  const toastIdRef = useRef(0);

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    const savedKarma  = load<number>(STORE.karma,  CURRENT_USER.karma);
    const savedXp     = load<number>(STORE.xp,     CURRENT_USER.xp);
    const savedNeeds  = load<PetNeeds>(STORE.needs, MY_PET.needs);
    const savedScores = load<Partial<GameScores>>(STORE.scores, {});
    const savedActs   = load<Activity[]>(STORE.acts, []);
    const savedWorld  = localStorage.getItem(WORLD_STORAGE_KEY) as WorldId | null;

    setUser(u => ({ ...u, karma: savedKarma, xp: savedXp }));
    setPet(p => ({ ...p, needs: savedNeeds, mood: deriveMood(savedNeeds) }));
    setGameScores(s => ({ ...s, ...savedScores }));
    setActivities(savedActs);
    if (savedWorld) setWorldIdState(savedWorld);
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

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const showToast = useCallback((text: string, value?: number, color = "#c8ff00", icon?: string) => {
    const id = String(++toastIdRef.current);
    setToasts(ts => [...ts.slice(-3), { id, text, value, color, icon }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 2800);
  }, []);

  // ── Activity helpers ───────────────────────────────────────────────────────
  const addActivity = useCallback((a: Omit<Activity, "id" | "timestamp">) => {
    const act: Activity = { ...a, id: `act_${Date.now()}_${Math.random()}`, timestamp: Date.now() };
    setActivities(prev => {
      const next = [act, ...prev].slice(0, 40);
      localStorage.setItem(STORE.acts, JSON.stringify(next));
      return next;
    });
  }, []);

  const petMoodComputed = deriveMood(pet.needs);

  const setWorldId = useCallback((id: WorldId) => {
    localStorage.setItem(WORLD_STORAGE_KEY, id);
    setWorldIdState(id);
  }, []);

  const addXP = useCallback((amount: number) => {
    setUser(u => {
      const nx = u.xp + amount;
      localStorage.setItem(STORE.xp, String(nx));
      return { ...u, xp: nx };
    });
    setPet(p => ({ ...p, xp: p.xp + amount }));
  }, []);

  const addKarma = useCallback((amount: number, source?: string) => {
    setUser(u => {
      const nk = u.karma + amount;
      localStorage.setItem(STORE.karma, String(nk));
      return { ...u, karma: nk };
    });
    if (amount > 0) {
      showToast(source ?? "Karma earned", amount, "#c8ff00", "⚡");
    }
  }, [showToast]);

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
      return { ...p, needs, mood: deriveMood(needs), lastFed: new Date().toISOString() };
    });
    showToast(type === "premium" ? "Premium feast!" : "Pet fed!", undefined, "#ff6b35", "🍖");
    addActivity({ emoji: type === "premium" ? "🥩" : "🍖", title: `Fed ${pet.name}`, detail: type === "premium" ? "Premium feast" : "Basic meal", source: "pet" });
    return true;
  }, [pet.name, showToast, addActivity]);

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
      setWorldId, addXP, addKarma, spendKarma,
      feedPet, playWithPet, restPet, healPet,
      updateScore, addActivity, showToast,
      petMoodComputed,
    }}>
      {children}
      <ToastOverlay toasts={toasts} />
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
