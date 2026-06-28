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
    <div style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", position: "relative" }}>

      {/* ── White flash on open ── */}
      <AnimatePresence>
        {openFlash && (
          <motion.div
            key="open-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, background: "#ffffff", zIndex: 9990, pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      {/* ── Legendary Pop Overlay ── */}
      <AnimatePresence>
        {showLegendaryPop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "radial-gradient(circle, #ffd70044 0%, rgba(0,0,0,0.9) 70%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}
          >
            <motion.div
              animate={{ scale: [0, 1.4, 1], rotate: [0, -10, 10, 0] }}
              transition={{ type: "spring", stiffness: 200 }}
              style={{ fontSize: "8rem" }}
            >👑</motion.div>
            <motion.div animate={{ opacity: [0, 1] }} transition={{ delay: 0.5 }} style={{ fontSize: 24, fontWeight: 900, color: "#ffd700", textAlign: "center", marginTop: 16 }}>LEGENDARY DROP!</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    background: `linear-gradient(135deg, ${rc.color}18, ${rc.color}08)`,
                    border: `2px solid ${rc.color}`,
                    borderRadius: 14, padding: "14px 10px", textAlign: "center",
                    boxShadow: `0 0 16px ${rc.glow}`,
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
          {/* Case picker — beautiful cards */}
          <div className="flex gap-2 mb-4">
            {CASES.map((cs, i) => {
              const isSelected = selectedCase === i;
              return (
                <motion.button
                  key={i}
                  onClick={() => setSelectedCase(i)}
                  disabled={phase === "spinning"}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: "10px 6px", borderRadius: 14,
                    background: isSelected
                      ? `linear-gradient(135deg, ${cs.color}33, ${cs.color}18)`
                      : "#111",
                    border: `2.5px solid ${isSelected ? cs.color : "#2a2a2a"}`,
                    cursor: phase === "spinning" ? "default" : "pointer",
                    textAlign: "center",
                    boxShadow: isSelected ? `0 0 20px ${cs.color}55, inset 0 0 20px ${cs.color}11` : "none",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Rarity glow stripe at top */}
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, transparent, ${cs.color}, transparent)`,
                      boxShadow: `0 0 8px ${cs.color}`,
                    }} />
                  )}
                  {/* Bobbing emoji */}
                  <motion.div
                    animate={isSelected ? { y: [0, -4, 0] } : {}}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    style={{ fontSize: "1.8rem", display: "block" }}
                  >
                    {cs.emoji}
                  </motion.div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? cs.color : "#888", marginTop: 4 }}>{cs.name}</div>
                  {/* Price tag chip */}
                  <div style={{
                    display: "inline-block",
                    marginTop: 5,
                    background: isSelected ? `${cs.color}22` : "#1a1a1a",
                    border: `1.5px solid ${isSelected ? cs.color : "#333"}`,
                    borderRadius: 8, padding: "2px 8px",
                    fontSize: 10, fontWeight: 800,
                    color: isSelected ? cs.color : "#555",
                  }}>
                    {cs.price} ⚡
                  </div>
                </motion.button>
              );
            })}
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
                      background: i === 42 ? `linear-gradient(135deg, ${rc.color}33, ${rc.color}11)` : "#111",
                      borderRight: "1px solid #1a1a1a",
                      boxShadow: i === 42 ? `inset 0 0 12px ${rc.color}44` : "none",
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

          {/* Reveal overlay — zoom spring + confetti particles */}
          <AnimatePresence>
            {phase === "reveal" && winner && cfg && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
                style={{
                  background: `linear-gradient(135deg, ${cfg.color}28, ${cfg.color}0a)`,
                  border: `3px solid ${cfg.color}`,
                  borderRadius: 20, padding: "24px 20px", textAlign: "center", marginBottom: 12,
                  boxShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}`,
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Shimmer sweep */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  style={{
                    position: "absolute", top: 0, left: 0, bottom: 0, width: "60%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                    pointerEvents: "none",
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ fontSize: "4rem", display: "block" }}
                >
                  {winner.emoji}
                </motion.div>
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
          <motion.button
            onClick={handleOpen}
            disabled={phase === "spinning"}
            whileHover={phase !== "spinning" ? { scale: 1.02 } : {}}
            whileTap={phase !== "spinning" ? { scale: 0.97 } : {}}
            style={{
              width: "100%", padding: "18px",
              background: phase === "spinning"
                ? "#1a1a1a"
                : `linear-gradient(135deg, ${c.color}cc, ${c.color})`,
              border: `3px solid ${phase === "spinning" ? "#333" : c.color}`,
              borderRadius: 16, fontSize: 17, fontWeight: 700,
              color: phase === "spinning" ? "#555" : "#000",
              cursor: phase === "spinning" ? "default" : "pointer",
              boxShadow: phase !== "spinning" ? `4px 4px 0px #000, 0 0 24px ${c.color}66` : "none",
              letterSpacing: "0.04em",
            }}
          >
            {phase === "spinning" ? "🎰 Opening..." : phase === "reveal" ? "📦 OPEN AGAIN" : `📦 OPEN — ${c.price} ⚡`}
          </motion.button>

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
