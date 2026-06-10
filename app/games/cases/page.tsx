"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import CaseOpening from "@/components/games/CaseOpening";
import { useApp } from "@/context/AppContext";

export default function CasesPage() {
  const { user, spendKarma, addKarma, addXP, addActivity } = useApp();

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#0a0a0a", borderBottom: "2px solid #ffcc00" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#1a1a1a", border: "2px solid #ffcc00", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#ffcc00" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ffcc00", fontSize: 16, fontWeight: 700 }}>📦 CASE OPENING</div>
          <div style={{ color: "#555", fontSize: 11 }}>Unbox rare items · Roll the roulette</div>
        </div>
        <div style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700 }}>{user.karma.toLocaleString()} ⚡</div>
      </div>

      <div className="px-4 pt-4 pb-4">
        <CaseOpening
          karma={user.karma}
          onSpend={spendKarma}
          onWin={(karma, xp, itemName, rarity) => {
            addKarma(karma, "Case Opening");
            addXP(xp);
            addActivity({ emoji: rarity === "legendary" ? "👑" : rarity === "covert" ? "⭐" : "📦", title: `Unboxed ${itemName}`, detail: `${rarity.toUpperCase()} · Case Opening`, karma, xp, source: "cases", rarity });
          }}
        />
      </div>
    </div>
  );
}
