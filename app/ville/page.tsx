"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

// ─── Building definitions ─────────────────────────────────────────────────────

type BuildingDef = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  cost: number;
  karmaPerHour: number;
  xpBonus: number;
  unlockLevel: number;
  w: number;
  color: string;
};

const BUILDINGS: BuildingDef[] = [
  { id: "house",   emoji: "🏠", name: "Karma Huset",  desc: "Din bas. Ger basic karma varje timme.",          cost: 0,    karmaPerHour: 2,   xpBonus: 0,   unlockLevel: 1,  w: 1, color: "#c8ff00" },
  { id: "school",  emoji: "🏫", name: "XP Skolan",    desc: "+20% XP på alla aktiviteter.",                   cost: 200,  karmaPerHour: 5,   xpBonus: 20,  unlockLevel: 2,  w: 2, color: "#4488ff" },
  { id: "gym",     emoji: "🏋️", name: "Karma Gym",    desc: "Stärker ditt husdjur dagligen.",                 cost: 350,  karmaPerHour: 8,   xpBonus: 0,   unlockLevel: 3,  w: 1, color: "#ff6b35" },
  { id: "cafe",    emoji: "☕", name: "Social Café",   desc: "Vänner kan besöka dig. +karma vid besök.",       cost: 500,  karmaPerHour: 10,  xpBonus: 5,   unlockLevel: 4,  w: 1, color: "#8b5cf6" },
  { id: "market",  emoji: "🏪", name: "Karma Market",  desc: "Sälj items till vänner. Passiv inkomst.",        cost: 750,  karmaPerHour: 15,  xpBonus: 0,   unlockLevel: 5,  w: 2, color: "#ff2d8d" },
  { id: "lab",     emoji: "🔬", name: "DNA Lab",       desc: "Boostar DNA Breaker score med 2x.",              cost: 1000, karmaPerHour: 12,  xpBonus: 10,  unlockLevel: 7,  w: 1, color: "#00e5ff" },
  { id: "stadium", emoji: "🏟️", name: "Battle Arena",  desc: "Host Pet Battles. Vinn turnering karma.",        cost: 1500, karmaPerHour: 20,  xpBonus: 15,  unlockLevel: 10, w: 2, color: "#ffde00" },
  { id: "bank",    emoji: "🏦", name: "Karma Bank",    desc: "Biljetter till KARMA POTTEN ×2.",                cost: 2000, karmaPerHour: 25,  xpBonus: 0,   unlockLevel: 12, w: 1, color: "#c8ff00" },
  { id: "tower",   emoji: "🗼", name: "Legend Tower",  desc: "Syns på leaderboard. Flex status.",              cost: 3000, karmaPerHour: 35,  xpBonus: 25,  unlockLevel: 15, w: 1, color: "#ff8c00" },
  { id: "castle",  emoji: "🏰", name: "KARMA CASTLE",  desc: "Maximal prestige. Allt boostat.",                cost: 5000, karmaPerHour: 60,  xpBonus: 50,  unlockLevel: 20, w: 2, color: "#e040fb" },
];

const GRID_COLS = 4;
const GRID_ROWS = 4;

type PlacedBuilding = { buildingId: string; col: number; row: number };
const STORE_KEY = "karma_ville_v1";

function loadVille(): PlacedBuilding[] {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]"); } catch { return []; }
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

// ─── Grid constants ────────────────────────────────────────────────────────────

const TILE_W = 76; // kept for legacy compat
const TILE_H = 38;
const TILE_DEPTH = 10;
const BHEIGHTS: Record<string, number> = { house: 52, school: 70, gym: 48, cafe: 48, market: 60, lab: 68, stadium: 90, bank: 62, tower: 110, castle: 130 };
const TILE_COLORS = ["rgba(60,20,180,0.35)", "rgba(50,15,160,0.30)", "rgba(70,25,200,0.38)", "rgba(45,10,150,0.28)"];
const PATH_TILES = new Set(["1,1","2,1","1,2","2,2"]);
const BTOP: Record<string, string> = { house:"#1a2e00", school:"#001a3a", gym:"#2a1200", cafe:"#1a0a2e", market:"#2e001a", lab:"#002a2e", stadium:"#2e2800", bank:"#002200", tower:"#2a1800", castle:"#1e0028" };

const VISITORS = [
  { name: "AlexK",  emoji: "😎", msg: "Love your café! ☕" },
  { name: "MiaS",   emoji: "🌸", msg: "Din arena är epic! 🏟️" },
  { name: "ZaraQ",  emoji: "💜", msg: "Building goals fr 🏰" },
];

// ─── Canvas render ────────────────────────────────────────────────────────────

function renderWorld(
  canvas: HTMLCanvasElement,
  placed: PlacedBuilding[],
  selected: { col: number; row: number } | null,
  frame: number,
  petEmoji: string,
  petPos: { col: number; row: number },
) {
  const ctxMaybe = canvas.getContext("2d");
  if (!ctxMaybe) return;
  const ctx: CanvasRenderingContext2D = ctxMaybe;
  // Use CSS dimensions so coordinates match regardless of devicePixelRatio
  const W = canvas.offsetWidth || canvas.width;
  const H = canvas.offsetHeight || canvas.height;

  // ── Background ─────────────────────────────────────────────────────────────
  ctx.fillStyle = "#030310";
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow in center
  const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  rg.addColorStop(0, "rgba(80,20,200,0.12)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  // ── Top-down tile grid ──────────────────────────────────────────────────────
  const PAD = 12;
  const GAP = 6;
  const cols = GRID_COLS;
  const rows = GRID_ROWS;
  const tileW = (W - PAD * 2 - GAP * (cols - 1)) / cols;
  const tileH = Math.min(tileW * 0.85, (H - PAD * 2 - GAP * (rows - 1)) / rows);
  const gridH = rows * tileH + (rows - 1) * GAP;
  const startY = (H - gridH) / 2;

  function tileRect(col: number, row: number) {
    return {
      x: PAD + col * (tileW + GAP),
      y: startY + row * (tileH + GAP),
      w: tileW,
      h: tileH,
    };
  }

  // Roads between occupied tiles
  const occupiedCells = placed.map(p => ({ col: p.col, row: p.row, id: p.buildingId }));
  for (let i = 0; i < occupiedCells.length; i++) {
    for (let j = i + 1; j < occupiedCells.length; j++) {
      const a = occupiedCells[i];
      const b = occupiedCells[j];
      if (Math.abs(a.col - b.col) + Math.abs(a.row - b.row) <= 2) {
        const ra = tileRect(a.col, a.row);
        const rb = tileRect(b.col, b.row);
        const bdefA = BUILDINGS.find(bd => bd.id === a.id);
        const bdefB = BUILDINGS.find(bd => bd.id === b.id);
        const color = bdefA?.color ?? bdefB?.color ?? "#4444ff";
        ctx.save();
        ctx.strokeStyle = color + "44";
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(ra.x + ra.w / 2, ra.y + ra.h / 2);
        ctx.lineTo(rb.x + rb.w / 2, rb.y + rb.h / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Draw each tile
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { x, y, w, h } = tileRect(col, row);
      const pb = placed.find(p => p.col === col && p.row === row);
      const bdef = pb ? BUILDINGS.find(b => b.id === pb.buildingId) : null;
      const isSel = selected?.col === col && selected?.row === row;
      const pulse = Math.sin(frame * 0.06 + col * 0.8 + row * 1.1) * 0.5 + 0.5;
      const r = 10; // corner radius

      // Tile background
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      if (bdef) {
        ctx.fillStyle = bdef.color + "1a";
      } else {
        ctx.fillStyle = "#0d0d22";
      }
      ctx.fill();

      // Border
      if (bdef) {
        ctx.strokeStyle = bdef.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = bdef.color;
        ctx.shadowBlur = isSel ? 20 : 10 * pulse;
      } else if (isSel) {
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#c8ff00";
        ctx.shadowBlur = 16 * pulse;
      } else {
        ctx.strokeStyle = "#2a2a60";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        ctx.shadowBlur = 0;
        // dashed border for empty
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = (frame * 0.3) % 8;
      }
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (bdef) {
        // Emoji large centered
        const bob = Math.sin(frame * 0.05 + col * 0.7 + row * 0.9) * 2;
        ctx.font = `${Math.min(tileW * 0.45, 36)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = bdef.color;
        ctx.shadowBlur = 14;
        ctx.fillText(bdef.emoji, x + w / 2, y + h / 2 - 10 - bob);
        ctx.shadowBlur = 0;
        // Name below emoji
        ctx.font = `bold ${Math.min(tileW * 0.12, 10)}px sans-serif`;
        ctx.fillStyle = bdef.color;
        ctx.shadowColor = bdef.color;
        ctx.shadowBlur = 4;
        ctx.fillText(bdef.name.toUpperCase(), x + w / 2, y + h - 10);
        ctx.shadowBlur = 0;
        // Passive income sparkle
        if (Math.floor(frame / 50) % 2 === (col + row) % 2) {
          const sparkFrac = (frame % 50) / 50;
          ctx.globalAlpha = 1 - sparkFrac;
          ctx.font = "12px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = bdef.color;
          ctx.shadowBlur = 6;
          ctx.fillText("⚡", x + w / 2 + Math.sin(frame * 0.12) * 8, y + h / 2 - 20 - sparkFrac * 20);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      } else {
        // Empty: faint + icon
        ctx.save();
        ctx.globalAlpha = 0.2 + 0.15 * pulse;
        ctx.strokeStyle = "#5555aa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h / 2 - 8);
        ctx.lineTo(x + w / 2, y + h / 2 + 8);
        ctx.moveTo(x + w / 2 - 8, y + h / 2);
        ctx.lineTo(x + w / 2 + 8, y + h / 2);
        ctx.stroke();
        ctx.restore();
      }

      // Selection ring
      if (isSel && !bdef) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.4 * pulse;
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#c8ff00";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Pet sprite ─────────────────────────────────────────────────────────────
  const pr = tileRect(petPos.col, petPos.row);
  const petBob = Math.sin(frame * 0.09) * 3;
  ctx.font = "22px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#c8ff00";
  ctx.shadowBlur = 10;
  ctx.fillText(petEmoji, pr.x + pr.w / 2 + 8, pr.y + pr.h / 2 - petBob);
  ctx.shadowBlur = 0;

  // ── Corner neon accents ─────────────────────────────────────────────────────
  [
    { x: 0, y: 0 }, { x: W, y: 0 }, { x: 0, y: H }, { x: W, y: H }
  ].forEach(({ x, y }, i) => {
    const color = ["#c8ff00","#00e5ff","#a855f7","#ff2d8d"][i];
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.5 + Math.sin(frame * 0.04 + i) * 0.3;
    const s = 16, dx = x === 0 ? 1 : -1, dy = y === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * s);
    ctx.stroke();
    ctx.restore();
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VillePage() {
  const { user, spendKarma, addKarma, addXP, showToast, pet } = useApp();
  const [placed, setPlaced] = useState<PlacedBuilding[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const placedRef = useRef<PlacedBuilding[]>([]);
  const selectedRef = useRef<{ col: number; row: number } | null>(null);

  // Pet wanders
  const [petPos, setPetPos] = useState({ col: 1, row: 1 });
  const petPosRef = useRef({ col: 1, row: 1 });

  useEffect(() => {
    const p = loadVille();
    if (p.length === 0) {
      const initial: PlacedBuilding[] = [{ buildingId: "house", col: 1, row: 1 }];
      setPlaced(initial);
      placedRef.current = initial;
      saveVille(initial);
    } else {
      setPlaced(p);
      placedRef.current = p;
    }
  }, []);

  // Pet wander
  useEffect(() => {
    const id = setInterval(() => {
      const col = Math.floor(Math.random() * GRID_COLS);
      const row = Math.floor(Math.random() * GRID_ROWS);
      petPosRef.current = { col, row };
      setPetPos({ col, row });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || 360;
      canvas.height = canvas.offsetHeight || 320;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      frameRef.current++;
      const petEmoji = pet.skinId?.startsWith("emoji:") ? pet.skinId.slice(6) : "🦊";
      renderWorld(
        canvas,
        placedRef.current,
        selectedRef.current,
        frameRef.current,
        petEmoji,
        petPosRef.current,
      );
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [pet.skinId]);

  // Keep refs in sync with state
  useEffect(() => { placedRef.current = placed; }, [placed]);
  useEffect(() => { selectedRef.current = selectedCell; }, [selectedCell]);

  // Convert canvas click to top-down tile
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const W = rect.width;
    const H = rect.height;
    const PAD = 12, GAP = 6;
    const cols = GRID_COLS, rows = GRID_ROWS;
    const tileW = (W - PAD * 2 - GAP * (cols - 1)) / cols;
    const tileH = Math.min(tileW * 0.85, (H - PAD * 2 - GAP * (rows - 1)) / rows);
    const gridH = rows * tileH + (rows - 1) * GAP;
    const startY = (H - gridH) / 2;

    const col = Math.floor((mx - PAD) / (tileW + GAP));
    const row = Math.floor((my - startY) / (tileH + GAP));

    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      setSelectedCell(null);
      return;
    }

    const isSame = selectedCell?.col === col && selectedCell?.row === row;
    if (isSame) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell({ col, row });
    const hasBuilding = placedRef.current.some(p => p.col === col && p.row === row);
    if (!hasBuilding) setShopOpen(true);
  }, [selectedCell]);

  const passiveKarma = calcPassiveKarma(placed);
  const placedIds = new Set(placed.map(p => p.buildingId));
  const userLevel = Math.max(1, Math.floor(user.xp / 500) + 1);

  function build(building: BuildingDef) {
    if (!selectedCell) return;
    if (placedIds.has(building.id)) { showToast("Redan byggt!", undefined, "#ff4444", "🚫"); return; }
    const ok = building.cost === 0 || spendKarma(building.cost);
    if (!ok) { showToast(`Behöver ${building.cost} ⚡`, undefined, "#ff4444", "💸"); return; }
    const next = [...placed, { buildingId: building.id, col: selectedCell.col, row: selectedCell.row }];
    setPlaced(next);
    placedRef.current = next;
    saveVille(next);
    if (building.xpBonus) addXP(building.xpBonus * 5);
    showToast(`${building.emoji} ${building.name} byggd! +${building.karmaPerHour}/h`, undefined, building.color, building.emoji);
    setShopOpen(false);
    setSelectedCell(null);
  }

  function demolish(col: number, row: number) {
    const cell = placed.find(p => p.col === col && p.row === row);
    if (!cell || cell.buildingId === "house") return;
    const next = placed.filter(p => !(p.col === col && p.row === row));
    setPlaced(next);
    placedRef.current = next;
    saveVille(next);
    const b = BUILDINGS.find(b => b.id === cell.buildingId);
    const refund = Math.floor((b?.cost ?? 0) * 0.5);
    if (refund > 0) addKarma(refund, "Demolish refund");
    showToast(`Rivet! +${refund} ⚡ refund`, undefined, "#ff6b35", "🏗️");
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

  const selBuilding = selectedCell
    ? placed.find(p => p.col === selectedCell.col && p.row === selectedCell.row)
    : null;
  const selBuildingDef = selBuilding ? BUILDINGS.find(b => b.id === selBuilding.buildingId) : null;

  return (
    <div style={{ background: "linear-gradient(180deg, #0a0020 0%, #050a15 100%)", minHeight: "100dvh", color: "#e0e0e0", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(5,5,5,0.97)", backdropFilter: "blur(12px)",
        borderBottom: "2px solid #c8ff0033",
        padding: "12px 16px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 24px #c8ff0011",
      }}>
        <Link href="/feed" style={{ color: "#c8ff00", fontSize: 22, textDecoration: "none" }}>←</Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.02em" }}>
            <span style={{ background: "linear-gradient(135deg, #c8ff00, #00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>🌆 KARMA CITY</span>
          </div>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.06em" }}>TRYCK PÅ RUTAN FÖR ATT BYGGA</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link
            href="/map"
            style={{
              background: "#0d0d0d", border: "2px solid #1a1a1a",
              borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 700,
              color: "#c8ff00", textDecoration: "none", display: "inline-block",
              boxShadow: "2px 2px 0px #c8ff00",
            }}
          >
            🗺️ Karta
          </Link>
          <button
            onClick={() => setVisitorsOpen(true)}
            style={{
              background: "#0d0d0d", border: "2px solid #1a1a1a",
              borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 700,
              color: "#00e5ff", cursor: "pointer",
              boxShadow: "2px 2px 0px #00e5ff",
            }}
          >
            👥 {VISITORS.length}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
        {[
          { label: "BYGGNADER",  value: `${placed.length}/${BUILDINGS.length}`, color: "#c8ff00", icon: "🏗️" },
          { label: "PASSIV /H",  value: `${passiveKarma} ⚡`,                   color: "#00e5ff", icon: "⚡" },
          { label: "DIN NIVÅ",   value: `LV ${userLevel}`,                       color: "#a855f7", icon: "⭐" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#0d0d0d", border: "2px solid #1a1a1a",
            borderRadius: 14, padding: "9px 14px",
            textAlign: "center", flexShrink: 0, flex: 1,
            boxShadow: `0 0 12px ${s.color}11`,
          }}>
            <div style={{ fontSize: 9, color: "#444", marginBottom: 2, fontWeight: 700, letterSpacing: "0.06em" }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: s.color, textShadow: `0 0 8px ${s.color}88` }}>{s.value}</div>
          </div>
        ))}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={collectPassive}
          animate={collecting ? {} : { boxShadow: ["0 0 0 #c8ff0033", "0 0 18px #c8ff0077", "0 0 0 #c8ff0033"] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background: collecting ? "#111" : "linear-gradient(135deg, #c8ff00, #a0e000)",
            border: `3px solid ${collecting ? "#222" : "#0a0a0a"}`,
            borderRadius: 14, padding: "9px 16px",
            fontSize: 12, fontWeight: 900, color: collecting ? "#555" : "#000",
            cursor: collecting ? "default" : "pointer", flexShrink: 0,
          }}
        >
          {collecting ? "✅ Samlat!" : "💰 SAMLA"}
        </motion.button>
      </div>

      {/* Live map link — your city lives on the world map */}
      <Link href="/map" style={{ textDecoration: "none", display: "block", margin: "10px 16px 0" }}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: ["0 0 10px #00e5ff22", "0 0 22px #00e5ff44", "0 0 10px #00e5ff22"] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{
            background: "linear-gradient(135deg, #001318, #00080d)",
            border: "1.5px solid #00e5ff44", borderRadius: 14,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>🌍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#00e5ff", letterSpacing: "0.05em" }}>DIN STAD SYNS PÅ LIVE-KARTAN</div>
            <div style={{ fontSize: 10, color: "#557" }}>Varje byggnad ger +9% kontroll över KARMA CITY · ta över alla 5 områden</div>
          </div>
          <span style={{ fontSize: 12, color: "#00e5ff" }}>→</span>
        </motion.div>
      </Link>

      {/* The isometric world canvas */}
      <div style={{ margin: "12px 12px 0", borderRadius: 20, overflow: "hidden", position: "relative", boxShadow: "0 0 40px #c8ff0022, 0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 1.5px #c8ff0033" }}>
        {/* React-layer animated stars (above canvas via z-index) */}
        {[...Array(20)].map((_, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.15 }}
            style={{
              position: "absolute",
              width: 2, height: 2, borderRadius: "50%",
              background: i % 3 === 0 ? "#c8ff00" : i % 3 === 1 ? "#00e5ff" : "#fff",
              top: `${5 + (i * 17) % 50}%`,
              left: `${(i * 23) % 90}%`,
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        ))}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: "100%", height: 340, display: "block", cursor: "pointer", position: "relative", zIndex: 1 }}
        />
      </div>

      {/* Selected cell info panel */}
      <AnimatePresence>
        {selectedCell && selBuildingDef && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              margin: "10px 16px 0",
              background: "#0d0d0d", border: `2px solid ${selBuildingDef.color}44`,
              borderRadius: 18, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: `0 0 20px ${selBuildingDef.color}11`,
            }}
          >
            <span style={{ fontSize: "2rem", filter: `drop-shadow(0 0 8px ${selBuildingDef.color})` }}>{selBuildingDef.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: selBuildingDef.color }}>{selBuildingDef.name}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{selBuildingDef.desc}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#c8ff00", marginTop: 4 }}>+{selBuildingDef.karmaPerHour} karma/h</div>
            </div>
            {selBuilding?.buildingId !== "house" && (
              <button
                onClick={() => demolish(selectedCell.col, selectedCell.row)}
                style={{
                  background: "#1a0000", border: "1.5px solid #ff444455",
                  borderRadius: 10, padding: "8px 12px",
                  fontSize: 11, fontWeight: 700, color: "#ff4444", cursor: "pointer",
                }}
              >🏗️ Rivs</button>
            )}
          </motion.div>
        )}
        {selectedCell && !selBuildingDef && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              margin: "10px 16px 0",
              background: "#0d0d0d", border: "2px solid #c8ff0033",
              borderRadius: 18, padding: "14px 16px",
              textAlign: "center",
              boxShadow: "0 0 20px #c8ff0011",
            }}
          >
            <div style={{ fontSize: 13, color: "#555" }}>Tom ruta · Placera en byggnad här</div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShopOpen(true)}
              style={{
                marginTop: 10, padding: "10px 28px",
                background: "linear-gradient(135deg, #c8ff00, #a0e000)",
                border: "3px solid #0a0a0a", borderRadius: 12,
                fontSize: 13, fontWeight: 900, color: "#000",
                cursor: "pointer", boxShadow: "3px 3px 0px #0a0a0a",
              }}
            >🏗️ BYGG HÄR</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      <div style={{ padding: "10px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#444", fontWeight: 600, letterSpacing: "0.04em" }}>
          Tryck på en ruta i staden · {pet.name} vandrar runt
        </div>
      </div>

      {/* ── BUILD SHOP MODAL ── */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => { setShopOpen(false); setSelectedCell(null); }}
          >
            <motion.div
              initial={{ y: 400, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#080808", borderRadius: "28px 28px 0 0",
                borderTop: "2px solid #c8ff0044",
                padding: "20px 16px 44px",
                width: "100%", maxWidth: 480,
                maxHeight: "76dvh", overflow: "auto",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.7), 0 0 60px #c8ff0011",
              }}
            >
              <div style={{ width: 36, height: 4, background: "#c8ff0033", borderRadius: 2, margin: "0 auto 18px" }} />
              <div style={{ fontSize: 17, fontWeight: 900, color: "#c8ff00", marginBottom: 4 }}>🏗️ Bygg en struktur</div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 16, letterSpacing: "0.04em" }}>Välj vad du vill placera i din stad</div>

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
                        background: owned ? `${b.color}0d` : locked ? "#0a0a0a" : "#0d0d0d",
                        border: `2px solid ${owned ? b.color + "55" : locked ? "#1a1a1a" : b.color + "44"}`,
                        borderRadius: 16, padding: "14px",
                        display: "flex", alignItems: "center", gap: 12,
                        cursor: disabled ? "default" : "pointer",
                        opacity: locked ? 0.4 : 1,
                        textAlign: "left",
                        boxShadow: owned ? `0 0 12px ${b.color}22` : "none",
                      }}
                    >
                      <div style={{ fontSize: "2rem", flexShrink: 0, filter: owned ? `drop-shadow(0 0 6px ${b.color})` : "none" }}>{b.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: owned ? b.color : "#e0e0e0" }}>
                            {b.name}
                          </span>
                          {owned && <span style={{ fontSize: 9, color: b.color, fontWeight: 700 }}>✓ BYGGD</span>}
                          {locked && <span style={{ fontSize: 9, color: "#444", fontWeight: 700 }}>🔒 LV{b.unlockLevel}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{b.desc}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: b.color, marginTop: 4 }}>
                          +{b.karmaPerHour} karma/h
                          {b.xpBonus > 0 && <span style={{ color: "#4488ff", marginLeft: 8 }}>+{b.xpBonus}% XP</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {b.cost === 0 ? (
                          <span style={{ fontSize: 11, color: "#c8ff00", fontWeight: 800 }}>GRATIS</span>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 800, color: canAfford ? "#c8ff00" : "#333" }}>
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

      {/* ── VISITORS MODAL ── */}
      <AnimatePresence>
        {visitorsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px",
            }}
            onClick={() => setVisitorsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "#080808", border: "2px solid #1a1a1a", borderRadius: 24, padding: "24px 20px", width: "100%", maxWidth: 380, boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 40px #00e5ff11" }}
            >
              <div style={{ fontSize: 17, fontWeight: 900, color: "#00e5ff", marginBottom: 16 }}>👥 Besökare idag</div>
              {VISITORS.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < VISITORS.length - 1 ? "1px solid #111" : "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0d0d0d", border: "2px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>{v.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0" }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{v.msg}</div>
                  </div>
                  <button style={{ background: "#0d0d0d", border: "1.5px solid #1a1a1a", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#888", cursor: "pointer" }}>👋</button>
                </div>
              ))}
              <button onClick={() => setVisitorsOpen(false)} style={{ width: "100%", marginTop: 16, padding: "14px", background: "linear-gradient(135deg, #c8ff00, #a0e000)", border: "3px solid #0a0a0a", borderRadius: 14, fontSize: 14, fontWeight: 900, color: "#000", cursor: "pointer" }}>STÄNG</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
