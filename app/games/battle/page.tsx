"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Trophy, Zap } from "lucide-react";
import PetBattle from "@/components/games/PetBattle";
import { useApp } from "@/context/AppContext";
import { getPetEmoji } from "@/lib/pet-evolution";

export default function BattlePage() {
  const { pet, addKarma, addXP, updateScore, gameScores } = useApp();

  function handleEnd(won: boolean, karma: number) {
    if (karma > 0) addKarma(karma, "Karma Defense");
    addXP(won ? 80 : 15);
    if (won) updateScore("battle", (gameScores.battle ?? 0) + 1);
  }

  return (
    <div style={{ background: "#050510", minHeight: "100dvh", color: "#fff", userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "#050510", borderBottom: "2px solid #a855f7" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#0d0020", border: "2px solid #a855f7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#a855f7" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#a855f7", fontSize: 16, fontWeight: 700 }}>🌀 KARMA PULSE</div>
          <div style={{ color: "#555", fontSize: 11 }}>{pet.name} · {pet.class} · Circular nexus defense</div>
        </div>
        {(gameScores.battle ?? 0) > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> Wave {gameScores.battle}
          </div>
        )}
      </div>

      <div className="px-3 pt-3 pb-6">
        <PetBattle pet={pet} petEmoji={getPetEmoji(pet.evolution, pet.class)} onEnd={handleEnd} />
      </div>
    </div>
  );
}
