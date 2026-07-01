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

// ─── Isometric constants ──────────────────────────────────────────────────────

const TILE_W = 76;
const TILE_H = 38;
const TILE_DEPTH = 10; // ground thickness

// Building heights (in pixels above ground)
const BHEIGHTS: Record<string, number> = {
  house: 52, school: 70, gym: 48, cafe: 48, market: 60,
  lab: 68, stadium: 90, bank: 62, tower: 110, castle: 130,
};

// Tile top face colors (dark cyberpunk grid)
const TILE_COLORS = ["rgba(60,20,180,0.35)", "rgba(50,15,160,0.30)", "rgba(70,25,200,0.38)", "rgba(45,10,150,0.28)"];
const PATH_TILES = new Set(["1,1","2,1","1,2","2,2"]);

// Building top face colors — dark cyberpunk tinted
const BTOP: Record<string, string> = {
  house:   "#1a2e00", school:  "#001a3a", gym:     "#2a1200",
  cafe:    "#1a0a2e", market:  "#2e001a", lab:     "#002a2e",
  stadium: "#2e2800", bank:    "#002200", tower:   "#2a1800",
  castle:  "#1e0028",
};

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
  const W = canvas.width;
  const H = canvas.height;

  // Sky gradient — dark cyberpunk dusk/night
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,   "#0a0020");
  sky.addColorStop(0.4, "#1a0040");
  sky.addColorStop(0.7, "#0d1a2d");
  sky.addColorStop(1,   "#050a15");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Static stars (seeded by position)
  const starPositions = [
    [0.08, 0.06], [0.18, 0.14], [0.32, 0.04], [0.48, 0.10],
    [0.62, 0.07], [0.75, 0.15], [0.88, 0.03], [0.14, 0.22],
    [0.55, 0.18], [0.92, 0.20], [0.40, 0.25], [0.70, 0.28],
    [0.25, 0.30], [0.85, 0.12], [0.05, 0.32], [0.60, 0.35],
  ];
  starPositions.forEach(([sx, sy], i) => {
    const twinkle = Math.sin(frame * 0.06 + i * 1.3) * 0.4 + 0.6;
    ctx.save();
    ctx.globalAlpha = twinkle * 0.9;
    ctx.fillStyle = i % 3 === 0 ? "#c8ff00" : i % 3 === 1 ? "#00e5ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(sx * W, sy * H * 0.85, i % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Neon moon (full circle, glowing)
  const MX = W * 0.82, MY = 38;
  ctx.save();
  ctx.shadowColor = "#c8ff00";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(MX, MY, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#d4f060";
  ctx.fill();
  // Slightly darker inner circle for depth
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#8aaa00";
  ctx.beginPath();
  ctx.arc(MX + 6, MY - 4, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Moon glow ring
  ctx.save();
  ctx.globalAlpha = 0.18 + Math.sin(frame * 0.04) * 0.06;
  ctx.strokeStyle = "#c8ff00";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#c8ff00";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(MX, MY, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Distant city glow on horizon
  ctx.save();
  const cityGlow = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.55);
  cityGlow.addColorStop(0, "rgba(100,0,200,0)");
  cityGlow.addColorStop(0.5, "rgba(100,0,255,0.12)");
  cityGlow.addColorStop(1, "rgba(50,0,120,0.06)");
  ctx.fillStyle = cityGlow;
  ctx.fillRect(0, H * 0.42, W, H * 0.13);
  ctx.restore();

  // ── Isometric grid origin ────────────────────────────────────────────────
  const OX = W / 2;
  const OY = H * 0.30;

  function toScreen(col: number, row: number) {
    return {
      x: OX + (col - row) * TILE_W / 2,
      y: OY + (col + row) * TILE_H / 2,
    };
  }

  function drawDiamond(cx: number, cy: number, fill: string, strokeCol?: string, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + TILE_W / 2, cy + TILE_H / 2);
    ctx.lineTo(cx, cy + TILE_H);
    ctx.lineTo(cx - TILE_W / 2, cy + TILE_H / 2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw tiles — back to front
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const { x, y } = toScreen(col, row);
      const isPath = PATH_TILES.has(`${col},${row}`);
      const isSel = selected?.col === col && selected?.row === row;

      // Ground tile top
      const tileColor = isPath
        ? "rgba(180,255,0,0.12)"
        : TILE_COLORS[(col * 3 + row * 2) % TILE_COLORS.length];
      const tileStroke = isPath ? "rgba(200,255,0,0.35)" : "rgba(100,60,255,0.45)";
      drawDiamond(x, y, tileColor, tileStroke);

      // Tile thickness (left side)
      ctx.beginPath();
      ctx.moveTo(x - TILE_W / 2, y + TILE_H / 2);
      ctx.lineTo(x, y + TILE_H);
      ctx.lineTo(x, y + TILE_H + TILE_DEPTH);
      ctx.lineTo(x - TILE_W / 2, y + TILE_H / 2 + TILE_DEPTH);
      ctx.closePath();
      ctx.fillStyle = isPath ? "rgba(120,180,0,0.18)" : "rgba(30,10,100,0.55)";
      ctx.fill();
      ctx.strokeStyle = isPath ? "rgba(200,255,0,0.2)" : "rgba(80,40,200,0.3)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Tile thickness (right side)
      ctx.beginPath();
      ctx.moveTo(x + TILE_W / 2, y + TILE_H / 2);
      ctx.lineTo(x, y + TILE_H);
      ctx.lineTo(x, y + TILE_H + TILE_DEPTH);
      ctx.lineTo(x + TILE_W / 2, y + TILE_H / 2 + TILE_DEPTH);
      ctx.closePath();
      ctx.fillStyle = isPath ? "rgba(80,120,0,0.15)" : "rgba(20,5,80,0.55)";
      ctx.fill();
      ctx.strokeStyle = isPath ? "rgba(200,255,0,0.15)" : "rgba(60,20,180,0.25)";
      ctx.stroke();

      // Selection highlight pulse
      if (isSel) {
        const pulse = Math.sin(frame * 0.12) * 0.25 + 0.55;
        drawDiamond(x, y, `rgba(200,255,0,${pulse * 0.35})`, `rgba(200,255,0,${pulse})`);
      }

      // Empty cell indicator (glowing +)
      const hasBuilding = placed.some(p => p.col === col && p.row === row);
      if (!hasBuilding && !isSel) {
        const glowPulse = Math.sin(frame * 0.05 + col * 0.9 + row * 1.1) * 0.15 + 0.28;
        ctx.save();
        ctx.globalAlpha = glowPulse;
        ctx.strokeStyle = "#a060ff";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#8040ff";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(x, y + TILE_H / 2 - 9);
        ctx.lineTo(x, y + TILE_H / 2 + 9);
        ctx.moveTo(x - 9, y + TILE_H / 2);
        ctx.lineTo(x + 9, y + TILE_H / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Draw buildings — back to front ───────────────────────────────────────
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const pb = placed.find(p => p.col === col && p.row === row);
      if (!pb) continue;
      const bdef = BUILDINGS.find(b => b.id === pb.buildingId);
      if (!bdef) continue;

      const { x, y } = toScreen(col, row);
      const bh = BHEIGHTS[pb.buildingId] ?? 50;
      const topColor = BTOP[pb.buildingId] ?? "#f0e0d0";

      // Slight bob animation for buildings
      const bob = Math.sin(frame * 0.04 + col * 0.7 + row * 0.5) * 1.5;
      const by = y - bob;

      // Left shadow face — dark with color glow tint
      ctx.beginPath();
      ctx.moveTo(x - TILE_W / 2, by + TILE_H / 2);
      ctx.lineTo(x, by + TILE_H);
      ctx.lineTo(x, by + TILE_H - bh);
      ctx.lineTo(x - TILE_W / 2, by + TILE_H / 2 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(5,0,20,0.85)";
      ctx.fill();
      ctx.strokeStyle = `${bdef.color}55`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Right face — slightly lighter dark
      ctx.beginPath();
      ctx.moveTo(x + TILE_W / 2, by + TILE_H / 2);
      ctx.lineTo(x, by + TILE_H);
      ctx.lineTo(x, by + TILE_H - bh);
      ctx.lineTo(x + TILE_W / 2, by + TILE_H / 2 - bh);
      ctx.closePath();
      ctx.fillStyle = "rgba(15,5,40,0.75)";
      ctx.fill();
      ctx.strokeStyle = `${bdef.color}33`;
      ctx.stroke();

      // Top face with building color tint
      ctx.beginPath();
      ctx.moveTo(x, by - bh);
      ctx.lineTo(x + TILE_W / 2, by + TILE_H / 2 - bh);
      ctx.lineTo(x, by + TILE_H - bh);
      ctx.lineTo(x - TILE_W / 2, by + TILE_H / 2 - bh);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
      // Glowing outline on top face
      ctx.save();
      ctx.strokeStyle = bdef.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = bdef.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Roof highlight
      const rGrad = ctx.createLinearGradient(x, by - bh, x, by + TILE_H / 2 - bh);
      rGrad.addColorStop(0, "rgba(255,255,255,0.22)");
      rGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.moveTo(x, by - bh);
      ctx.lineTo(x + TILE_W / 2, by + TILE_H / 2 - bh);
      ctx.lineTo(x, by + TILE_H - bh);
      ctx.lineTo(x - TILE_W / 2, by + TILE_H / 2 - bh);
      ctx.closePath();
      ctx.fillStyle = rGrad;
      ctx.fill();

      // Emoji on top with glow shadow
      ctx.save();
      ctx.shadowColor = bdef.color;
      ctx.shadowBlur = 14;
      ctx.font = `${Math.min(TILE_W * 0.38, 28)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(bdef.emoji, x, by - bh + 6);
      ctx.restore();

      // Passive income sparkle — colored to match building
      if (frame % 80 < 40) {
        const sparkX = x + Math.sin(frame * 0.1 + col) * 12;
        const sparkY = by - bh - 12 - (frame % 80) * 0.4;
        ctx.save();
        ctx.globalAlpha = 1 - (frame % 80) / 60;
        ctx.shadowColor = bdef.color;
        ctx.shadowBlur = 8;
        ctx.font = "11px serif";
        ctx.textAlign = "center";
        ctx.fillText("⚡", sparkX, sparkY);
        ctx.restore();
      }
    }
  }

  // ── Pet sprite ────────────────────────────────────────────────────────────
  const { x: px, y: py } = toScreen(petPos.col, petPos.row);
  const petBob = Math.sin(frame * 0.08) * 3;
  ctx.font = "26px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(petEmoji, px, py + TILE_H / 2 - 2 - petBob);

  // Shadow under pet
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(px, py + TILE_H - 2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  // ── Decorative neon pylons around perimeter ───────────────────────────────
  const pylonColors = ["#c8ff00", "#00e5ff", "#a855f7", "#ff2d8d", "#ff6b35", "#4488ff"];
  const pylonSpots = [
    { x: OX - TILE_W * 2.8, y: OY + TILE_H * 1.5 },
    { x: OX + TILE_W * 2.2, y: OY + TILE_H * 1.2 },
    { x: OX - TILE_W * 1.2, y: OY - TILE_H * 0.3 },
    { x: OX + TILE_W * 0.8, y: OY - TILE_H * 0.5 },
    { x: OX - TILE_W * 0.3, y: OY + TILE_H * 4.2 },
    { x: OX + TILE_W * 3.1, y: OY + TILE_H * 3.0 },
  ];
  pylonSpots.forEach(({ x: tx, y: ty }, i) => {
    const col = pylonColors[i % pylonColors.length];
    const blink = Math.sin(frame * 0.08 + i * 1.7) * 0.4 + 0.6;
    // Pylon shaft
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(tx, ty + 20);
    ctx.lineTo(tx, ty - 22);
    ctx.stroke();
    // Top light
    ctx.globalAlpha = blink;
    ctx.beginPath();
    ctx.arc(tx, ty - 22, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
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
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
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

  // Convert canvas click to isometric tile
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const W = rect.width;
    const H = rect.height;
    const OX = W / 2;
    const OY = H * 0.30;

    // Inverse isometric projection
    const dx = (mx - OX) / (TILE_W / 2);
    const dy = (my - OY) / (TILE_H / 2);
    const col = Math.floor((dx + dy) / 2);
    const row = Math.floor((dy - dx) / 2);

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
