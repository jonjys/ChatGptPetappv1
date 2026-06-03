"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Pet } from "@/types/pet";
import type { User } from "@/types/user";
import { CURRENT_USER, MY_PET } from "@/lib/mock-data";

type AppContextType = {
  user: User;
  pet: Pet;
  addXP: (amount: number) => void;
  addKarma: (amount: number) => void;
  spendKarma: (amount: number) => boolean;
  feedPet: () => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(CURRENT_USER);
  const [pet, setPet] = useState<Pet>(MY_PET);

  const addXP = useCallback((amount: number) => {
    setUser((u) => ({ ...u, xp: u.xp + amount }));
    setPet((p) => ({ ...p, xp: p.xp + amount, mood: "excited" }));
  }, []);

  const addKarma = useCallback((amount: number) => {
    setUser((u) => ({ ...u, karma: u.karma + amount }));
  }, []);

  const spendKarma = useCallback(
    (amount: number): boolean => {
      if (user.karma < amount) return false;
      setUser((u) => ({ ...u, karma: u.karma - amount }));
      return true;
    },
    [user.karma]
  );

  const feedPet = useCallback(() => {
    setPet((p) => ({
      ...p,
      mood: "happy",
      lastFed: new Date().toISOString(),
    }));
  }, []);

  return (
    <AppContext.Provider value={{ user, pet, addXP, addKarma, spendKarma, feedPet }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
