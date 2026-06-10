"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import DeepCatch from "@/components/games/DeepCatch";
import { useApp } from "@/context/AppContext";

export default function FishingPage() {
  const { addKarma, addXP, updateScore, gameScores, addActivity } = useApp();

  function handleCatch(karma: number, xp: number, fishName: string, rarity: string) {
    addKarma(karma, "Deep Catch");
    addXP(xp);
    updateScore("fishing", (gameScores.fishing ?? 0) + 1);
    addActivity({
      emoji: rarity === "legendary" ? "🏆" : "🎣",
      title: `Caught a ${rarity === "legendary" ? "LEGENDARY " : ""}${fishName}!`,
      detail: "Deep Catch",
      karma, xp, source: "fishing", rarity,
    });
  }

  return (
    <div style={{ background: "#010d1a", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#010d1a", borderBottom: "2px solid #4488ff" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#0d1a2a", border: "2px solid #4488ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#4488ff" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#4488ff", fontSize: 16, fontWeight: 700 }}>🎣 DEEP CATCH</div>
          <div style={{ color: "#555", fontSize: 11 }}>Tap when the marker hits the yellow zone</div>
        </div>
        {(gameScores.fishing ?? 0) > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#4488ff", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.fishing} caught
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        <DeepCatch onCatch={handleCatch} />
      </div>
    </div>
  );
}
