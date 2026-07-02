"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FRIENDS } from "@/lib/mock-data";
import { getPetEmoji, getPetClassColor } from "@/lib/pet-evolution";
import { useApp } from "@/context/AppContext";

// ── Geometry Dash-style Karma Runner — Neo-brutalist, Social Ghosts, 5 obstacle types, Boss, Worlds ──

const GW = 390, GH = 420, GROUND = 320;
const PET_X = 68, PET_H = 44, GRAVITY = 0.72, JUMP_V = -15.5;
const BASE_SPD = 4, MAX_SPD = 12;

type ObstacleType = "wall" | "spike" | "pit" | "ceiling" | "gate";
type PwupKind = "shield" | "boost" | "magnet" | "star" | "beat" | "warp" | "rocket" | "time_slow" | "karma_rain";

type Obs = { id: number; x: number; w: number; h: number; kind: ObstacleType; yOff: number; lane: number; passed: boolean };
type Gem = { id: number; x: number; yOff: number; done: boolean; risky: boolean };
type Pwup = { id: number; x: number; type: PwupKind; done: boolean };
type Ptcl = { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type TrailPt = { x: number; y: number };
type BossBullet = { x: number; y: number; vx: number; vy: number; phase: number };
type KarmaRainGem = { x: number; y: number; vy: number; done: boolean };

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
  // New fields
  world: number;
  bossActive: boolean; bossHp: number; bossX: number; bossY: number;
  bossBullets: BossBullet[];
  bossTimer: number;
  hasRocket: boolean; rocketTimer: number; rocketX: number;
  hasTimeSlow: boolean; timeSlowTimer: number;
  karmaRainActive: boolean; karmaRainTimer: number; karmaRainGems: KarmaRainGem[];
  beatPulse: number;
  inKarmaZone: boolean; nxtKarmaZone: number; karmaZoneStart: number; karmaZoneEnd: number;
  lane: number; laneY: number;
  worldFlash: number; worldFlashName: string;
  bossSpawnDist: number;
  // Level system
  level: number; levelUpFlash: number; levelUpFrame: number;
  // Jump combo multiplier
  jumpCombo: number; jumpComboTimer: number;
  // Pet-class special ability
  ability: { active: boolean; cooldown: number; timer: number };
  // Level-based boss encounters
  lvlBossActive: boolean; lvlBossX: number; lvlBossBaseY: number;
  lvlBossEmoji: string; lvlBossLevel: number;
  lvlBossWarning: number; lvlBossDefeatedFlash: number; lvlBossNextLevel: number;
};

// ── Biome floor accent (level-based) ─────────────────────────────────────────
function getBiomeAccent(level: number): string {
  if (level <= 2) return "#00ff88";  // Neon green
  if (level <= 4) return "#ff4400";  // Lava / fire
  if (level <= 6) return "#00e5ff";  // Ice / crystal
  if (level <= 8) return "#8800ff";  // Shadow / void
  if (level <= 10) return "#ffdd00"; // Lightning / storm
  return "#ffd700";                  // Golden karma
}

function getLevelBossEmoji(bossLevel: number): string {
  if (bossLevel <= 5) return "👹";
  if (bossLevel <= 10) return "💀";
  if (bossLevel <= 15) return "🔥";
  return "⚡";
}

const ABILITY_INFO: Record<string, { label: string; flashRgb: string; duration: number }> = {
  "Grinder Beast":     { label: "💪 RAGE MODE",   flashRgb: "255,107,53", duration: 180 },
  "Influencer Spirit": { label: "✨ STAR SHIELD", flashRgb: "255,45,141", duration: 300 },
  "Merchant King":     { label: "💰 COIN MAGNET", flashRgb: "200,255,0",  duration: 240 },
};

// ── World palette data ────────────────────────────────────────────────────────
const WORLDS = [
  { name: "SUNSHINE PLAINS", bgTop: "#5ab8f5", bgBot: "#a8d8f0", ground: "#5ec95a", grid: "rgba(94,201,90,0.06)",   cloudAlpha: 0.95, bossEmoji: "☀️", ripEmoji: "🌈" },
  { name: "CHERRY BLOSSOM",  bgTop: "#f7c8e0", bgBot: "#ffe4f0", ground: "#e085b4", grid: "rgba(224,133,180,0.06)", cloudAlpha: 0.9,  bossEmoji: "🌸", ripEmoji: "🌺" },
  { name: "NEON CITY",       bgTop: "#050510", bgBot: "#0a0020", ground: "#c8ff00", grid: "rgba(200,255,0,0.04)",   cloudAlpha: 0.07, bossEmoji: "🔥", ripEmoji: "💀" },
  { name: "LAVA CORE",       bgTop: "#1a0000", bgBot: "#2a0800", ground: "#ff4400", grid: "rgba(255,100,0,0.05)",   cloudAlpha: 0.05, bossEmoji: "🔥", ripEmoji: "☠️" },
  { name: "ICE REALM",       bgTop: "#000a1a", bgBot: "#001a2a", ground: "#00e5ff", grid: "rgba(0,200,255,0.05)",   cloudAlpha: 0.07, bossEmoji: "❄️", ripEmoji: "🧊" },
  { name: "VOID SPACE",      bgTop: "#000000", bgBot: "#0a0010", ground: "#8b00ff", grid: "rgba(180,0,255,0.06)",   cloudAlpha: 0.04, bossEmoji: "🌑", ripEmoji: "👻" },
  { name: "KARMA HEAVEN",    bgTop: "#1a1400", bgBot: "#2a2000", ground: "#ffd700", grid: "rgba(255,215,0,0.07)",   cloudAlpha: 0.08, bossEmoji: "👑", ripEmoji: "✨" },
];
const LANE_OFFSETS = [0, 80, 160]; // pixels above ground for each lane

// Level-based accent colors (used for HUD and trail in dark worlds)
const LEVEL_BG: Record<number, { top: string; bot: string; accent: string }> = {
  1: { top: "#0a1a0a", bot: "#051005", accent: "#00ff88" },
  2: { top: "#0a0a1a", bot: "#050510", accent: "#4488ff" },
  3: { top: "#1a0a1a", bot: "#100510", accent: "#cc44ff" },
  4: { top: "#1a0a0a", bot: "#100505", accent: "#ff4444" },
  5: { top: "#1a1400", bot: "#100e00", accent: "#ffd700" },
};

// Obstacle colors by type
const OBS_COLORS: Record<ObstacleType, string> = {
  wall: "#ff2d8d",
  spike: "#ff6b35",
  pit: "#000000",
  ceiling: "#00e5ff",
  gate: "#8b5cf6",
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
    // New fields
    world: 0,
    bossActive: false, bossHp: 0, bossX: 0, bossY: 60,
    bossBullets: [],
    bossTimer: 0,
    hasRocket: false, rocketTimer: 0, rocketX: 0,
    hasTimeSlow: false, timeSlowTimer: 0,
    karmaRainActive: false, karmaRainTimer: 0, karmaRainGems: [],
    beatPulse: 0,
    inKarmaZone: false, nxtKarmaZone: 700, karmaZoneStart: 0, karmaZoneEnd: 0,
    lane: 0, laneY: 0,
    worldFlash: 0, worldFlashName: "",
    bossSpawnDist: 500,
    level: 1, levelUpFlash: 0, levelUpFrame: 0,
    jumpCombo: 1, jumpComboTimer: 0,
    ability: { active: false, cooldown: 0, timer: 0 },
    lvlBossActive: false, lvlBossX: GW + 30, lvlBossBaseY: 200,
    lvlBossEmoji: "", lvlBossLevel: 0,
    lvlBossWarning: 0, lvlBossDefeatedFlash: 0, lvlBossNextLevel: 5,
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

export default function KarmaRunner({ petEmoji = "🦁", onEnd }: { petEmoji?: string; onEnd?: (score: number, gems: number) => void }) {
  const { pet } = useApp();
  // Compute pet-derived values; store in refs so draw/loop always see current values
  const activePetEmoji = pet.skinId?.startsWith("emoji:") ? pet.skinId.slice(6) : getPetEmoji(pet.evolution, pet.class);
  const classColor = getPetClassColor(pet.class);
  const petEmojiRef = useRef(activePetEmoji);
  const classColorRef = useRef(classColor);
  const petClassRef = useRef(pet.class);
  petEmojiRef.current = activePetEmoji;
  classColorRef.current = classColor;
  petClassRef.current = pet.class;

  const cvs = useRef<HTMLCanvasElement>(null);
  const gs = useRef<GS>(mkGS());
  const raf = useRef<number>(0);
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [fin, setFin] = useState({ score: 0, karma: 0, maxCombo: 0, timeSec: 0, dist: 0 });
  const [best, setBest] = useState(0);
  const [ui, setUi] = useState({ combo: 0, karmaChain: 0, shield: false, speed: BASE_SPD, lane: 0, world: 0, level: 1, jumpCombo: 1 });
  const [abilityUi, setAbilityUi] = useState({ active: false, cooldown: 0 });
  const [copied, setCopied] = useState(false);
  const [shaking, setShaking] = useState(false);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem("karma_runner_best_v2") ?? "0") || 0); } catch {}
  }, []);

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const g = gs.current;
    const wIdx = Math.min(g.world, WORLDS.length - 1);
    const world = WORLDS[wIdx];
    const curPetEmoji = petEmojiRef.current;
    const curClassColor = classColorRef.current;
    const biomeAccent = getBiomeAccent(g.level);

    ctx.save();
    if (g.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * g.screenShake, (Math.random() - 0.5) * g.screenShake);
    }

    // ── Background: world-themed gradient ────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, GH);
    bg.addColorStop(0, world.bgTop);
    bg.addColorStop(1, world.bgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GW, GH);

    // Draw sun for bright worlds (0 = Sunshine Plains, 1 = Cherry Blossom)
    if (g.world <= 1) {
      const SX = GW * 0.82, SY = 38;
      const sunColor = g.world === 0 ? "#ffe57a" : "#ffaad4";
      ctx.save();
      ctx.shadowColor = sunColor;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(SX, SY, 22, 0, Math.PI * 2);
      ctx.fillStyle = sunColor;
      ctx.fill();
      ctx.restore();
      // Sun rays
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + g.frame * 0.01;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = sunColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SX + Math.cos(angle) * 28, SY + Math.sin(angle) * 28);
        ctx.lineTo(SX + Math.cos(angle) * 38, SY + Math.sin(angle) * 38);
        ctx.stroke();
        ctx.restore();
      }
    }

    // time_slow overlay
    if (g.hasTimeSlow) {
      ctx.fillStyle = "rgba(100,100,120,0.15)";
      ctx.fillRect(0, 0, GW, GH);
    }

    // Neon grid lines (parallax background)
    const gridOff = (g.frame * g.speed * 0.15) % 40;
    const gridBaseAlpha = parseFloat(world.grid.match(/[\d.]+\)$/)?.[0]?.replace(")", "") ?? "0.04");
    const gridAlpha = g.beatPulse > 0 ? gridBaseAlpha + (0.12 - gridBaseAlpha) * (g.beatPulse / 15) : gridBaseAlpha;
    const gridColor = world.grid.replace(/[\d.]+\)$/, `${gridAlpha})`);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let gx = -gridOff; gx < GW; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, GROUND); ctx.stroke();
    }
    for (let gy = 0; gy < GROUND; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GW, gy); ctx.stroke();
    }

    // ── Parallax mountains ───────────────────────────────────────────────────
    const levelAccentColor = LEVEL_BG[Math.min(g.level, 5)]?.accent ?? "#00ff88";
    const mtnOff = (g.frame * g.speed * 0.6) % GW;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = levelAccentColor;
    for (let mi = 0; mi < 5; mi++) {
      const mx = (mi * (GW / 4) - mtnOff + GW * 2) % (GW + GW / 4) - GW / 4;
      const mh = 60 + mi * 20;
      ctx.beginPath();
      ctx.moveTo(mx - 60, GROUND);
      ctx.lineTo(mx, GROUND - mh);
      ctx.lineTo(mx + 60, GROUND);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Stars (only for dark worlds)
    if (world.cloudAlpha <= 0.5) {
      [[20,8],[75,5],[130,18],[195,7],[250,22],[310,11],[340,20],[55,34],[165,4],[295,28],[50,15],[225,16],[155,30],[380,9]].forEach(([sx, sy], i) => {
        const tw = 0.2 + 0.3 * Math.sin(g.frame * 0.03 + i * 1.3);
        ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.beginPath(); ctx.arc(sx!, sy!, 1, 0, Math.PI * 2); ctx.fill();
      });
    }

    // Draw clouds
    if (world.cloudAlpha > 0.5) {
      // Bright world fluffy clouds
      for (let i = 0; i < 4; i++) {
        const cx = ((g.cx[i]! * 3.5) % (GW + 120)) - 60;
        const cy = g.cy[i]! * 10 + 15;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.shadowColor = "rgba(255,255,255,0.4)";
        ctx.shadowBlur = 8;
        for (const [dx, dy, r] of [[0,0,16],[18,0,13],[-15,4,11],[8,-9,10]] as [number,number,number][]) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    } else {
      // Dark world subtle clouds
      ctx.save();
      ctx.globalAlpha = world.cloudAlpha;
      for (let i = 0; i < 4; i++) {
        const cx = ((g.cx[i]! * 3.5) % (GW + 120)) - 60;
        const cy = g.cy[i]! * 10 + 15;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 18, cy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 14, cy + 4, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // ── Speed lines at high speed ────────────────────────────────────────────
    if (g.speed > 7) {
      const sAlpha = Math.min(0.25, (g.speed - 7) / 5 * 0.25);
      const lineAlpha = g.beatPulse > 0 ? sAlpha * 1.8 : sAlpha;
      ctx.strokeStyle = `rgba(200,255,0,${lineAlpha})`; ctx.lineWidth = 1;
      for (let li = 0; li < 10; li++) {
        const ly = 20 + li * 28;
        const lineLen = 20 + (g.speed - 7) * 8;
        const lx = GW - ((g.frame * g.speed * 1.2 + li * 60) % (GW + lineLen + 100));
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lineLen, ly); ctx.stroke();
      }
    }

    // ── Karma Zone ───────────────────────────────────────────────────────────
    if (g.inKarmaZone) {
      ctx.save();
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(g.frame * 0.1);
      ctx.strokeRect(2, 52, GW - 4, GROUND - 54);
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(g.frame * 0.08);
      ctx.fillStyle = "#00e5ff";
      ctx.fillRect(2, 52, GW - 4, GROUND - 54);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Ground ───────────────────────────────────────────────────────────────
    ctx.fillStyle = "#060606";
    ctx.fillRect(0, GROUND + 3, GW, GH - GROUND - 3);

    // Perspective grid lines below ground (3D runway effect)
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = world.ground;
    ctx.lineWidth = 1;
    const vanishX = GW / 2;
    const perspLines = [0.1, 0.3, 0.5, 0.7, 0.9];
    perspLines.forEach(frac => {
      const groundX = frac * GW;
      ctx.beginPath(); ctx.moveTo(vanishX, GROUND); ctx.lineTo(groundX, GH); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // Neon ground line (beat-enhanced, biome accent color)
    const groundLineWidth = g.beatPulse > 0 ? 3 + 2 * (g.beatPulse / 15) : 3;
    const groundLineColor = g.beatPulse > 0 ? "#ffffff" : biomeAccent;
    ctx.strokeStyle = groundLineColor;
    ctx.lineWidth = groundLineWidth;
    ctx.shadowColor = biomeAccent;
    ctx.shadowBlur = g.beatPulse > 0 ? 16 : 8;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(GW, GROUND); ctx.stroke();
    ctx.shadowBlur = 0;

    // Biome floor accent effects
    {
      const tilePhase = (g.frame * g.speed) % 60;
      if (g.level >= 3 && g.level <= 4) {
        // Lava: red/orange shimmer ripple on ground edge
        for (let lx = 0; lx < GW; lx += 12) {
          const ripple = Math.sin((lx + g.frame * 3) * 0.18) * 3;
          ctx.fillStyle = `rgba(255,${60 + Math.floor(ripple * 10)},0,0.18)`;
          ctx.fillRect(lx, GROUND + 1, 10, 4 + ripple);
        }
      } else if (g.level >= 5 && g.level <= 6) {
        // Ice: blue shimmer dots along ground
        for (let lx = (-tilePhase * 2) % 30; lx < GW; lx += 30) {
          const glint = 0.3 + 0.4 * Math.abs(Math.sin(lx * 0.1 + g.frame * 0.05));
          ctx.fillStyle = `rgba(0,229,255,${glint})`;
          ctx.fillRect(lx, GROUND - 1, 6, 2);
        }
      } else if (g.level >= 7 && g.level <= 8) {
        // Void: dark purple crack lines
        ctx.strokeStyle = "rgba(136,0,255,0.25)";
        ctx.lineWidth = 1;
        for (let ci = 0; ci < 5; ci++) {
          const cx = (ci * 78 + g.frame * 2) % GW;
          ctx.beginPath(); ctx.moveTo(cx, GROUND); ctx.lineTo(cx + 10, GROUND + 8); ctx.stroke();
        }
      } else if (g.level >= 9 && g.level <= 10) {
        // Lightning: yellow sparks
        if (g.frame % 8 === 0) {
          spawnPtcls(g, Math.random() * GW, GROUND - 2, "#ffdd00", 1, 2);
        }
      } else if (g.level >= 11) {
        // Golden: gold shimmer
        for (let lx = (-tilePhase * 1.5) % 20; lx < GW; lx += 20) {
          const shine = 0.2 + 0.5 * Math.abs(Math.sin(lx * 0.2 + g.frame * 0.08));
          ctx.fillStyle = `rgba(255,215,0,${shine})`;
          ctx.fillRect(lx, GROUND - 1, 4, 2);
        }
      }
    }

    // Lane guide lines
    if (g.lane > 0) {
      ctx.strokeStyle = `rgba(200,255,0,0.12)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      for (let ln = 1; ln <= 2; ln++) {
        const laneLineY = GROUND - LANE_OFFSETS[ln]!;
        ctx.beginPath(); ctx.moveTo(0, laneLineY); ctx.lineTo(GW, laneLineY); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Moving ground tiles
    const tileOff = (g.frame * g.speed) % 30;
    ctx.strokeStyle = `rgba(200,255,0,0.15)`; ctx.lineWidth = 1;
    for (let tx = -tileOff; tx < GW; tx += 30) {
      ctx.beginPath(); ctx.moveTo(tx, GROUND); ctx.lineTo(tx, GROUND + 6); ctx.stroke();
    }

    // ── Pit obstacles (draw dark gaps) ───────────────────────────────────────
    g.obs.filter(o => o.kind === "pit").forEach(o => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(o.x, GROUND, o.w, GH - GROUND);
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
        const wallGroundY = GROUND - (LANE_OFFSETS[Math.min(o.lane, 2)] ?? 0);
        ctx.fillRect(o.x, wallGroundY - o.h, o.w, o.h);
        ctx.strokeStyle = "#ffffff44";
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x, wallGroundY - o.h, o.w, o.h);
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        ctx.fillText("WALL", o.x + o.w / 2, wallGroundY - o.h - 4);
      } else if (o.kind === "spike") {
        ctx.beginPath();
        ctx.moveTo(o.x, GROUND);
        ctx.lineTo(o.x + o.w / 2, GROUND - o.h);
        ctx.lineTo(o.x + o.w, GROUND);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, GROUND);
        ctx.lineTo(o.x + o.w, GROUND - o.h * 0.7);
        ctx.lineTo(o.x + o.w * 1.5, GROUND);
        ctx.closePath();
        ctx.fill();
      } else if (o.kind === "ceiling") {
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
        const gapTop = GROUND - o.h;
        const gapBot = GROUND - o.yOff;
        ctx.fillRect(o.x, gapBot, o.w, GH - gapBot);
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

    // ── Boss ─────────────────────────────────────────────────────────────────
    if (g.bossActive) {
      const bEmoji = world.bossEmoji;
      ctx.font = "80px serif";
      ctx.fillText(bEmoji, g.bossX - 40, g.bossY + 80);

      // Health bar
      const hpBarW = 200;
      const hpBarX = GW / 2 - 100;
      const hpBarY = g.bossY + 90;
      ctx.fillStyle = "#330000";
      ctx.fillRect(hpBarX, hpBarY, hpBarW, 8);
      ctx.fillStyle = "#ff2200";
      ctx.shadowColor = "#ff2200";
      ctx.shadowBlur = 6;
      ctx.fillRect(hpBarX, hpBarY, hpBarW * (g.bossHp / 20), 8);
      ctx.shadowBlur = 0;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`BOSS ❤️ ${g.bossHp}/20`, GW / 2, hpBarY + 20);
      ctx.textAlign = "left";

      // Boss bullets
      const bulletColor = wIdx === 2 ? "#00ccff" : wIdx === 3 ? "#cc00ff" : wIdx === 4 ? "#ffd700" : "#ff4400";
      g.bossBullets.forEach(b => {
        ctx.fillStyle = bulletColor;
        ctx.shadowColor = bulletColor;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // ── Level Boss ────────────────────────────────────────────────────────────
    if (g.lvlBossActive) {
      const bossCurrentY = g.lvlBossBaseY + Math.sin(g.frame * 0.08) * 60;
      ctx.save();
      ctx.font = "52px serif";
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 28;
      ctx.fillText(g.lvlBossEmoji, g.lvlBossX, bossCurrentY + 52);
      ctx.shadowBlur = 0;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#ff4444";
      ctx.textAlign = "center";
      ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 6;
      ctx.fillText(`LVL BOSS Lv.${g.lvlBossLevel}`, g.lvlBossX + 26, bossCurrentY - 6);
      ctx.shadowBlur = 0; ctx.textAlign = "left";
      ctx.restore();
    }

    // ── Boss Warning Banner ────────────────────────────────────────────────────
    if (g.lvlBossWarning > 0) {
      const warnAlpha = 0.65 + 0.25 * Math.sin(g.frame * 0.35);
      ctx.save();
      ctx.globalAlpha = warnAlpha;
      ctx.fillStyle = "rgba(180,0,0,0.82)";
      ctx.fillRect(0, GH / 2 - 30, GW, 60);
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = "#ffdd00";
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 14;
      ctx.textAlign = "center";
      ctx.fillText("⚠️ WARNING! ⚠️", GW / 2, GH / 2 + 2);
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 0;
      ctx.fillText("LEVEL BOSS INCOMING!", GW / 2, GH / 2 + 20);
      ctx.textAlign = "left"; ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Boss Defeated Flash ────────────────────────────────────────────────────
    if (g.lvlBossDefeatedFlash > 0) {
      const t = g.lvlBossDefeatedFlash / 120;
      const floatY = GH / 2 - 70 + (1 - t) * 35;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 2.5);
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 22;
      ctx.textAlign = "center";
      ctx.fillText("BOSS DEFEATED! +50⚡", GW / 2, floatY);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.textAlign = "left";
      ctx.restore();
    }

    // ── Rocket ───────────────────────────────────────────────────────────────
    if (g.hasRocket) {
      ctx.font = "24px serif";
      ctx.fillText("🚀", g.rocketX, GROUND - 80);
    }

    // ── Karma Rain gems ──────────────────────────────────────────────────────
    g.karmaRainGems.forEach(rg => {
      if (rg.done) return;
      ctx.font = "16px serif";
      ctx.globalAlpha = 0.9;
      ctx.fillText("⚡", rg.x, rg.y);
      ctx.globalAlpha = 1;
    });

    // ── Gems (karma ⚡ collectibles) ─────────────────────────────────────────
    g.gms.forEach(gem => {
      if (gem.done) return;
      const yy = GROUND + gem.yOff - 10 + Math.sin(g.frame * 0.12 + gem.id * 0.5) * 3;
      const gemScale = g.beatPulse > 0 ? 1.0 + 0.4 * (g.beatPulse / 15) : 1.0;
      const pulse = 0.6 + 0.4 * Math.sin(g.frame * 0.15 + gem.id);
      ctx.fillStyle = g.inKarmaZone ? `rgba(0,229,255,${pulse * 0.4})` : `rgba(255,220,0,${pulse * 0.3})`;
      ctx.beginPath(); ctx.arc(gem.x + 8, yy - 8, 12 * gemScale, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(gem.x + 8, yy - 8);
      ctx.scale(gemScale, gemScale);
      ctx.translate(-gem.x - 8, -(yy - 8));
      ctx.font = "16px serif";
      ctx.fillText("⚡", gem.x, yy);
      ctx.restore();
      if (gem.risky) {
        ctx.font = "bold 7px monospace";
        ctx.fillStyle = "#ffdd00";
        ctx.textAlign = "center";
        ctx.fillText("2×", gem.x + 8, yy - 14);
        ctx.textAlign = "left";
      }
    });

    // ── Powerups ─────────────────────────────────────────────────────────────
    const pwupEmoji: Record<PwupKind, string> = { shield:"🛡️", boost:"💨", magnet:"🧲", star:"⭐", beat:"🎵", warp:"🌀", rocket:"🚀", time_slow:"🐢", karma_rain:"🌧️" };
    const pwupColor: Record<PwupKind, string> = { shield:"#00e5ff", boost:"#c8ff00", magnet:"#ff44cc", star:"#ffdd00", beat:"#ff6600", warp:"#aa44ff", rocket:"#ff8800", time_slow:"#aaaaff", karma_rain:"#00ffcc" };
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
      ctx.fillText(curPetEmoji, pt.x - 4 - i * 3, pt.y);
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

    // Beat pulse ring
    if (g.beatPulse > 10) {
      const ringAlpha = (g.beatPulse - 10) / 5;
      const ringR = 28 + (15 - g.beatPulse) * 4;
      const petScreenY = GROUND - g.laneY - g.petY;
      ctx.strokeStyle = `rgba(255,255,100,${ringAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, ringR, 0, Math.PI * 2); ctx.stroke();
    }

    // ── Pet ──────────────────────────────────────────────────────────────────
    ctx.save();
    const petScreenY = GROUND - g.laneY - g.petY;
    if (g.over) {
      ctx.translate(PET_X + 22, petScreenY - PET_H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-PET_X - 22, -(petScreenY - PET_H / 2));
    }

    // Neon glow ring — uses pet class color when no powerup active
    const glowColor = g.hasStar ? `hsl(${(g.frame * 5) % 360},100%,60%)` : g.hasShield ? "#00e5ff" : curClassColor;
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

    // ── Class ability visual effects ─────────────────────────────────────────
    if (g.ability.active) {
      const pc = petClassRef.current;
      const petCX = PET_X + 22;
      const petCY = petScreenY - PET_H / 2;
      if (pc === "Grinder Beast") {
        // Rage: concentric orange/red rings
        const rageA = 0.65 + 0.35 * Math.sin(g.frame * 0.35);
        ctx.strokeStyle = `rgba(255,80,0,${rageA})`; ctx.lineWidth = 4;
        ctx.shadowColor = "#ff6600"; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(petCX, petCY, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,30,0,${rageA * 0.6})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(petCX, petCY, 44, 0, Math.PI * 2); ctx.stroke();
        // Orange color tint overlay
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ff6600";
        ctx.beginPath(); ctx.arc(petCX, petCY, 26, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      } else if (pc === "Influencer Spirit") {
        // Star shield: pulsing bubble
        const shieldPulse = 0.45 + 0.55 * Math.sin(g.frame * 0.18);
        const shieldR = 30 + shieldPulse * 8;
        ctx.strokeStyle = `rgba(255,45,141,${shieldPulse})`; ctx.lineWidth = 3;
        ctx.shadowColor = "#ff2d8d"; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(petCX, petCY, shieldR, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = shieldPulse * 0.18;
        ctx.fillStyle = "#ff2d8d";
        ctx.beginPath(); ctx.arc(petCX, petCY, shieldR, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      } else if (pc === "Merchant King") {
        // Coin magnet: cyan magnetic field rings
        const magA = 0.35 + 0.2 * Math.sin(g.frame * 0.12);
        ctx.strokeStyle = `rgba(0,229,255,${magA})`; ctx.lineWidth = 1.5;
        ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(petCX, petCY, 66, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(petCX, petCY, 82, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }

    // Speed blur: squish horizontally when fast
    if (g.speed > 8 && !g.over) {
      ctx.save();
      ctx.translate(PET_X + 22, petScreenY - PET_H / 2);
      ctx.scale(0.85, 1);
      ctx.translate(-(PET_X + 22), -(petScreenY - PET_H / 2));
      ctx.font = `${PET_H}px serif`;
      ctx.fillText(curPetEmoji, PET_X, petScreenY);
      ctx.restore();
    } else {
      ctx.font = `${PET_H}px serif`;
      ctx.fillText(curPetEmoji, PET_X, petScreenY);
    }
    ctx.restore();

    // ── HUD ──────────────────────────────────────────────────────────────────
    // For bright worlds, use a lighter panel and dark text; dark worlds keep existing style
    const hudShadow = g.world <= 1 ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)";
    const hudPanel = g.world <= 1 ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.55)";
    const levelAccent = LEVEL_BG[Math.min(g.level, 5)]?.accent ?? "#00ff88";

    ctx.fillStyle = hudPanel;
    ctx.fillRect(0, 0, GW, 52);

    // Left: SCORE + DISTANCE
    ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
    ctx.shadowColor = hudShadow; ctx.shadowBlur = 4;
    ctx.fillStyle = g.world <= 1 ? "#c47a00" : "#ffdd00";
    ctx.fillText(`⚡ ${g.karma}`, 8, 18);
    ctx.fillStyle = g.world <= 1 ? "#444" : "#888";
    ctx.fillText(`📏 ${Math.floor(g.distance)}m`, 8, 34);
    ctx.shadowBlur = 0;

    // Center-left: LEVEL
    ctx.fillStyle = levelAccent;
    ctx.font = "bold 11px monospace";
    ctx.shadowColor = levelAccent;
    ctx.shadowBlur = 6;
    ctx.textAlign = "center";
    ctx.fillText(`LVL ${g.level}`, GW / 2 - 50, 18);
    ctx.shadowBlur = 0;

    // Center-right: JUMP COMBO
    if (g.jumpCombo > 1) {
      const comboColor = g.jumpCombo >= 5 ? "#ffd700" : g.jumpCombo >= 3 ? "#ff6600" : "#ff9900";
      ctx.fillStyle = comboColor;
      ctx.shadowColor = comboColor;
      ctx.shadowBlur = 6;
      ctx.fillText(`×${g.jumpCombo} COMBO`, GW / 2 + 50, 18);
      ctx.shadowBlur = 0;
    }

    // Right: SPEED
    const speedMult = (g.speed / BASE_SPD).toFixed(1);
    ctx.fillStyle = g.speed > 9 ? "#ff4444" : g.speed > 7 ? "#ff9900" : (g.world <= 1 ? "#2a7a00" : "#c8ff00");
    ctx.textAlign = "right";
    ctx.shadowColor = hudShadow; ctx.shadowBlur = 4;
    ctx.fillText(`⚡ ×${speedMult}`, GW - 8, 18);
    ctx.shadowBlur = 0;

    if (g.comboCount > 1 || g.karmaChain > 0) {
      ctx.fillStyle = g.inKarmaZone ? "#cc00ff" : "#ff6600";
      ctx.fillText(`🔥 ×${Math.max(g.comboCount, g.karmaChain)}${g.inKarmaZone ? " ×3" : ""}`, GW - 8, 34);
    }

    if (g.karmaChain >= 5) {
      ctx.fillStyle = g.world <= 1 ? "#c47a00" : "#ffdd00";
      ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
      ctx.fillText(`CHAIN ×${g.karmaChain}!`, GW / 2, 48);
    }
    ctx.textAlign = "left";

    // Active powerup icons (row 2 of HUD, centered)
    let iconX = GW / 2 - 20;
    if (g.hasShield)    { ctx.font = "13px serif"; ctx.fillText("🛡️", iconX, 34); iconX += 20; }
    if (g.hasMagnet)    { ctx.font = "13px serif"; ctx.fillText("🧲", iconX, 34); iconX += 20; }
    if (g.hasStar)      { ctx.font = "13px serif"; ctx.fillText("⭐", iconX, 34); iconX += 20; }
    if (g.hasBeat)      { ctx.font = "13px serif"; ctx.fillText("🎵", iconX, 34); iconX += 20; }
    if (g.hasRocket)    { ctx.font = "13px serif"; ctx.fillText("🚀", iconX, 34); iconX += 20; }
    if (g.hasTimeSlow)  { ctx.font = "13px serif"; ctx.fillText("🐢", iconX, 34); iconX += 20; }
    if (g.karmaRainActive) { ctx.font = "13px serif"; ctx.fillText("🌧️", iconX, 34); iconX += 20; }

    // Lane indicator
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = g.world <= 1 ? "rgba(50,120,0,0.85)" : "rgba(200,255,0,0.7)";
    ctx.textAlign = "right";
    ctx.fillText(`LN ${g.lane + 1}/3`, GW - 8, 48);
    ctx.textAlign = "left";

    // World indicator (bottom-left)
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = g.world <= 1 ? "rgba(30,30,30,0.6)" : "rgba(255,255,255,0.4)";
    ctx.shadowColor = hudShadow; ctx.shadowBlur = 2;
    ctx.fillText(`W${g.world + 1}: ${world.name}`, 6, GH - 8);
    ctx.shadowBlur = 0;

    // Karma zone banner
    if (g.inKarmaZone) {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#00e5ff";
      ctx.textAlign = "center";
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 8;
      ctx.fillText("✦ KARMA ZONE ×3 ✦", GW / 2, 66);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }

    // World flash banner
    if (g.worldFlash > 0) {
      const flashT = g.worldFlash / 60;
      ctx.save();
      ctx.globalAlpha = Math.min(1, flashT * 2);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, GH / 2 - 36, GW, 72);
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = world.ground;
      ctx.shadowColor = world.ground;
      ctx.shadowBlur = 18;
      ctx.textAlign = "center";
      ctx.fillText(`WORLD ${g.world + 1}: ${g.worldFlashName}`, GW / 2, GH / 2 - 4);
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#ffffff99";
      ctx.shadowBlur = 0;
      ctx.fillText("NEW WORLD ENTERED", GW / 2, GH / 2 + 18);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
      ctx.restore();
    }

    // ── Level-up floating text ────────────────────────────────────────────────
    if (g.levelUpFlash > 0) {
      const t = g.levelUpFlash / 90;
      const floatY = GH / 2 - 60 + (1 - t) * 30;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 3);
      ctx.font = "bold 28px monospace";
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 24;
      ctx.textAlign = "center";
      ctx.fillText(`LEVEL ${g.level}!`, GW / 2, floatY);
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.fillText("LEVEL UP!", GW / 2, floatY + 24);
      ctx.shadowBlur = 0;
      ctx.restore();
      g.levelUpFlash--;
    }

    // ── Screen flash ─────────────────────────────────────────────────────────
    if (g.flashAlpha > 0) {
      ctx.fillStyle = `rgba(${g.flashColor},${g.flashAlpha})`;
      ctx.fillRect(0, 0, GW, GH);
      g.flashAlpha -= 0.06;
    }

    ctx.textAlign = "left";
    ctx.restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loop = useCallback(() => {
    const g = gs.current;
    if (!g.on || g.over) return;

    g.frame++;
    g.distance += g.speed * 0.1;

    // Effective speed (time_slow)
    const effSpeed = g.hasTimeSlow ? g.speed * 0.4 : g.speed;

    // Speed progression: every 500m +0.5, cap at MAX_SPD
    g.speed = Math.min(BASE_SPD + Math.floor(g.distance / 500) * 0.5, MAX_SPD);

    // ── World system ──────────────────────────────────────────────────────────
    const newWorld = Math.min(Math.floor(g.distance / 1000), WORLDS.length - 1);
    if (newWorld > g.world) {
      g.world = newWorld;
      g.worldFlash = 60;
      g.worldFlashName = WORLDS[newWorld]?.name ?? "";
      g.flashColor = "255,215,0"; g.flashAlpha = 0.2;
    }
    if (g.worldFlash > 0) g.worldFlash--;

    const beatMult = g.hasBeat ? 2 : 1;
    g.score = Math.floor(g.frame * g.speed * 0.09 * beatMult) + g.karma * 10 * Math.max(1, g.comboCount) + g.scoreBonus;

    // Beat pulse every 60 frames
    if (g.frame % 60 === 0) g.beatPulse = 15;
    if (g.beatPulse > 0) g.beatPulse--;

    // Update clouds
    g.cx = g.cx.map((cx, i) => { const nx = cx - g.cspd[i]!; return nx < -40 ? GW + 30 : nx; });

    // Timer powerups
    if (g.shieldTimer > 0)   { g.shieldTimer--;   if (g.shieldTimer === 0)   g.hasShield   = false; }
    if (g.magnetTimer > 0)   { g.magnetTimer--;   if (g.magnetTimer === 0)   g.hasMagnet   = false; }
    if (g.starTimer   > 0)   { g.starTimer--;     if (g.starTimer   === 0)   g.hasStar     = false; }
    if (g.beatTimer   > 0)   { g.beatTimer--;     if (g.beatTimer   === 0)   g.hasBeat     = false; }
    if (g.timeSlowTimer > 0) { g.timeSlowTimer--; if (g.timeSlowTimer === 0) g.hasTimeSlow = false; }
    if (g.screenShake > 0)   g.screenShake = Math.max(0, g.screenShake - 0.6);

    // ── Class ability timers ──────────────────────────────────────────────────
    if (g.ability.cooldown > 0) g.ability.cooldown--;
    if (g.ability.active) {
      g.ability.timer--;
      if (g.ability.timer <= 0) {
        g.ability.active = false;
        g.ability.timer = 0;
        // For Influencer Spirit: shield expires with ability
        // hasShield was set separately and may already be consumed
      }
    }

    // ── Lane interpolation ────────────────────────────────────────────────────
    const targetLaneY = LANE_OFFSETS[Math.min(g.lane, 2)] ?? 0;
    g.laneY += (targetLaneY - g.laneY) * 0.15;

    // Physics (applied on top of lane floor)
    g.petVY += GRAVITY;
    g.petY = Math.max(0, g.petY - g.petVY);
    if (g.petY <= 0) { g.petY = 0; g.petVY = 0; g.jumpsLeft = 2; }

    // Trail
    const trailY = GROUND - g.laneY - g.petY;
    g.trail.unshift({ x: PET_X, y: trailY });
    if (g.trail.length > 5) g.trail.length = 5;

    // Trail neon particles
    if (g.frame % 3 === 0 && g.petY > 5) {
      spawnPtcls(g, PET_X + 10, GROUND - g.laneY - g.petY, "#00ff88", 1, 2);
    }

    // ── Karma Zone check ─────────────────────────────────────────────────────
    if (!g.inKarmaZone && g.distance > g.nxtKarmaZone) {
      g.inKarmaZone = true;
      g.karmaZoneStart = g.distance;
      g.karmaZoneEnd = g.distance + 300;
      g.flashColor = "0,229,255"; g.flashAlpha = 0.25;
    }
    if (g.inKarmaZone && g.distance > g.karmaZoneEnd) {
      g.inKarmaZone = false;
      g.nxtKarmaZone += 700;
    }

    // ── Ghost visibility check ────────────────────────────────────────────────
    g.ghosts.forEach(ghost => {
      if (!ghost.visible && g.distance >= ghost.diedAt) ghost.visible = true;
    });

    // ── Boss wave ─────────────────────────────────────────────────────────────
    if (!g.bossActive && g.distance >= g.bossSpawnDist) {
      g.bossActive = true;
      g.bossHp = 20;
      g.bossX = 380;
      g.bossY = 60;
      g.bossBullets = [];
      g.bossTimer = 0;
      g.flashColor = "255,100,0"; g.flashAlpha = 0.35;
    }

    if (g.bossActive) {
      g.bossTimer++;

      // Boss moves left, stops at 250
      if (g.bossX > 250) g.bossX -= 0.8;

      // Fire bullets every 60 frames
      if (g.bossTimer % 60 === 0) {
        const phases = [0, 2.09, 4.18];
        phases.forEach(phase => {
          g.bossBullets.push({ x: g.bossX, y: g.bossY + 40, vx: -2.5, vy: Math.sin(phase) * 1.5, phase });
        });
      }

      // Move bullets
      g.bossBullets = g.bossBullets.map(b => ({ ...b, x: b.x + b.vx, y: b.y + b.vy })).filter(b => b.x > -20 && b.y > 0 && b.y < GH);

      // Despawn after 480 frames
      if (g.bossTimer >= 480) {
        g.bossActive = false;
        g.bossBullets = [];
        g.bossSpawnDist += 1000;
      }
    }

    // ── Rocket powerup ────────────────────────────────────────────────────────
    if (g.hasRocket) {
      g.rocketX += 8;
      // Destroy obstacles in rocket path
      g.obs = g.obs.filter(o => Math.abs(o.x - g.rocketX) > 30);
      g.rocketTimer--;
      if (g.rocketTimer <= 0 || g.rocketX > GW + 50) {
        g.hasRocket = false;
        g.rocketTimer = 0;
      }
    }

    // ── Karma rain ───────────────────────────────────────────────────────────
    if (g.karmaRainActive) {
      g.karmaRainTimer--;
      g.karmaRainGems = g.karmaRainGems.map(rg => ({ ...rg, y: rg.y + rg.vy }));
      // Auto-collect at GROUND level
      g.karmaRainGems.forEach(rg => {
        if (!rg.done && rg.y > GROUND - 30) {
          rg.done = true;
          g.karma++;
          g.scoreBonus += 5;
          spawnPtcls(g, rg.x, GROUND - 20, "#ffdd00", 3, 2);
        }
      });
      g.karmaRainGems = g.karmaRainGems.filter(rg => !rg.done && rg.y < GROUND + 20);
      if (g.karmaRainTimer <= 0 && g.karmaRainGems.length === 0) {
        g.karmaRainActive = false;
      }
    }

    // ── Spawn obstacles ───────────────────────────────────────────────────────
    g.nxtObs--;
    if (g.nxtObs <= 0 && !g.bossActive) {
      const roll = Math.random();
      const distFactor = Math.min(1, g.distance / 400);
      let obs: Obs;

      if (roll < 0.28) {
        const h = 50 + Math.floor(Math.random() * 30);
        obs = { id: g.frame, x: GW + 10, w: 22, h, kind: "wall", yOff: 0, lane: 0, passed: false };
      } else if (roll < 0.50) {
        obs = { id: g.frame, x: GW + 10, w: 24, h: 28, kind: "spike", yOff: 0, lane: 0, passed: false };
      } else if (roll < 0.66 && distFactor > 0.15) {
        obs = { id: g.frame, x: GW + 10, w: 55, h: 0, kind: "pit", yOff: 0, lane: 0, passed: false };
      } else if (roll < 0.80 && distFactor > 0.3) {
        const h = 120 + Math.floor(Math.random() * 40);
        obs = { id: g.frame, x: GW + 10, w: 40, h, kind: "ceiling", yOff: 0, lane: 0, passed: false };
      } else if (distFactor > 0.5) {
        const gapH = 80 + Math.floor(Math.random() * 20);
        obs = { id: g.frame, x: GW + 10, w: 20, h: GROUND - gapH - 60, kind: "gate", yOff: gapH, lane: 0, passed: false };
      } else {
        obs = { id: g.frame, x: GW + 10, w: 22, h: 50, kind: "wall", yOff: 0, lane: 0, passed: false };
      }
      g.obs.push(obs);
      g.nxtObs = Math.max(35, 60 + Math.floor(Math.random() * 55) - Math.floor(effSpeed * 3));
    }

    // Move obstacles using effective speed
    g.obs = g.obs.map(o => ({ ...o, x: o.x - effSpeed })).filter(o => o.x > -120);

    // ── Obstacle passed tracking (jump combo multiplier) ──────────────────────
    g.obs.forEach(o => {
      if (!o.passed && o.x + o.w < PET_X - 5) {
        o.passed = true;
        g.jumpCombo = Math.min(5, g.jumpCombo + 1);
        g.jumpComboTimer = 180;
      }
    });

    // Jump combo timer countdown
    if (g.jumpComboTimer > 0) {
      g.jumpComboTimer--;
      if (g.jumpComboTimer === 0) g.jumpCombo = 1;
    }

    // ── Level system ──────────────────────────────────────────────────────────
    const newLevel = Math.floor(g.distance / 800) + 1;
    if (newLevel > g.level) {
      g.level = newLevel;
      g.levelUpFlash = 90;
      g.levelUpFrame = g.frame;
      g.flashColor = "255,215,0";
      g.flashAlpha = 0.35;
    }

    // Level-colored trail particles (every 2 frames when airborne)
    if (g.frame % 2 === 0 && g.petY > 2) {
      const trailColor = LEVEL_BG[Math.min(g.level, 5)]?.accent ?? "#00ff88";
      spawnPtcls(g, PET_X + 10 + Math.random() * 8, GROUND - g.laneY - g.petY + Math.random() * 8, trailColor, 2, 2);
    }

    // ── Karma gems ────────────────────────────────────────────────────────────
    g.nxtGem--;
    if (g.nxtGem <= 0) {
      const risky = Math.random() < 0.25;
      const yOff = risky ? -Math.floor(Math.random() * 60) - 20 : -6;
      g.gms.push({ id: g.frame + 99999, x: GW + 10, yOff, done: false, risky });
      g.nxtGem = Math.max(18, 30 + Math.floor(Math.random() * 25));
    }
    g.gms = g.gms.map(gem => ({ ...gem, x: gem.x - effSpeed })).filter(gem => gem.x > -25);

    // ── Powerups ──────────────────────────────────────────────────────────────
    g.nxtPwup--;
    if (g.nxtPwup <= 0) {
      const types: PwupKind[] = ["shield", "boost", "magnet", "star", "beat", "warp", "rocket", "time_slow", "karma_rain"];
      const weights =           [3,        3,       3,        1,      1,      1.5,    1.5,      1.5,          1.5];
      const total = weights.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * total;
      let chosen: PwupKind = "boost";
      for (let ti = 0; ti < types.length; ti++) { rnd -= weights[ti]!; if (rnd <= 0) { chosen = types[ti]!; break; } }
      g.pwups.push({ id: g.frame, x: GW + 10, type: chosen, done: false });
      g.nxtPwup = 260 + Math.floor(Math.random() * 160);
    }
    g.pwups = g.pwups.map(p => ({ ...p, x: p.x - effSpeed })).filter(p => p.x > -30);

    // ── Collision detection ───────────────────────────────────────────────────
    const pFloorY = GROUND - g.laneY; // screen Y of player's current floor
    const pL = PET_X + 6, pR = PET_X + PET_H - 6;
    const playerScreenY = GROUND - g.laneY - g.petY;
    const pT = playerScreenY - PET_H + 8;
    const pB = playerScreenY - 8;
    const petCenterY = playerScreenY - PET_H / 2;

    function triggerDeath() {
      g.over = true; g.on = false;
      g.flashAlpha = 0.9; g.flashColor = "255,50,50"; g.screenShake = 12;
      const timeSec = Math.floor((g.frame - g.startFrame) / 60);
      g.maxCombo = Math.max(g.maxCombo, g.comboCount);
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

    // Boss bullet collision
    if (g.bossActive) {
      const bHitX = PET_X + 22;
      const bHitY = petCenterY;
      for (let bi = g.bossBullets.length - 1; bi >= 0; bi--) {
        const b = g.bossBullets[bi]!;
        const dx = b.x - bHitX, dy = b.y - bHitY;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          if (g.hasShield) {
            g.hasShield = false; g.shieldTimer = 0;
            spawnPtcls(g, bHitX, bHitY, "#00e5ff", 6, 3);
            g.screenShake = 4; g.comboCount = 0;
            g.bossBullets.splice(bi, 1);
          } else {
            triggerDeath(); return;
          }
        }
      }
    }

    for (const o of g.obs) {
      if (g.hasStar) continue;
      // Grinder Beast rage: smash through obstacles
      if (g.ability.active && petClassRef.current === "Grinder Beast") {
        // Shatter if overlapping
        if (pR > o.x + 3 && pL < o.x + o.w - 3) {
          spawnPtcls(g, o.x + o.w / 2, GROUND - Math.max(o.h, 20), "#ff6600", 6, 4);
          g.obs = g.obs.filter(x => x !== o);
        }
        continue;
      }

      if (o.kind === "pit") {
        // Pit: player falls in if on ground level (lane 0) and over gap
        if (g.lane === 0 && pR > o.x && pL < o.x + o.w && g.petY < 5) {
          if (g.hasShield) {
            g.hasShield = false; g.shieldTimer = 0;
            spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3);
            g.screenShake = 4; g.comboCount = 0;
            g.petVY = JUMP_V * 0.6; g.petY = 10; g.jumpsLeft = 1;
            g.obs = g.obs.filter(x => x !== o);
            continue;
          }
          triggerDeath(); return;
        }
      } else if (o.kind === "ceiling") {
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
        const gapBottom = GROUND - o.yOff;
        const gapTop = GROUND - o.h;
        if (pR > o.x && pL < o.x + o.w) {
          if (pB > gapBottom && pT < pFloorY) {
            if (g.hasShield) { g.hasShield = false; g.shieldTimer = 0; spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3); g.screenShake = 4; g.comboCount = 0; g.obs = g.obs.filter(x => x !== o); continue; }
            triggerDeath(); return;
          }
          if (pT < gapTop && pB > 0) {
            if (g.hasShield) { g.hasShield = false; g.shieldTimer = 0; spawnPtcls(g, PET_X + 22, petCenterY, "#00e5ff", 6, 3); g.screenShake = 4; g.comboCount = 0; g.obs = g.obs.filter(x => x !== o); continue; }
            triggerDeath(); return;
          }
        }
      } else {
        // wall / spike — standard AABB; lanes: lane > 0 naturally avoids ground obstacles
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

    // ── Level boss collision ──────────────────────────────────────────────────
    if (g.lvlBossActive) {
      const lvlBossCurrentY = g.lvlBossBaseY + Math.sin(g.frame * 0.08) * 60;
      const bossCX = g.lvlBossX + 26;
      const bossCY = lvlBossCurrentY + 26;
      const dx = (PET_X + 22) - bossCX;
      const dy = petCenterY - bossCY;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        if (g.ability.active && petClassRef.current === "Grinder Beast") {
          spawnPtcls(g, bossCX, bossCY, "#ff6600", 10, 5);
        } else if (g.hasShield || g.hasStar || (g.ability.active && petClassRef.current === "Influencer Spirit")) {
          g.hasShield = false; g.shieldTimer = 0;
          spawnPtcls(g, bossCX, bossCY, "#00e5ff", 8, 4);
          g.screenShake = 5;
        } else {
          triggerDeath(); return;
        }
      }
      // Boss passed the screen — player survived
      g.lvlBossX -= Math.max(2.5, effSpeed * 0.75);
      if (g.lvlBossX < -80) {
        g.lvlBossActive = false;
        g.karma += 50;
        g.scoreBonus += 300;
        g.lvlBossDefeatedFlash = 120;
        g.lvlBossNextLevel += 5;
        g.flashColor = "255,215,0"; g.flashAlpha = 0.45;
        spawnPtcls(g, GW / 2, GH / 2, "#ffd700", 18, 5);
      }
    }
    if (g.lvlBossDefeatedFlash > 0) g.lvlBossDefeatedFlash--;

    // ── Level boss warning / spawn trigger ───────────────────────────────────
    if (!g.lvlBossActive && g.lvlBossWarning === 0 && g.lvlBossDefeatedFlash === 0
        && g.level >= g.lvlBossNextLevel && g.level >= 5) {
      g.lvlBossWarning = 120; // 2-second warning
    }
    if (g.lvlBossWarning > 0) {
      g.lvlBossWarning--;
      if (g.lvlBossWarning === 0) {
        // Spawn boss
        g.lvlBossActive = true;
        g.lvlBossX = GW + 30;
        g.lvlBossBaseY = 190;
        g.lvlBossEmoji = getLevelBossEmoji(g.lvlBossNextLevel);
        g.lvlBossLevel = g.lvlBossNextLevel;
        g.flashColor = "255,60,0"; g.flashAlpha = 0.4;
        g.screenShake = 6;
      }
    }

    // ── Karma gem collection ──────────────────────────────────────────────────
    g.gms.forEach(gem => {
      if (gem.done) return;
      const gy = GROUND + gem.yOff - 10;
      // Merchant King ability extends magnet range further
      const magnetActive = g.hasMagnet || (g.ability.active && petClassRef.current === "Merchant King");
      const magnetRange = (g.ability.active && petClassRef.current === "Merchant King") ? 80 : 55;
      const inRange = magnetActive
        ? (Math.abs(gem.x - (PET_X + 22)) < magnetRange && Math.abs(gy - petCenterY) < magnetRange)
        : (gem.x < pR && gem.x + 16 > pL && gy < pB && gy + 16 > pT);
      if (inRange) {
        gem.done = true;
        const bonus = gem.risky ? 2 : 1;
        const zoneMult = g.inKarmaZone ? 3 : 1;
        const comboMult = g.jumpCombo >= 3 ? 2 : 1;
        // Merchant King ability: 3× gems
        const abilityMult = (g.ability.active && petClassRef.current === "Merchant King") ? 3 : 1;
        g.karma += bonus * zoneMult * comboMult * abilityMult;
        g.karmaChain++;
        g.comboCount++;
        g.maxCombo = Math.max(g.maxCombo, g.comboCount);
        const chainMult = g.karmaChain >= 10 ? 2 : 1;
        g.scoreBonus += 5 * bonus * chainMult * zoneMult * comboMult * abilityMult;
        spawnPtcls(g, gem.x, gy, g.inKarmaZone ? "#00e5ff" : "#ffdd00", 4, 3);
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
        spawnPtcls(g, p.x, py, "#ffffff", 5, 3);
        switch (p.type) {
          case "shield":
            g.hasShield = true; g.shieldTimer = 300;
            break;
          case "boost":
            g.scoreBonus += 80; g.flashColor = "200,255,0"; g.flashAlpha = 0.25;
            break;
          case "magnet":
            g.hasMagnet = true; g.magnetTimer = 400;
            break;
          case "star":
            g.hasStar = true; g.starTimer = 180; g.flashColor = "255,220,0"; g.flashAlpha = 0.3;
            spawnPtcls(g, PET_X + 22, petCenterY, "#ffdd00", 8, 4);
            break;
          case "beat":
            g.hasBeat = true; g.beatTimer = 300; g.flashColor = "255,100,0"; g.flashAlpha = 0.2;
            break;
          case "warp":
            g.obs = g.obs.filter(o => o.x < PET_X + 50 || o.x > PET_X + 250);
            g.warpActive = true; g.warpFrame = g.frame;
            g.flashColor = "170,68,255"; g.flashAlpha = 0.3;
            spawnPtcls(g, PET_X + 22, petCenterY, "#aa44ff", 8, 4);
            break;
          case "rocket":
            g.hasRocket = true; g.rocketTimer = 120; g.rocketX = PET_X + 50;
            g.flashColor = "255,136,0"; g.flashAlpha = 0.25;
            spawnPtcls(g, PET_X + 22, petCenterY, "#ff8800", 6, 3);
            break;
          case "time_slow":
            g.hasTimeSlow = true; g.timeSlowTimer = 240;
            g.flashColor = "170,170,255"; g.flashAlpha = 0.2;
            spawnPtcls(g, PET_X + 22, petCenterY, "#aaaaff", 6, 3);
            break;
          case "karma_rain":
            g.karmaRainActive = true; g.karmaRainTimer = 180;
            // Spawn 20 rain gems
            for (let ri = 0; ri < 20; ri++) {
              g.karmaRainGems.push({
                x: Math.random() * (GW - 20) + 10,
                y: -10 - Math.random() * 80,
                vy: 3,
                done: false,
              });
            }
            g.flashColor = "0,255,204"; g.flashAlpha = 0.2;
            spawnPtcls(g, PET_X + 22, petCenterY, "#00ffcc", 6, 3);
            break;
        }
      }
    });

    if (g.warpActive && g.frame - g.warpFrame > 30) g.warpActive = false;

    // ── Boss damage on tap (handled via jump/click, tracked via bossHit) ─────
    // Done in jump() — bossHp decremented there

    // ── Particles ─────────────────────────────────────────────────────────────
    g.particles = g.particles
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.18, life: p.life - 0.04 }))
      .filter(p => p.life > 0);

    if (g.frame % 4 === 0) {
      setUi({ combo: g.comboCount, karmaChain: g.karmaChain, shield: g.hasShield, speed: g.speed, lane: g.lane, world: g.world, level: g.level, jumpCombo: g.jumpCombo });
      setAbilityUi({ active: g.ability.active, cooldown: g.ability.cooldown });
    }

    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, onEnd]);

  const activateAbility = useCallback(() => {
    const g = gs.current;
    if (!g.on || g.over || g.ability.cooldown > 0 || g.ability.active) return;
    const pc = petClassRef.current;
    const info = ABILITY_INFO[pc];
    if (!info) return;
    const COOLDOWN = 900; // 15 seconds at 60fps
    g.ability.active = true;
    g.ability.cooldown = COOLDOWN;
    g.ability.timer = info.duration;
    if (pc === "Influencer Spirit") {
      // Star Shield also grants shield powerup for 5s
      g.hasShield = true; g.shieldTimer = info.duration;
    } else if (pc === "Merchant King") {
      // Coin Magnet amplifies existing magnet
      g.hasMagnet = true; g.magnetTimer = Math.max(g.magnetTimer, info.duration);
    }
    g.flashColor = info.flashRgb; g.flashAlpha = 0.35;
    spawnPtcls(g, PET_X + 22, GROUND - g.petY - PET_H / 2, classColorRef.current, 10, 4);
    setAbilityUi({ active: true, cooldown: COOLDOWN });
  }, []);

  function jump() {
    const g = gs.current;
    if (phase === "idle") {
      g.on = true; g.startFrame = g.frame;
      setPhase("on"); raf.current = requestAnimationFrame(loop); return;
    }
    // Boss damage on tap
    if (g.bossActive && !g.over) {
      g.bossHp--;
      if (g.bossHp <= 0) {
        // Boss defeated
        g.bossActive = false;
        g.bossBullets = [];
        g.bossSpawnDist += 1000;
        g.scoreBonus += 200;
        g.flashColor = "255,215,0"; g.flashAlpha = 0.5;
        // Spawn 15 karma gems as reward
        for (let bi = 0; bi < 15; bi++) {
          g.gms.push({
            id: g.frame + 88888 + bi,
            x: 100 + bi * 18,
            yOff: -20 - Math.floor(Math.random() * 40),
            done: false,
            risky: false,
          });
        }
        spawnPtcls(g, GW / 2, GH / 2, "#ffd700", 20, 5);
        return;
      }
      spawnPtcls(g, g.bossX, g.bossY + 40, "#ff4400", 4, 3);
      g.screenShake = 2;
      return;
    }
    if (g.jumpsLeft > 0 && !g.over) {
      g.petVY = g.jumpsLeft === 2 ? JUMP_V : JUMP_V * 0.82; g.jumpsLeft--;
      g.karmaChain = 0; // reset chain on jump (forces skill)
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    swipeStartY.current = e.clientY;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const g = gs.current;
    if (swipeStartY.current === null) return;
    const deltaY = e.clientY - swipeStartY.current;
    swipeStartY.current = null;

    if (Math.abs(deltaY) > 30) {
      // Swipe detected — change lane
      if (deltaY > 30) {
        // Swipe down: decrease lane (move to lower lane)
        g.lane = Math.max(0, g.lane - 1);
      } else if (deltaY < -30) {
        // Swipe up: increase lane (move to higher lane)
        g.lane = Math.min(2, g.lane + 1);
      }
    } else {
      // Short tap: jump
      jump();
    }
  }

  function restart() {
    cancelAnimationFrame(raf.current);
    gs.current = mkGS(); setPhase("idle");
    setFin({ score: 0, karma: 0, maxCombo: 0, timeSec: 0, dist: 0 });
    setUi({ combo: 0, karmaChain: 0, shield: false, speed: BASE_SPD, lane: 0, world: 0, level: 1, jumpCombo: 1 });
    setAbilityUi({ active: false, cooldown: 0 });
    setCopied(false); setShaking(false);
    raf.current = requestAnimationFrame(draw);
  }

  function copyScore() {
    const text = `I ran ${fin.dist}m and earned ${fin.karma} ⚡ karma in Karma Runner! 💀`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  useEffect(() => { requestAnimationFrame(draw); return () => cancelAnimationFrame(raf.current); }, [draw]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
      if (e.code === "ArrowDown") { const g = gs.current; g.lane = Math.max(0, g.lane - 1); }
      if (e.code === "ArrowUp" && e.shiftKey) { const g = gs.current; g.lane = Math.min(2, g.lane + 1); }
    };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
  const speedMult = (ui.speed / BASE_SPD).toFixed(1);

  const deathGhost = gs.current.ghosts.find(gh => gh.name === gs.current.deathGhostName);
  const wIdx = Math.min(gs.current.world, WORLDS.length - 1);
  const currentWorld = WORLDS[wIdx]!;

  // Ability UI derived values
  const abilityLabel = ABILITY_INFO[pet.class]?.label ?? "⚡ ABILITY";

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
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => {/* handled by pointerUp tap detection */}}
        onTouchStart={e => e.preventDefault()}
      />

      {/* IDLE SCREEN */}
      {phase === "idle" && (
        <div
          onClick={jump}
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", borderRadius: 16, gap: 8, cursor: "pointer",
            background: gs.current.world === 0
              ? "linear-gradient(160deg,rgba(90,184,245,0.94) 0%,rgba(168,216,240,0.94) 100%)"
              : gs.current.world === 1
              ? "linear-gradient(160deg,rgba(247,200,224,0.94) 0%,rgba(255,228,240,0.94) 100%)"
              : "rgba(5,5,16,0.88)",
          }}
        >
          <div style={{ fontSize: "3.2rem" }}>{activePetEmoji}</div>
          <div style={{
            color: gs.current.world <= 1 ? "#1a4a00" : "#c8ff00",
            fontSize: 22, fontWeight: 900, letterSpacing: 3,
            textShadow: gs.current.world <= 1 ? "0 0 16px rgba(255,255,255,0.7)" : "0 0 20px #c8ff00",
          }}>KARMA RUNNER</div>
          <div style={{ color: gs.current.world <= 1 ? "#3a5a2a" : "#666", fontSize: 11 }}>GEOMETRY DASH STYLE • 7 WORLDS • BOSS WAVES</div>

          {/* World selector */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 350, marginTop: 2 }}>
            {WORLDS.map((w, i) => (
              <button
                key={w.name}
                onClick={e => { e.stopPropagation(); gs.current.world = i; setUi(u => ({ ...u, world: i })); }}
                style={{
                  padding: "4px 8px", borderRadius: 8, fontSize: 9, fontWeight: 800, cursor: "pointer",
                  border: gs.current.world === i ? "2px solid #fff" : "1px solid rgba(0,0,0,0.2)",
                  background: i === 0
                    ? "linear-gradient(135deg,#74d7f7,#a8f0a8)"
                    : i === 1
                    ? "linear-gradient(135deg,#f9b8d8,#ffd6ec)"
                    : "rgba(0,0,0,0.55)",
                  color: i <= 1 ? "#1a3a00" : "#aaa",
                  boxShadow: gs.current.world === i ? "0 0 8px rgba(255,255,255,0.6)" : "none",
                  transform: gs.current.world === i ? "scale(1.08)" : "scale(1)",
                  transition: "transform 0.12s",
                }}
              >
                {w.bossEmoji} {w.name}
              </button>
            ))}
          </div>

          <div style={{
            fontSize: 10, fontWeight: 700, marginTop: 0,
            color: gs.current.world <= 1 ? "#2a5a00" : "#888",
            background: gs.current.world <= 1 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.06)",
            padding: "3px 12px", borderRadius: 20,
          }}>
            STARTING: {WORLDS[Math.min(gs.current.world, WORLDS.length - 1)]?.name}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 }}>
            {([["🧱","WALL"],["⬆️","SPIKE"],["⬇️","PIT"],["🚧","CEILING"],["🚪","GATE"],["⚡","KARMA"],["👑","BOSS"],["🛤️","LANES"]] as [string,string][]).map(([e, t]) => (
              <div key={t} style={{
                textAlign: "center", borderRadius: 8, padding: "5px 9px",
                background: gs.current.world <= 1 ? "rgba(255,255,255,0.5)" : "#0a0010",
                border: gs.current.world <= 1 ? "1px solid rgba(0,0,0,0.1)" : "1px solid #2a0a3a",
              }}>
                <div style={{ fontSize: "1rem" }}>{e}</div>
                <div style={{ fontSize: 8, color: gs.current.world <= 1 ? "#3a4a2a" : "#666", fontWeight: 700 }}>{t}</div>
              </div>
            ))}
          </div>
          {best > 0 && <div style={{ color: gs.current.world <= 1 ? "#2a4a00" : "#888", fontSize: 11, marginTop: 2 }}>BEST: <span style={{ color: gs.current.world <= 1 ? "#1a7a00" : "#c8ff00", fontWeight: 700 }}>{best}</span></div>}
          <div style={{ color: gs.current.world <= 1 ? "#3a5a2a" : "#444", fontSize: 10, marginTop: 2 }}>TAP / SPACE TO START • SWIPE UP/DOWN TO CHANGE LANE</div>
          <div style={{ color: gs.current.world <= 1 ? "#4a6a3a" : "#333", fontSize: 9 }}>7 WORLDS • BOSS WAVES • KARMA ZONES • DOUBLE JUMP</div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {phase === "over" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,5,16,0.95)", borderRadius: 16, gap: 7 }}>
          <div style={{ fontSize: "2.8rem", animation: "pulse 0.7s ease-in-out infinite alternate" }}>{currentWorld.ripEmoji}</div>
          <div style={{ color: "#ff2d8d", fontSize: 22, fontWeight: 900, letterSpacing: 3, textShadow: "0 0 18px #ff2d8d" }}>GAME OVER</div>
          <div style={{ color: currentWorld.ground, fontSize: 11, fontWeight: 700, opacity: 0.7 }}>{currentWorld.name}</div>
          <div style={{ color: "#c8ff00", fontSize: 40, fontWeight: 900, textShadow: "0 0 24px #c8ff0077", lineHeight: 1 }}>{fin.score}</div>
          {fin.score > best && <div style={{ color: "#ffdd00", fontSize: 12, fontWeight: 700 }}>🏆 NEW BEST!</div>}
          {fin.score <= best && best > 0 && <div style={{ color: "#555", fontSize: 11 }}>BEST: <span style={{ color: "#c8ff00" }}>{best}</span></div>}

          {gs.current.deathGhostName && (
            <div style={{ color: "#ffffff88", fontSize: 10, fontStyle: "italic", background: "#ffffff11", borderRadius: 8, padding: "4px 10px" }}>
              {deathGhost?.emoji} @{gs.current.deathGhostName} died {gs.current.deathGhostDist}m {gs.current.deathGhostDist < 10 ? "away" : "from here"} 👻
            </div>
          )}

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
        <>
          {/* Class ability button */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "8px 0" }}>
            <button
              onClick={activateAbility}
              disabled={abilityUi.cooldown > 0}
              style={{
                background: abilityUi.active ? classColor : abilityUi.cooldown > 0 ? "#1a1a1a" : "#0d0d0d",
                border: `2px solid ${classColor}`,
                borderRadius: 14, padding: "10px 24px",
                color: abilityUi.cooldown > 0 ? "#555" : classColor,
                fontWeight: 700, fontSize: 13, cursor: abilityUi.cooldown > 0 ? "not-allowed" : "pointer",
                boxShadow: abilityUi.active ? `0 0 20px ${classColor}` : "none",
                transition: "all 0.2s",
              }}
            >
              {abilityUi.active ? "✨ ACTIVE!" : abilityUi.cooldown > 0 ? `⏳ ${Math.ceil(abilityUi.cooldown / 60)}s` : abilityLabel}
            </button>
          </div>
          {/* Cooldown bar */}
          {abilityUi.cooldown > 0 && !abilityUi.active && (
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}>
              <div style={{ width: 160, height: 4, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${Math.round((1 - abilityUi.cooldown / 900) * 100)}%`,
                  background: classColor, transition: "width 0.1s linear",
                }} />
              </div>
            </div>
          )}
          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ color: "#ffdd00", fontSize: 11, fontWeight: 700 }}>⚡ KARMA</span>
            <span style={{ color: ui.speed > 9 ? "#ff4444" : ui.speed > 7 ? "#ff9900" : "#c8ff00", fontSize: 11, fontWeight: 700 }}>×{speedMult} SPD</span>
            <span style={{ color: (LEVEL_BG[Math.min(ui.level, 5)]?.accent ?? "#00ff88"), fontSize: 11, fontWeight: 700 }}>LVL {ui.level}</span>
            {ui.jumpCombo > 1 && <span style={{ color: ui.jumpCombo >= 5 ? "#ffd700" : ui.jumpCombo >= 3 ? "#ff6600" : "#ff9900", fontSize: 11, fontWeight: 700 }}>×{ui.jumpCombo} COMBO</span>}
            {ui.combo > 1 && <span style={{ color: "#ff6600", fontSize: 11, fontWeight: 700 }}>🔥 ×{ui.combo}</span>}
            {ui.karmaChain >= 5 && <span style={{ color: "#ffdd00", fontSize: 11, fontWeight: 700 }}>CHAIN ×{ui.karmaChain}</span>}
            {ui.shield && <span style={{ fontSize: 13 }}>🛡️</span>}
            <span style={{ color: "#666", fontSize: 10 }}>LN {ui.lane + 1}/3</span>
            <span style={{ color: "#444", fontSize: 9 }}>TAP JUMP • SWIPE LANE</span>
          </div>
        </>
      )}

      <style>{`@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.18); } }`}</style>
    </div>
  );
}
