"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Pet, PetNeeds } from "@/types/pet";
import type { User } from "@/types/user";
import type { GameScores } from "@/types/game";
import type { WorldId } from "@/types/world";
import { CURRENT_USER, MY_PET } from "@/lib/mock-data";
import { WORLD_STORAGE_KEY, getWorld } from "@/lib/worlds";

type AppContextType = {
  user: User;
  pet: Pet;
  gameScores: GameScores;
  worldId: WorldId;
  setWorldId: (id: WorldId) => void;
  // XP & Karma
  addXP: (amount: number) => void;
  addKarma: (amount: number) => void;
  spendKarma: (amount: number) => boolean;
  // Pet needs
  feedPet: (type: "basic" | "premium") => boolean;
  playWithPet: () => void;
  restPet: () => void;
  healPet: () => boolean;
  // Game scores
  updateScore: (game: keyof GameScores, score: number) => void;
  // Computed
  petMoodComputed: Pet["mood"];
};

const AppContext = createContext<AppContextType | null>(null);

function deriveMood(needs: PetNeeds): Pet["mood"] {
  if (needs.hunger < 15) return "hungry";
  if (needs.energy < 10) return "sleeping";
  if (needs.happiness > 80 && needs.hunger > 60 && needs.energy > 50) return "excited";
  if (needs.happiness > 60 && needs.hunger > 40) return "happy";
  if (needs.happiness < 30 || needs.hunger < 30) return "sad";
  return "neutral";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(CURRENT_USER);
  const [pet, setPet] = useState<Pet>(MY_PET);
  const [gameScores, setGameScores] = useState<GameScores>({
    runner: 0, slots: 0, memory: 0, battle: 0, blitz: 0,
    fishing: 0, cases: 0, breaker: 0,
  });
  const [worldId, setWorldIdState] = useState<WorldId>("city");

  useEffect(() => {
    const saved = localStorage.getItem(WORLD_STORAGE_KEY) as WorldId | null;
    if (saved) setWorldIdState(saved);
  }, []);

  const setWorldId = useCallback((id: WorldId) => {
    localStorage.setItem(WORLD_STORAGE_KEY, id);
    setWorldIdState(id);
  }, []);

  const petMoodComputed = deriveMood(pet.needs);

  const addXP = useCallback((amount: number) => {
    setUser(u => ({ ...u, xp: u.xp + amount }));
    setPet(p => ({ ...p, xp: p.xp + amount }));
  }, []);

  const addKarma = useCallback((amount: number) => {
    setUser(u => ({ ...u, karma: u.karma + amount }));
  }, []);

  const spendKarma = useCallback((amount: number): boolean => {
    if (user.karma < amount) return false;
    setUser(u => ({ ...u, karma: u.karma - amount }));
    return true;
  }, [user.karma]);

  const feedPet = useCallback((type: "basic" | "premium"): boolean => {
    const cost = type === "basic" ? 50 : 150;
    if (user.karma < cost) return false;
    setUser(u => ({ ...u, karma: u.karma - cost }));
    setPet(p => {
      const needs: PetNeeds = {
        hunger: Math.min(100, p.needs.hunger + (type === "basic" ? 30 : 65)),
        happiness: Math.min(100, p.needs.happiness + (type === "premium" ? 20 : 0)),
        energy: p.needs.energy,
      };
      return { ...p, needs, mood: deriveMood(needs), lastFed: new Date().toISOString() };
    });
    return true;
  }, [user.karma]);

  const playWithPet = useCallback(() => {
    setPet(p => {
      const needs: PetNeeds = {
        hunger: Math.max(0, p.needs.hunger - 5),
        happiness: Math.min(100, p.needs.happiness + 28),
        energy: Math.max(0, p.needs.energy - 18),
      };
      return { ...p, needs, mood: deriveMood(needs) };
    });
    addXP(10);
  }, [addXP]);

  const restPet = useCallback(() => {
    setPet(p => {
      const needs: PetNeeds = {
        hunger: Math.max(0, p.needs.hunger - 3),
        happiness: Math.max(0, p.needs.happiness - 8),
        energy: Math.min(100, p.needs.energy + 45),
      };
      return { ...p, needs, mood: deriveMood(needs) };
    });
  }, []);

  const healPet = useCallback((): boolean => {
    if (user.karma < 100) return false;
    setUser(u => ({ ...u, karma: u.karma - 100 }));
    setPet(p => {
      const needs: PetNeeds = {
        hunger: Math.min(100, p.needs.hunger + 20),
        happiness: Math.min(100, p.needs.happiness + 30),
        energy: Math.min(100, p.needs.energy + 30),
      };
      return { ...p, needs, mood: deriveMood(needs) };
    });
    return true;
  }, [user.karma]);

  const updateScore = useCallback((game: keyof GameScores, score: number) => {
    setGameScores(s => ({ ...s, [game]: Math.max(s[game], score) }));
  }, []);

  return (
    <AppContext.Provider value={{
      user, pet, gameScores, worldId, setWorldId,
      addXP, addKarma, spendKarma,
      feedPet, playWithPet, restPet, healPet,
      updateScore, petMoodComputed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
