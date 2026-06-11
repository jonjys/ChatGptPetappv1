"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ShadowVault from "@/components/games/ShadowVault";
import { useApp } from "@/context/AppContext";

export default function CasesPage() {
  const { user, spendKarma, addKarma, addXP, addActivity } = useApp();

  return (
    <div style={{ background: "#080010", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#080010", borderBottom: "2px solid #cc44ff" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#110022", border: "2px solid #cc44ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#cc44ff" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#cc44ff", fontSize: 16, fontWeight: 700 }}>🏴‍☠️ SHADOW VAULT</div>
          <div style={{ color: "#555", fontSize: 11 }}>Unbox rare artifacts · Roll the vault</div>
        </div>
        <div style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700 }}>{user.karma.toLocaleString()} ⚡</div>
      </div>

      <div className="px-4 pt-4 pb-4">
        <ShadowVault
          karma={user.karma}
          onSpend={spendKarma}
          onWin={(karma, xp, itemName, rarity) => {
            addKarma(karma, "Shadow Vault");
            addXP(xp);
            addActivity({ emoji: rarity === "legendary" ? "👑" : rarity === "covert" ? "⭐" : "🏴‍☠️", title: `Unboxed ${itemName}`, detail: `${rarity.toUpperCase()} · Shadow Vault`, karma, xp, source: "cases", rarity });
          }}
        />
      </div>
    </div>
  );
}
