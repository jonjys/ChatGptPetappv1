"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import KarmaSlots from "@/components/games/KarmaSlots";
import { useApp } from "@/context/AppContext";

export default function SlotsPage() {
  const { user, spendKarma, addKarma, addXP, updateScore, gameScores } = useApp();

  function handleSpin(cost: number): boolean { return spendKarma(cost); }

  function handleWin(amount: number) {
    addKarma(amount);
    addXP(Math.floor(amount / 5));
    updateScore("slots", (gameScores.slots ?? 0) + amount);
  }

  return (
    <div style={{ background: "#1a1000", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#1a1000", borderBottom: "2px solid #ffde00" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#2a1c00", border: "2px solid #ffde00", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#ffde00" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ffde00", fontSize: 16, fontWeight: 700 }}>🎰 KARMA SLOTS</div>
          <div style={{ color: "#555", fontSize: 11 }}>Balance: ⚡ {user.karma.toLocaleString()}</div>
        </div>
        {gameScores.slots > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#ffde00", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> +{gameScores.slots} total
          </div>
        )}
      </div>

      <div className="px-4 pt-5 pb-4">
        <KarmaSlots karma={user.karma} onSpin={handleSpin} onWin={handleWin} />
      </div>
    </div>
  );
}
