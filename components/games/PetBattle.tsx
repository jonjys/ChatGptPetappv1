"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Pet } from "@/types/pet";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface PetBattleProps {
  pet?: Pet;
  petEmoji?: string;
  onEnd?: (won: boolean, karma: number) => void;
  onWin?: (karma: number, xp: number, name: string, rarity: string) => void;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type Phase = "idle" | "wave" | "between" | "upgrade" | "win" | "gameover";
type EnemyType = "seeker" | "runner" | "tank" | "ghost" | "swarm" | "boss";
type UpgradeId =
  | "rate" | "multi" | "dmg" | "pierce" | "drone"
  | "missile" | "ricochet" | "boom" | "magnet" | "shield";

interface EnemyDef {
  type: EnemyType;
  emoji: string;
  hp: number;
  speed: number;   // px per frame at reference size
  reward: number;
  radius: number;
  touchDmg: number;
  color: string;
}

interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  wobble: number;      // phase offset for weaving
  hitFlash: number;
  spin: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  ricochet: number;
  life: number;
  color: string;
  r: number;
  homing: boolean;
  boomR: number;       // explosion radius on final hit (missiles)
  hitIds: number[];
  targetId: number;    // for homing
}

interface Drone {
  angle: number;
  cooldown: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
  lw: number;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  xp: number;
  life: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Stats {
  dmg: number;
  fireDelay: number;   // frames between volleys
  bullets: number;     // streams per volley
  pierce: number;
  drones: number;
  missiles: number;    // homing missiles per missile-volley
  ricochet: number;
  boomRadius: number;  // AoE explosion radius on kills (0 = off)
  magnetR: number;
  shieldMax: number;
  bulletSpeed: number;
}

interface GS {
  phase: Phase;
  resumePhase: Phase;  // phase to return to after upgrade screen
  size: number;        // logical canvas size (square)
  wave: number;
  frame: number;

  hp: number;
  maxHp: number;
  shield: number;

  score: number;
  earnedKarma: number;
  killCount: number;

  xp: number;
  level: number;
  xpNext: number;

  energy: number;
  maxEnergy: number;

  stats: Stats;
  owned: Partial<Record<UpgradeId, number>>;
  upgradeChoices: UpgradeId[];

  enemies: Enemy[];
  bullets: Bullet[];
  drones: Drone[];
  droneSpin: number;
  particles: Particle[];
  shockwaves: Shockwave[];
  orbs: Orb[];
  floats: FloatText[];

  spawnQueue: { type: EnemyType; delay: number }[];
  spawnTimer: number;
  betweenTimer: number;
  fireTimer: number;
  missileTimer: number;

  aimAngle: number;
  focusing: boolean;

  // Free-flying ship
  shipX: number;
  shipY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  novaFlash: number;

  screenShake: number;
  showWaveBanner: number;
  shipFlash: number;   // white flash when damaged
  muzzle: number;      // muzzle flash frames
}

// ─── Enemy Definitions ─────────────────────────────────────────────────────────
const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  seeker: { type: "seeker", emoji: "👾", hp: 34,   speed: 0.55, reward: 8,   radius: 12, touchDmg: 10, color: "#f87171" },
  runner: { type: "runner", emoji: "💨", hp: 20,   speed: 1.05, reward: 6,   radius: 10, touchDmg: 8,  color: "#fb923c" },
  tank:   { type: "tank",   emoji: "🔷", hp: 170,  speed: 0.28, reward: 30,  radius: 17, touchDmg: 22, color: "#60a5fa" },
  ghost:  { type: "ghost",  emoji: "👻", hp: 30,   speed: 0.75, reward: 15,  radius: 12, touchDmg: 12, color: "#c4b5fd" },
  swarm:  { type: "swarm",  emoji: "🐝", hp: 8,    speed: 1.25, reward: 2,   radius: 8,  touchDmg: 5,  color: "#fbbf24" },
  boss:   { type: "boss",   emoji: "💀", hp: 1400, speed: 0.22, reward: 200, radius: 28, touchDmg: 45, color: "#dc2626" },
};

// ─── Upgrade Definitions ───────────────────────────────────────────────────────
interface UpgradeDef {
  id: UpgradeId;
  emoji: string;
  name: string;
  desc: string;
  max: number;
  color: string;
  apply: (s: Stats) => void;
}

const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  rate:     { id: "rate",     emoji: "🔥", name: "Rapid Fire",   desc: "+25% fire rate",             max: 6, color: "#f97316", apply: s => { s.fireDelay = Math.max(3, s.fireDelay * 0.78); } },
  multi:    { id: "multi",    emoji: "🌟", name: "Multishot",    desc: "+1 bullet stream",           max: 6, color: "#fbbf24", apply: s => { s.bullets += 1; } },
  dmg:      { id: "dmg",      emoji: "💪", name: "Power Core",   desc: "+35% bullet damage",         max: 8, color: "#ef4444", apply: s => { s.dmg = Math.round(s.dmg * 1.35); } },
  pierce:   { id: "pierce",   emoji: "🗡️", name: "Piercing",     desc: "Bullets pierce +1 enemy",    max: 5, color: "#e2e8f0", apply: s => { s.pierce += 1; } },
  drone:    { id: "drone",    emoji: "🛸", name: "Drone",        desc: "+1 orbiting attack drone",   max: 4, color: "#38bdf8", apply: s => { s.drones += 1; } },
  missile:  { id: "missile",  emoji: "🚀", name: "Homing Missile", desc: "+1 homing missile volley", max: 4, color: "#f472b6", apply: s => { s.missiles += 1; } },
  ricochet: { id: "ricochet", emoji: "🪃", name: "Ricochet",     desc: "Bullets bounce +1 time",     max: 3, color: "#c8ff00", apply: s => { s.ricochet += 1; } },
  boom:     { id: "boom",     emoji: "💥", name: "Detonator",    desc: "Kills explode, bigger AoE",  max: 4, color: "#fb7185", apply: s => { s.boomRadius += 34; } },
  magnet:   { id: "magnet",   emoji: "🧲", name: "Magnet",       desc: "+70% XP pickup range",       max: 3, color: "#a78bfa", apply: s => { s.magnetR *= 1.7; } },
  shield:   { id: "shield",   emoji: "🛡️", name: "Shield",       desc: "+30 shield, refills each wave", max: 3, color: "#34d399", apply: s => { s.shieldMax += 30; } },
};

const UPGRADE_ORDER: UpgradeId[] = ["rate", "multi", "dmg", "pierce", "drone", "missile", "ricochet", "boom", "magnet", "shield"];

// ─── Stars (static) ────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 50 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.4 + Math.random() * 1.4,
  a: 0.25 + Math.random() * 0.45,
  tw: Math.random() * Math.PI * 2,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────
let _eid = 0;
function nextId() { return ++_eid; }

const NOVA_COST = 35;
const MAX_PARTICLES = 300;
const MAX_BULLETS = 420;
const SHIP_MAX_SPEED = 3.7;   // px/frame the ship flies toward your finger

function initStats(): Stats {
  return {
    dmg: 12,
    fireDelay: 15,
    bullets: 1,
    pierce: 0,
    drones: 0,
    missiles: 0,
    ricochet: 0,
    boomRadius: 0,
    magnetR: 46,
    shieldMax: 0,
    bulletSpeed: 5.2,
  };
}

function initGS(): GS {
  return {
    phase: "idle",
    resumePhase: "wave",
    size: 360,
    wave: 0,
    frame: 0,
    hp: 200,
    maxHp: 200,
    shield: 0,
    score: 0,
    earnedKarma: 0,
    killCount: 0,
    xp: 0,
    level: 1,
    xpNext: 22,
    energy: 40,
    maxEnergy: 100,
    stats: initStats(),
    owned: {},
    upgradeChoices: [],
    enemies: [],
    bullets: [],
    drones: [],
    droneSpin: 0,
    particles: [],
    shockwaves: [],
    orbs: [],
    floats: [],
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    fireTimer: 0,
    missileTimer: 0,
    aimAngle: -Math.PI / 2,
    focusing: false,
    shipX: 180,
    shipY: 180,
    targetX: 180,
    targetY: 180,
    moving: false,
    novaFlash: 0,
    screenShake: 0,
    showWaveBanner: 0,
    shipFlash: 0,
    muzzle: 0,
  };
}

function buildWave(wave: number): { type: EnemyType; delay: number }[] {
  const q: { type: EnemyType; delay: number }[] = [];
  const delay = Math.max(14, 42 - wave * 1.5);

  function add(type: EnemyType, count: number) {
    for (let i = 0; i < count; i++) q.push({ type, delay });
  }

  if (wave <= 3) {
    add("seeker", 8 + wave * 3);
    if (wave >= 2) add("runner", wave * 2);
  } else if (wave <= 6) {
    add("seeker", 6 + wave * 2);
    add("runner", 4 + wave);
    add("swarm", wave * 2);
  } else if (wave <= 10) {
    add("seeker", 5 + wave);
    add("runner", 4 + wave);
    add("ghost", 2 + Math.floor(wave / 2));
    add("swarm", 4 + wave);
  } else if (wave <= 15) {
    add("seeker", 4 + wave);
    add("runner", 4 + wave);
    add("tank", 1 + Math.floor(wave / 4));
    add("ghost", 2 + Math.floor(wave / 3));
    add("swarm", 6 + wave);
  } else {
    add("seeker", 4 + wave);
    add("runner", 5 + wave);
    add("tank", 2 + Math.floor(wave / 5));
    add("ghost", 3 + Math.floor(wave / 3));
    add("swarm", 8 + wave);
  }

  // Shuffle for variety
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }

  if (wave % 5 === 0) {
    q.push({ type: "boss", delay: delay * 2 });
  }

  return q;
}

function enemyHpScale(wave: number): number {
  return 1 + (wave - 1) * 0.13;
}

// ─── Particle / FX helpers (mutate gs) ─────────────────────────────────────────
function spawnParticles(gs: GS, x: number, y: number, color: string, count: number, speed: number, size: number, life: number) {
  const room = MAX_PARTICLES - gs.particles.length;
  const n = Math.min(count, Math.max(0, room));
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = speed * (0.4 + Math.random() * 0.9);
    gs.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: life * (0.6 + Math.random() * 0.6),
      maxLife: life,
      color,
      size: size * (0.6 + Math.random() * 0.8),
    });
  }
}

function spawnExplosion(gs: GS, x: number, y: number, color: string, big: boolean) {
  spawnParticles(gs, x, y, color, big ? 26 : 12, big ? 3.4 : 2.2, big ? 3.4 : 2.4, big ? 42 : 28);
  spawnParticles(gs, x, y, "#ffffff", big ? 8 : 4, big ? 2.6 : 1.6, 1.8, 18);
  gs.shockwaves.push({
    x, y, r: 4,
    maxR: big ? 66 : 34,
    life: big ? 22 : 14,
    maxLife: big ? 22 : 14,
    color,
    lw: big ? 4 : 2.5,
  });
  if (big) gs.screenShake = Math.max(gs.screenShake, 10);
}

function damageEnemiesInRadius(gs: GS, x: number, y: number, radius: number, dmg: number) {
  gs.enemies.forEach(e => {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d <= radius + ENEMY_DEFS[e.type].radius) {
      e.hp -= dmg;
      e.hitFlash = 6;
    }
  });
}

function killEnemy(gs: GS, e: Enemy) {
  const def = ENEMY_DEFS[e.type];
  gs.score += def.reward;
  gs.earnedKarma += def.reward / 3;
  gs.killCount++;
  gs.energy = Math.min(gs.maxEnergy, gs.energy + (e.type === "boss" ? 25 : 3));

  const big = e.type === "boss" || e.type === "tank";
  spawnExplosion(gs, e.x, e.y, def.color, big);

  // Detonator AoE
  if (gs.stats.boomRadius > 0 && e.type !== "boss") {
    damageEnemiesInRadius(gs, e.x, e.y, gs.stats.boomRadius, Math.round(gs.stats.dmg * 0.5));
    gs.shockwaves.push({
      x: e.x, y: e.y, r: 6,
      maxR: gs.stats.boomRadius, life: 12, maxLife: 12,
      color: "#fb7185", lw: 2,
    });
  }

  // Boss death: MEGA explosion
  if (e.type === "boss") {
    gs.screenShake = 26;
    for (let ring = 0; ring < 3; ring++) {
      gs.shockwaves.push({
        x: e.x, y: e.y, r: 8 + ring * 14,
        maxR: 120 + ring * 45, life: 30 + ring * 8, maxLife: 30 + ring * 8,
        color: ring === 1 ? "#fbbf24" : "#dc2626", lw: 5 - ring,
      });
    }
    spawnParticles(gs, e.x, e.y, "#fbbf24", 40, 4.5, 3.6, 55);
    spawnParticles(gs, e.x, e.y, "#dc2626", 30, 3.2, 4.2, 60);
    damageEnemiesInRadius(gs, e.x, e.y, 150, 250);
    gs.floats.push({ x: e.x, y: e.y - 30, text: "BOSS DOWN!", color: "#fbbf24", life: 60 });
  }

  // Drop XP orbs
  const orbCount = e.type === "boss" ? 8 : e.type === "tank" ? 3 : 1;
  const xpEach = Math.max(1, Math.round(def.reward / (2 * orbCount)) * orbCount === 0 ? 1 : Math.max(1, Math.round(def.reward * 0.55 / orbCount)));
  for (let i = 0; i < orbCount; i++) {
    const a = Math.random() * Math.PI * 2;
    gs.orbs.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * (0.8 + Math.random() * 1.4),
      vy: Math.sin(a) * (0.8 + Math.random() * 1.4),
      xp: xpEach,
      life: 700,
    });
  }
}

function rollUpgrades(gs: GS): UpgradeId[] {
  const avail = UPGRADE_ORDER.filter(id => (gs.owned[id] ?? 0) < UPGRADE_DEFS[id].max);
  for (let i = avail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [avail[i], avail[j]] = [avail[j], avail[i]];
  }
  return avail.slice(0, 3);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PetBattle({ pet, petEmoji, onEnd, onWin }: PetBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>(initGS());
  const rafRef = useRef<number>(0);
  const pointerRef = useRef<{ down: boolean; startX: number; startY: number; moved: boolean }>({
    down: false, startX: 0, startY: 0, moved: false,
  });

  // UI state — synced at 10fps from the game-state ref
  const [uiPhase, setUiPhase] = useState<Phase>("idle");
  const [uiWave, setUiWave] = useState(0);
  const [uiScore, setUiScore] = useState(0);
  const [uiHp, setUiHp] = useState(200);
  const [uiShield, setUiShield] = useState(0);
  const [uiEnergy, setUiEnergy] = useState(40);
  const [uiLevel, setUiLevel] = useState(1);
  const [uiXpPct, setUiXpPct] = useState(0);
  const [uiChoices, setUiChoices] = useState<UpgradeId[]>([]);
  const [uiOwned, setUiOwned] = useState<Partial<Record<UpgradeId, number>>>({});

  const shipEmoji = petEmoji ?? "🐾";

  // ─── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gsRef.current;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = gs.size;
    const H = gs.size;
    const cx = W / 2;
    const cy = H / 2;
    const R = W / 2;
    const SHIP_R = R * 0.11;
    const sx = gs.shipX;
    const sy = gs.shipY;

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (gs.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * gs.screenShake * 0.6;
      shakeY = (Math.random() - 0.5) * gs.screenShake * 0.6;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bgGrad.addColorStop(0, "#0a0018");
    bgGrad.addColorStop(0.5, "#050512");
    bgGrad.addColorStop(1, "#010108");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // 2. Stars (twinkle)
    STARS.forEach(s => {
      const tw = 0.75 + 0.25 * Math.sin(gs.frame * 0.03 + s.tw);
      ctx.fillStyle = `rgba(255,255,255,${s.a * tw})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Arena rings
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(168,85,247,0.22)";
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(100,100,150,0.07)";
    [0.42, 0.62, 0.79].forEach(f => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 4. Movement target indicator (where the ship is flying to)
    if (gs.moving && (gs.phase === "wave" || gs.phase === "between")) {
      const td = Math.hypot(gs.targetX - sx, gs.targetY - sy);
      if (td > SHIP_R) {
        ctx.save();
        // trail line from ship to target
        ctx.strokeStyle = "rgba(200,255,0,0.16)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(gs.targetX, gs.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        // target ring
        const tp = 0.6 + 0.4 * Math.sin(gs.frame * 0.2);
        ctx.strokeStyle = `rgba(200,255,0,${0.5 * tp})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(gs.targetX, gs.targetY, 7 + tp * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. XP orbs
    gs.orbs.forEach(o => {
      const pulse = 0.8 + 0.2 * Math.sin(gs.frame * 0.15 + o.x);
      ctx.save();
      ctx.shadowColor = "#a78bfa";
      ctx.shadowBlur = 6;
      ctx.fillStyle = `rgba(167,139,250,${0.9 * pulse})`;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 3.2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Bullets (tracer glow)
    gs.bullets.forEach(b => {
      ctx.save();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.r;
      ctx.lineCap = "round";
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 2.2, b.y - b.vy * 2.2);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7. Enemies
    gs.enemies.forEach(e => {
      const def = ENEMY_DEFS[e.type];
      const isBoss = e.type === "boss";

      // Glow
      ctx.save();
      if (e.type === "ghost") ctx.globalAlpha = 0.55 + 0.35 * Math.sin(gs.frame * 0.08 + e.wobble);
      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, def.radius * 1.8);
      glow.addColorStop(0, `${def.color}55`);
      glow.addColorStop(1, `${def.color}00`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, def.radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Hit flash
      if (e.hitFlash > 0) {
        ctx.globalAlpha = e.hitFlash / 8;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(e.x, e.y, def.radius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Emoji
      const fontSize = isBoss ? Math.round(def.radius * 1.9) : Math.round(def.radius * 1.7);
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.sin(gs.frame * 0.06 + e.spin) * 0.18);
      ctx.fillText(def.emoji, 0, 0);
      ctx.restore();

      // Small HP bar (non-boss, only when damaged)
      if (!isBoss && e.hp < e.maxHp) {
        const barW = def.radius * 2;
        const pct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = "rgba(20,20,40,0.8)";
        ctx.fillRect(e.x - barW / 2, e.y - def.radius - 8, barW, 3);
        ctx.fillStyle = pct > 0.5 ? "#22c55e" : pct > 0.2 ? "#eab308" : "#ef4444";
        ctx.fillRect(e.x - barW / 2, e.y - def.radius - 8, barW * pct, 3);
      }
    });

    // 8. Drones
    gs.drones.forEach((d, i) => {
      const a = gs.droneSpin + (i / Math.max(1, gs.drones.length)) * Math.PI * 2;
      const dr = SHIP_R * 2.4;
      const dx = sx + Math.cos(a) * dr;
      const dy = sy + Math.sin(a) * dr;
      ctx.save();
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 9. Particles
    gs.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 10. Shockwaves
    gs.shockwaves.forEach(sw => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife) * 0.9;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lw;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 11. Ship (glowing hull + pet emoji)
    const shipPulse = 1 + Math.sin(gs.frame * 0.06) * 0.08;
    for (let i = 3; i >= 0; i--) {
      const nr = SHIP_R * (1.1 + i * 0.45) * shipPulse;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, nr);
      grad.addColorStop(0, `rgba(168,85,247,${0.28 - i * 0.06})`);
      grad.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hull — rotates toward aim
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(gs.aimAngle);
    ctx.fillStyle = gs.shipFlash > 0 ? "#ffffff" : "#1e0a3c";
    ctx.strokeStyle = gs.shipFlash > 0 ? "#ffffff" : "#a855f7";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(SHIP_R * 1.25, 0);
    ctx.lineTo(-SHIP_R * 0.75, SHIP_R * 0.85);
    ctx.lineTo(-SHIP_R * 0.35, 0);
    ctx.lineTo(-SHIP_R * 0.75, -SHIP_R * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Muzzle flash
    if (gs.muzzle > 0) {
      ctx.fillStyle = `rgba(255,240,150,${gs.muzzle / 5})`;
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(SHIP_R * 1.45, 0, 4 + gs.muzzle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Spinning energy dots around ship
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(gs.frame * 0.03);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = "#c8ff00";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * SHIP_R * 1.55, Math.sin(a) * SHIP_R * 1.55, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Pet emoji on top
    ctx.font = `${Math.round(SHIP_R * 1.15)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shipEmoji, sx, sy);

    // Shield bubble
    if (gs.shield > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(gs.frame * 0.1);
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sx, sy, SHIP_R * 1.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 12. Boss HP bar
    const boss = gs.enemies.find(e => e.type === "boss");
    if (boss) {
      const bw = W * 0.7;
      const bx = cx - bw / 2;
      const by = 14;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
      ctx.fillStyle = "#3f0d0d";
      ctx.fillRect(bx, by, bw, 8);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 8);
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 2, by - 2, bw + 4, 12);
      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#fca5a5";
      ctx.textAlign = "center";
      ctx.fillText("💀 BOSS", cx, by + 20);
    }

    // 13. Float texts
    gs.floats.forEach(f => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life / 30);
      ctx.font = `bold ${Math.round(R * 0.06)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = f.color;
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    });

    // 14. Wave banner
    if (gs.showWaveBanner > 0) {
      const alpha = Math.min(1, gs.showWaveBanner / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(cx - 100, cy - 70, 200, 44);
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 100, cy - 70, 200, 44);
      ctx.font = `bold ${Math.round(R * 0.08)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#c8ff00";
      ctx.fillText(`WAVE ${gs.wave}`, cx, cy - 48);
      ctx.restore();
    }

    ctx.restore();
  }, [shipEmoji]);

  // ─── Game Loop ──────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    const gs = gsRef.current;

    const W = gs.size;
    const cx = W / 2;
    const cy = W / 2;
    const R = W / 2;
    const SHIP_R = R * 0.11;
    const SPEED_SCALE = W / 360; // reference tuning size

    gs.frame++;
    if (gs.screenShake > 0) gs.screenShake -= 1.5;
    if (gs.shipFlash > 0) gs.shipFlash--;
    if (gs.muzzle > 0) gs.muzzle--;
    if (gs.novaFlash > 0) gs.novaFlash--;
    if (gs.showWaveBanner > 0) gs.showWaveBanner--;

    const simulating = gs.phase === "wave" || gs.phase === "between";

    // ── Ship movement: fly toward your finger ──
    if (simulating) {
      const maxSpd = SHIP_MAX_SPEED * SPEED_SCALE;
      const dx = gs.targetX - gs.shipX;
      const dy = gs.targetY - gs.shipY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.6) {
        const step = Math.min(dist, maxSpd * (gs.moving ? 1 : 0.5));
        gs.shipX += (dx / dist) * step;
        gs.shipY += (dy / dist) * step;
      }
      // keep inside the arena
      const cdx = gs.shipX - cx, cdy = gs.shipY - cy;
      const cd = Math.hypot(cdx, cdy);
      const limit = R * 0.84;
      if (cd > limit) {
        gs.shipX = cx + (cdx / cd) * limit;
        gs.shipY = cy + (cdy / cd) * limit;
      }
    }
    const sx = gs.shipX;
    const sy = gs.shipY;

    if (simulating) {
      // ── Spawning ──
      if (gs.phase === "wave") {
        gs.spawnTimer--;
        if (gs.spawnTimer <= 0 && gs.spawnQueue.length > 0) {
          const next = gs.spawnQueue.shift()!;
          gs.spawnTimer = next.delay;
          const def = ENEMY_DEFS[next.type];
          const angle = Math.random() * Math.PI * 2;
          const scale = enemyHpScale(gs.wave);
          const hp = Math.round(def.hp * scale * (next.type === "boss" ? 1 + gs.wave * 0.12 : 1));
          gs.enemies.push({
            id: nextId(),
            type: next.type,
            x: cx + Math.cos(angle) * R * 0.97,
            y: cy + Math.sin(angle) * R * 0.97,
            hp,
            maxHp: hp,
            wobble: Math.random() * Math.PI * 2,
            hitFlash: 0,
            spin: Math.random() * Math.PI * 2,
          });
        }
      }

      // ── Energy regen ──
      gs.energy = Math.min(gs.maxEnergy, gs.energy + 0.045);

      // Slow shield trickle
      if (gs.stats.shieldMax > 0) {
        gs.shield = Math.min(gs.stats.shieldMax, gs.shield + 0.02);
      }

      // ── Auto-fire ──
      gs.fireTimer--;
      if (gs.fireTimer <= 0 && gs.bullets.length < MAX_BULLETS) {
        gs.fireTimer = gs.stats.fireDelay;
        const n = gs.stats.bullets;

        // Auto-aim: nearest enemies to the ship
        const pool = [...gs.enemies].sort((a, b) =>
          (Math.hypot(a.x - sx, a.y - sy)) - (Math.hypot(b.x - sx, b.y - sy))
        );

        let fired = false;
        for (let i = 0; i < n; i++) {
          let ang: number;
          if (pool.length > 0) {
            const target = pool[i % pool.length];
            ang = Math.atan2(target.y - sy, target.x - sx) + (Math.random() - 0.5) * 0.10;
          } else {
            ang = gs.aimAngle + (i - (n - 1) / 2) * 0.22;
          }
          const spd = gs.stats.bulletSpeed * SPEED_SCALE;
          gs.bullets.push({
            x: sx + Math.cos(ang) * SHIP_R * 1.4,
            y: sy + Math.sin(ang) * SHIP_R * 1.4,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            dmg: gs.stats.dmg,
            pierce: gs.stats.pierce,
            ricochet: gs.stats.ricochet,
            life: 90,
            color: "#fbbf24",
            r: 2.8,
            homing: false,
            boomR: 0,
            hitIds: [],
            targetId: 0,
          });
          fired = true;
          // point the hull at the nearest target
          if (i === 0 && pool.length > 0) gs.aimAngle = ang;
        }
        if (fired) {
          gs.muzzle = 4;
          spawnParticles(gs, sx + Math.cos(gs.aimAngle) * SHIP_R * 1.5, sy + Math.sin(gs.aimAngle) * SHIP_R * 1.5, "#fde68a", 2, 1.4, 1.6, 10);
        }
      }

      // ── Homing missiles ──
      if (gs.stats.missiles > 0) {
        gs.missileTimer--;
        if (gs.missileTimer <= 0 && gs.enemies.length > 0) {
          gs.missileTimer = 85;
          for (let i = 0; i < gs.stats.missiles; i++) {
            const target = gs.enemies[Math.floor(Math.random() * gs.enemies.length)];
            const ang = Math.random() * Math.PI * 2;
            const spd = 2.4 * SPEED_SCALE;
            gs.bullets.push({
              x: sx, y: sy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              dmg: Math.round(gs.stats.dmg * 1.6),
              pierce: 0,
              ricochet: 0,
              life: 160,
              color: "#f472b6",
              r: 3.6,
              homing: true,
              boomR: 46,
              hitIds: [],
              targetId: target.id,
            });
          }
        }
      }

      // ── Drones ──
      gs.droneSpin += 0.05;
      while (gs.drones.length < gs.stats.drones) gs.drones.push({ angle: 0, cooldown: 20 + gs.drones.length * 10 });
      gs.drones.forEach((d, i) => {
        d.cooldown--;
        if (d.cooldown <= 0 && gs.enemies.length > 0 && gs.bullets.length < MAX_BULLETS) {
          d.cooldown = 42;
          const a = gs.droneSpin + (i / Math.max(1, gs.drones.length)) * Math.PI * 2;
          const dx = sx + Math.cos(a) * SHIP_R * 2.4;
          const dy = sy + Math.sin(a) * SHIP_R * 2.4;
          let best: Enemy | null = null;
          let bestD = Infinity;
          gs.enemies.forEach(e => {
            const dist = Math.hypot(e.x - dx, e.y - dy);
            if (dist < bestD) { bestD = dist; best = e; }
          });
          if (best) {
            const t = best as Enemy;
            const ang = Math.atan2(t.y - dy, t.x - dx);
            const spd = 4.6 * SPEED_SCALE;
            gs.bullets.push({
              x: dx, y: dy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              dmg: Math.round(gs.stats.dmg * 0.7),
              pierce: 0,
              ricochet: 0,
              life: 80,
              color: "#38bdf8",
              r: 2.2,
              homing: false,
              boomR: 0,
              hitIds: [],
              targetId: 0,
            });
          }
        }
      });

      // ── Move bullets + collisions ──
      const keptBullets: Bullet[] = [];
      gs.bullets.forEach(b => {
        // Homing steering
        if (b.homing) {
          let target = gs.enemies.find(e => e.id === b.targetId);
          if (!target && gs.enemies.length > 0) {
            target = gs.enemies[0];
            b.targetId = target.id;
          }
          if (target) {
            const ang = Math.atan2(target.y - b.y, target.x - b.x);
            const cur = Math.atan2(b.vy, b.vx);
            let d = ang - cur;
            d = ((d % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
            const turn = Math.max(-0.14, Math.min(0.14, d));
            const spd = Math.min(4.6 * SPEED_SCALE, Math.hypot(b.vx, b.vy) * 1.03);
            b.vx = Math.cos(cur + turn) * spd;
            b.vy = Math.sin(cur + turn) * spd;
          }
          // Exhaust trail
          if (gs.frame % 3 === 0) spawnParticles(gs, b.x, b.y, "#f9a8d4", 1, 0.4, 1.6, 14);
        }

        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        if (b.life <= 0) return;
        if (Math.hypot(b.x - cx, b.y - cy) > R * 1.05) return;

        // Collision
        let alive = true;
        for (const e of gs.enemies) {
          if (b.hitIds.includes(e.id)) continue;
          const def = ENEMY_DEFS[e.type];
          if (Math.hypot(e.x - b.x, e.y - b.y) <= def.radius + b.r) {
            e.hp -= b.dmg;
            e.hitFlash = 6;
            b.hitIds.push(e.id);
            spawnParticles(gs, b.x, b.y, b.color, 3, 1.6, 1.6, 12);

            if (b.boomR > 0) {
              // Missile: explode
              damageEnemiesInRadius(gs, b.x, b.y, b.boomR, Math.round(b.dmg * 0.6));
              spawnExplosion(gs, b.x, b.y, "#f472b6", false);
              alive = false;
              break;
            }

            if (b.pierce > 0) {
              b.pierce--;
            } else if (b.ricochet > 0) {
              b.ricochet--;
              // Bounce toward nearest other enemy
              let best: Enemy | null = null;
              let bestD = Infinity;
              gs.enemies.forEach(o => {
                if (o.id === e.id || b.hitIds.includes(o.id)) return;
                const d = Math.hypot(o.x - b.x, o.y - b.y);
                if (d < bestD && d < R * 0.9) { bestD = d; best = o; }
              });
              if (best) {
                const t = best as Enemy;
                const ang = Math.atan2(t.y - b.y, t.x - b.x);
                const spd = Math.hypot(b.vx, b.vy);
                b.vx = Math.cos(ang) * spd;
                b.vy = Math.sin(ang) * spd;
                b.color = "#c8ff00";
              } else {
                alive = false;
                break;
              }
            } else {
              alive = false;
              break;
            }
          }
        }
        if (alive) keptBullets.push(b);
      });
      gs.bullets = keptBullets;

      // ── Move enemies + ship contact ──
      const aliveEnemies: Enemy[] = [];
      gs.enemies.forEach(e => {
        if (e.hitFlash > 0) e.hitFlash--;
        const def = ENEMY_DEFS[e.type];
        const ang = Math.atan2(sy - e.y, sx - e.x);
        let weave = 0;
        if (e.type === "ghost" || e.type === "swarm") {
          weave = Math.sin(gs.frame * 0.07 + e.wobble) * 0.7;
        } else if (e.type === "runner") {
          weave = Math.sin(gs.frame * 0.05 + e.wobble) * 0.35;
        }
        const spd = def.speed * SPEED_SCALE;
        e.x += Math.cos(ang + weave) * spd;
        e.y += Math.sin(ang + weave) * spd;

        const distToShip = Math.hypot(e.x - sx, e.y - sy);

        if (e.hp <= 0) {
          killEnemy(gs, e);
        } else if (distToShip <= SHIP_R * 1.3 + def.radius) {
          // Contact: enemy detonates on ship
          let dmg = def.touchDmg;
          if (gs.shield > 0) {
            const absorbed = Math.min(gs.shield, dmg);
            gs.shield -= absorbed;
            dmg -= absorbed;
          }
          gs.hp -= dmg;
          gs.shipFlash = 8;
          gs.screenShake = Math.max(gs.screenShake, e.type === "boss" ? 20 : 8);
          spawnExplosion(gs, e.x, e.y, "#ef4444", e.type === "boss" || e.type === "tank");
        } else {
          aliveEnemies.push(e);
        }
      });
      gs.enemies = aliveEnemies;

      // ── XP orbs ──
      const keptOrbs: Orb[] = [];
      gs.orbs.forEach(o => {
        o.life--;
        o.x += o.vx;
        o.y += o.vy;
        o.vx *= 0.92;
        o.vy *= 0.92;
        const d = Math.hypot(o.x - sx, o.y - sy);
        const magnetR = gs.stats.magnetR * SPEED_SCALE;
        if (d < magnetR) {
          const pull = (1 - d / magnetR) * 3.2 + 0.6;
          const a = Math.atan2(sy - o.y, sx - o.x);
          o.x += Math.cos(a) * pull;
          o.y += Math.sin(a) * pull;
        }
        if (d <= SHIP_R * 1.7) {
          gs.xp += o.xp;
          gs.score += 1;
          gs.energy = Math.min(gs.maxEnergy, gs.energy + 1);
          spawnParticles(gs, o.x, o.y, "#a78bfa", 3, 1.2, 1.6, 12);
        } else if (o.life > 0) {
          keptOrbs.push(o);
        }
      });
      gs.orbs = keptOrbs;

      // ── Level up → upgrade cards ──
      if (gs.xp >= gs.xpNext) {
        gs.xp -= gs.xpNext;
        gs.level++;
        gs.xpNext = Math.round(20 + gs.level * 14);
        const choices = rollUpgrades(gs);
        if (choices.length > 0) {
          gs.upgradeChoices = choices;
          gs.resumePhase = gs.phase === "between" ? "between" : "wave";
          gs.phase = "upgrade";
          gs.floats.push({ x: sx, y: sy - SHIP_R * 3, text: "LEVEL UP!", color: "#c8ff00", life: 60 });
        } else {
          gs.score += 50;
          gs.floats.push({ x: sx, y: sy - SHIP_R * 3, text: "MAXED! +50", color: "#fbbf24", life: 45 });
        }
      }

      // ── Auto NOVA: fires itself when energy is full ──
      if (gs.energy >= gs.maxEnergy && gs.enemies.length > 0) {
        // aim at the densest nearby cluster (nearest enemy centroid)
        const near = [...gs.enemies].sort((a, b) =>
          Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy)
        ).slice(0, 5);
        let nx = 0, ny = 0;
        near.forEach(e => { nx += e.x; ny += e.y; });
        nx /= near.length; ny /= near.length;
        gs.energy = 0;
        gs.novaFlash = 10;
        const radius = W * 0.19;
        damageEnemiesInRadius(gs, nx, ny, radius, Math.round(gs.stats.dmg * 6 + 60));
        gs.shockwaves.push({ x: nx, y: ny, r: 6, maxR: radius, life: 18, maxLife: 18, color: "#c8ff00", lw: 4 });
        gs.shockwaves.push({ x: nx, y: ny, r: 2, maxR: radius * 0.6, life: 12, maxLife: 12, color: "#ffffff", lw: 2 });
        spawnParticles(gs, nx, ny, "#c8ff00", 20, 3.4, 2.6, 32);
        gs.screenShake = Math.max(gs.screenShake, 12);
        gs.floats.push({ x: nx, y: ny - 20, text: "NOVA!", color: "#c8ff00", life: 35 });
      }

      // ── Ship death ──
      if (gs.hp <= 0) {
        gs.hp = 0;
        gs.phase = "gameover";
        spawnExplosion(gs, sx, sy, "#a855f7", true);
        spawnParticles(gs, sx, sy, "#c8ff00", 30, 4, 3, 50);
        gs.screenShake = 24;
        onEnd?.(false, Math.floor(gs.earnedKarma));
      }

      // ── Wave complete ──
      if (gs.phase === "wave" && gs.spawnQueue.length === 0 && gs.enemies.length === 0) {
        if (gs.wave >= 25) {
          gs.phase = "win";
          onEnd?.(true, Math.floor(gs.earnedKarma));
          onWin?.(
            Math.floor(gs.earnedKarma),
            gs.killCount * 10,
            pet?.name ?? "Unknown",
            pet?.rarity ?? "common"
          );
        } else {
          gs.phase = "between";
          gs.betweenTimer = 130;
          // Shield refill between waves
          gs.shield = gs.stats.shieldMax;
        }
      } else if (gs.phase === "between") {
        gs.betweenTimer--;
        if (gs.betweenTimer <= 0) {
          gs.wave++;
          gs.spawnQueue = buildWave(gs.wave);
          gs.spawnTimer = 40;
          gs.phase = "wave";
          gs.showWaveBanner = 60;
        }
      }
    }

    // ── Always: particles / shockwaves / floats decay (even in menus) ──
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life--;
      return p.life > 0;
    });
    gs.shockwaves = gs.shockwaves.filter(sw => {
      sw.life--;
      sw.r += (sw.maxR - sw.r) * 0.22;
      return sw.life > 0;
    });
    gs.floats = gs.floats.filter(f => {
      f.y -= 0.5;
      f.life--;
      return f.life > 0;
    });

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, onEnd, onWin, pet]);

  // ─── Pointer handling: drag anywhere = fly the ship there ───────────────────
  const toLocal = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const gs = gsRef.current;
    return {
      x: (clientX - rect.left) * (gs.size / rect.width),
      y: (clientY - rect.top) * (gs.size / rect.height),
    };
  }, []);

  const pointerDown = useCallback((clientX: number, clientY: number) => {
    const gs = gsRef.current;
    if (gs.phase !== "wave" && gs.phase !== "between") return;
    const p = toLocal(clientX, clientY);
    pointerRef.current = { down: true, startX: p.x, startY: p.y, moved: false };
    gs.targetX = p.x;
    gs.targetY = p.y;
    gs.moving = true;
  }, [toLocal]);

  const pointerMove = useCallback((clientX: number, clientY: number) => {
    const pr = pointerRef.current;
    if (!pr.down) return;
    const gs = gsRef.current;
    const p = toLocal(clientX, clientY);
    gs.targetX = p.x;
    gs.targetY = p.y;
    gs.moving = true;
  }, [toLocal]);

  const pointerUp = useCallback(() => {
    const pr = pointerRef.current;
    const gs = gsRef.current;
    pr.down = false;
    gs.moving = false;
  }, []);

  // ─── Setup: sizing, native touch listeners, UI sync, rAF ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      const w = parent ? parent.offsetWidth : 360;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${w}px`;
      const gs = gsRef.current;
      gs.size = w;
      if (gs.phase === "idle") {
        gs.shipX = gs.targetX = w / 2;
        gs.shipY = gs.targetY = w / 2;
      }
      draw();
    };
    window.addEventListener("resize", updateSize);
    updateSize();

    // Native touch listeners (non-passive so preventDefault works)
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) pointerDown(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) pointerMove(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      pointerUp();
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    const onMouseDown = (e: MouseEvent) => pointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => pointerMove(e.clientX, e.clientY);
    const onMouseUp = () => pointerUp();
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // UI sync at 10fps
    const uiTimer = setInterval(() => {
      const gs = gsRef.current;
      setUiPhase(gs.phase);
      setUiWave(gs.wave);
      setUiScore(gs.score);
      setUiHp(Math.max(0, Math.ceil(gs.hp)));
      setUiShield(Math.ceil(gs.shield));
      setUiEnergy(gs.energy);
      setUiLevel(gs.level);
      setUiXpPct(Math.min(100, (gs.xp / gs.xpNext) * 100));
      setUiChoices(prev => {
        const next = gs.upgradeChoices;
        if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
        return [...next];
      });
      setUiOwned(prev => {
        const next = gs.owned;
        const keys = UPGRADE_ORDER.filter(k => (next[k] ?? 0) > 0);
        const changed = keys.some(k => prev[k] !== next[k]) || keys.length !== Object.keys(prev).length;
        return changed ? { ...next } : prev;
      });
    }, 100);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", updateSize);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      clearInterval(uiTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw, gameLoop, pointerDown, pointerMove, pointerUp]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  function startGame() {
    const size = gsRef.current.size;
    gsRef.current = initGS();
    gsRef.current.size = size;
    gsRef.current.shipX = gsRef.current.targetX = size / 2;
    gsRef.current.shipY = gsRef.current.targetY = size / 2;
    gsRef.current.phase = "wave";
    gsRef.current.wave = 1;
    gsRef.current.spawnQueue = buildWave(1);
    gsRef.current.spawnTimer = 40;
    gsRef.current.showWaveBanner = 60;
  }

  function pickUpgrade(id: UpgradeId) {
    const gs = gsRef.current;
    if (gs.phase !== "upgrade") return;
    UPGRADE_DEFS[id].apply(gs.stats);
    gs.owned[id] = (gs.owned[id] ?? 0) + 1;
    gs.upgradeChoices = [];
    gs.phase = gs.resumePhase;
    setUiChoices([]);
    // celebration burst
    const c = gs.size / 2;
    spawnParticles(gs, c, c, UPGRADE_DEFS[id].color, 14, 2.6, 2.4, 30);
  }

  // ─── Derived UI ─────────────────────────────────────────────────────────────
  const hpPct = (uiHp / 200) * 100;
  const energyPct = (uiEnergy / 100) * 100;
  const novaReady = uiEnergy >= NOVA_COST;
  const ownedList = UPGRADE_ORDER.filter(id => (uiOwned[id] ?? 0) > 0);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#0d0d0d", borderRadius: 16, overflow: "hidden", userSelect: "none" }}>
      {/* Compact HUD — one line */}
      <div style={{
        display: "flex", gap: 10, padding: "7px 12px",
        background: "#0b0b12", borderBottom: "1px solid #1c1c28",
        alignItems: "center",
      }}>
        {/* Wave */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700, letterSpacing: 1 }}>WAVE</span>
          <span style={{ fontSize: 14, color: "#fbbf24", fontWeight: 900 }}>{uiPhase === "idle" ? "–" : uiWave}</span>
          <span style={{ fontSize: 9, color: "#665" }}>/25</span>
        </div>

        {/* HP bar (flex) */}
        <div style={{ flex: 1, minWidth: 60 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 8, color: "#a855f7", fontWeight: 800, letterSpacing: 1 }}>
              ❤ HP {uiShield > 0 ? `· 🛡${uiShield}` : ""}
            </span>
            <span style={{ fontSize: 8, color: "#a78bfa", fontWeight: 700 }}>LV{uiLevel}</span>
          </div>
          <div style={{ background: "#1a0a2e", borderRadius: 3, height: 6, overflow: "hidden" }}>
            <div style={{
              width: `${hpPct}%`, height: "100%",
              background: hpPct > 50 ? "#a855f7" : hpPct > 20 ? "#f97316" : "#ef4444",
              transition: "width 0.3s",
            }} />
          </div>
          {/* thin xp + nova sliver */}
          <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
            <div style={{ flex: 1, background: "#14102a", borderRadius: 2, height: 3, overflow: "hidden" }}>
              <div style={{ width: `${uiXpPct}%`, height: "100%", background: "#a78bfa" }} />
            </div>
            <div style={{ flex: 1, background: "#1a2000", borderRadius: 2, height: 3, overflow: "hidden" }}>
              <div style={{ width: `${energyPct}%`, height: "100%", background: novaReady ? "#c8ff00" : "#5a7a00", boxShadow: novaReady ? "0 0 4px #c8ff00" : "none" }} />
            </div>
          </div>
        </div>

        {/* Score */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          <span style={{ fontSize: 14, color: "#38bdf8", fontWeight: 900 }}>{uiScore}</span>
          <span style={{ fontSize: 8, color: "#38bdf8", fontWeight: 700, letterSpacing: 1 }}>PTS</span>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", touchAction: "none", cursor: "crosshair" }}
        />

        {/* Owned upgrades — tiny overlay, bottom-left */}
        {ownedList.length > 0 && (uiPhase === "wave" || uiPhase === "between") && (
          <div style={{
            position: "absolute", left: 8, bottom: 8,
            display: "flex", gap: 4, flexWrap: "wrap", maxWidth: "62%",
            pointerEvents: "none",
          }}>
            {ownedList.map(id => {
              const def = UPGRADE_DEFS[id];
              const lvl = uiOwned[id] ?? 0;
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", gap: 2,
                  padding: "2px 5px", borderRadius: 6,
                  background: "rgba(0,0,0,0.5)", border: `1px solid ${def.color}66`,
                }}>
                  <span style={{ fontSize: 11 }}>{def.emoji}</span>
                  <span style={{ fontSize: 8, color: def.color, fontWeight: 800 }}>{lvl}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Idle overlay */}
        {uiPhase === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{shipEmoji}</div>
            <div style={{
              fontSize: 22, fontWeight: 900, color: "#c8ff00",
              letterSpacing: 3, textShadow: "0 0 20px #a855f7",
              marginBottom: 4,
            }}>KARMA PULSE</div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 20, textAlign: "center", padding: "0 24px", lineHeight: 1.6 }}>
              <strong style={{ color: "#c8ff00" }}>DRA för att flyga skeppet</strong> vart du vill.<br />
              Skeppet skjuter själv · flyg in i 💜 orbs för att samla XP<br />
              NOVA laddar & smäller av automatiskt · överlev 25 vågor
            </div>
            <button
              onClick={startGame}
              style={{
                padding: "12px 32px", fontSize: 14, fontWeight: 700,
                background: "linear-gradient(135deg, #a855f7, #c8ff00)",
                color: "#000", border: "none", borderRadius: 8,
                cursor: "pointer", letterSpacing: 2,
                boxShadow: "0 0 20px rgba(168,85,247,0.5)",
              }}
            >
              LAUNCH
            </button>
          </div>
        )}

        {/* Upgrade picker overlay */}
        {uiPhase === "upgrade" && uiChoices.length > 0 && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,10,0.82)", padding: 12,
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#c8ff00", letterSpacing: 2, marginBottom: 2 }}>
              ⬆ LEVEL UP
            </div>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 12 }}>Choose an upgrade</div>
            <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "center" }}>
              {uiChoices.map(id => {
                const def = UPGRADE_DEFS[id];
                const lvl = uiOwned[id] ?? 0;
                return (
                  <button
                    key={id}
                    onClick={() => pickUpgrade(id)}
                    style={{
                      flex: "1 1 0", maxWidth: 110, padding: "14px 6px",
                      background: "#14081f",
                      border: `2px solid ${def.color}`,
                      borderRadius: 10, cursor: "pointer",
                      boxShadow: `0 0 14px ${def.color}44`,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{def.emoji}</div>
                    <div style={{ fontSize: 10, color: def.color, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }}>
                      {def.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 9, color: "#aaa", lineHeight: 1.35 }}>{def.desc}</div>
                    <div style={{ fontSize: 8, color: "#555", marginTop: 5 }}>
                      Lv {lvl} → {lvl + 1} / {def.max}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Between-wave banner */}
        {uiPhase === "between" && (
          <div style={{
            position: "absolute", top: "8%", left: 0, right: 0,
            display: "flex", justifyContent: "center", pointerEvents: "none",
          }}>
            <div style={{
              background: "rgba(0,0,0,0.8)",
              border: "1px solid #c8ff00",
              borderRadius: 8, padding: "6px 16px",
              color: "#c8ff00", fontWeight: 700, fontSize: 11,
              letterSpacing: 2,
            }}>
              WAVE {uiWave} CLEAR · NEXT INCOMING…
            </div>
          </div>
        )}

        {/* Win overlay */}
        {uiPhase === "win" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,10,0.88)",
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#c8ff00", letterSpacing: 3, marginBottom: 4 }}>
              SECTOR CLEARED
            </div>
            <div style={{ color: "#a855f7", fontSize: 13, marginBottom: 6 }}>
              All 25 waves destroyed!
            </div>
            <div style={{ color: "#888", fontSize: 11, marginBottom: 20 }}>
              {gsRef.current.killCount} kills · {Math.floor(gsRef.current.earnedKarma)} karma earned
            </div>
            <button
              onClick={startGame}
              style={{
                padding: "10px 28px", fontSize: 13, fontWeight: 700,
                background: "#c8ff00", color: "#000", border: "none",
                borderRadius: 8, cursor: "pointer", letterSpacing: 2,
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Game Over overlay */}
        {uiPhase === "gameover" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.88)",
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>💥</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444", letterSpacing: 3, marginBottom: 4 }}>
              SHIP DESTROYED
            </div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
              Wave {uiWave} · {gsRef.current.killCount} kills · {Math.floor(gsRef.current.earnedKarma)} karma earned
            </div>
            <button
              onClick={startGame}
              style={{
                padding: "10px 28px", fontSize: 13, fontWeight: 700,
                background: "#ef4444", color: "#fff", border: "none",
                borderRadius: 8, cursor: "pointer", letterSpacing: 2,
              }}
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
