"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Trophy } from "lucide-react";
import KarmaRunner from "@/components/games/KarmaRunner";
import { useApp } from "@/context/AppContext";
import { getPetEmoji } from "@/lib/pet-evolution";

export default function RunnerPage() {
  const { pet, addKarma, addXP, updateScore, gameScores } = useApp();
  const [lastResult, setLastResult] = useState<{ score: number; gems: number } | null>(null);
  const petEmoji = getPetEmoji(pet.evolution, pet.class);

  function handleEnd(score: number, gems: number) {
    const karmaEarned = gems * 5 + Math.floor(score / 20);
    addKarma(karmaEarned);
    addXP(Math.floor(score / 10));
    updateScore("runner", score);
    setLastResult({ score, gems });
  }

  return (
    <div style={{ background: "#0d1a0a", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#0d1a0a", borderBottom: "2px solid #c8ff00" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#1a2a10", border: "2px solid #c8ff00", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#c8ff00" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#c8ff00", fontSize: 16, fontWeight: 700 }}>🏃 KARMA RUNNER</div>
          <div style={{ color: "#555", fontSize: 11 }}>Earn: gems×5 + score÷20 karma</div>
        </div>
        {gameScores.runner > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#c8ff00", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.runner}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        <KarmaRunner petEmoji={petEmoji} onEnd={handleEnd} />

        {lastResult && (
          <div style={{ background: "#0a1400", border: "2px solid #c8ff0044", borderRadius: 14, padding: "12px 16px" }}>
            <div style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>LAST RUN</div>
            <div style={{ color: "#aaa", fontSize: 12 }}>Score {lastResult.score} · 💎×{lastResult.gems} · +{lastResult.gems * 5 + Math.floor(lastResult.score / 20)} karma</div>
          </div>
        )}

        <div style={{ background: "#0a1400", border: "2px solid #333", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.6 }}>
            <strong style={{ color: "#c8ff00" }}>How to play:</strong><br />
            Tap · Space · ↑ to jump. Dodge obstacles. Collect 💎 gems.<br />
            Speed increases over time. Your pet runs for you!
          </div>
        </div>
      </div>
    </div>
  );
}
