"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FRIENDS } from "@/lib/mock-data";

// ── Geometry Dash-style Karma Runner — Neo-brutalist, Social Ghosts, 5 obstacle types ──

const GW = 390, GH = 420, GROUND = 320;
const PET_X = 68, PET_H = 44, GRAVITY = 0.72, JUMP_V = -15.5;
const BASE_SPD = 4, MAX_SPD = 12;

type ObstacleType = "wall" | "spike" | "pit" | "ceiling" | "gate";
type PwupKind = "shield" | "boost" | "magnet" | "star" | "beat" | "warp";

type Obs = { id: number; x: number; w: number; h: number; kind: ObstacleType; yOff: number };
type Gem = { id: number; x: number; yOff: number; done: boolean; risky: boolean };
type Pwup = { id: number; x: number; type: PwupKind; done: boolean };
type Ptcl = { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type TrailPt = { x: number; y: number };

interface Ghost {
  name: string;
  diedAt: number;
  emoji: string;
  visible: boolean;
  x: number;
}

type GS = {
  on: boolean; over: boolean; frame: number; speed: number; distance: number;
  score: number; karma: number; petY: number; petVY: number;
  jumpsLeft: number; hasShield: boolean; hasMagnet: boolean; hasStar: boolean; hasBeat: boolean;
  shieldTimer: number; magnetTimer: number; starTimer: number; beatTimer: number;
  comboCount: number; maxCombo: number; karmaChain: number;
  warpActive: boolean; warpFrame: number;
  obs: Obs[]; gms: Gem[]; pwups: Pwup[]; particles: Ptcl[];
  trail: TrailPt[];
  nxtObs: number; nxtGem: number; nxtPwup: number;
  cx: number[]; cy: number[]; cspd: number[];
  screenShake: number; flashAlpha: number; flashColor: string;
  startFrame: number; scoreBonus: number;
  ghosts: Ghost[];
  deathGhostName: string;
  deathGhostDist: number;
};

function buildGhosts(): Ghost[] {
  const friends = FRIENDS.slice(0, 3);
  return friends.map((f, i) => ({
    name: f.username,
    diedAt: 80 + i * 150 + Math.floor(Math.random() * 200),
    emoji: f.petEmoji ?? "🐾",
    visible: false,
    x: PET_X - 30 - i * 8,
  }));
}

function mkGS(): GS {
  return {
    on: false, over: false, frame: 0, speed: BASE_SPD, distance: 0,
    score: 0, karma: 0, petY: 0, petVY: 0,
    jumpsLeft: 2, hasShield: false, hasMagnet: false, hasStar: false, hasBeat: false,
    shieldTimer: 0, magnetTimer: 0, starTimer: 0, beatTimer: 0,
    comboCount: 0, maxCombo: 0, karmaChain: 0,
    warpActive: false, warpFrame: 0,
    obs: [], gms: [], pwups: [], particles: [],
    trail: [],
    nxtObs: 80, nxtGem: 50, nxtPwup: 220,
    cx: [60, 180, 290, 340], cy: [18, 12, 24, 10], cspd: [0.3, 0.48, 0.36, 0.22],
    screenShake: 0, flashAlpha: 0, flashColor: "255,50,50",
    startFrame: 0, scoreBonus: 0,
    ghosts: buildGhosts(),
    deathGhostName: "",
    deathGhostDist: 0,
  };
}

function spawnPtcls(g: GS, x: number, y: number, color: string, count = 5, size = 4) {
  for (let i = 0; i < count; i++) {
    g.particles.push({
      id: g.frame * 1000 + i + Math.random() * 999,
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 4 - 1,
      life: 1.0, color, size,
    });
  }
}

// Obstacle colors by type
const OBS_COLORS: Record<ObstacleType, string> = {
  wall: "#ff2d8d",
  spike: "#ff6b35",
  pit: "#000000",
  ceiling: "#00e5ff",
  gate: "#8b5cf6",
};

export default function KarmaRunner({ petEmoji = "🦁", onEnd }: { petEmoji?: string; onEnd?: (score: number, gems: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const gs = useRef<GS>(mkGS());
  const raf = useRef<number>(0);
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [fin, setFin] = useState({ score: 0, karma: 0, maxCombo: 0, timeSec: 0, dist: 0 });
  const [best, setBest] = useState(0);
  const [ui, setUi] = useState({ combo: 0, karmaChain: 0, shield: false, speed: BASE_SPD });
  const [copied, setCopied] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem("karma_runner_best_v2") ?? "0") || 0); } catch {}
  }, []);

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const g = gs.current;

    ctx.save();
    if (g.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * g.screenShake, (Math.random() - 0.5) * g.screenShake);
    }

    // ── Background: dark gradient ────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, GH);
    bg.addColorStop(0, "#050510");
    bg.addColorStop(1, "#0a0020");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GW, GH);

    // Neon grid lines (parallax background)
    const gridOff = (g.frame * g.speed * 0.15) % 40;
    ctx.strokeStyle = "rgba(200,255,0,0.04)";
    ctx.lineWidth = 1;
    for (let gx = -gridOff; gx < GW; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GROUND); ctx.stroke();
    }
    for (let gy = 0; gy < GROUND; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GW, gy); ctx.stroke();
    }

    // Stars
    [[20,8],[75,5],[130,18],[195,7],[250,22],[310,11],[340,20],[55,34],[165,4],[295,28],[50,15],[225,16],[155,30],[380,9]].forEach(([sx, sy], i) => {
      const tw = 0.2 + 0.3 * Math.sin(g.frame * 0.03 + i * 1.3);
      ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.beginPath(); ctx.arc(sx!, sy!, 1, 0, Math.PI * 2); ctx.fill();
    });

    // Clouds (faint)
    ctx.font = "16px serif";
    g.cx.forEach((cx, i) => { ctx.globalAlpha = 0.07 + i * 0.02; ctx.fillText("☁️", cx, g.cy[i]); });
    ctx.globalAlpha = 1;

    // ── Speed lines at high speed ────────────────────────────────────────────
    if (g.speed > 7) {
      const alpha = Math.min(0.25, (g.speed - 7) / 5 * 0.25);
      ctx.strokeStyle = `rgba(200,255,0,${alpha})`; ctx.lineWidth = 1;
      for (let li = 0; li < 10; li++) {
        const ly = 20 + li * 28;
        const lineLen = 20 + (g.speed - 7) * 8;
        const lx = GW - ((g.frame * g.speed * 1.2 + li * 60) % (GW + lineLen + 100));
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lineLen, ly); ctx.stroke();
      }
    }

    // ── Ground ───────────────────────────────────────────────────────────────
    // Ground fill (black below neon line)
    ctx.fillStyle = "#060606";
    ctx.fillRect(0, GROUND + 3, GW, GH - GROUND - 3);

    // Neon ground line
    ctx.strokeStyle = "#c8ff00";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#c8ff00";
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(GW, GROUND); ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving ground tiles
    const tileOff = (g.frame * g.speed) % 30;
    ctx.strokeStyle = "rgba(200,255,0,0.15)"; ctx.lineWidth = 1;
    for (let tx = -tileOff; tx < GW; tx += 30) {
      ctx.beginPath(); ctx.moveTo(tx, GROUND); ctx.lineTo(tx, GROUND + 6); ctx.stroke();
    }

    // ── Pit obstacles (draw dark gaps) ───────────────────────────────────────
    g.obs.filter(o => o.kind === "pit").forEach(o => {
      // Draw dark gap in ground
      ctx.fillStyle = "#000000";
      ctx.fillRect(o.x, GROUND, o.w, GH - GROUND);
      // Neon edges
      ctx.strokeStyle = "#ff2d8d";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff2d8d";
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(o.x, GROUND - 2); ctx.lineTo(o.x, GH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x + o.w, GROUND - 2); ctx.lineTo(o.x + o.w, GH); ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // ── Obstacles (non-pit) ──────────────────────────────────────────────────
    g.obs.filter(o => o.kind !== "pit").forEach(o => {
      const color = OBS_COLORS[o.kind];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      if (o.kind === "wall") {
        // Tall wall — jump over
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
        // Neon border
        ctx.strokeStyle = "#ffffff44";
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x, GROUND - o.h, o.w, o.h);
        // Label
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        ctx.fillText("WALL", o.x + o.w / 2, GROUND - o.h - 4);
      } else if (o.kind === "spike") {
        // Low spike triangle
        ctx.beginPath();
        ctx.moveTo(o.x, GROUND);
        ctx.lineTo(o.x + o.w / 2, GROUND - o.h);
        ctx.lineTo(o.x + o.w, GROUND);
        ctx.closePath();
        ctx.fill();
        // Second spike
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, GROUND);
        ctx.lineTo(o.x + o.w, GROUND - o.h * 0.7);
        ctx.lineTo(o.x + o.w * 1.5, GROUND);
        ctx.closePath();
        ctx.fill();
      } else if (o.kind === "ceiling") {
        // Hangs from top — duck under
        ctx.fillRect(o.x, 0, o.w, o.h);
        ctx.strokeStyle = "#ffffff44";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.strokeRect(o.x, 0, o.w, o.h);
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText("DUCK", o.x + o.w / 2, o.h + 12);
      } else if (o.kind === "gate") {
        // Two walls with gap — must jump to correct height
        const gapTop = GROUND - o.h;
        const gapBot = GROUND - o.yOff;
        // Bottom wall
        ctx.fillRect(o.x, gapBot, o.w, GH - gapBot);
        // Top wall (ceiling part)
        ctx.fillRect(o.x, 0, o.w, gapTop);
        ctx.strokeStyle = "#ffffff44";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.strokeRect(o.x, gapBot, o.w, GH - gapBot);
        ctx.strokeRect(o.x, 0, o.w, gapTop);
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("⬆", o.x + o.w / 2, gapBot - 4);
      }
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    });

    // ── Gems (karma ⚡ collectibles) ─────────────────────────────────────────
    g.gms.forEach(gem => {
      if (gem.done) return;
      const yy = GROUND + gem.yOff - 10 + Math.sin(g.frame * 0.12 + gem.id * 0.5) * 3;
      // Pulsing yellow circle background
      const pulse = 0.6 + 0.4 * Math.sin(g.frame * 0.15 + gem.id);
      ctx.fillStyle = `rgba(255,220,0,${pulse * 0.3})`;
      ctx.beginPath(); ctx.arc(gem.x + 8, yy - 8, 12, 0, Math.PI * 2); ctx.fill();
      ctx.font = "16px serif";
      ctx.fillText("⚡", gem.x, yy);
      if (gem.risky) {
        ctx.font = "bold 7px monospace";
        ctx.fillStyle = "#ffdd00";
        ctx.textAlign = "center";
        ctx.fillText("2×", gem.x + 8, yy - 14);
        ctx.textAlign = "left";
      }
    });

    // ── Powerups ─────────────────────────────────────────────────────────────
    const pwupEmoji: Record<PwupKind, string> = { shield:"🛡️", boost:"💨", magnet:"🧲", star:"⭐", beat:"🎵", warp:"🌀" };
    const pwupColor: Record<PwupKind, string> = { shield:"#00e5ff", boost:"#c8ff00", magnet:"#ff44cc", star:"#ffdd00", beat:"#ff6600", warp:"#aa44ff" };
    ctx.font = "18px serif";
    g.pwups.forEach(p => {
      if (p.done) return;
      const yy = GROUND - 68 + Math.sin(g.frame * 0.12 + p.id) * 5;
      ctx.fillText(pwupEmoji[p.type], p.x, yy);
      ctx.strokeStyle = pwupColor[p.type];
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(g.frame * 0.15);
      ctx.beginPath(); ctx.arc(p.x + 9, yy - 9, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // ── Social Ghosts ────────────────────────────────────────────────────────
    g.ghosts.forEach(ghost => {
      if (!ghost.visible) return;
      const ghostY = GROUND - PET_H + 4;
      ctx.globalAlpha = 0.35;
      ctx.font = `${PET_H}px serif`;
      ctx.fillText(ghost.emoji, ghost.x, ghostY);
      ctx.globalAlpha = 0.5;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`@${ghost.name} 💀`, ghost.x + PET_H / 2, ghostY - PET_H - 2);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    });

    // ── Player trail ─────────────────────────────────────────────────────────
    g.trail.slice().reverse().forEach((pt, i) => {
      const opacity = [0.18, 0.12, 0.08, 0.05, 0.03][i] ?? 0;
      ctx.globalAlpha = opacity;
      ctx.font = `${PET_H}px serif`;
      ctx.fillText(petEmoji, pt.x - 4 - i * 3, pt.y);
    });
    ctx.globalAlpha = 1;

    // Trail particles (neon dots)
    g.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // ── Pet ──────────────────────────────────────────────────────────────────
    ctx.save();
    const petScreenY = GROUND - g.petY;
    if (g.over) {
      ctx.translate(PET_X + 22, petScreenY - PET_H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-PET_X - 22, -(petScreenY - PET_H / 2));
    }

    // Neon glow ring
    const glowColor = g.hasStar ? `hsl(${(g.frame * 5) % 360},100%,60%)` : g.hasShield ? "#00e5ff" : "#00ff88";
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = g.hasStar || g.hasShield ? 3 : 2;
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(g.frame * 0.2);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 28, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    if (g.hasMagnet) {
      ctx.strokeStyle = "#ff44cc"; ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35; ctx.shadowColor = "#ff44cc"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 52, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    ctx.font = `${PET_H}px serif`;
    ctx.fillText(petEmoji, PET_X, petScreenY);
    ctx.restore();

    // ── HUD ──────────────────────────────────────────────────────────────────
    // Top bar background
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, GW, 46);

    ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
    ctx.fillStyle = "#ffdd00"; ctx.fillText(`⚡ ${g.karma}`, 8, 18);
    ctx.fillStyle = "#888"; ctx.fillText(`📏 ${Math.floor(g.distance)}m`, 8, 34);

    const speedMult = (g.speed / BASE_SPD).toFixed(1);
    ctx.fillStyle = g.speed > 9 ? "#ff4444" : g.speed > 7 ? "#ff9900" : "#c8ff00";
    ctx.textAlign = "right";
    ctx.fillText(`⚡ ×${speedMult}`, GW - 8, 18);

    if (g.comboCount > 1 || g.karmaChain > 0) {
      ctx.fillStyle = "#ff6600";
      ctx.fillText(`🔥 ×${Math.max(g.comboCount, g.karmaChain)}`, GW - 8, 34);
    }

    if (g.karmaChain >= 5) {
      ctx.fillStyle = "#ffdd00"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
      ctx.fillText(`CHAIN ×${g.karmaChain}!`, GW / 2, 42);
    }
    ctx.textAlign = "left";

    // Active powerup icons
    let iconX = GW / 2 - 20;
    if (g.hasShield)  { ctx.font = "13px serif"; ctx.fillText("🛡️", iconX, 20); iconX += 20; }
    if (g.hasMagnet)  { ctx.font = "13px serif"; ctx.fillText("🧲", iconX, 20); iconX += 20; }
    if (g.hasStar)    { ctx.font = "13px serif"; ctx.fillText("⭐", iconX, 20); }
    if (g.hasBeat)    { ctx.font = "13px serif"; ctx.fillText("🎵", iconX + 20, 20); }

    // ── Screen flash ─────────────────────────────────────────────────────────
    if (g.flashAlpha > 0) {
      ctx.fillStyle = `rgba(${g.flashColor},${g.flashAlpha})`;
      ctx.fillRect(0, 0, GW, GH);
      g.flashAlpha -= 0.06;
    }

    ctx.textAlign = "left";
    ctx.restore();
  }, [petEmoji]);

  const loop = useCallback(() => {
    const g = gs.current;
    if (!g.on || g.over) return;

    g.frame++;
    g.distance += g.speed * 0.1;

    // Speed progression: every 500m +0.5, cap at MAX_SPD
    g.speed = Math.min(BASE_SPD + Math.floor(g.distance / 500) * 0.5, MAX_SPD);

    const beatMult = g.hasBeat ? 2 : 1;
    g.score = Math.floor(g.frame * g.speed * 0.09 * beatMult) + g.karma * 10 * Math.max(1, g.comboCount) + g.scoreBonus;

    // Update clouds
    g.cx = g.cx.map((cx, i) => { const nx = cx - g.cspd[i]; return nx < -40 ? GW + 30 : nx; });

    // Timer powerups
    if (g.shieldTimer > 0) { g.shieldTimer--; if (g.shieldTimer === 0) g.hasShield = false; }
    if (g.magnetTimer > 0) { g.magnetTimer--; if (g.magnetTimer === 0) g.hasMagnet = false; }
    if (g.starTimer   > 0) { g.starTimer--;   if (g.starTimer   === 0) g.hasStar   = false; }
    if (g.beatTimer   > 0) { g.beatTimer--;   if (g.beatTimer   === 0) g.hasBeat   = false; }
    if (g.screenShake > 0) g.screenShake = Math.max(0, g.screenShake - 0.6);

    // Physics
    g.petVY += GRAVITY; g.petY = Math.max(0, g.petY - g.petVY);
    if (g.petY === 0) { g.petVY = 0; g.jumpsLeft = 2; }

    // Trail
    g.trail.unshift({ x: PET_X, y: GROUND - g.petY });
    if (g.trail.length > 5) g.trail.length = 5;

    // Trail neon particles
    if (g.frame % 3 === 0 && g.petY > 5) {
      spawnPtcls(g, PET_X + 10, GROUND - g.petY, "#00ff88", 1, 2);
    }

    // ── Ghost visibility check ────────────────────────────────────────────────
    g.ghosts.forEach(ghost => {
      if (!ghost.visible && g.distance >= ghost.diedAt) {
        ghost.visible = true;
      }
    });

    // ── Spawn obstacles ───────────────────────────────────────────────────────
    g.nxtObs--;
    if (g.nxtObs <= 0) {
      const roll = Math.random();
      const distFactor = Math.min(1, g.distance / 400);
      let obs: Obs;

      if (roll < 0.28) {
        // Wall — tall, jump over
        const h = 50 + Math.floor(Math.random() * 30);
        obs = { id: g.frame, x: GW + 10, w: 22, h, kind: "wall", yOff: 0 };
      } else if (roll < 0.50) {
        // Spike — low, jump over
        obs = { id: g.frame, x: GW + 10, w: 24, h: 28, kind: "spike", yOff: 0 };
      } else if (roll < 0.66 && distFactor > 0.15) {
        // Pit — gap in ground, jump across
        obs = { id: g.frame, x: GW + 10, w: 55, h: 0, kind: "pit", yOff: 0 };
      } else if (roll < 0.80 && distFactor > 0.3) {
        // Ceiling — hangs from top
        const h = 120 + Math.floor(Math.random() * 40);
        obs = { id: g.frame, x: GW + 10, w: 40, h, kind: "ceiling", yOff: 0 };
      } else if (distFactor > 0.5) {
        // Gate — gap to jump through at right height
        const gapH = 80 + Math.floor(Math.random() * 20); // gap height
        obs = { id: g.frame, x: GW + 10, w: 20, h: GROUND - gapH - 60, kind: "gate", yOff: gapH };
      } else {
        obs = { id: g.frame, x: GW + 10, w: 22, h: 50, kind: "wall", yOff: 0 };
      }
      g.obs.push(obs);
      g.nxtObs = Math.max(35, 60 + Math.floor(Math.random() * 55) - Math.floor(g.speed * 3));
    }

    // Move obstacles
    g.obs = g.obs.map(o => ({ ...o, x: o.x - g.speed })).filter(o => o.x > -120);

    // ── Karma gems ────────────────────────────────────────────────────────────
    g.nxtGem--;
    if (g.nxtGem <= 0) {
      const risky = Math.random() < 0.25;
      const yOff = risky ? -Math.floor(Math.random() * 60) - 20 : -6;
      g.gms.push({ id: g.frame + 99999, x: GW + 10, yOff, done: false, risky });
      g.nxtGem = Math.max(18, 30 + Math.floor(Math.random() * 25));
    }
    g.gms = g.gms.map(gem => ({ ...gem, x: gem.x - g.speed })).filter(gem => gem.x > -25);

    // ── Powerups ──────────────────────────────────────────────────────────────
    g.nxtPwup--;
    if (g.nxtPwup <= 0) {
      const types: PwupKind[] = ["shield", "boost", "magnet", "star", "beat", "warp"];
      const weights = [3, 3, 3, 1, 1, 1.5];
      const total = weights.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * total;
      let chosen: PwupKind = "boost";
      for (let ti = 0; ti < types.length; ti++) { rnd -= weights[ti]; if (rnd <= 0) { chosen = types[ti]; break; } }
      g.pwups.push({ id: g.frame, x: GW + 10, type: chosen, done: false });
      g.nxtPwup = 260 + Math.floor(Math.random() * 160);
    }
    g.pwups = g.pwups.map(p => ({ ...p, x: p.x - g.speed })).filter(p => p.x > -30);

    // ── Collision detection ───────────────────────────────────────────────────
    const pL = PET_X + 6, pR = PET_X + PET_H - 6;
    const pT = GROUND - g.petY - PET_H + 8, pB = GROUND - g.petY - 8;
    const petCenterY = GROUND - g.petY - PET_H / 2;

    function triggerDeath() {
      g.over = true; g.on = false;
      g.flashAlpha = 0.9; g.flashColor = "255,50,50"; g.screenShake = 12;
      const timeSec = Math.floor((g.frame - g.startFrame) / 60);
      g.maxCombo = Math.max(g.maxCombo, g.comboCount);
      // Find nearest ghost
      let nearest = { name: "", dist: 9999 };
      g.ghosts.forEach(gh => {
        const diff = Math.abs(gh.diedAt - g.distance);
        if (diff < nearest.dist) nearest = { name: gh.name, dist: diff };
      });
      g.deathGhostName = nearest.name;
      g.deathGhostDist = Math.floor(nearest.dist);
      spawnPtcls(g, PET_X + 22, petCenterY, "#ff2d8d", 10, 4);
      draw();
      setFin({ score: g.score, karma: g.karma, maxCombo: g.maxCombo, timeSec, dist: Math.floor(g.distance) });
      try {
        const prev = parseInt(localStorage.getItem("karma_runner_best_v2") ?? "0") || 0;
        if (g.score > prev) { localStorage.setItem("karma_runner_best_v2", String(g.score)); setBest(g.score); }
      } catch {}
      onEnd?.(g.score, g.karma);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      setPhase("over");
    }

    for (const o of g.obs) {
      if (g.hasStar) continue;

      if (o.kind === "pit") {
        // Pit: player falls in if x is over gap AND on the ground
        if (pR > o.x && pL < o.x + o.w && g.petY < 5) {
          if (g.hasShield) {
            g.hasShield = false; g.shieldTimer = 0;
            spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3);
            g.screenShake = 4; g.comboCount = 0;
            // Push player up slightly to escape pit
            g.petVY = JUMP_V * 0.6; g.petY = 10; g.jumpsLeft = 1;
            g.obs = g.obs.filter(x => x !== o);
            continue;
          }
          triggerDeath(); return;
        }
      } else if (o.kind === "ceiling") {
        // Ceiling: collision if player is in air and hits it
        const cT = 0, cB = o.h;
        if (pR > o.x && pL < o.x + o.w && pT < cB && pB > cT) {
          if (g.hasShield) {
            g.hasShield = false; g.shieldTimer = 0;
            spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3);
            g.screenShake = 4; g.comboCount = 0;
            g.obs = g.obs.filter(x => x !== o);
            continue;
          }
          triggerDeath(); return;
        }
      } else if (o.kind === "gate") {
        // Gate: must be in the gap (not hitting top or bottom walls)
        const gapBottom = GROUND - o.yOff;
        const gapTop = GROUND - o.h;
        // Check if player is horizontally inside gate
        if (pR > o.x && pL < o.x + o.w) {
          // Hit bottom wall
          if (pB > gapBottom && pT < GROUND) {
            if (g.hasShield) { g.hasShield = false; g.shieldTimer = 0; spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3); g.screenShake = 4; g.comboCount = 0; g.obs = g.obs.filter(x => x !== o); continue; }
            triggerDeath(); return;
          }
          // Hit top wall
          if (pT < gapTop && pB > 0) {
            if (g.hasShield) { g.hasShield = false; g.shieldTimer = 0; spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3); g.screenShake = 4; g.comboCount = 0; g.obs = g.obs.filter(x => x !== o); continue; }
            triggerDeath(); return;
          }
        }
      } else {
        // wall / spike — standard AABB
        const oL = o.x + 3, oR = o.x + o.w - 3;
        const oT = GROUND - o.h + 3, oB = GROUND - 3;
        if (pR > oL && pL < oR && pB > oT && pT < oB) {
          if (g.hasShield) {
            g.hasShield = false; g.shieldTimer = 0;
            spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3);
            g.screenShake = 4; g.comboCount = 0;
            g.obs = g.obs.filter(x => x !== o);
            continue;
          }
          triggerDeath(); return;
        }
      }
    }

    // ── Karma gem collection ──────────────────────────────────────────────────
    g.gms.forEach(gem => {
      if (gem.done) return;
      const gy = GROUND + gem.yOff - 10;
      const inRange = g.hasMagnet
        ? (Math.abs(gem.x - (PET_X + 22)) < 55 && Math.abs(gy - petCenterY) < 55)
        : (gem.x < pR && gem.x + 16 > pL && gy < pB && gy + 16 > pT);
      if (inRange) {
        gem.done = true;
        const bonus = gem.risky ? 2 : 1;
        g.karma += bonus;
        g.karmaChain++;
        g.comboCount++;
        g.maxCombo = Math.max(g.maxCombo, g.comboCount);
        const chainMult = g.karmaChain >= 10 ? 2 : 1;
        g.scoreBonus += 5 * bonus * chainMult;
        spawnPtcls(g, gem.x, gy, "#ffdd00", 4, 3);
        if (g.karmaChain === 10) {
          g.flashColor = "255,220,0"; g.flashAlpha = 0.3;
        }
      }
    });

    // ── Powerup collection ────────────────────────────────────────────────────
    g.pwups.forEach(p => {
      if (p.done) return;
      const py = GROUND - 68;
      if (Math.abs(p.x - (PET_X + 22)) < 28 && Math.abs(py - petCenterY) < 48) {
        p.done = true;
        const pwupEmoji: Record<PwupKind, string> = { shield:"🛡️", boost:"💨", magnet:"🧲", star:"⭐", beat:"🎵", warp:"🌀" };
        spawnPtcls(g, p.x, py, "#ffffff", 5, 3);
        switch (p.type) {
          case "shield": g.hasShield = true; g.shieldTimer = 300; break;
          case "boost":  g.scoreBonus += 80; g.flashColor = "200,255,0"; g.flashAlpha = 0.25; break;
          case "magnet": g.hasMagnet = true; g.magnetTimer = 400; break;
          case "star":   g.hasStar = true; g.starTimer = 180; g.flashColor = "255,220,0"; g.flashAlpha = 0.3;
            spawnPtcls(g, PET_X + 22, petCenterY, "#ffdd00", 8, 4); break;
          case "beat":   g.hasBeat = true; g.beatTimer = 300; g.flashColor = "255,100,0"; g.flashAlpha = 0.2; break;
          case "warp":
            g.obs = g.obs.filter(o => o.x < PET_X + 50 || o.x > PET_X + 250);
            g.warpActive = true; g.warpFrame = g.frame;
            g.flashColor = "170,68,255"; g.flashAlpha = 0.3;
            spawnPtcls(g, PET_X + 22, petCenterY, "#aa44ff", 8, 4);
            break;
        }
        void pwupEmoji;
      }
    });

    if (g.warpActive && g.frame - g.warpFrame > 30) g.warpActive = false;

    // ── Particles ─────────────────────────────────────────────────────────────
    g.particles = g.particles
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.18, life: p.life - 0.04 }))
      .filter(p => p.life > 0);

    if (g.frame % 4 === 0) {
      setUi({ combo: g.comboCount, karmaChain: g.karmaChain, shield: g.hasShield, speed: g.speed });
    }

    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, onEnd]);

  function jump() {
    const g = gs.current;
    if (phase === "idle") {
      g.on = true; g.startFrame = g.frame;
      setPhase("on"); raf.current = requestAnimationFrame(loop); return;
    }
    if (g.jumpsLeft > 0 && !g.over) {
      g.petVY = g.jumpsLeft === 2 ? JUMP_V : JUMP_V * 0.82; g.jumpsLeft--;
      g.karmaChain = 0; // reset chain on jump (forces skill)
    }
  }

  function restart() {
    cancelAnimationFrame(raf.current);
    gs.current = mkGS(); setPhase("idle");
    setFin({ score: 0, karma: 0, maxCombo: 0, timeSec: 0, dist: 0 });
    setUi({ combo: 0, karmaChain: 0, shield: false, speed: BASE_SPD });
    setCopied(false); setShaking(false);
    requestAnimationFrame(draw);
  }

  function copyScore() {
    const text = `I ran ${fin.dist}m and earned ${fin.karma} ⚡ karma in Karma Runner! 💀`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  useEffect(() => { requestAnimationFrame(draw); return () => cancelAnimationFrame(raf.current); }, [draw]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const speedMult = (ui.speed / BASE_SPD).toFixed(1);

  // Get the nearest ghost for death screen
  const deathGhost = gs.current.ghosts.find(gh => gh.name === gs.current.deathGhostName);

  return (
    <div
      style={{
        position: "relative", userSelect: "none", touchAction: "none",
        transform: shaking ? `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 8}px)` : "none",
        transition: shaking ? "none" : "transform 0.1s ease",
      }}
    >
      <canvas ref={cvs} width={GW} height={GH}
        style={{ width: "100%", height: "auto", borderRadius: 18, border: "2px solid #1a002a", display: "block", cursor: "pointer", boxShadow: "0 0 40px #c8ff0033, 0 0 80px #8b5cf611" }}
        onClick={jump} onTouchStart={e => { e.preventDefault(); jump(); }} />

      {/* IDLE SCREEN */}
      {phase === "idle" && (
        <div onClick={jump} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,5,16,0.88)", borderRadius: 16, gap: 8, cursor: "pointer" }}>
          <div style={{ fontSize: "3.2rem" }}>{petEmoji}</div>
          <div style={{ color: "#c8ff00", fontSize: 22, fontWeight: 900, letterSpacing: 3, textShadow: "0 0 20px #c8ff00" }}>KARMA RUNNER</div>
          <div style={{ color: "#666", fontSize: 11 }}>GEOMETRY DASH STYLE • LIFE CHALLENGES</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 }}>
            {([["🧱","WALL"],["⬆️","SPIKE"],["⬇️","PIT"],["🚧","CEILING"],["🚪","GATE"],["⚡","KARMA"]] as [string,string][]).map(([e, t]) => (
              <div key={t} style={{ textAlign: "center", background: "#0a0010", borderRadius: 8, padding: "5px 9px", border: "1px solid #2a0a3a" }}>
                <div style={{ fontSize: "1rem" }}>{e}</div>
                <div style={{ fontSize: 8, color: "#666", fontWeight: 700 }}>{t}</div>
              </div>
            ))}
          </div>
          {best > 0 && <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>BEST: <span style={{ color: "#c8ff00", fontWeight: 700 }}>{best}</span></div>}
          <div style={{ color: "#444", fontSize: 10, marginTop: 2 }}>TAP / SPACE TO START • DOUBLE JUMP • GHOST RUNNERS</div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {phase === "over" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,5,16,0.95)", borderRadius: 16, gap: 7 }}>
          <div style={{ fontSize: "2.8rem", animation: "pulse 0.7s ease-in-out infinite alternate" }}>💀</div>
          <div style={{ color: "#ff2d8d", fontSize: 22, fontWeight: 900, letterSpacing: 3, textShadow: "0 0 18px #ff2d8d" }}>GAME OVER</div>
          <div style={{ color: "#c8ff00", fontSize: 40, fontWeight: 900, textShadow: "0 0 24px #c8ff0077", lineHeight: 1 }}>{fin.score}</div>
          {fin.score > best && <div style={{ color: "#ffdd00", fontSize: 12, fontWeight: 700 }}>🏆 NEW BEST!</div>}
          {fin.score <= best && best > 0 && <div style={{ color: "#555", fontSize: 11 }}>BEST: <span style={{ color: "#c8ff00" }}>{best}</span></div>}

          {/* Ghost nearest info */}
          {gs.current.deathGhostName && (
            <div style={{ color: "#ffffff88", fontSize: 10, fontStyle: "italic", background: "#ffffff11", borderRadius: 8, padding: "4px 10px" }}>
              {deathGhost?.emoji} @{gs.current.deathGhostName} died {gs.current.deathGhostDist}m {gs.current.deathGhostDist < 10 ? "away" : "from here"} 👻
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 18px", marginTop: 2, marginBottom: 4 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ffdd00", fontSize: 16, fontWeight: 700 }}>⚡ {fin.karma}</div>
              <div style={{ color: "#444", fontSize: 9 }}>KARMA</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>📏 {fin.dist}m</div>
              <div style={{ color: "#444", fontSize: 9 }}>DISTANCE</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ff6600", fontSize: 16, fontWeight: 700 }}>🔥 ×{fin.maxCombo}</div>
              <div style={{ color: "#444", fontSize: 9 }}>MAX COMBO</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#aaaaff", fontSize: 16, fontWeight: 700 }}>⏱ {formatTime(fin.timeSec)}</div>
              <div style={{ color: "#444", fontSize: 9 }}>SURVIVED</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={e => { e.stopPropagation(); restart(); }}
              style={{ padding: "10px 28px", background: "#c8ff00", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 900, color: "#0a0a0a", cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a" }}>
              ↺ RETRY
            </button>
            <button onClick={e => { e.stopPropagation(); copyScore(); }}
              style={{ padding: "10px 18px", background: copied ? "#00aa44" : "#1a001a", border: "3px solid #330033", borderRadius: 12, fontSize: 13, fontWeight: 700, color: copied ? "#fff" : "#aaa", cursor: "pointer" }}>
              {copied ? "✓ COPIED!" : "📤 SHARE"}
            </button>
          </div>
        </div>
      )}

      {/* IN-GAME HUD BELOW CANVAS */}
      {phase === "on" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ color: "#ffdd00", fontSize: 11, fontWeight: 700 }}>⚡ KARMA</span>
          <span style={{ color: ui.speed > 9 ? "#ff4444" : ui.speed > 7 ? "#ff9900" : "#c8ff00", fontSize: 11, fontWeight: 700 }}>×{speedMult} SPD</span>
          {ui.combo > 1 && <span style={{ color: "#ff6600", fontSize: 11, fontWeight: 700 }}>🔥 ×{ui.combo}</span>}
          {ui.karmaChain >= 5 && <span style={{ color: "#ffdd00", fontSize: 11, fontWeight: 700 }}>CHAIN ×{ui.karmaChain}</span>}
          {ui.shield && <span style={{ fontSize: 13 }}>🛡️</span>}
          <span style={{ color: "#444", fontSize: 9 }}>TAP TO JUMP</span>
        </div>
      )}

      <style>{`@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.18); } }`}</style>
    </div>
  );
}
