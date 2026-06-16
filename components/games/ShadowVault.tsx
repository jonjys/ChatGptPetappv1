"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Rarity = "consumer" | "industrial" | "classified" | "restricted" | "covert" | "legendary" | "mythic";
type CaseItem = { emoji: string; name: string; rarity: Rarity };

// Cascading drop weights modeled on real CS:GO case odds (~5-6x rarer per tier).
// Sums to exactly 100, so each weight doubles as a display percentage.
const RARITY_CFG: Record<Rarity, { label: string; color: string; glow: string; weight: number }> = {
  consumer:   { label: "Common",      color: "#aaaaaa", glow: "#aaaaaa44", weight: 50    },
  industrial: { label: "Industrial",  color: "#4488ff", glow: "#4488ff44", weight: 28    },
  classified: { label: "Classified",  color: "#9933ff", glow: "#9933ff44", weight: 14    },
  restricted: { label: "Restricted",  color: "#ff44cc", glow: "#ff44cc44", weight: 6     },
  covert:     { label: "Covert",      color: "#ff3333", glow: "#ff333344", weight: 1.7   },
  legendary:  { label: "★ LEGENDARY", color: "#ffcc00", glow: "#ffcc0066", weight: 0.25  },
  mythic:     { label: "✦ MYTHIC",    color: "#ff0055", glow: "#ff0055aa", weight: 0.05  },
};

const VAULT_ITEMS: CaseItem[] = [
  { emoji: "🗡️",  name: "Shadow Blade",      rarity: "consumer"   },
  { emoji: "🔫",  name: "Rusty Pistol",       rarity: "consumer"   },
  { emoji: "🛡️",  name: "Cracked Shield",     rarity: "consumer"   },
  { emoji: "⚔️",  name: "Bronze Sword",       rarity: "consumer"   },
  { emoji: "💣",  name: "Old Grenade",         rarity: "consumer"   },
  { emoji: "🪖",  name: "Steel Helmet",        rarity: "consumer"   },
  { emoji: "🏹",  name: "Steel Bow",           rarity: "industrial" },
  { emoji: "🔱",  name: "Plasma Fork",         rarity: "industrial" },
  { emoji: "🪃",  name: "Carbon Boomerang",    rarity: "industrial" },
  { emoji: "🧲",  name: "Magnetic Gauntlet",   rarity: "industrial" },
  { emoji: "💎",  name: "Crystal Dagger",      rarity: "classified" },
  { emoji: "🌙",  name: "Lunar Katana",        rarity: "classified" },
  { emoji: "🔮",  name: "Void Orb",            rarity: "classified" },
  { emoji: "🔥",  name: "Inferno Cannon",      rarity: "restricted" },
  { emoji: "❄️",  name: "Frostbite Strike",    rarity: "restricted" },
  { emoji: "⚡",  name: "Thunder Spear",       rarity: "restricted" },
  { emoji: "⭐",  name: "Star Cannon",         rarity: "covert"     },
  { emoji: "🐉",  name: "Dragon Lance",        rarity: "covert"     },
  { emoji: "👑",  name: "KARMA CROWN",         rarity: "legendary"  },
  { emoji: "🌌",  name: "VOID SINGULARITY",    rarity: "legendary"  },
  { emoji: "🌠",  name: "ETERNAL NOVA",        rarity: "mythic"     },
  { emoji: "💠",  name: "ABYSSAL THRONE",      rarity: "mythic"     },
];

type VaultDef = { name: string; emoji: string; price: number; color: string; description: string; theme: string };

const VAULTS: VaultDef[] = [
  { name: "Karma Crate",    emoji: "📦", price: 100,  color: "#4488ff", description: "Standard loot · balanced odds",   theme: "#0a0a1a" },
  { name: "Shadow Vault",   emoji: "🖤", price: 250,  color: "#cc44ff", description: "Dark artifacts · boosted purple", theme: "#0f0015" },
  { name: "LEGEND VAULT",   emoji: "👑", price: 500,  color: "#ffcc00", description: "Rares only · extreme rewards",    theme: "#1a1000" },
];

function rollItem(vault: VaultDef): CaseItem {
  let pool = VAULT_ITEMS;
  if (vault.name === "Shadow Vault")  pool = VAULT_ITEMS.filter(i => i.rarity !== "consumer");
  if (vault.name === "LEGEND VAULT")  pool = VAULT_ITEMS.filter(i => ["classified","restricted","covert","legendary","mythic"].includes(i.rarity));
  const weights = pool.map(item => RARITY_CFG[item.rarity].weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[0];
}

function buildReel(winner: CaseItem): CaseItem[] {
  const reel: CaseItem[] = [];
  for (let i = 0; i < 52; i++) reel.push(VAULT_ITEMS[Math.floor(Math.random() * VAULT_ITEMS.length)]);
  reel[44] = winner;
  return reel;
}

type Props = { karma: number; onSpend: (amount: number) => boolean; onWin: (karma: number, xp: number, itemName: string, rarity: Rarity) => void };

export default function ShadowVault({ karma, onSpend, onWin }: Props) {
  const [selectedVault, setSelectedVault] = useState(0);
  const [phase, setPhase] = useState<"select" | "spinning" | "reveal" | "error">("select");
  const [reel, setReel]     = useState<CaseItem[]>([]);
  const [winner, setWinner] = useState<CaseItem | null>(null);
  const [inventory, setInventory] = useState<CaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "inv">("open");
  const [errMsg, setErrMsg] = useState("");
  const [spinKey, setSpinKey] = useState(0); // KEY FIX: forces reel re-mount on each spin

  const ITEM_W = 100;

  const handleOpen = useCallback(() => {
    const v = VAULTS[selectedVault];
    if (!onSpend(v.price)) {
      setErrMsg(`Need ${v.price} ⚡ to open!`);
      setPhase("error");
      setTimeout(() => setPhase("select"), 1800);
      return;
    }
    const w = rollItem(v);
    const r = buildReel(w);
    setWinner(w);
    setReel(r);
    setSpinKey(k => k + 1); // KEY FIX: triggers re-mount → fresh animation
    setPhase("spinning");

    setTimeout(() => {
      setInventory(prev => [w, ...prev]);
      const rarityKarma: Record<Rarity, number> = { consumer: 10, industrial: 30, classified: 80, restricted: 180, covert: 350, legendary: 800, mythic: 3000 };
      const rarityXP:    Record<Rarity, number> = { consumer: 5,  industrial: 20, classified: 50, restricted: 100, covert: 200, legendary: 500, mythic: 1500 };
      onWin(rarityKarma[w.rarity], rarityXP[w.rarity], w.name, w.rarity);
      setPhase("reveal");
    }, 4500);
  }, [selectedVault, onSpend, onWin]);

  const v   = VAULTS[selectedVault];
  const cfg = winner ? RARITY_CFG[winner.rarity] : null;

  return (
    <div style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["open","inv"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: "10px", borderRadius: 12,
              background: activeTab === t ? "#0a0a0a" : "#111",
              border: `2px solid ${activeTab === t ? "#c8ff00" : "#333"}`,
              color: activeTab === t ? "#c8ff00" : "#888",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
            {t === "open" ? "🏴‍☠️ SHADOW VAULT" : `🗄️ COLLECTION (${inventory.length})`}
          </button>
        ))}
      </div>

      {/* Inventory tab */}
      {activeTab === "inv" && (
        <div>
          {inventory.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#555" }}>
              <div style={{ fontSize: "2.5rem" }}>🏴‍☠️</div>
              <p style={{ marginTop: 8, fontWeight: 600 }}>Vault is empty. Open to collect artifacts!</p>
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
                    boxShadow: `0 0 14px ${rc.glow}`,
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

      {/* Open tab */}
      {activeTab === "open" && (
        <>
          {/* Vault picker */}
          <div className="flex gap-2 mb-2">
            {VAULTS.map((vt, i) => (
              <button key={i} onClick={() => setSelectedVault(i)}
                disabled={phase === "spinning"}
                style={{
                  flex: 1, padding: "6px 4px", borderRadius: 10,
                  background: selectedVault === i ? `${vt.color}18` : "#111",
                  border: `2px solid ${selectedVault === i ? vt.color : "#2a2a2a"}`,
                  cursor: "pointer", textAlign: "center",
                  boxShadow: selectedVault === i ? `0 0 12px ${vt.color}44` : "none",
                  transition: "all 0.2s",
                }}>
                <div style={{ fontSize: "1.2rem" }}>{vt.emoji}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: selectedVault === i ? vt.color : "#888", marginTop: 2 }}>{vt.name}</div>
                <div style={{ fontSize: 9, color: selectedVault === i ? vt.color : "#555" }}>{vt.price} ⚡</div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: "#555", textAlign: "center", marginBottom: 6 }}>{v.description}</p>

          {/* Reel window */}
          <div style={{
            position: "relative", height: 88, borderRadius: 14, overflow: "hidden",
            background: v.theme, border: `2px solid ${v.color}`,
            boxShadow: `0 0 20px ${v.color}33`,
            marginBottom: 4,
          }}>
            {/* Center pointer line */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 3, background: "#c8ff00", zIndex: 10, transform: "translateX(-50%)", boxShadow: "0 0 10px #c8ff00" }} />
            {/* Edge fades */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 60, background: `linear-gradient(90deg, ${v.theme}, transparent)`, zIndex: 9, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 60, background: `linear-gradient(-90deg, ${v.theme}, transparent)`, zIndex: 9, pointerEvents: "none" }} />

            {/* Idle display */}
            {phase === "select" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                {VAULT_ITEMS.slice(0, 6).map((item, i) => (
                  <div key={i} style={{ textAlign: "center", opacity: 0.3 + Math.abs(i - 2.5) * -0.06 + 0.2 }}>
                    <div style={{ fontSize: "1.8rem" }}>{item.emoji}</div>
                    <div style={{ fontSize: 8, color: RARITY_CFG[item.rarity].color, fontWeight: 700 }}>{RARITY_CFG[item.rarity].label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Spinning reel — key={spinKey} forces fresh re-mount on every spin */}
            {(phase === "spinning" || phase === "reveal") && reel.length > 0 && (
              <motion.div
                key={spinKey}
                style={{ display: "flex", alignItems: "center", height: "100%", willChange: "transform" }}
                initial={{ x: 0 }}
                animate={{ x: -(44 * ITEM_W - (360 / 2 - ITEM_W / 2)) }}
                transition={{ duration: 4.2, ease: [0.05, 0.95, 0.35, 1.0] }}
              >
                {reel.map((item, i) => {
                  const rc = RARITY_CFG[item.rarity];
                  const isWinner = i === 44;
                  return (
                    <div key={i} style={{
                      minWidth: ITEM_W, height: 80,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      background: isWinner ? `${rc.color}28` : "#0a0a0a",
                      borderRight: `1px solid #1a1a1a`,
                      borderLeft: isWinner ? `2px solid ${rc.color}` : undefined,
                      transition: "background 0.3s",
                    }}>
                      <div style={{ fontSize: "2rem" }}>{item.emoji}</div>
                      <div style={{ fontSize: 8, color: rc.color, fontWeight: 700, marginTop: 3 }}>{rc.label}</div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Spinning overlay */}
            <AnimatePresence>
              {phase === "spinning" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.15, 0, 0.1, 0] }}
                  transition={{ duration: 4.2 }}
                  style={{ position: "absolute", inset: 0, background: v.color, pointerEvents: "none" }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Pointer arrow */}
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderBottom: `12px solid #c8ff00`, display: "inline-block" }} />
          </div>

          {/* Mythic full-screen flash burst */}
          <AnimatePresence>
            {phase === "reveal" && winner?.rarity === "mythic" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, times: [0, 0.15, 1] }}
                style={{
                  position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none",
                  background: "radial-gradient(circle, #ff0055aa, transparent 70%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Reveal card */}
          <AnimatePresence>
            {phase === "reveal" && winner && cfg && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                style={{
                  background: `${cfg.color}18`, border: `2.5px solid ${cfg.color}`,
                  borderRadius: 16, padding: "12px 16px", textAlign: "center", marginBottom: 10,
                  boxShadow: `0 0 24px ${cfg.glow}`,
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.8 }}
                  style={{ fontSize: "2.8rem", flexShrink: 0 }}
                >{winner.emoji}</motion.div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color }}>{winner.name}</div>
                  <div style={{ fontSize: 11, color: cfg.color, opacity: 0.8, letterSpacing: "0.12em", marginTop: 2 }}>{cfg.label}</div>
                  {winner.rarity === "legendary" && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      style={{ marginTop: 4, fontSize: 10, color: "#ffcc00", fontWeight: 700, letterSpacing: "0.1em" }}
                    >✨ ARTIFACT CLAIMED ✨</motion.div>
                  )}
                  {winner.rarity === "mythic" && (
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4], color: ["#ff0055", "#ff66aa", "#ff0055"] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{ marginTop: 4, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em" }}
                    >⚡ ONE IN TWO THOUSAND ⚡</motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
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
              width: "100%", padding: "12px",
              background: phase === "spinning" ? "#111" : `linear-gradient(135deg, ${v.color}99, ${v.color})`,
              border: `3px solid ${phase === "spinning" ? "#222" : v.color}`,
              borderRadius: 16, fontSize: 17, fontWeight: 700,
              color: phase === "spinning" ? "#555" : "#000",
              cursor: phase === "spinning" ? "not-allowed" : "pointer",
              boxShadow: phase !== "spinning" ? `4px 4px 0px #000, 0 0 24px ${v.color}44` : "none",
              letterSpacing: "0.04em", transition: "all 0.2s",
            }}
          >
            {phase === "spinning" ? "🔓 Opening vault..." : phase === "reveal" ? "🏴‍☠️ OPEN AGAIN" : `🏴‍☠️ OPEN VAULT — ${v.price} ⚡`}
          </button>

          {/* Drop rates — compact inline */}
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.08em" }}>
              {(Object.entries(RARITY_CFG) as [Rarity, typeof RARITY_CFG[Rarity]][]).map(([key, r]) => (
                <span key={key} style={{ color: r.color, marginRight: 6 }}>{r.label} {r.weight}%</span>
              ))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
