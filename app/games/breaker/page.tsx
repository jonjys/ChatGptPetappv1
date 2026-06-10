"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import DNABreaker from "@/components/games/DNABreaker";
import { useApp } from "@/context/AppContext";

export default function BreakerPage() {
  const { addKarma, addXP, updateScore, gameScores, addActivity } = useApp();

  function handleEnd(score: number, coins: number) {
    const karma = Math.floor(score / 10) + coins * 5;
    addKarma(karma, "DNA Breaker");
    addXP(Math.floor(score / 20) + coins * 3);
    updateScore("breaker", score);
    addActivity({ emoji: "🧬", title: `DNA Breaker — Score ${score}`, detail: `${coins} DNA collected · ${karma} karma earned`, karma, source: "breaker" });
  }

  return (
    <div style={{ background: "#050510", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#050510", borderBottom: "2px solid #4488ff" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#0a0a1a", border: "2px solid #4488ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#4488ff" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#4488ff", fontSize: 16, fontWeight: 700 }}>🧬 DNA BREAKER</div>
          <div style={{ color: "#555", fontSize: 11 }}>Break blocks · Collect DNA · Fusion Strike</div>
        </div>
        {(gameScores.breaker ?? 0) > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#4488ff", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.breaker}
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-4">
        <DNABreaker onEnd={handleEnd} />
      </div>
    </div>
  );
}
