"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "idle" | "casting" | "waiting" | "bite" | "reeling" | "timing" | "result";
type SpecialEvent = "STORM!" | "RARE SPAWN!" | "MIDNIGHT ZONE" | "FEEDING FRENZY" | null;
type Rarity = "common" | "rare" | "legendary" | "secret";
type DepthZone = 1 | 2 | 3;
type Weather = "calm" | "rainy" | "stormy";
type BaitType = "worm" | "cricket" | "golden";

interface FishDef {
  emoji: string;
  name: string;
  rarity: Rarity;
  zone: DepthZone;
  karma: number;
  xp: number;
  speed: number;
  size: number;
  /** width of the green zone 0-100 in timing bar */
  zoneWidth: number;
}

interface LiveFish {
  def: FishDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wobble: number;
  wobbleSpeed: number;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Seaweed {
  x: number;
  segments: number;
  phase: number;
}

interface Jellyfish {
  x: number;
  y: number;
  vy: number;
  color: string;
  r: number;
  pulse: number;
}

interface LightShaft {
  x: number;
  width: number;
  speed: number;
  offset: number;
}

interface GameState {
  fish: LiveFish[];
  hookY: number;
  targetFishIdx: number;
  bubbles: Bubble[];
  particles: Particle[];
  clouds: Cloud[];
  seaweeds: Seaweed[];
  jellies: Jellyfish[];
  shafts: LightShaft[];
  shakeX: number;
  shakeY: number;
  shakeDuration: number;
  biteRing: number;  // 0-1 pulse animation
  reelGauge: number; // 0-100
  reelTaps: number;
  reelDecay: number; // frames since last reel tap
  t: number;         // frame counter
  eventTimer: number; // frames until next event check
}

interface CaughtRecord {
  def: FishDef;
  count: number;
}

interface Props {
  onCatch: (karma: number, xp: number, fishName: string, rarity: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CW = 360;
const CH = 320;
const SKY_H = 28;           // 0 → 28
const WATER_TOP = SKY_H;
const WATER_H = CH - SKY_H; // 445px of water
// Zone boundaries (absolute Y)
const ZONE1_MAX_Y = SKY_H + WATER_H * 0.28; // ~180
const ZONE2_MAX_Y = SKY_H + WATER_H * 0.62; // ~331
const ZONE3_MAX_Y = CH;                       // 500
const REEL_TAPS_NEEDED = 10;
const BOBBER_X = CW * 0.5;
const BOBBER_Y = SKY_H + 4;
const LINE_X = BOBBER_X;

// Fish roster: 20 species
const FISH_ROSTER: FishDef[] = [
  // Common — zone 1
  { emoji: "🐟", name: "Sardine",       rarity: "common",    zone: 1, karma: 12,  xp: 8,   speed: 1.4, size: 20, zoneWidth: 38 },
  { emoji: "🐠", name: "Clownfish",     rarity: "common",    zone: 1, karma: 18,  xp: 12,  speed: 1.1, size: 22, zoneWidth: 36 },
  { emoji: "🦐", name: "Shrimp",        rarity: "common",    zone: 1, karma: 10,  xp: 7,   speed: 1.6, size: 16, zoneWidth: 40 },
  { emoji: "🐡", name: "Pufferfish",    rarity: "common",    zone: 1, karma: 20,  xp: 14,  speed: 0.8, size: 24, zoneWidth: 35 },
  { emoji: "🫧",  name: "Bubble Fish",  rarity: "common",    zone: 1, karma: 8,   xp: 5,   speed: 0.6, size: 18, zoneWidth: 42 },
  { emoji: "🦑", name: "Baby Squid",    rarity: "common",    zone: 1, karma: 15,  xp: 10,  speed: 1.3, size: 20, zoneWidth: 37 },
  // Rare — zone 2
  { emoji: "🦞", name: "Lobster",       rarity: "rare",      zone: 2, karma: 65,  xp: 42,  speed: 0.7, size: 26, zoneWidth: 28 },
  { emoji: "🐙", name: "Octopus",       rarity: "rare",      zone: 2, karma: 80,  xp: 55,  speed: 0.9, size: 28, zoneWidth: 26 },
  { emoji: "🦀", name: "Crab",          rarity: "rare",      zone: 2, karma: 55,  xp: 38,  speed: 0.6, size: 24, zoneWidth: 30 },
  { emoji: "🐬", name: "Dolphin",       rarity: "rare",      zone: 2, karma: 90,  xp: 60,  speed: 2.1, size: 32, zoneWidth: 22 },
  { emoji: "🦋", name: "Butterfly Fish",rarity: "rare",      zone: 2, karma: 70,  xp: 48,  speed: 1.2, size: 24, zoneWidth: 27 },
  { emoji: "🐊", name: "Sea Croc",      rarity: "rare",      zone: 2, karma: 100, xp: 68,  speed: 1.5, size: 34, zoneWidth: 20 },
  // Legendary — zone 3
  { emoji: "🦈", name: "Great Shark",   rarity: "legendary", zone: 3, karma: 180, xp: 120, speed: 2.5, size: 40, zoneWidth: 14 },
  { emoji: "🐋", name: "Blue Whale",    rarity: "legendary", zone: 3, karma: 300, xp: 200, speed: 1.0, size: 48, zoneWidth: 11 },
  { emoji: "🐲", name: "Sea Dragon",    rarity: "legendary", zone: 3, karma: 250, xp: 170, speed: 1.8, size: 44, zoneWidth: 12 },
  { emoji: "🌊", name: "Wave Spirit",   rarity: "legendary", zone: 3, karma: 220, xp: 150, speed: 2.0, size: 40, zoneWidth: 13 },
  { emoji: "🦑", name: "Giant Squid",   rarity: "legendary", zone: 3, karma: 200, xp: 140, speed: 1.3, size: 46, zoneWidth: 12 },
  { emoji: "🐳", name: "Sperm Whale",   rarity: "legendary", zone: 3, karma: 280, xp: 185, speed: 0.9, size: 50, zoneWidth: 10 },
  // Secret — any zone, ultra rare
  { emoji: "🪸", name: "Coral Spirit",  rarity: "secret",    zone: 3, karma: 500, xp: 350, speed: 0.5, size: 36, zoneWidth: 7  },
  { emoji: "⚡", name: "Electric Eel",  rarity: "secret",    zone: 3, karma: 450, xp: 300, speed: 3.0, size: 30, zoneWidth: 6  },
  // 10 New Species
  { emoji: "🐚", name: "Nautilus",       rarity: "common",    zone: 1, karma: 14,  xp: 9,   speed: 0.5, size: 18, zoneWidth: 41 },
  { emoji: "🦦", name: "Sea Otter",      rarity: "common",    zone: 1, karma: 28,  xp: 18,  speed: 1.8, size: 24, zoneWidth: 36 },
  { emoji: "🐢", name: "Sea Turtle",     rarity: "rare",      zone: 2, karma: 72,  xp: 48,  speed: 0.6, size: 28, zoneWidth: 27 },
  { emoji: "🦭", name: "Leopard Seal",   rarity: "rare",      zone: 2, karma: 62,  xp: 42,  speed: 1.9, size: 30, zoneWidth: 25 },
  { emoji: "🎏", name: "Phantom Koi",    rarity: "rare",      zone: 2, karma: 110, xp: 75,  speed: 0.8, size: 26, zoneWidth: 21 },
  { emoji: "🐉", name: "Leviathan",      rarity: "legendary", zone: 3, karma: 350, xp: 235, speed: 1.4, size: 52, zoneWidth: 9  },
  { emoji: "🌟", name: "Star King",      rarity: "legendary", zone: 3, karma: 230, xp: 155, speed: 0.7, size: 38, zoneWidth: 13 },
  { emoji: "🌀", name: "Vortex Manta",   rarity: "legendary", zone: 3, karma: 275, xp: 185, speed: 2.4, size: 44, zoneWidth: 11 },
  { emoji: "🔮", name: "Crystal Oracle", rarity: "secret",    zone: 3, karma: 700, xp: 500, speed: 0.3, size: 40, zoneWidth: 4  },
  { emoji: "💀", name: "Shadow Ghost",   rarity: "secret",    zone: 3, karma: 550, xp: 380, speed: 3.5, size: 32, zoneWidth: 5  },
];

const RARITY_COLOR: Record<Rarity, string> = {
  common:    "#7ad4ff",
  rare:      "#cc55ff",
  legendary: "#ffcc00",
  secret:    "#ff2299",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common:    "COMMON",
  rare:      "RARE",
  legendary: "LEGENDARY",
  secret:    "SECRET",
};

const WEATHER_ICON: Record<Weather, string> = {
  calm:   "☀️",
  rainy:  "🌧️",
  stormy: "⛈️",
};

const BAIT_ICON: Record<BaitType, string> = { worm: "🪱", cricket: "🦗", golden: "🧲" };
const BAIT_LABEL: Record<BaitType, string> = { worm: "Worm", cricket: "Cricket", golden: "Gold Lure" };

const ZONE_LABEL: Record<DepthZone, string> = { 1: "SURFACE", 2: "MIDWATER", 3: "ABYSS" };
const ZONE_COLOR: Record<DepthZone, string> = {
  1: "#0066aa",
  2: "#003366",
  3: "#000820",
};

// Combo thresholds
const COMBO_THRESHOLDS = [
  { at: 8, mult: 3.0, label: "×3 INSANE!" },
  { at: 5, mult: 2.0, label: "×2 AMAZING!" },
  { at: 3, mult: 1.5, label: "×1.5 NICE!" },
];

function getCombo(streak: number): { mult: number; label: string } {
  for (const t of COMBO_THRESHOLDS) {
    if (streak >= t.at) return { mult: t.mult, label: t.label };
  }
  return { mult: 1, label: "" };
}

// ─── Spawn helpers ────────────────────────────────────────────────────────────

function zoneYRange(zone: DepthZone): [number, number] {
  if (zone === 1) return [WATER_TOP + 10, ZONE1_MAX_Y - 10];
  if (zone === 2) return [ZONE1_MAX_Y + 10, ZONE2_MAX_Y - 10];
  return [ZONE2_MAX_Y + 10, ZONE3_MAX_Y - 20];
}

function pickFish(
  activeZone: DepthZone,
  bait: BaitType,
  weather: Weather
): FishDef {
  // Zone filtering: fish prefer their zone but can stray ±1
  const eligible = FISH_ROSTER.filter(f => {
    const diff = Math.abs(f.zone - activeZone);
    return diff <= 1;
  });

  // Base weights
  const weights = eligible.map(f => {
    let w =
      f.rarity === "common"    ? 50 :
      f.rarity === "rare"      ? 30 :
      f.rarity === "legendary" ? 15 : 1; // secret

    // Bait bonuses
    if (bait === "cricket" && f.rarity === "rare")      w *= 2;
    if (bait === "golden"  && f.rarity === "legendary") w *= 3;
    if (bait === "golden"  && f.rarity === "secret")    w *= 5;

    // Weather bonuses
    if (weather === "rainy" && f.rarity === "rare")     w *= 1.5;
    if (weather === "stormy" && f.rarity === "legendary") w *= 1.3;

    // Prefer fish native to active zone
    if (f.zone === activeZone) w *= 2;

    return w;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

function spawnLiveFish(
  def: FishDef,
  forceZone?: DepthZone
): LiveFish {
  const [yMin, yMax] = zoneYRange(forceZone ?? def.zone);
  const goLeft = Math.random() < 0.5;
  return {
    def,
    x: goLeft ? CW + 40 : -40,
    y: yMin + Math.random() * (yMax - yMin),
    vx: (def.speed * (0.7 + Math.random() * 0.6)) * (goLeft ? -1 : 1),
    vy: (Math.random() - 0.5) * 0.15,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.03,
  };
}

function spawnCloud(): Cloud {
  return {
    x: CW + 60,
    y: 5 + Math.random() * 30,
    w: 50 + Math.random() * 70,
    h: 18 + Math.random() * 20,
    speed: 0.15 + Math.random() * 0.2,
  };
}

function spawnJelly(): Jellyfish {
  const colors = ["#ff55ff", "#55ffff", "#aaddff", "#ffaaff"];
  return {
    x: Math.random() * CW,
    y: ZONE2_MAX_Y + 10 + Math.random() * (CH - ZONE2_MAX_Y - 40),
    vy: -(0.2 + Math.random() * 0.25),
    color: colors[Math.floor(Math.random() * colors.length)],
    r: 8 + Math.random() * 12,
    pulse: Math.random() * Math.PI * 2,
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DeepCatch({ onCatch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>({
    fish: [],
    hookY: -80,
    targetFishIdx: -1,
    bubbles: [],
    particles: [],
    clouds: [],
    seaweeds: [],
    jellies: [],
    shafts: [],
    shakeX: 0,
    shakeY: 0,
    shakeDuration: 0,
    biteRing: 0,
    reelGauge: 0,
    reelTaps: 0,
    reelDecay: 0,
    t: 0,
    eventTimer: 300 + Math.floor(Math.random() * 300),
  });
  const rafRef = useRef<number>(0);

  // Phase
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");

  // Timing bar
  const markerRef = useRef(50);
  const markerDirRef = useRef(1);
  const markerSpeedRef = useRef(1.8);
  const [markerPct, setMarkerPct] = useState(50);

  // Zone the hook is targeting
  const [activeZone, setActiveZone] = useState<DepthZone>(1);
  const activeZoneRef = useRef<DepthZone>(1);

  // Game settings
  const [weather] = useState<Weather>(() => {
    const r = Math.random();
    return r < 0.33 ? "calm" : r < 0.66 ? "rainy" : "stormy";
  });
  const [bait, setBait] = useState<BaitType>("worm");
  const [goldenUses, setGoldenUses] = useState(5);
  const baitRef = useRef<BaitType>("worm");
  const goldenUsesRef = useRef(5);

  // Score / combo
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);
  const [best, setBest] = useState(0);

  // Catch result
  const [caughtFish, setCaughtFish] = useState<FishDef | null>(null);
  const [catchKarma, setCatchKarma] = useState(0);
  const [catchXP, setCatchXP] = useState(0);
  const [isMiss, setIsMiss] = useState(false);

  // Collection
  const [collection, setCollection] = useState<Map<string, CaughtRecord>>(new Map());
  const [showCollection, setShowCollection] = useState(false);

  // Special events
  const [specialEvent, setSpecialEvent] = useState<SpecialEvent>(null);
  const specialEventRef = useRef<SpecialEvent>(null);

  // Trophy (first catch)
  const [trophyFish, setTrophyFish] = useState<FishDef | null>(null);

  // Bite window timer
  const biteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hook target Y for the chosen zone
  function zoneTargetY(zone: DepthZone): number {
    if (zone === 1) return WATER_TOP + (ZONE1_MAX_Y - WATER_TOP) * 0.6;
    if (zone === 2) return ZONE1_MAX_Y + (ZONE2_MAX_Y - ZONE1_MAX_Y) * 0.6;
    return ZONE2_MAX_Y + (CH - ZONE2_MAX_Y) * 0.55;
  }

  // ─── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const gs = gsRef.current;

    // Seed fish across all zones
    for (let zone = 1; zone <= 3; zone++) {
      const count = zone === 1 ? 6 : zone === 2 ? 5 : 4;
      for (let i = 0; i < count; i++) {
        const candidates = FISH_ROSTER.filter(f => f.zone === zone);
        const def = candidates[Math.floor(Math.random() * candidates.length)];
        gs.fish.push(spawnLiveFish(def, zone as DepthZone));
      }
    }

    // Bubbles
    for (let i = 0; i < 30; i++) {
      gs.bubbles.push({
        x: Math.random() * CW,
        y: WATER_TOP + Math.random() * WATER_H,
        r: 0.8 + Math.random() * 2.5,
        vy: -(0.3 + Math.random() * 0.5),
        alpha: 0.2 + Math.random() * 0.4,
      });
    }

    // Clouds
    for (let i = 0; i < 4; i++) {
      gs.clouds.push({ x: Math.random() * CW, y: 5 + Math.random() * 30, w: 50 + Math.random() * 70, h: 18 + Math.random() * 20, speed: 0.15 + Math.random() * 0.2 });
    }

    // Seaweeds
    for (let i = 0; i < 8; i++) {
      gs.seaweeds.push({ x: 20 + Math.random() * (CW - 40), segments: 4 + Math.floor(Math.random() * 4), phase: Math.random() * Math.PI * 2 });
    }

    // Jellies
    for (let i = 0; i < 5; i++) gs.jellies.push(spawnJelly());

    // Light shafts
    for (let i = 0; i < 5; i++) {
      gs.shafts.push({ x: 30 + i * 70, width: 20 + Math.random() * 30, speed: 0.2 + Math.random() * 0.2, offset: Math.random() * CW });
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // ─── Draw ────────────────────────────────────────────────────────────────

    function draw(t: number) {
      const gs = gsRef.current;
      const curPhase = phaseRef.current;
      const curZone = activeZoneRef.current;
      const shakeX = gs.shakeX;
      const shakeY = gs.shakeY;

      if (gs.shakeDuration > 0) {
        ctx.save();
        ctx.translate(shakeX, shakeY);
      }

      ctx.clearRect(-10, -10, CW + 20, CH + 20);

      // ── Sky ──────────────────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, SKY_H);
      skyGrad.addColorStop(0, "#0a1628");
      skyGrad.addColorStop(1, "#1a3a5c");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CW, SKY_H);

      // Stars
      for (let i = 0; i < 18; i++) {
        const sx = (i * 79 + 13) % CW;
        const sy = (i * 37 + 7) % (SKY_H - 10);
        const flicker = 0.5 + 0.5 * Math.sin(t * 0.02 + i);
        ctx.globalAlpha = flicker * 0.7;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Moon
      ctx.fillStyle = "#fffbe8";
      ctx.shadowColor = "#fffbe8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(CW - 38, 18, 10, 0, Math.PI * 2);
      ctx.fill();
      // Moon crescent cutout
      ctx.fillStyle = "#0a1628";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(CW - 34, 15, 9, 0, Math.PI * 2);
      ctx.fill();

      // Clouds
      gs.clouds.forEach(c => {
        ctx.fillStyle = "rgba(200,230,255,0.18)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x - c.w * 0.2, c.y + 4, c.w * 0.35, c.h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x + c.w * 0.22, c.y + 3, c.w * 0.3, c.h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Water body ───────────────────────────────────────────────────────
      const waterGrad = ctx.createLinearGradient(0, WATER_TOP, 0, CH);
      waterGrad.addColorStop(0,   "#006699");
      waterGrad.addColorStop(0.3, "#003d5c");
      waterGrad.addColorStop(0.7, "#001e3a");
      waterGrad.addColorStop(1,   "#000820");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, WATER_TOP, CW, WATER_H);

      // Zone separator lines (subtle)
      ctx.strokeStyle = "rgba(100,200,255,0.06)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 10]);
      [ZONE1_MAX_Y, ZONE2_MAX_Y].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
      });
      ctx.setLineDash([]);

      // ── Light shafts ─────────────────────────────────────────────────────
      gs.shafts.forEach(s => {
        const shaftX = ((s.offset + t * s.speed * 0.25) % (CW + 80)) - 40;
        const grad = ctx.createLinearGradient(0, WATER_TOP, 0, CH);
        grad.addColorStop(0,   "rgba(180,230,255,0.05)");
        grad.addColorStop(0.5, "rgba(100,180,255,0.02)");
        grad.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(shaftX - s.width * 0.3, WATER_TOP);
        ctx.lineTo(shaftX + s.width * 0.3, WATER_TOP);
        ctx.lineTo(shaftX + s.width * 1.2, CH);
        ctx.lineTo(shaftX - s.width * 1.2, CH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // ── Seaweeds ─────────────────────────────────────────────────────────
      gs.seaweeds.forEach(sw => {
        const segH = 16;
        ctx.strokeStyle = "rgba(0,180,80,0.55)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        let sy = CH;
        let sx = sw.x;
        ctx.moveTo(sx, sy);
        for (let seg = 0; seg < sw.segments; seg++) {
          const sway = Math.sin(sw.phase + t * 0.025 + seg * 0.5) * 6;
          sx += sway;
          sy -= segH;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        // Leaf tips
        ctx.fillStyle = "rgba(0,220,90,0.4)";
        ctx.beginPath();
        ctx.ellipse(sx, sy - 4, 5, 10, Math.sin(sw.phase + t * 0.025) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Bubbles ──────────────────────────────────────────────────────────
      gs.bubbles.forEach(b => {
        ctx.globalAlpha = b.alpha * 0.8;
        ctx.strokeStyle = "#88ccff";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        // Highlight
        ctx.fillStyle = "rgba(200,240,255,0.25)";
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ── Jellyfish (abyss zone) ───────────────────────────────────────────
      gs.jellies.forEach(j => {
        const pulse = 0.85 + 0.15 * Math.sin(j.pulse + t * 0.04);
        ctx.save();
        ctx.translate(j.x, j.y);
        // Glow
        ctx.shadowColor = j.color;
        ctx.shadowBlur = 12;
        // Body
        ctx.fillStyle = j.color + "55";
        ctx.strokeStyle = j.color + "cc";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, j.r * pulse, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
        // Tentacles
        ctx.strokeStyle = j.color + "66";
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 5; i++) {
          const tx = (i - 2) * j.r * 0.4;
          const sway = Math.sin(j.pulse + t * 0.03 + i) * 4;
          ctx.beginPath();
          ctx.moveTo(tx, 0);
          ctx.quadraticCurveTo(tx + sway, j.r * 0.8, tx + sway * 1.5, j.r * 1.6);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // ── Abyss bioluminescent particles ───────────────────────────────────
      if (curZone === 3 || gs.hookY > ZONE2_MAX_Y) {
        for (let i = 0; i < 12; i++) {
          const px = ((t * (0.3 + i * 0.07) + i * 73) % CW);
          const py = ZONE2_MAX_Y + ((t * (0.15 + i * 0.05) + i * 53) % (CH - ZONE2_MAX_Y));
          const alpha = 0.2 + 0.3 * Math.sin(t * 0.05 + i);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = i % 3 === 0 ? "#00ffee" : i % 3 === 1 ? "#ff88ff" : "#88aaff";
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ── Fish ─────────────────────────────────────────────────────────────
      gs.fish.forEach((f, idx) => {
        ctx.save();
        ctx.translate(f.x, f.y + Math.sin(f.wobble) * 3);
        if (f.vx > 0) ctx.scale(-1, 1);

        const depthFactor = (f.y - WATER_TOP) / WATER_H;
        const baseSize = f.def.size;

        // Glow for rare/legendary
        if (f.def.rarity === "rare") {
          ctx.shadowColor = RARITY_COLOR.rare;
          ctx.shadowBlur = 8;
        } else if (f.def.rarity === "legendary") {
          ctx.shadowColor = RARITY_COLOR.legendary;
          ctx.shadowBlur = 14;
        } else if (f.def.rarity === "secret") {
          ctx.shadowColor = RARITY_COLOR.secret;
          ctx.shadowBlur = 18;
        }

        // Target fish highlight
        if (
          (curPhase === "waiting" || curPhase === "bite") &&
          gs.targetFishIdx === idx
        ) {
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 20;
        }

        ctx.font = `${Math.round(baseSize * (0.8 + depthFactor * 0.4))}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.def.emoji, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // ── Particles ────────────────────────────────────────────────────────
      gs.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ── Bobber ───────────────────────────────────────────────────────────
      const bobberBob = Math.sin(t * 0.04) * 1.5;
      const bby = BOBBER_Y + bobberBob;

      // Ripple rings
      for (let ri = 0; ri < 3; ri++) {
        const rAlpha = (1 - ((t * 0.8 + ri * 20) % 60) / 60) * 0.25;
        const rR = 6 + ((t * 0.8 + ri * 20) % 60) * 0.3;
        ctx.strokeStyle = `rgba(150,220,255,${rAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(BOBBER_X, bby + 1, rR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Bobber body
      ctx.fillStyle = "#cc2200";
      ctx.beginPath();
      ctx.arc(BOBBER_X, bby - 3, 5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(BOBBER_X, bby + 2, 5, 0, Math.PI);
      ctx.fill();
      // Line from rod to bobber (just goes off-screen top)
      ctx.strokeStyle = "rgba(220,200,160,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CW, 0);
      ctx.lineTo(BOBBER_X, bby - 3);
      ctx.stroke();

      // ── Fishing line (if cast) ────────────────────────────────────────────
      if (curPhase !== "idle") {
        ctx.strokeStyle = "rgba(220,210,170,0.7)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(LINE_X, bby + 8);
        ctx.lineTo(LINE_X, gs.hookY - 8);
        ctx.stroke();

        // Hook
        ctx.strokeStyle = "#e8d8a0";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.shadowColor = "#fff8";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(LINE_X, gs.hookY, 6, 0, Math.PI);
        ctx.stroke();
        // Hook point
        ctx.beginPath();
        ctx.moveTo(LINE_X + 6, gs.hookY);
        ctx.lineTo(LINE_X + 6, gs.hookY - 5);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Bait on hook
        ctx.font = "10px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(BAIT_ICON[baitRef.current], LINE_X, gs.hookY + 4);
      }

      // ── Reel gauge ───────────────────────────────────────────────────────
      if (curPhase === "reeling") {
        const rg = gs.reelGauge;
        const gx = LINE_X - 90, gy = CH - 56, gw = 180, gh = 22;
        // Background
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        ctx.roundRect?.(gx - 4, gy - 24, gw + 8, gh + 34, 10);
        ctx.fill();
        // Label
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`REEL! ${gs.reelTaps}/${REEL_TAPS_NEEDED} TAPS`, LINE_X, gy - 8);
        // Track
        ctx.fillStyle = "#0a1a0a";
        ctx.beginPath();
        ctx.roundRect?.(gx, gy, gw, gh, 6);
        ctx.fill();
        // Fill — green → yellow as it fills
        const hue = 120 - rg * 0.4;
        ctx.fillStyle = `hsl(${hue}, 90%, 52%)`;
        if (rg > 0) {
          ctx.beginPath();
          ctx.roundRect?.(gx + 1, gy + 1, Math.max(8, (gw - 2) * rg / 100), gh - 2, 5);
          ctx.fill();
        }
        // Tap prompt flash
        const flash = 0.5 + 0.5 * Math.sin(t * 0.2);
        ctx.fillStyle = `rgba(0,255,136,${flash})`;
        ctx.font = "bold 10px monospace";
        ctx.fillText("TAP TAP TAP!", LINE_X, gy + gh + 14);
      }

      // ── Bite ring ────────────────────────────────────────────────────────
      if (curPhase === "bite" || curPhase === "waiting") {
        const ring = gs.biteRing;
        const ringAlpha = 0.8 - ring * 0.5;
        const ringR = 15 + ring * 30;
        ctx.strokeStyle = `rgba(255,220,0,${ringAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(LINE_X, gs.hookY, ringR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner pulse
        ctx.strokeStyle = `rgba(255,120,0,${ringAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(LINE_X, gs.hookY, ringR * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── Surface shimmer ───────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(120,200,255,0.35)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= CW; x += 3) {
        const wy = WATER_TOP + Math.sin((x + t * 1.5) * 0.06) * 2.2 + Math.sin((x + t) * 0.13) * 1;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();

      // Second shimmer layer
      ctx.strokeStyle = "rgba(80,160,220,0.2)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= CW; x += 5) {
        const wy = WATER_TOP + 3 + Math.sin((x + t * 0.9) * 0.09 + 1.2) * 1.5;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();

      if (gs.shakeDuration > 0) ctx.restore();

      // ── HUD overlays drawn on canvas ──────────────────────────────────────

      // Depth zone indicator strip (right side)
      const zoneLabels: [string, number, number][] = [
        ["SURFACE",   WATER_TOP,    ZONE1_MAX_Y],
        ["MIDWATER",  ZONE1_MAX_Y,  ZONE2_MAX_Y],
        ["ABYSS",     ZONE2_MAX_Y,  CH],
      ];
      zoneLabels.forEach(([label, y1, y2], zi) => {
        const isActive = (zi + 1) === curZone;
        ctx.fillStyle = isActive ? "rgba(0,120,220,0.15)" : "rgba(0,0,0,0)";
        ctx.fillRect(CW - 68, y1, 68, y2 - y1);
        ctx.fillStyle = isActive ? "rgba(100,180,255,0.8)" : "rgba(80,140,200,0.3)";
        ctx.font = `bold ${isActive ? 9 : 8}px monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(label, CW - 4, (y1 + y2) / 2);
      });
    }

    // ─── Tick ─────────────────────────────────────────────────────────────

    function tick() {
      const gs = gsRef.current;
      gs.t++;
      const t = gs.t;
      const curPhase = phaseRef.current;

      // Clouds
      gs.clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x < -80) {
          c.x = CW + 60;
          c.y = 5 + Math.random() * 30;
        }
      });

      // Fish animation
      gs.fish.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        f.wobble += f.wobbleSpeed;
        const [yMin, yMax] = zoneYRange(f.def.zone);
        // Wrap horizontally
        if (f.vx < 0 && f.x < -50) f.x = CW + 40;
        if (f.vx > 0 && f.x > CW + 50) f.x = -40;
        // Drift vertically, stay in zone
        f.vy += (Math.random() - 0.5) * 0.02;
        f.vy = Math.max(-0.4, Math.min(0.4, f.vy));
        f.y = Math.max(yMin, Math.min(yMax, f.y));
      });
      // Maintain fish count per zone
      const zone1Count = gs.fish.filter(f => f.def.zone === 1).length;
      const zone2Count = gs.fish.filter(f => f.def.zone === 2).length;
      const zone3Count = gs.fish.filter(f => f.def.zone === 3).length;
      if (zone1Count < 5) { const d = FISH_ROSTER.filter(f => f.zone === 1); gs.fish.push(spawnLiveFish(d[Math.floor(Math.random() * d.length)], 1)); }
      if (zone2Count < 4) { const d = FISH_ROSTER.filter(f => f.zone === 2); gs.fish.push(spawnLiveFish(d[Math.floor(Math.random() * d.length)], 2)); }
      if (zone3Count < 3) { const d = FISH_ROSTER.filter(f => f.zone === 3); gs.fish.push(spawnLiveFish(d[Math.floor(Math.random() * d.length)], 3)); }

      // Bubbles
      gs.bubbles.forEach(b => {
        b.y += b.vy;
        b.x += Math.sin(t * 0.04 + b.y) * 0.3;
        if (b.y < WATER_TOP) {
          b.y = CH - 10;
          b.x = Math.random() * CW;
        }
      });

      // Jellyfish
      gs.jellies.forEach(j => {
        j.y += j.vy;
        j.x += Math.sin(j.pulse + t * 0.02) * 0.4;
        j.pulse += 0.04;
        if (j.y < ZONE2_MAX_Y - 20) {
          Object.assign(j, spawnJelly());
        }
      });

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.life--;
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Screen shake
      if (gs.shakeDuration > 0) {
        gs.shakeDuration--;
        const mag = gs.shakeDuration * 0.5;
        gs.shakeX = (Math.random() - 0.5) * mag;
        gs.shakeY = (Math.random() - 0.5) * mag;
      } else {
        gs.shakeX = 0;
        gs.shakeY = 0;
      }

      // Bite ring pulse
      if (curPhase === "bite" || curPhase === "waiting") {
        gs.biteRing = (gs.biteRing + 0.025) % 1;
      } else {
        gs.biteRing = 0;
      }

      // Special event system
      gs.eventTimer -= 1;
      if (gs.eventTimer <= 0) {
        gs.eventTimer = 400 + Math.floor(Math.random() * 400);
        const events: SpecialEvent[] = ["STORM!", "RARE SPAWN!", "MIDNIGHT ZONE", "FEEDING FRENZY"];
        const ev = events[Math.floor(Math.random() * events.length)];
        specialEventRef.current = ev;
        setSpecialEvent(ev);
        // Apply event effects
        if (ev === "STORM!") gs.shakeDuration = 30;
        if (ev === "RARE SPAWN!") {
          const rares = FISH_ROSTER.filter(f => f.rarity === "rare" || f.rarity === "legendary");
          for (let ri = 0; ri < 3; ri++) {
            gs.fish.push(spawnLiveFish(rares[Math.floor(Math.random() * rares.length)]));
          }
        }
        if (ev === "FEEDING FRENZY") {
          for (let fi = 0; fi < 5; fi++) {
            const d = FISH_ROSTER.filter(f => f.zone === 1);
            gs.fish.push(spawnLiveFish(d[Math.floor(Math.random() * d.length)], 1));
          }
        }
        setTimeout(() => { specialEventRef.current = null; setSpecialEvent(null); }, 4000);
      }

      // Reeling phase
      if (curPhase === "reeling") {
        gs.reelDecay += 1;
        if (gs.reelDecay > 12) {
          gs.reelGauge = Math.max(0, gs.reelGauge - 1.2);
        }
        if (gs.reelGauge <= 0 && gs.reelTaps > 0) {
          // Fish escaped
          if (gs.targetFishIdx >= 0 && gs.targetFishIdx < gs.fish.length) {
            gs.fish.splice(gs.targetFishIdx, 1);
          }
          gs.targetFishIdx = -1;
          gs.hookY = -80;
          gs.reelGauge = 0;
          gs.reelTaps = 0;
          phaseRef.current = "result";
          setPhase("result");
          setIsMiss(true);
          setCaughtFish(null);
          setTimeout(() => { phaseRef.current = "idle"; setPhase("idle"); setIsMiss(false); }, 1800);
        }
        // Move hooked fish toward surface
        const reeledFish = gs.fish[gs.targetFishIdx];
        if (reeledFish) {
          reeledFish.x += (LINE_X - reeledFish.x) * 0.08;
          reeledFish.y += (gs.hookY - reeledFish.y) * 0.06;
        }
      }

      // Hook descent
      if (curPhase === "casting") {
        const targetY = zoneTargetY(activeZoneRef.current);
        if (gs.hookY < targetY) {
          gs.hookY += 3.5;
        } else {
          gs.hookY = targetY;
          phaseRef.current = "waiting";
          setPhase("waiting");

          // After a short wait, pick a fish to bite
          const waitTime = 600 + Math.random() * 1400;
          biteTimerRef.current = setTimeout(() => {
            // Find a fish near the hook
            const near = gs.fish
              .map((f, i) => ({ f, i, dist: Math.abs(f.y - gs.hookY) + Math.abs(f.x - LINE_X) * 0.3 }))
              .sort((a, b) => a.dist - b.dist);

            // Optionally pick based on zone preference
            const zone = activeZoneRef.current;
            const preferred = near.filter(n => n.f.def.zone === zone);
            const picked = preferred.length > 0 ? preferred[0] : near[0];

            if (!picked) {
              // No fish? reel back
              gs.hookY = -80;
              gs.targetFishIdx = -1;
              phaseRef.current = "idle";
              setPhase("idle");
              return;
            }

            gs.targetFishIdx = picked.i;
            // Move target fish toward hook
            const tf = gs.fish[picked.i];
            tf.vx = (LINE_X - tf.x > 0 ? 1 : -1) * Math.abs(tf.vx);

            phaseRef.current = "bite";
            setPhase("bite");
            gs.shakeDuration = 8;

            // Bite window — varies by rarity
            const rarity = tf.def.rarity;
            const window = rarity === "secret" ? 800 : rarity === "legendary" ? 1000 : rarity === "rare" ? 1400 : 1800;
            biteTimerRef.current = setTimeout(() => {
              if (phaseRef.current === "bite") {
                // Missed the bite window — fish swam away
                gs.fish.splice(gs.targetFishIdx, 1);
                gs.targetFishIdx = -1;
                gs.hookY = -80;
                phaseRef.current = "result";
                setPhase("result");
                setIsMiss(true);
                setCaughtFish(null);
                setTimeout(() => {
                  phaseRef.current = "idle";
                  setPhase("idle");
                  setIsMiss(false);
                }, 1800);
              }
            }, window);

          }, waitTime);
        }
      }

      // Timing marker
      if (curPhase === "timing") {
        markerRef.current += markerDirRef.current * markerSpeedRef.current;
        if (markerRef.current >= 100) { markerRef.current = 100; markerDirRef.current = -1; }
        if (markerRef.current <= 0)   { markerRef.current = 0;   markerDirRef.current = 1; }
        setMarkerPct(Math.round(markerRef.current));
      }

      draw(t);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCast = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
    const gs = gsRef.current;
    gs.hookY = BOBBER_Y + 10;
    gs.targetFishIdx = -1;
    phaseRef.current = "casting";
    setPhase("casting");

    // Deduct golden lure use
    if (baitRef.current === "golden") {
      const newUses = goldenUsesRef.current - 1;
      goldenUsesRef.current = newUses;
      setGoldenUses(newUses);
      if (newUses <= 0) {
        baitRef.current = "worm";
        setBait("worm");
      }
    }
  }, []);

  const handleBiteTap = useCallback(() => {
    if (phaseRef.current !== "bite") return;
    if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
    const gs = gsRef.current;

    const tf = gs.fish[gs.targetFishIdx];
    if (!tf) return;

    // Transition to reeling phase
    gs.reelGauge = 0;
    gs.reelTaps = 0;
    gs.reelDecay = 0;
    phaseRef.current = "reeling";
    setPhase("reeling");
  }, [weather]);

  const handleReel = useCallback(() => {
    if (phaseRef.current !== "reeling") return;
    const gs = gsRef.current;
    const tf = gs.fish[gs.targetFishIdx];
    if (!tf) return;

    gs.reelTaps += 1;
    gs.reelDecay = 0;
    gs.reelGauge = Math.min(100, gs.reelGauge + (100 / REEL_TAPS_NEEDED));
    // Move hook up toward surface with each tap
    gs.hookY = Math.max(WATER_TOP + 30, gs.hookY - 20);

    // Add splash particles on each reel tap
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      gs.particles.push({
        x: LINE_X + (Math.random() - 0.5) * 20,
        y: gs.hookY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 1.5 + Math.random() * 2,
        color: RARITY_COLOR[tf.def.rarity],
        life: 25,
        maxLife: 25,
      });
    }

    if (gs.reelGauge >= 100) {
      // Reel complete → timing phase
      markerRef.current = 50;
      markerDirRef.current = 1;
      const baseSpeed = tf.def.rarity === "secret" ? 3.5 :
                        tf.def.rarity === "legendary" ? 2.8 :
                        tf.def.rarity === "rare" ? 2.0 : 1.5;
      const weatherMod = weather === "stormy" ? 1.4 : weather === "rainy" ? 1.1 : 1;
      markerSpeedRef.current = baseSpeed * weatherMod;
      phaseRef.current = "timing";
      setPhase("timing");
    }
  }, [weather]);

  const handleTiming = useCallback(() => {
    if (phaseRef.current !== "timing") return;
    const gs = gsRef.current;
    const tf = gs.fish[gs.targetFishIdx];
    if (!tf) return;

    const zoneCenter = 50;
    const halfWidth = tf.def.zoneWidth / 2;
    const zoneStart = zoneCenter - halfWidth;
    const zoneEnd   = zoneCenter + halfWidth;
    const hit = markerRef.current >= zoneStart && markerRef.current <= zoneEnd;

    // Spawn catch particles
    if (hit) {
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        gs.particles.push({
          x: LINE_X,
          y: gs.hookY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          r: 2 + Math.random() * 3,
          color: RARITY_COLOR[tf.def.rarity],
          life: 40,
          maxLife: 40,
        });
      }
    }

    // Remove fish from water
    gs.fish.splice(gs.targetFishIdx, 1);
    gs.targetFishIdx = -1;
    gs.hookY = -80;
    gs.shakeDuration = hit ? 15 : 5;

    phaseRef.current = "result";

    if (hit) {
      const newStreak = streakRef.current + 1;
      streakRef.current = newStreak;
      setStreak(newStreak);
      const { mult } = getCombo(newStreak);
      const karmaBase = tf.def.karma;
      const xpBase    = tf.def.xp;
      // Weather bonus
      const wMult = weather === "stormy" ? 2 : weather === "rainy" ? 1.3 : 1;
      const finalKarma = Math.round(karmaBase * mult * wMult);
      const finalXP    = Math.round(xpBase    * mult * wMult);

      setCaughtFish(tf.def);
      setCatchKarma(finalKarma);
      setCatchXP(finalXP);
      setIsMiss(false);

      setScore(s => {
        const ns = s + 1;
        setBest(b => Math.max(b, ns));
        return ns;
      });

      // Update collection + trophy on first catch
      setCollection(prev => {
        const next = new Map(prev);
        const key = tf.def.name;
        const existing = next.get(key);
        if (!existing) {
          // First catch — show trophy!
          setTimeout(() => setTrophyFish(tf.def), 2600);
        }
        next.set(key, { def: tf.def, count: (existing?.count ?? 0) + 1 });
        return next;
      });

      onCatch(finalKarma, finalXP, tf.def.name, tf.def.rarity);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setCaughtFish(null);
      setIsMiss(true);
    }

    setPhase("result");
    setTimeout(() => {
      phaseRef.current = "idle";
      setPhase("idle");
      setCaughtFish(null);
      setIsMiss(false);
    }, 2400);
  }, [weather, onCatch]);

  const handleMainButton = useCallback(() => {
    const p = phaseRef.current;
    if (p === "idle")    return handleCast();
    if (p === "bite")    return handleBiteTap();
    if (p === "reeling") return handleReel();
    if (p === "timing")  return handleTiming();
  }, [handleCast, handleBiteTap, handleReel, handleTiming]);

  const handleZoneSelect = useCallback((zone: DepthZone) => {
    if (phaseRef.current !== "idle") return;
    activeZoneRef.current = zone;
    setActiveZone(zone);
  }, []);

  const handleBaitSelect = useCallback((b: BaitType) => {
    if (phaseRef.current !== "idle") return;
    if (b === "golden" && goldenUsesRef.current <= 0) return;
    baitRef.current = b;
    setBait(b);
  }, []);

  // ─── Derived state ─────────────────────────────────────────────────────────

  const activeFishDef =
    (phase === "timing" || phase === "bite" || phase === "waiting" || phase === "reeling")
      ? gsRef.current.fish[gsRef.current.targetFishIdx]?.def
      : null;

  const comboInfo = getCombo(streak);
  const zoneCenter = 50;
  const halfWidth  = (activeFishDef?.zoneWidth ?? 30) / 2;
  const zoneStart  = zoneCenter - halfWidth;

  // Button label & style
  const btnLabel =
    phase === "idle"     ? "🎣  CAST" :
    phase === "casting"  ? "⏳  Sinking..." :
    phase === "waiting"  ? "🎣  Waiting for bite..." :
    phase === "bite"     ? "⚡  BITE! TAP NOW!" :
    phase === "reeling"  ? `🎣  REEL! TAP FAST! (${gsRef.current.reelTaps}/${REEL_TAPS_NEEDED})` :
    phase === "timing"   ? "🎯  PERFECT TIMING!" :
    caughtFish           ? `${caughtFish.emoji}  CAUGHT!` : "💨  MISSED!";

  const btnDisabled = phase === "casting" || phase === "waiting" || phase === "result";

  const btnBg =
    phase === "bite"    ? "linear-gradient(135deg,#ff6600,#ffcc00)" :
    phase === "reeling" ? "linear-gradient(135deg,#006622,#00cc44)" :
    phase === "timing"  ? "linear-gradient(135deg,#ffaa00,#ff4400)" :
    phase === "idle"    ? "linear-gradient(135deg,#0044aa,#0077dd)" :
    btnDisabled         ? "#111" : "#222";

  const btnBorder =
    phase === "bite"    ? "#ffcc00" :
    phase === "reeling" ? "#00ff66" :
    phase === "timing"  ? "#ff4400" :
    phase === "idle"    ? "#4488ff" : "#333";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ fontFamily: "var(--font-space-grotesk,monospace)", userSelect: "none" }}
      onTouchStart={phase === "bite" ? handleBiteTap : phase === "reeling" ? handleReel : phase === "timing" ? handleTiming : undefined}
    >
      {/* ── Top HUD ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingInline: 2 }}>
        {/* Weather */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#0d1a2a", borderRadius: 10, padding: "4px 10px", border: "1.5px solid #1a3a5c" }}>
          <span style={{ fontSize: 16 }}>{WEATHER_ICON[weather]}</span>
          <span style={{ fontSize: 11, color: weather === "stormy" ? "#ff8800" : weather === "rainy" ? "#88aaff" : "#88ff88", fontWeight: 700 }}>
            {weather.toUpperCase()}
            {weather === "stormy" && " ×2 KARMA"}
            {weather === "rainy"  && " RARE+"}
            {weather === "calm"   && " EASY"}
          </span>
        </div>

        {/* Combo */}
        {streak >= 3 && (
          <motion.div
            key={streak}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: "linear-gradient(135deg,#ff6600,#ffcc00)", borderRadius: 10, padding: "4px 10px" }}
          >
            <span style={{ fontSize: 11, fontWeight: 900, color: "#000" }}>{streak} COMBO {comboInfo.label}</span>
          </motion.div>
        )}

        {/* Collection button */}
        <button
          onClick={() => setShowCollection(true)}
          style={{ background: "#0d1a2a", border: "1.5px solid #2255aa", borderRadius: 10, padding: "4px 10px", color: "#88aaff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
        >
          🐟 {collection.size}/{FISH_ROSTER.length}
        </button>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "2.5px solid #0d4a7a", boxShadow: "0 0 32px #0066aa55, 0 0 8px #002244" }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ display: "block", width: "100%", height: "auto" }}
          onClick={handleMainButton}
        />

        {/* ── Reel alert overlay ────────────────────────────────────────── */}
        <AnimatePresence>
          {phase === "reeling" && activeFishDef && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
                background: "rgba(0,80,20,0.93)", borderRadius: 12, padding: "6px 18px",
                border: `2px solid #00ff66`,
                boxShadow: `0 0 18px #00ff6688`,
                textAlign: "center", pointerEvents: "none",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
                style={{ fontSize: 13, fontWeight: 900, color: "#00ff88", letterSpacing: "0.08em" }}
              >
                🎣 REEL IT IN! TAP FAST!
              </motion.div>
              <div style={{ fontSize: 10, color: "#88ffaa", fontWeight: 700 }}>
                {activeFishDef.emoji} {activeFishDef.name} — {gsRef.current.reelTaps}/{REEL_TAPS_NEEDED} TAPS
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bite alert overlay ─────────────────────────────────────────── */}
        <AnimatePresence>
          {phase === "bite" && activeFishDef && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 0.4 } }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
                background: "rgba(255,100,0,0.92)", borderRadius: 12, padding: "6px 18px",
                border: `2px solid ${RARITY_COLOR[activeFishDef.rarity]}`,
                boxShadow: `0 0 18px ${RARITY_COLOR[activeFishDef.rarity]}`,
                textAlign: "center", pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: "0.08em" }}>
                {activeFishDef.emoji} BITE! TAP FAST!
              </div>
              <div style={{ fontSize: 10, color: RARITY_COLOR[activeFishDef.rarity], fontWeight: 700 }}>
                {RARITY_LABEL[activeFishDef.rarity]} — {activeFishDef.name}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Timing bar overlay ─────────────────────────────────────────── */}
        <AnimatePresence>
          {phase === "timing" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", bottom: 14, left: 14, right: 14,
              }}
            >
              {/* Fish name / rarity label */}
              {activeFishDef && (
                <div style={{ textAlign: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: RARITY_COLOR[activeFishDef.rarity], textShadow: `0 0 8px ${RARITY_COLOR[activeFishDef.rarity]}`, letterSpacing: "0.06em" }}>
                    {activeFishDef.emoji} {activeFishDef.name.toUpperCase()} — {RARITY_LABEL[activeFishDef.rarity]}
                  </span>
                </div>
              )}
              {/* Gauge track */}
              <div style={{
                position: "relative", height: 32, background: "rgba(0,0,0,0.8)",
                borderRadius: 16, border: "2px solid rgba(255,255,255,0.15)", overflow: "hidden",
                boxShadow: "0 2px 12px #000a",
              }}>
                {/* Track gradient */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg,#220000 0%,#882200 35%,#006600 45%,#00aa00 50%,#006600 55%,#882200 65%,#220000 100%)",
                }} />
                {/* Green zone */}
                <motion.div
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  style={{
                    position: "absolute", top: 0, bottom: 0,
                    left: `${zoneStart}%`,
                    width: `${activeFishDef?.zoneWidth ?? 30}%`,
                    background: "rgba(0,255,80,0.3)",
                    borderLeft: "2px solid #00ff50",
                    borderRight: "2px solid #00ff50",
                  }}
                />
                {/* Center line */}
                <div style={{ position: "absolute", top: 4, bottom: 4, left: "50%", width: 1, background: "rgba(255,255,255,0.2)", transform: "translateX(-50%)" }} />
                {/* Marker */}
                <motion.div
                  style={{
                    position: "absolute", top: 2, bottom: 2,
                    width: 6, borderRadius: 3,
                    background: "#ffffff",
                    left: `${markerPct}%`,
                    transform: "translateX(-50%)",
                    boxShadow: "0 0 10px #fff, 0 0 4px #88ccff",
                  }}
                />
              </div>
              <p style={{ textAlign: "center", fontSize: 10, color: "#ffcc00", fontWeight: 700, marginTop: 4, letterSpacing: "0.1em" }}>
                TAP WHEN MARKER HITS THE GREEN ZONE
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Result overlay ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                textAlign: "center",
                background: caughtFish ? "rgba(0,10,30,0.95)" : "rgba(20,0,0,0.92)",
                borderRadius: 22,
                padding: "22px 36px",
                border: caughtFish
                  ? `2.5px solid ${RARITY_COLOR[caughtFish.rarity]}`
                  : "2.5px solid #ff3333",
                boxShadow: caughtFish
                  ? `0 0 32px ${RARITY_COLOR[caughtFish.rarity]}88, 0 0 8px ${RARITY_COLOR[caughtFish.rarity]}44`
                  : "0 0 20px #ff333344",
                minWidth: 180,
              }}
            >
              {caughtFish ? (
                <>
                  <motion.div
                    animate={{ rotate: [-5, 5, -5, 5, 0] }}
                    transition={{ duration: 0.5 }}
                    style={{ fontSize: "3.4rem", lineHeight: 1 }}
                  >
                    {caughtFish.emoji}
                  </motion.div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: RARITY_COLOR[caughtFish.rarity], letterSpacing: "0.12em", marginTop: 6, textShadow: `0 0 8px ${RARITY_COLOR[caughtFish.rarity]}` }}>
                    {RARITY_LABEL[caughtFish.rarity]}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                    {caughtFish.name}
                  </div>
                  <div style={{ fontSize: 14, color: "#c8ff00", fontWeight: 800, marginTop: 6 }}>
                    +{catchKarma} ⚡ · +{catchXP} XP
                  </div>
                  {streak >= 3 && (
                    <div style={{ fontSize: 11, color: "#ffaa00", fontWeight: 700, marginTop: 4 }}>
                      🔥 {comboInfo.label}
                    </div>
                  )}
                  {weather === "stormy" && (
                    <div style={{ fontSize: 10, color: "#ff8800", marginTop: 3 }}>⛈️ Storm bonus ×2!</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: "2.5rem" }}>💨</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#ff5555", marginTop: 6 }}>
                    {isMiss && !caughtFish ? "Got Away!" : "Missed!"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    {streak > 0 ? `Combo lost (was ${streak})` : "Try again"}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Special event banner ───────────────────────────────────────── */}
        <AnimatePresence>
          {specialEvent && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              style={{
                position: "absolute", top: 8, left: 8, right: 8,
                background: specialEvent === "STORM!" ? "rgba(255,80,0,0.92)"
                  : specialEvent === "RARE SPAWN!" ? "rgba(180,0,255,0.9)"
                  : specialEvent === "MIDNIGHT ZONE" ? "rgba(0,0,40,0.95)"
                  : "rgba(0,150,60,0.9)",
                borderRadius: 12,
                border: `2px solid ${specialEvent === "STORM!" ? "#ffcc00" : specialEvent === "RARE SPAWN!" ? "#cc88ff" : specialEvent === "MIDNIGHT ZONE" ? "#4455ff" : "#00ff88"}`,
                padding: "8px 14px",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                pointerEvents: "none",
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                style={{ fontSize: "1.4rem" }}
              >
                {specialEvent === "STORM!" ? "⛈️" : specialEvent === "RARE SPAWN!" ? "💜" : specialEvent === "MIDNIGHT ZONE" ? "🌑" : "🐟"}
              </motion.span>
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 900, letterSpacing: "0.1em" }}>{specialEvent}</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
                  {specialEvent === "STORM!" ? "×2 karma for all catches!" : specialEvent === "RARE SPAWN!" ? "Rare fish swarming the depths!" : specialEvent === "MIDNIGHT ZONE" ? "Legendary fish appear..." : "Schools of fish incoming!"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Trophy first-catch modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {trophyFish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24,
            }}
            onClick={() => setTrophyFish(null)}
          >
            <motion.div
              initial={{ scale: 0.4, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.4 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: `radial-gradient(circle at 50% 30%, ${RARITY_COLOR[trophyFish.rarity]}33, #010d1a 70%)`,
                border: `3px solid ${RARITY_COLOR[trophyFish.rarity]}`,
                borderRadius: 28, padding: "32px 28px",
                textAlign: "center", maxWidth: 280,
                boxShadow: `0 0 60px ${RARITY_COLOR[trophyFish.rarity]}66`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: RARITY_COLOR[trophyFish.rarity], marginBottom: 8 }}>🏆 FIRST CATCH!</div>
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [-5, 5, -5, 0] }}
                transition={{ duration: 1.2, repeat: 3 }}
                style={{ fontSize: "5rem", lineHeight: 1, marginBottom: 12 }}
              >
                {trophyFish.emoji}
              </motion.div>
              <div style={{ fontSize: 11, fontWeight: 900, color: RARITY_COLOR[trophyFish.rarity], letterSpacing: "0.12em", marginBottom: 4 }}>
                {RARITY_LABEL[trophyFish.rarity]}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 12 }}>{trophyFish.name}</div>
              <div style={{ fontSize: 14, color: "#c8ff00", fontWeight: 700, marginBottom: 6 }}>Added to collection! 🐟</div>
              <div style={{ fontSize: 12, color: "#888" }}>Tap anywhere to continue</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingInline: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#4488ff" }}>
          Caught: {score}  |  Best: {best}
        </span>
        {activeFishDef && phase !== "result" && (
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            style={{ fontSize: 11, fontWeight: 800, color: RARITY_COLOR[activeFishDef.rarity] }}
          >
            {activeFishDef.emoji} {activeFishDef.name}
          </motion.span>
        )}
      </div>

      {/* ── Zone selector ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {([1, 2, 3] as DepthZone[]).map(z => (
          <button
            key={z}
            onClick={() => handleZoneSelect(z)}
            style={{
              flex: 1,
              padding: "10px 4px",
              background: activeZone === z
                ? `linear-gradient(135deg, ${ZONE_COLOR[z]}cc, ${ZONE_COLOR[z]}88)`
                : "rgba(10,20,40,0.8)",
              border: activeZone === z ? `2px solid ${z === 1 ? "#4499ff" : z === 2 ? "#2255aa" : "#1a2a66"}` : "2px solid #1a2a3a",
              borderRadius: 12,
              color: activeZone === z ? "#fff" : "#445566",
              fontSize: 11,
              fontWeight: 800,
              cursor: phaseRef.current === "idle" ? "pointer" : "default",
              transition: "all 0.2s",
              letterSpacing: "0.04em",
              boxShadow: activeZone === z ? `0 0 12px ${ZONE_COLOR[z]}88` : "none",
            }}
          >
            {z === 1 ? "☀️" : z === 2 ? "🌊" : "🌑"}<br />
            <span style={{ fontSize: 9 }}>{ZONE_LABEL[z]}</span>
          </button>
        ))}
      </div>

      {/* ── Bait selector ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {(["worm", "cricket", "golden"] as BaitType[]).map(b => (
          <button
            key={b}
            onClick={() => handleBaitSelect(b)}
            style={{
              flex: 1,
              padding: "8px 4px",
              background: bait === b ? "rgba(40,80,20,0.85)" : "rgba(10,20,40,0.7)",
              border: bait === b ? "2px solid #44cc44" : "2px solid #1a2a3a",
              borderRadius: 10,
              color: bait === b ? "#88ff88" : "#445566",
              fontSize: 11,
              fontWeight: 700,
              cursor: (b === "golden" && goldenUses <= 0) ? "not-allowed" : "pointer",
              opacity: (b === "golden" && goldenUses <= 0) ? 0.35 : 1,
              transition: "all 0.2s",
            }}
          >
            {BAIT_ICON[b]}{" "}
            <span style={{ fontSize: 9 }}>
              {BAIT_LABEL[b]}
              {b === "golden" && goldenUses > 0 && ` ×${goldenUses}`}
            </span>
          </button>
        ))}
      </div>

      {/* ── Main action button ───────────────────────────────────────────────── */}
      <button
        onClick={handleMainButton}
        disabled={btnDisabled}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "16px",
          background: btnBg,
          border: `3px solid ${btnBorder}`,
          borderRadius: 16,
          fontSize: phase === "bite" ? 19 : 17,
          fontWeight: 900,
          color: phase === "bite" || phase === "timing" || phase === "reeling" ? "#000" : btnDisabled ? "#444" : "#fff",
          cursor: btnDisabled ? "default" : "pointer",
          letterSpacing: "0.06em",
          boxShadow: phase === "bite"
            ? `0 0 28px #ff990088, 4px 4px 0 #000`
            : phase === "reeling"
            ? `0 0 24px #00ff6644, 4px 4px 0 #000`
            : phase === "timing"
            ? `0 0 20px #ff440066, 4px 4px 0 #000`
            : phase === "idle"
            ? `0 0 16px #0066aa55, 4px 4px 0 #000`
            : "none",
          transition: "all 0.12s ease",
          animation: phase === "bite" ? "pulse 0.4s infinite alternate" : "none",
        }}
      >
        {btnLabel}
      </button>

      {/* Pulse keyframe injection */}
      <style>{`
        @keyframes pulse { from { box-shadow: 0 0 18px #ff990077, 4px 4px 0 #000; } to { box-shadow: 0 0 36px #ff9900cc, 4px 4px 0 #000; } }
      `}</style>

      {/* ── Collection modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCollection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setShowCollection(false)}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.7, y: 40 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#010d1a",
                border: "2.5px solid #1a4a7a",
                borderRadius: 22,
                padding: 22,
                maxWidth: 340,
                width: "100%",
                maxHeight: "75vh",
                overflowY: "auto",
                boxShadow: "0 0 40px #0066aa55",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#4488ff" }}>🐟 Fish Collection</div>
                <div style={{ fontSize: 13, color: "#4488ff", fontWeight: 700 }}>{collection.size} / {FISH_ROSTER.length}</div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: "#0d2040", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(collection.size / FISH_ROSTER.length) * 100}%`, background: "linear-gradient(90deg,#0066aa,#4488ff)", borderRadius: 3, transition: "width 0.4s" }} />
              </div>

              {/* Fish list by rarity */}
              {(["secret", "legendary", "rare", "common"] as Rarity[]).map(rarity => {
                const fishOfRarity = FISH_ROSTER.filter(f => f.rarity === rarity);
                return (
                  <div key={rarity} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: RARITY_COLOR[rarity], letterSpacing: "0.12em", marginBottom: 6 }}>
                      {RARITY_LABEL[rarity]}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                      {fishOfRarity.map(f => {
                        const rec = collection.get(f.name);
                        const caught = !!rec;
                        return (
                          <div
                            key={f.name}
                            style={{
                              background: caught ? "rgba(0,40,80,0.8)" : "rgba(10,15,25,0.6)",
                              border: caught ? `1.5px solid ${RARITY_COLOR[f.rarity]}66` : "1.5px solid #1a2a3a",
                              borderRadius: 10,
                              padding: "8px 4px",
                              textAlign: "center",
                              opacity: caught ? 1 : 0.35,
                              transition: "all 0.2s",
                            }}
                          >
                            <div style={{ fontSize: caught ? 22 : 18 }}>{caught ? f.emoji : "❓"}</div>
                            <div style={{ fontSize: 8, color: caught ? "#aaccff" : "#334", fontWeight: 700, marginTop: 2, lineHeight: 1.1 }}>
                              {caught ? f.name : "???"}
                            </div>
                            {caught && rec && rec.count > 1 && (
                              <div style={{ fontSize: 8, color: RARITY_COLOR[f.rarity], fontWeight: 700 }}>×{rec.count}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setShowCollection(false)}
                style={{ width: "100%", marginTop: 8, padding: "11px", background: "#0d2040", border: "2px solid #1a4a7a", borderRadius: 12, color: "#4488ff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
