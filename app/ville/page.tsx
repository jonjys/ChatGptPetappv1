"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

// ─── Building definitions ────────────────────────────────────────────────────

type BuildingDef = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  cost: number;
  karmaPerHour: number;
  xpBonus: number;
  unlockLevel: number;
  w: number; // grid width
  color: string;
};

const BUILDINGS: BuildingDef[] = [
  { id: "house",    emoji: "🏠", name: "Karma Huset",    desc: "Din bas. Ger basic karma varje timme.",         cost: 0,    karmaPerHour: 2,   xpBonus: 0,   unlockLevel: 1,  w: 1, color: "#c8ff00" },
  { id: "school",   emoji: "🏫", name: "XP Skolan",      desc: "+20% XP på alla aktiviteter.",                  cost: 200,  karmaPerHour: 5,   xpBonus: 20,  unlockLevel: 2,  w: 2, color: "#4488ff" },
  { id: "gym",      emoji: "🏋️", name: "Karma Gym",      desc: "Stärker ditt husdjur dagligen.",                cost: 350,  karmaPerHour: 8,   xpBonus: 0,   unlockLevel: 3,  w: 1, color: "#ff6b35" },
  { id: "cafe",     emoji: "☕", name: "Social Café",    desc: "Vänner kan besöka dig. +karma vid besök.",      cost: 500,  karmaPerHour: 10,  xpBonus: 5,   unlockLevel: 4,  w: 1, color: "#8b5cf6" },
  { id: "market",   emoji: "🏪", name: "Karma Market",   desc: "Sälj items till vänner. Passiv inkomst.",       cost: 750,  karmaPerHour: 15,  xpBonus: 0,   unlockLevel: 5,  w: 2, color: "#ff2d8d" },
  { id: "lab",      emoji: "🔬", name: "DNA Lab",        desc: "Boostar DNA Breaker score med 2x.",             cost: 1000, karmaPerHour: 12,  xpBonus: 10,  unlockLevel: 7,  w: 1, color: "#00e5ff" },
  { id: "stadium",  emoji: "🏟️", name: "Battle Arena",   desc: "Host Pet Battles. Vinn turnering karma.",       cost: 1500, karmaPerHour: 20,  xpBonus: 15,  unlockLevel: 10, w: 2, color: "#ffde00" },
  { id: "bank",     emoji: "🏦", name: "Karma Bank",     desc: "Biljetter till KARMA POTTEN ×2.",               cost: 2000, karmaPerHour: 25,  xpBonus: 0,   unlockLevel: 12, w: 1, color: "#c8ff00" },
  { id: "tower",    emoji: "🗼", name: "Legend Tower",   desc: "Syns på leaderboard. Flex status.",             cost: 3000, karmaPerHour: 35,  xpBonus: 25,  unlockLevel: 15, w: 1, color: "#ff8c00" },
  { id: "castle",   emoji: "🏰", name: "KARMA CASTLE",   desc: "Maximal prestige. Allt boostat.",               cost: 5000, karmaPerHour: 60,  xpBonus: 50,  unlockLevel: 20, w: 2, color: "#e040fb" },
];

const GRID_COLS = 4;
const GRID_ROWS = 4;

type PlacedBuilding = { buildingId: string; col: number; row: number };

const STORE_KEY = "karma_ville_v1";

function loadVille(): PlacedBuilding[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch { return []; }
}

function saveVille(placed: PlacedBuilding[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(placed)); } catch {}
}

function calcPassiveKarma(placed: PlacedBuilding[]): number {
  return placed.reduce((s, p) => {
    const b = BUILDINGS.find(b => b.id === p.buildingId);
    return s + (b?.karmaPerHour ?? 0);
  }, 0);
}

const VISITORS = [
  { name: "AlexK",  emoji: "😎", msg: "Love your café! ☕" },
  { name: "MiaS",   emoji: "🌸", msg: "Din arena är epic! 🏟️" },
  { name: "ZaraQ",  emoji: "💜", msg: "Building goals fr 🏰" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VillePage() {
  const { user, spendKarma, addKarma, addXP, showToast } = useApp();
  const [placed, setPlaced] = useState<PlacedBuilding[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    const p = loadVille();
    if (p.length === 0) {
      // Start with house in center
      const initial: PlacedBuilding[] = [{ buildingId: "house", col: 1, row: 1 }];
      setPlaced(initial);
      saveVille(initial);
    } else {
      setPlaced(p);
    }
  }, []);

  const passiveKarma = calcPassiveKarma(placed);
  const placedIds = new Set(placed.map(p => p.buildingId));
  const totalBuildings = placed.length;

  function getCellBuilding(col: number, row: number) {
    return placed.find(p => p.col === col && p.row === row);
  }

  function build(building: BuildingDef) {
    if (!selectedCell) return;
    if (placedIds.has(building.id)) {
      showToast("Redan byggt!", undefined, "#ff4444", "🚫");
      return;
    }
    const ok = building.cost === 0 || spendKarma(building.cost);
    if (!ok) {
      showToast(`Inte nog karma! Behöver ${building.cost} ⚡`, undefined, "#ff4444", "💸");
      return;
    }
    const next = [...placed, { buildingId: building.id, col: selectedCell.col, row: selectedCell.row }];
    setPlaced(next);
    saveVille(next);
    if (building.xpBonus) addXP(building.xpBonus * 5);
    showToast(`${building.emoji} ${building.name} byggd! +${building.karmaPerHour}/h`, undefined, building.color, building.emoji);
    setShopOpen(false);
    setSelectedCell(null);
  }

  function demolish(col: number, row: number) {
    const cell = getCellBuilding(col, row);
    if (!cell || cell.buildingId === "house") return;
    const next = placed.filter(p => !(p.col === col && p.row === row));
    setPlaced(next);
    saveVille(next);
    const b = BUILDINGS.find(b => b.id === cell.buildingId);
    const refund = Math.floor((b?.cost ?? 0) * 0.5);
    if (refund > 0) addKarma(refund, "Demolish refund");
    showToast(`Demolished! +${refund} ⚡ refund`, undefined, "#ff6b35", "🏗️");
    setSelectedCell(null);
  }

  function collectPassive() {
    if (collecting) return;
    setCollecting(true);
    const earned = Math.round(passiveKarma * 0.5);
    addKarma(earned, "Ville passive income");
    showToast(`Ville inkomst! +${earned} ⚡`, earned, "#c8ff00", "🏙️");
    setTimeout(() => setCollecting(false), 3000);
  }

  const userLevel = Math.max(1, Math.floor(user.xp / 500) + 1);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(10,10,10,0.96)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "14px 16px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/feed" style={{ color: "#888", fontSize: 22, textDecoration: "none" }}>←</Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.04em" }}>🏙️ KARMA VILLE</div>
          <div style={{ fontSize: 10, color: "#555" }}>Bygg din stad · Tjäna passiv karma</div>
        </div>
        <button
          onClick={() => setVisitorsOpen(true)}
          style={{
            background: "#111", border: "1.5px solid #333", borderRadius: 10,
            padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#aaa", cursor: "pointer",
          }}
        >
          👥 {VISITORS.length}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 10, padding: "14px 16px 0",
        overflowX: "auto", scrollbarWidth: "none",
      }}>
        {[
          { label: "BYGGNADER", value: `${totalBuildings}/${BUILDINGS.length}`, color: "#c8ff00", icon: "🏗️" },
          { label: "PASSIV /H", value: `${passiveKarma} ⚡`, color: "#ff6b35", icon: "⚡" },
          { label: "DIN NIVÅ", value: `LV ${userLevel}`, color: "#4488ff", icon: "⭐" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
            padding: "10px 14px", textAlign: "center", flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}

        {/* Collect button */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={collectPassive}
          animate={collecting ? { scale: [1, 1.05, 1] } : {}}
          style={{
            background: collecting ? "#1a2a00" : "linear-gradient(135deg, #c8ff00, #88ff00)",
            border: "none", borderRadius: 12, padding: "10px 16px",
            fontSize: 13, fontWeight: 900, color: collecting ? "#c8ff00" : "#0a0a0a",
            cursor: collecting ? "default" : "pointer", flexShrink: 0,
          }}
        >
          {collecting ? "✅ Samlat!" : "💰 SAMLA"}
        </motion.button>
      </div>

      {/* Town grid */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: 8,
          background: "linear-gradient(135deg, #060f06, #0a0a0a)",
          border: "2px solid #1a2a1a",
          borderRadius: 20,
          padding: 12,
        }}>
          {Array.from({ length: GRID_ROWS }).map((_, row) =>
            Array.from({ length: GRID_COLS }).map((_, col) => {
              const cell = getCellBuilding(col, row);
              const building = cell ? BUILDINGS.find(b => b.id === cell.buildingId) : null;
              const isSelected = selectedCell?.col === col && selectedCell?.row === row;

              return (
                <motion.button
                  key={`${col}-${row}`}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCell(null);
                    } else {
                      setSelectedCell({ col, row });
                      if (!building) setShopOpen(true);
                    }
                  }}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 14,
                    background: building
                      ? `${building.color}18`
                      : isSelected ? "#c8ff0011" : "#111",
                    border: building
                      ? `2px solid ${building.color}55`
                      : isSelected ? "2px dashed #c8ff0066" : "2px solid #1a1a1a",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: building ? `0 0 12px ${building.color}22` : "none",
                    position: "relative",
                    transition: "all 0.15s ease",
                  }}
                >
                  {building ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: Math.random() * 3 }}
                        style={{ fontSize: "1.6rem" }}
                      >
                        {building.emoji}
                      </motion.div>
                      <div style={{ fontSize: 7, color: building.color, fontWeight: 700, marginTop: 2, textAlign: "center", lineHeight: 1.2 }}>
                        {building.name.split(" ")[0].toUpperCase()}
                      </div>
                      {/* Passive income indicator */}
                      <div style={{
                        position: "absolute", top: 4, right: 4,
                        fontSize: 7, color: "#c8ff00", fontWeight: 700,
                        background: "#c8ff0022", borderRadius: 4, padding: "1px 3px",
                      }}>+{building.karmaPerHour}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: "1.4rem", opacity: 0.2 }}>＋</div>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{
                        position: "absolute", inset: -2, borderRadius: 16,
                        border: "2px solid #c8ff00", pointerEvents: "none",
                      }}
                    />
                  )}
                </motion.button>
              );
            })
          )}
        </div>

        {/* Selected cell actions */}
        <AnimatePresence>
          {selectedCell && getCellBuilding(selectedCell.col, selectedCell.row) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                marginTop: 12, background: "#111", border: "1px solid #222",
                borderRadius: 16, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              {(() => {
                const cell = getCellBuilding(selectedCell.col, selectedCell.row)!;
                const b = BUILDINGS.find(b => b.id === cell.buildingId)!;
                return (
                  <>
                    <span style={{ fontSize: "2rem" }}>{b.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: b.color }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{b.desc}</div>
                      <div style={{ fontSize: 11, color: "#c8ff00", fontWeight: 700, marginTop: 4 }}>+{b.karmaPerHour} karma/h</div>
                    </div>
                    {cell.buildingId !== "house" && (
                      <button
                        onClick={() => demolish(selectedCell.col, selectedCell.row)}
                        style={{
                          background: "#ff444422", border: "1px solid #ff444444",
                          borderRadius: 10, padding: "8px 12px",
                          fontSize: 11, fontWeight: 700, color: "#ff4444", cursor: "pointer",
                        }}
                      >🏗️ Rivs</button>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tip */}
      <div style={{ padding: "12px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#333" }}>
          Tryck på en tom ruta för att bygga · Passiv karma samlas varje timme
        </div>
      </div>

      {/* BUILD SHOP MODAL */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => { setShopOpen(false); setSelectedCell(null); }}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#111", border: "2px solid #222",
                borderRadius: "28px 28px 0 0", padding: "20px 16px 44px",
                width: "100%", maxWidth: 480,
                maxHeight: "75dvh", overflow: "auto",
              }}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 16px" }} />

              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
                🏗️ Bygg en struktur
              </div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>
                Välj en byggnad för din stad
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {BUILDINGS.map(b => {
                  const owned = placedIds.has(b.id);
                  const locked = userLevel < b.unlockLevel;
                  const canAfford = user.karma >= b.cost;
                  const disabled = owned || locked;

                  return (
                    <motion.button
                      key={b.id}
                      whileTap={disabled ? {} : { scale: 0.98 }}
                      onClick={() => !disabled && build(b)}
                      style={{
                        background: owned ? "#0a1a00" : locked ? "#0a0a0a" : "#111",
                        border: `1.5px solid ${owned ? "#c8ff0044" : locked ? "#1a1a1a" : b.color + "44"}`,
                        borderRadius: 16, padding: "14px 14px",
                        display: "flex", alignItems: "center", gap: 12,
                        cursor: disabled ? "default" : "pointer",
                        opacity: locked ? 0.4 : 1,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: "2rem", flexShrink: 0 }}>{b.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: owned ? "#c8ff00" : "#fff" }}>
                            {b.name}
                          </span>
                          {owned && <span style={{ fontSize: 9, color: "#c8ff00", fontWeight: 700 }}>✓ BYGGD</span>}
                          {locked && <span style={{ fontSize: 9, color: "#555", fontWeight: 700 }}>🔒 LV{b.unlockLevel}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{b.desc}</div>
                        <div style={{ fontSize: 11, color: b.color, fontWeight: 700, marginTop: 4 }}>
                          +{b.karmaPerHour} karma/h
                          {b.xpBonus > 0 && <span style={{ color: "#4488ff", marginLeft: 8 }}>+{b.xpBonus}% XP</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {b.cost === 0 ? (
                          <span style={{ fontSize: 11, color: "#c8ff00", fontWeight: 700 }}>GRATIS</span>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 800, color: canAfford ? "#c8ff00" : "#444" }}>
                            {b.cost} ⚡
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VISITORS MODAL */}
      <AnimatePresence>
        {visitorsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 20px",
            }}
            onClick={() => setVisitorsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#111", border: "2px solid #222",
                borderRadius: 24, padding: "24px 20px",
                width: "100%", maxWidth: 380,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 16 }}>
                👥 Besökare idag
              </div>
              {VISITORS.map((v, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0", borderBottom: i < VISITORS.length - 1 ? "1px solid #1a1a1a" : "none",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "#222", border: "2px solid #333",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem",
                  }}>{v.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{v.msg}</div>
                  </div>
                  <button style={{
                    background: "#1a1a1a", border: "1px solid #333",
                    borderRadius: 8, padding: "6px 10px",
                    fontSize: 11, color: "#888", cursor: "pointer",
                  }}>👋</button>
                </div>
              ))}
              <button
                onClick={() => setVisitorsOpen(false)}
                style={{
                  width: "100%", marginTop: 16, padding: "14px",
                  background: "#c8ff00", border: "none", borderRadius: 14,
                  fontSize: 14, fontWeight: 900, color: "#0a0a0a", cursor: "pointer",
                }}
              >STÄNG</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
