"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import BountyBlitz from "@/components/games/BountyBlitz";
import { useApp } from "@/context/AppContext";

export default function BlitzPage() {
  const { addKarma, addXP, updateScore, gameScores } = useApp();

  function handleEnd({ accepted, combo, xp }: { accepted: number; skipped: number; xp: number; combo: number }) {
    const karma = Math.floor(accepted * 15 + (combo >= 3 ? 50 : 0));
    addKarma(karma);
    addXP(xp);
    updateScore("blitz", accepted);
  }

  return (
    <div style={{ background: "#001a1a", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#001a1a", borderBottom: "2px solid #00e5ff" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#002a2a", border: "2px solid #00e5ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#00e5ff" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>💥 BOUNTY BLITZ</div>
          <div style={{ color: "#555", fontSize: 11 }}>Accept as many as you can in 30s</div>
        </div>
        {gameScores.blitz > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#00e5ff", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.blitz} best
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        <BountyBlitz onEnd={handleEnd} />
      </div>
    </div>
  );
}
