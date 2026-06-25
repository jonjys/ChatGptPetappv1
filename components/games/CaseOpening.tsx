"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Rarity = "consumer" | "industrial" | "classified" | "restricted" | "covert" | "legendary";

type CaseItem = { emoji: string; name: string; rarity: Rarity };

const RARITY_CFG: Record<Rarity, { label: string; color: string; glow: string; weight: number }> = {
  consumer:   { label: "Consumer",   color: "#aaaaaa", glow: "#aaaaaa44", weight: 50 },
  industrial: { label: "Industrial", color: "#4488ff", glow: "#4488ff44", weight: 28 },
  classified: { label: "Classified", color: "#9933ff", glow: "#9933ff44", weight: 14 },
  restricted: { label: "Restricted", color: "#ff44cc", glow: "#ff44cc44", weight: 6  },
  covert:     { label: "Covert",     color: "#ff3333", glow: "#ff333344", weight: 1.7},
  legendary:  { label: "★ LEGENDARY",color: "#ffcc00", glow: "#ffcc0066", weight: 0.3},
};

const CASE_ITEMS: CaseItem[] = [
  { emoji: "🗡️",  name: "Shadow Blade",     rarity: "consumer"   },
  { emoji: "🔫",  name: "Rusty Gun",         rarity: "consumer"   },
  { emoji: "🛡️",  name: "Cracked Shield",    rarity: "consumer"   },
  { emoji: "⚔️",  name: "Bronze Sword",      rarity: "consumer"   },
  { emoji: "💣",  name: "Old Grenade",        rarity: "consumer"   },
  { emoji: "🏹",  name: "Steel Bow",         rarity: "industrial" },
  { emoji: "🔱",  name: "Plasma Fork",       rarity: "industrial" },
  { emoji: "🪃",  name: "Carbon Boomerang",  rarity: "industrial" },
  { emoji: "💎",  name: "Crystal Dagger",    rarity: "classified" },
  { emoji: "🌙",  name: "Lunar Katana",      rarity: "classified" },
  { emoji: "🔥",  name: "Inferno Rifle",     rarity: "restricted" },
  { emoji: "❄️",  name: "Frost Strike",      rarity: "restricted" },
  { emoji: "⭐",  name: "Star Cannon",       rarity: "covert"     },
  { emoji: "🐉",  name: "Dragon Lance",      rarity: "covert"     },
  { emoji: "👑",  name: "KARMA CROWN",       rarity: "legendary"  },
];

type CaseDef = { name: string; emoji: string; price: number; color: string; description: string };

const CASES: CaseDef[] = [
  { name: "Karma Case",   emoji: "📦", price: 100,  color: "#4488ff", description: "Basic loot · balanced odds" },
  { name: "Shadow Box",   emoji: "🖤", price: 250,  color: "#9933ff", description: "Dark items · boosted purple" },
  { name: "LEGEND Case",  emoji: "👑", price: 500,  color: "#ffcc00", description: "Rare only · high risk/reward" },
];

function rollItem(caseDef: CaseDef): CaseItem {
  let pool = CASE_ITEMS;
  if (caseDef.name === "Shadow Box") pool = CASE_ITEMS.filter(i => i.rarity !== "consumer");
  if (caseDef.name === "LEGEND Case") pool = CASE_ITEMS.filter(i =>
    ["classified","restricted","covert","legendary"].includes(i.rarity)
  );

  const weights = pool.map(item => RARITY_CFG[item.rarity].weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}

function buildReel(winner: CaseItem): CaseItem[] {
  const reel: CaseItem[] = [];
  for (let i = 0; i < 48; i++) {
    const rand = CASE_ITEMS[Math.floor(Math.random() * CASE_ITEMS.length)];
    reel.push(rand);
  }
  reel[42] = winner; // winner lands at position 42
  return reel;
}

type Props = { karma: number; onSpend: (amount: number) => boolean; onWin: (karma: number, xp: number, itemName: string, rarity: Rarity) => void };

export default function CaseOpening({ karma, onSpend, onWin }: Props) {
  const [selectedCase, setSelectedCase] = useState(0);
  const [phase, setPhase] = useState<"select" | "spinning" | "reveal" | "error">("select");
  const [reel, setReel] = useState<CaseItem[]>([]);
  const [winner, setWinner] = useState<CaseItem | null>(null);
  const [inventory, setInventory] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "inv">("open");
  const [errMsg, setErrMsg] = useState("");
  const [showLegendaryPop, setShowLegendaryPop] = useState(false);
  const [openFlash, setOpenFlash] = useState(false);
  const offsetRef = useRef(0);

  const ITEM_W = 96; // px per reel item
  const REEL_CENTER = 4; // items from left edge to center pointer

  const handleOpen = useCallback(() => {
    const c = CASES[selectedCase];
    if (!onSpend(c.price)) {
      setErrMsg(`Not enough karma! Need ${c.price} ⚡`);
      setPhase("error");
      setTimeout(() => setPhase("select"), 1800);
      return;
    }
    // Flash effect on open
    setOpenFlash(true);
    setTimeout(() => setOpenFlash(false), 400);

    const w = rollItem(c);
    const r = buildReel(w);
    setWinner(w);
    setReel(r);
    setPhase("spinning");

    // After animation ends, show reveal
    setTimeout(() => {
      setInventory(prev => [w, ...prev]);
      const rarityKarma: Record<Rarity, number> = {
        consumer: 10, industrial: 30, classified: 80, restricted: 180, covert: 350, legendary: 800
      };
      const rarityXP: Record<Rarity, number> = {
        consumer: 5, industrial: 20, classified: 50, restricted: 100, covert: 200, legendary: 500
      };
      onWin(rarityKarma[w.rarity], rarityXP[w.rarity], w.name, w.rarity);
      setPhase("reveal");
      if (w.rarity === "legendary") {
        setShowLegendaryPop(true);
        setTimeout(() => setShowLegendaryPop(false), 3500);
      }
    }, 4200);
  }, [selectedCase, onSpend, onWin]);

  const c = CASES[selectedCase];
  const cfg = winner ? RARITY_CFG[winner.rarity] : null;

  return (
    <div style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["open","inv"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: "10px", borderRadius: 12,
              background: activeTab === t ? "#0a0a0a" : "#1a1a1a",
              border: `2px solid ${activeTab === t ? "#c8ff00" : "#333"}`,
              color: activeTab === t ? "#c8ff00" : "#888",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
            {t === "open" ? "📦 OPEN CASE" : `🗄️ INVENTORY (${inventory.length})`}
          </button>
        ))}
      </div>

      {activeTab === "inv" && (
        <div>
          {inventory.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#555" }}>
              <div style={{ fontSize: "2rem" }}>📦</div>
              <p style={{ marginTop: 8, fontWeight: 600 }}>No items yet. Open a case!</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {inventory.map((item, i) => {
              const rc = RARITY_CFG[item.rarity];
              return (
                <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  style={{
                    background: `${rc.color}12`, border: `2px solid ${rc.color}`,
                    borderRadius: 14, padding: "14px 10px", textAlign: "center",
                    boxShadow: `0 0 12px ${rc.glow}`,
                  }}>
                  <div style={{ fontSize: "2rem" }}>{item.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: rc.color, marginTop: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{rc.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "open" && (
        <>
          {/* Case picker */}
          <div className="flex gap-2 mb-4">
            {CASES.map((cs, i) => (
              <button key={i} onClick={() => setSelectedCase(i)}
                disabled={phase === "spinning"}
                style={{
                  flex: 1, padding: "10px 6px", borderRadius: 14,
                  background: selectedCase === i ? `${cs.color}18` : "#111",
                  border: `2.5px solid ${selectedCase === i ? cs.color : "#2a2a2a"}`,
                  cursor: "pointer", textAlign: "center",
                  boxShadow: selectedCase === i ? `0 0 14px ${cs.color}44` : "none",
                }}>
                <div style={{ fontSize: "1.6rem" }}>{cs.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: selectedCase === i ? cs.color : "#888", marginTop: 3 }}>{cs.name}</div>
                <div style={{ fontSize: 10, color: selectedCase === i ? cs.color : "#555" }}>{cs.price} ⚡</div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#555", textAlign: "center", marginBottom: 12 }}>{c.description}</p>

          {/* Reel window */}
          <div style={{
            position: "relative", height: 110, borderRadius: 16, overflow: "hidden",
            background: "#0a0a0a", border: `2.5px solid ${c.color}`,
            boxShadow: `0 0 20px ${c.color}33`,
            marginBottom: 4,
          }}>
            {/* Center line */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 3, background: "#c8ff00", zIndex: 10, transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 3, boxShadow: "0 0 10px #c8ff00", zIndex: 10, transform: "translateX(-50%)" }} />

            {/* Idle display */}
            {phase === "select" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                {CASE_ITEMS.slice(0, 5).map((item, i) => (
                  <div key={i} style={{ textAlign: "center", opacity: 0.4 + i * 0.08 }}>
                    <div style={{ fontSize: "2rem" }}>{item.emoji}</div>
                    <div style={{ fontSize: 9, color: RARITY_CFG[item.rarity].color, fontWeight: 700 }}>{RARITY_CFG[item.rarity].label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Spinning reel */}
            {(phase === "spinning" || phase === "reveal") && reel.length > 0 && (
              <motion.div
                style={{ display: "flex", alignItems: "center", height: "100%", willChange: "transform" }}
                initial={{ x: 0 }}
                animate={{ x: -(42 * ITEM_W - (360 / 2 - ITEM_W / 2)) }}
                transition={{ duration: 4.0, ease: [0.1, 0.8, 0.4, 1.0] }}
              >
                {reel.map((item, i) => {
                  const rc = RARITY_CFG[item.rarity];
                  return (
                    <div key={i} style={{
                      minWidth: ITEM_W, height: 90, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      background: i === 42 ? `${rc.color}22` : "#111",
                      borderRight: "1px solid #1a1a1a",
                    }}>
                      <div style={{ fontSize: "1.8rem" }}>{item.emoji}</div>
                      <div style={{ fontSize: 9, color: rc.color, fontWeight: 700, marginTop: 2 }}>{rc.label}</div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Triangular pointer below reel */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "10px solid #c8ff00", display: "inline-block" }} />
          </div>

          {/* Reveal overlay */}
          <AnimatePresence>
            {phase === "reveal" && winner && cfg && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                style={{
                  background: `${cfg.color}18`, border: `3px solid ${cfg.color}`,
                  borderRadius: 20, padding: "20px", textAlign: "center", marginBottom: 12,
                  boxShadow: `0 0 30px ${cfg.glow}`,
                }}
              >
                <div style={{ fontSize: "3.5rem" }}>{winner.emoji}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: cfg.color, marginTop: 8 }}>{winner.name}</div>
                <div style={{ fontSize: 12, color: cfg.color, opacity: 0.8, letterSpacing: "0.1em", marginTop: 4 }}>{cfg.label}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {phase === "error" && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "#ff333322", border: "2px solid #ff3333", borderRadius: 12, padding: "12px 16px", marginBottom: 12, textAlign: "center", color: "#ff6666", fontWeight: 700, fontSize: 14 }}>
                {errMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Open button */}
          <button
            onClick={handleOpen}
            disabled={phase === "spinning"}
            style={{
              width: "100%", padding: "18px",
              background: phase === "spinning"
                ? "#1a1a1a"
                : `linear-gradient(135deg, ${c.color}cc, ${c.color})`,
              border: `3px solid ${phase === "spinning" ? "#333" : c.color}`,
              borderRadius: 16, fontSize: 17, fontWeight: 700,
              color: phase === "spinning" ? "#555" : "#000",
              cursor: phase === "spinning" ? "default" : "pointer",
              boxShadow: phase !== "spinning" ? `4px 4px 0px #000, 0 0 20px ${c.color}44` : "none",
              letterSpacing: "0.04em",
            }}
          >
            {phase === "spinning" ? "🎰 Opening..." : phase === "reveal" ? "📦 OPEN AGAIN" : `📦 OPEN — ${c.price} ⚡`}
          </button>

          {/* Odds table */}
          <div style={{ marginTop: 16, padding: "12px", background: "#111", borderRadius: 12, border: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>DROP RATES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(Object.entries(RARITY_CFG) as [Rarity, typeof RARITY_CFG[Rarity]][]).map(([key, r]) => (
                <span key={key} style={{ fontSize: 10, fontWeight: 700, color: r.color, background: `${r.color}18`, padding: "3px 8px", borderRadius: 6 }}>
                  {r.label}: {r.weight}%
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
