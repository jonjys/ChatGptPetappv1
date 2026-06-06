"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import PetBattle from "@/components/games/PetBattle";
import { useApp } from "@/context/AppContext";

export default function BattlePage() {
  const { pet, addKarma, addXP, updateScore, gameScores } = useApp();

  function handleEnd(won: boolean, karma: number) {
    addKarma(karma);
    addXP(won ? 80 : 15);
    if (won) updateScore("battle", gameScores.battle + 1);
  }

  return (
    <div style={{ background: "#150a00", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#150a00", borderBottom: "2px solid #ff6b35" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#2a1200", border: "2px solid #ff6b35", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#ff6b35" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ff6b35", fontSize: 16, fontWeight: 700 }}>⚔️ PET BATTLE</div>
          <div style={{ color: "#555", fontSize: 11 }}>{pet.name} · {pet.class}</div>
        </div>
        {gameScores.battle > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#ff6b35", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.battle}W
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        <PetBattle pet={pet} onEnd={handleEnd} />
      </div>
    </div>
  );
}
