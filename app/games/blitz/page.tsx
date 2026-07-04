"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import BountyHeist, { type HeistResult } from "@/components/games/BountyHeist";
import { useApp } from "@/context/AppContext";

export default function BlitzPage() {
  const { addKarma, addXP, updateScore, gameScores, addActivity } = useApp();

  function handleEnd({ banked, grabbed, busts, bestChain, xp }: HeistResult) {
    if (banked > 0) addKarma(banked, "Bounty Heist");
    addXP(xp);
    if (banked > (gameScores.blitz ?? 0)) updateScore("blitz", banked);
    if (grabbed > 0) addActivity({ emoji: "🚨", title: `Bounty Heist — banked ${banked}⚡`, detail: `chain ×${bestChain} · ${busts} bust${busts === 1 ? "" : "s"}`, karma: banked, source: "game" });
  }

  return (
    <div style={{ background: "#060a0e", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#060a0e", borderBottom: "2px solid #00e5ff" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#0a1a22", border: "2px solid #00e5ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#00e5ff" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>🚨 BOUNTY HEIST</div>
          <div style={{ color: "#555", fontSize: 11 }}>Grab · risk · bank — don&apos;t get busted</div>
        </div>
        {(gameScores.blitz ?? 0) > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#00e5ff", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.blitz}⚡
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        <BountyHeist onEnd={handleEnd} />
      </div>
    </div>
  );
}
