"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import MemoryPalace from "@/components/games/MemoryPalace";
import { useApp } from "@/context/AppContext";

export default function MemoryPage() {
  const { addKarma, addXP, updateScore, gameScores } = useApp();

  function handleEnd(matched: number, timeLeft: number, level: number) {
    const karma = matched * 12 + level * 30 + timeLeft * 2;
    const xp    = matched * 8  + level * 20 + timeLeft;
    addKarma(karma);
    addXP(xp);
    updateScore("memory", matched * 100 + level * 200 + timeLeft);
  }

  return (
    <div style={{ background: "#0d0a1a", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#0d0a1a", borderBottom: "2px solid #8b5cf6" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#1a1230", border: "2px solid #8b5cf6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#8b5cf6" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#8b5cf6", fontSize: 16, fontWeight: 700 }}>🧠 MEMORY PALACE</div>
          <div style={{ color: "#555", fontSize: 11 }}>Progressive rings · how far can you climb?</div>
        </div>
        {gameScores.memory > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#8b5cf6", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.memory}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        <MemoryPalace onEnd={handleEnd} />
      </div>
    </div>
  );
}
