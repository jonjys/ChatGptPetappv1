"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getPetEmoji, getPetClassColor, getEvolutionByLevel } from "@/lib/pet-evolution";

// ─── Zone definitions ─────────────────────────────────────────────────────────
interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  icon: string;
  href: string;
  desc: string;
  buildings: string[];
}

const ZONES: Zone[] = [
  {
    id: "city",
    name: "KARMA CITY",
    x: 0.35, y: 0.33, w: 0.30, h: 0.32,
    color: "#a855f7",
    icon: "🏙️",
    href: "/ville",
    desc: "Your home base. Build, grow, earn.",
    buildings: ["🏛️", "🏪", "🏗️", "🏦"],
  },
  {
    id: "bounty",
    name: "BOUNTY DISTRICT",
    x: 0.04, y: 0.06, w: 0.27, h: 0.24,
    color: "#ffcc00",
    icon: "🎯",
    href: "/map",
    desc: "Complete bounties. Earn big rewards.",
    buildings: ["📋", "🗺️", "🏆"],
  },
  {
    id: "arena",
    name: "ARENA ZONE",
    x: 0.69, y: 0.06, w: 0.27, h: 0.24,
    color: "#ff4444",
    icon: "⚔️",
    href: "/games/battle",
    desc: "Fight. Win. Dominate the leaderboard.",
    buildings: ["🏟️", "⚔️", "🛡️"],
  },
  {
    id: "park",
    name: "PET PARK",
    x: 0.04, y: 0.68, w: 0.27, h: 0.24,
    color: "#00ff88",
    icon: "🌿",
    href: "/pet",
    desc: "Train and evolve your pet.",
    buildings: ["🌳", "🎾", "🐾"],
  },
  {
    id: "market",
    name: "SHADOW MARKET",
    x: 0.69, y: 0.68, w: 0.27, h: 0.24,
    color: "#ff2d8d",
    icon: "💎",
    href: "/shop",
    desc: "Trade rare items. Mysterious deals.",
    buildings: ["💰", "🏪", "🔮"],
  },
];

// ─── Live players ─────────────────────────────────────────────────────────────
interface LivePlayer {
  name: string;
  emoji: string;
  x: number;
  y: number;
  color: string;
  pulseOffset: number;
}

const LIVE_PLAYERS: LivePlayer[] = [
  { name: "dragon99",    emoji: "🐉", x: 0.20, y: 0.22, color: "#ff4444", pulseOffset: 0 },
  { name: "lunavibes",   emoji: "🌙", x: 0.74, y: 0.40, color: "#ff2d8d", pulseOffset: 60 },
  { name: "tradeknight", emoji: "⚔️", x: 0.57, y: 0.72, color: "#ffcc00", pulseOffset: 120 },
  { name: "neonmiku",    emoji: "✨", x: 0.14, y: 0.60, color: "#00e5ff", pulseOffset: 40 },
  { name: "pixelrush",   emoji: "🎮", x: 0.82, y: 0.80, color: "#a855f7", pulseOffset: 90 },
];

// ─── Live feed ────────────────────────────────────────────────────────────────
const LIVE_FEED = [
  { emoji: "⚔️", text: "dragon99 won a battle in ARENA ZONE", time: "2s ago", color: "#ff4444" },
  { emoji: "💰", text: "tradeknight sold 3 items in SHADOW MARKET", time: "18s ago", color: "#ff2d8d" },
  { emoji: "🌿", text: "neonmiku leveled up their pet!", time: "1m ago", color: "#00ff88" },
  { emoji: "🎯", text: "pixelrush claimed a LEGENDARY bounty", time: "2m ago", color: "#ffcc00" },
  { emoji: "🏆", text: "lunavibes hit rank #1 on the board", time: "5m ago", color: "#a855f7" },
];

// ─── Canvas helper ─────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MapPage() {
  const { pet, user } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const starsRef = useRef<{ x: number; y: number; r: number; bright: number }[]>([]);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [currentZone, setCurrentZone] = useState("KARMA CITY");
  const [onlineCount] = useState(247);

  // Derive pet display info
  const evolution = getEvolutionByLevel(pet.level);
  const petEmoji = getPetEmoji(evolution, pet.class);
  const classColor = getPetClassColor(pet.class);

  // Canvas size
  const canvasHeight = typeof window !== "undefined" ? window.innerHeight - 70 : 700;

  // Init stars once
  useEffect(() => {
    const W = window.innerWidth;
    const H = canvasHeight;
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      bright: Math.random(),
    }));
  }, [canvasHeight]);

  // ─── Canvas draw loop ────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const frame = frameRef.current;

    // ── 1. Background ──────────────────────────────────────────────────────
    ctx.fillStyle = "#020208";
    ctx.fillRect(0, 0, W, H);

    // ── 2. Stars ──────────────────────────────────────────────────────────
    starsRef.current.forEach((s) => {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.008 + s.bright * 6.28));
      ctx.fillStyle = `rgba(180,180,255,${twinkle * 0.5})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── 3. Grid ────────────────────────────────────────────────────────────
    const gridSize = 60;
    for (let x = 0; x < W; x += gridSize) {
      const alpha = 0.05 + Math.sin(x / 100 + frame * 0.009) * 0.02;
      ctx.strokeStyle = `rgba(0,229,255,${Math.max(0.03, alpha)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      const alpha = 0.05 + Math.sin(y / 100 + frame * 0.007) * 0.02;
      ctx.strokeStyle = `rgba(0,229,255,${Math.max(0.03, alpha)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Intersection dots
    for (let x = 0; x < W; x += gridSize) {
      for (let y = 0; y < H; y += gridSize) {
        const pulse = 0.08 + Math.sin(frame * 0.015 + x * 0.05 + y * 0.03) * 0.05;
        ctx.fillStyle = `rgba(0,229,255,${pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── 4. Roads between zones ─────────────────────────────────────────────
    const cityZone = ZONES[0];
    const cityCX = (cityZone.x + cityZone.w / 2) * W;
    const cityCY = (cityZone.y + cityZone.h / 2) * H;

    ZONES.slice(1).forEach((zone) => {
      const zCX = (zone.x + zone.w / 2) * W;
      const zCY = (zone.y + zone.h / 2) * H;
      const grad = ctx.createLinearGradient(zCX, zCY, cityCX, cityCY);
      grad.addColorStop(0, zone.color + "55");
      grad.addColorStop(1, cityZone.color + "55");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -frame * 0.4;
      ctx.beginPath();
      ctx.moveTo(zCX, zCY);
      ctx.lineTo(cityCX, cityCY);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── 5. Zone fills ──────────────────────────────────────────────────────
    ZONES.forEach((zone) => {
      const zx = zone.x * W, zy = zone.y * H;
      const zw = zone.w * W, zh = zone.h * H;

      // Fill
      ctx.fillStyle = zone.color + "18";
      roundRect(ctx, zx, zy, zw, zh, 16);
      ctx.fill();

      // Animated glow border
      const glowPulse = Math.sin(frame * 0.04 + ZONES.indexOf(zone)) * 5;
      ctx.save();
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = zone.color;
      ctx.shadowBlur = 14 + glowPulse;
      roundRect(ctx, zx, zy, zw, zh, 16);
      ctx.stroke();
      ctx.restore();

      // Inner glow edge
      ctx.save();
      ctx.strokeStyle = zone.color + "44";
      ctx.lineWidth = 6;
      ctx.shadowColor = zone.color;
      ctx.shadowBlur = 20;
      roundRect(ctx, zx + 3, zy + 3, zw - 6, zh - 6, 14);
      ctx.stroke();
      ctx.restore();

      // Zone name
      ctx.font = "bold 10px 'Courier New', monospace";
      ctx.fillStyle = zone.color;
      ctx.textAlign = "center";
      ctx.shadowColor = zone.color;
      ctx.shadowBlur = 8;
      ctx.fillText(zone.name, zx + zw / 2, zy + 18);
      ctx.shadowBlur = 0;

      // Icon
      ctx.font = "22px serif";
      ctx.textBaseline = "middle";
      ctx.fillText(zone.icon, zx + zw / 2, zy + zh / 2 - 8);
      ctx.textBaseline = "alphabetic";

      // Buildings
      zone.buildings.forEach((b, bi) => {
        const bx = zx + 14 + bi * 22;
        const by = zy + zh - 18;
        if (bx + 10 < zx + zw - 10) {
          ctx.font = "13px serif";
          ctx.textAlign = "left";
          ctx.fillText(b, bx, by);
        }
      });
    });

    // ── 6. Player pulses ───────────────────────────────────────────────────
    LIVE_PLAYERS.forEach((p) => {
      const px = p.x * W;
      const py = p.y * H;
      const localFrame = (frame + p.pulseOffset) % 200;
      if (localFrame < 80) {
        const progress = localFrame / 80;
        const radius = 8 + progress * 30;
        const alpha = 0.6 * (1 - progress);
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // ── 7. Live players ────────────────────────────────────────────────────
    LIVE_PLAYERS.forEach((p) => {
      const px = p.x * W;
      const py = p.y * H;

      // Glow dot
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = p.color + "cc";
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Emoji
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, px, py);
      ctx.textBaseline = "alphabetic";

      // Name label with background
      const label = "@" + p.name;
      ctx.font = "bold 8px 'Courier New', monospace";
      const labelW = ctx.measureText(label).width + 8;
      ctx.fillStyle = "rgba(2,2,8,0.75)";
      ctx.beginPath();
      roundRect(ctx, px - labelW / 2, py + 12, labelW, 12, 4);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.textAlign = "center";
      ctx.fillText(label, px, py + 21);
    });

    // ── 8. Your pet (largest, center-ish in KARMA CITY) ───────────────────
    const city = ZONES[0];
    const cityCenterX = (city.x + city.w / 2) * W;
    const cityCenterY = (city.y + city.h / 2) * H;
    const petX = cityCenterX + Math.sin(frame * 0.008) * 38;
    const petY = cityCenterY + Math.cos(frame * 0.006) * 22 - 4;

    // Shadow glow
    ctx.save();
    ctx.shadowColor = classColor;
    ctx.shadowBlur = 28;
    ctx.font = "30px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(petEmoji, petX, petY);
    ctx.restore();

    // Second pass for extra brightness
    ctx.save();
    ctx.shadowColor = classColor;
    ctx.shadowBlur = 10;
    ctx.font = "30px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(petEmoji, petX, petY);
    ctx.restore();
    ctx.textBaseline = "alphabetic";

    // Pet name label
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = classColor;
    ctx.shadowColor = classColor;
    ctx.shadowBlur = 6;
    ctx.fillText(pet.name.toUpperCase(), petX, petY + 22);
    ctx.shadowBlur = 0;

    // YOU indicator
    ctx.font = "bold 7px 'Courier New', monospace";
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("▼ YOU", petX, petY - 20);

    // ── 9. Scanline overlay ───────────────────────────────────────────────
    const scanY = ((frame * 1.2) % H);
    const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    scanGrad.addColorStop(0, "rgba(0,229,255,0)");
    scanGrad.addColorStop(0.5, "rgba(0,229,255,0.025)");
    scanGrad.addColorStop(1, "rgba(0,229,255,0)");
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 30, W, 60);

    // ── 10. Corner decorations ─────────────────────────────────────────────
    const cornerAlpha = 0.4 + Math.sin(frame * 0.03) * 0.1;
    ctx.strokeStyle = `rgba(0,229,255,${cornerAlpha})`;
    ctx.lineWidth = 2;
    // TL
    ctx.beginPath(); ctx.moveTo(8, 24); ctx.lineTo(8, 8); ctx.lineTo(24, 8); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(W - 24, 8); ctx.lineTo(W - 8, 8); ctx.lineTo(W - 8, 24); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(8, H - 24); ctx.lineTo(8, H - 8); ctx.lineTo(24, H - 8); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(W - 24, H - 8); ctx.lineTo(W - 8, H - 8); ctx.lineTo(W - 8, H - 24); ctx.stroke();

    frameRef.current += 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [pet, petEmoji, classColor]);

  // Start / stop animation
  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 70;
      // Re-seed stars on resize
      starsRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        bright: Math.random(),
      }));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ─── Click/tap handling ─────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let cx: number, cy: number;

    if ("touches" in e) {
      cx = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
      cy = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }

    const x = (cx - rect.left) / canvas.width;
    const y = (cy - rect.top) / canvas.height;

    const hit = ZONES.find(
      (z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h
    );

    if (hit) {
      setSelectedZone(hit);
    } else {
      setSelectedZone(null);
    }
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        bottom: 70,
        background: "#020208",
        overflow: "hidden",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
        onClick={handleCanvasClick}
        onTouchEnd={handleCanvasClick}
      />

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(2,2,8,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,229,255,0.15)",
          zIndex: 20,
        }}
      >
        {/* Left: world name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>🌍</span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: "0.1em",
              background: "linear-gradient(90deg, #00e5ff, #a855f7, #ff2d8d)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            KARMA WORLD
          </span>
        </div>

        {/* Center: online count */}
        <motion.div
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            background: "rgba(0,229,255,0.1)",
            border: "1px solid rgba(0,229,255,0.3)",
            borderRadius: 20,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#00e5ff",
              boxShadow: "0 0 8px #00e5ff",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#00e5ff" }}>
            ⚡ {onlineCount} ONLINE
          </span>
        </motion.div>

        {/* Right: avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: `2px solid ${classColor}`,
            boxShadow: `0 0 10px ${classColor}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            background: "rgba(2,2,8,0.8)",
          }}
        >
          {petEmoji}
        </div>
      </div>

      {/* ── Zone tap card ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedZone && (
          <motion.div
            key={selectedZone.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            style={{
              position: "absolute",
              bottom: panelExpanded ? 310 : 70,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(340px, 90vw)",
              background: "rgba(6,6,18,0.97)",
              border: `1.5px solid ${selectedZone.color}55`,
              borderRadius: 20,
              padding: "18px 20px",
              boxShadow: `0 0 30px ${selectedZone.color}33, 0 8px 32px rgba(0,0,0,0.7)`,
              zIndex: 25,
            }}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedZone(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: "50%",
                width: 26,
                height: 26,
                color: "#aaa",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            {/* Zone header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: selectedZone.color + "18",
                  border: `2px solid ${selectedZone.color}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  boxShadow: `0 0 16px ${selectedZone.color}44`,
                }}
              >
                {selectedZone.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: selectedZone.color,
                    letterSpacing: "0.08em",
                    textShadow: `0 0 10px ${selectedZone.color}88`,
                  }}
                >
                  {selectedZone.name}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  🟢 3 players here right now
                </div>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 12, color: "#aaa", marginBottom: 14, lineHeight: 1.5 }}>
              {selectedZone.desc}
            </p>

            {/* Buildings preview */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {selectedZone.buildings.map((b, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 20,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "5px 10px",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>

            {/* Enter button */}
            <Link
              href={selectedZone.href}
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px",
                background: selectedZone.color,
                borderRadius: 14,
                color: "#020208",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.1em",
                textDecoration: "none",
                boxShadow: `0 0 20px ${selectedZone.color}66`,
              }}
            >
              ENTER ZONE →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom panel ──────────────────────────────────────────────────── */}
      <motion.div
        animate={{ height: panelExpanded ? 300 : 52 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(4,4,14,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(0,229,255,0.2)",
          overflow: "hidden",
          zIndex: 22,
        }}
      >
        {/* Collapsed strip */}
        <div
          onClick={() => setPanelExpanded((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            height: 52,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{petEmoji}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
                {pet.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 9, color: "#00ff88", fontWeight: 600 }}>
                📍 {currentZone}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.04em" }}>
              LV {pet.level} • {user.karma} ⚡
            </div>
            <motion.span
              animate={{ rotate: panelExpanded ? 180 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ fontSize: 12, color: "#00e5ff", display: "inline-block" }}
            >
              ▲
            </motion.span>
          </div>
        </div>

        {/* Expanded panel content */}
        <div style={{ padding: "0 16px 16px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {/* YOUR ZONE */}
            <div
              style={{
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.3)",
                borderRadius: 14,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 9, color: "#a855f7", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
                YOUR ZONE
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", marginBottom: 2 }}>KARMA CITY</div>
              <div style={{ fontSize: 10, color: "#888" }}>🏗️ 4 buildings</div>
              <div style={{ fontSize: 10, color: "#00ff88", marginTop: 2 }}>💰 +12 karma/hr</div>
            </div>

            {/* LIVE FEED */}
            <div
              style={{
                background: "rgba(0,229,255,0.06)",
                border: "1px solid rgba(0,229,255,0.2)",
                borderRadius: 14,
                padding: "10px 12px",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 9, color: "#00e5ff", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
                LIVE FEED
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {LIVE_FEED.slice(0, 3).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                    <span style={{ fontSize: 10, flexShrink: 0 }}>{item.emoji}</span>
                    <span style={{ fontSize: 9, color: "#999", lineHeight: 1.3 }}>
                      {item.text.length > 28 ? item.text.slice(0, 28) + "…" : item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "BUILD", icon: "🏗️", href: "/ville", color: "#a855f7" },
              { label: "EXPLORE", icon: "🗺️", href: "/map", color: "#ffcc00" },
              { label: "BATTLE", icon: "⚔️", href: "/games/battle", color: "#ff4444" },
              { label: "MARKET", icon: "💰", href: "/shop", color: "#ff2d8d" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                onClick={() => setPanelExpanded(false)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "8px 4px",
                  background: action.color + "12",
                  border: `1px solid ${action.color}44`,
                  borderRadius: 12,
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 16 }}>{action.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: action.color, letterSpacing: "0.06em" }}>
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
