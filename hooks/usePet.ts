"use client";

import { useApp } from "@/context/AppContext";

export function usePet() {
  const { pet, feedPet } = useApp();
  return { pet, feedPet };
}
