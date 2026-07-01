"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
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
type Phase = "idle" | "wave" | "between" | "win" | "gameover";
type TowerType = "pulse" | "arc" | "nova" | "chrono" | "sniper" | "echo";
type EnemyType = "seeker" | "runner" | "tank" | "ghost" | "swarm" | "boss";

interface TowerDef {
  type: TowerType;
  emoji: string;
  name: string;
  cost: number;
  dmg: number;
  rate: number;
  rangeAngle: number;
  color: string;
  special: string;
}

interface EnemyDef {
  type: EnemyType;
  emoji: string;
  hp: number;
  speed: number;
  reward: number;
  armor: number;
  color: string;
}

interface Tower {
  slot: number;
  type: TowerType;
  cooldown: number;
  flash: number;
}

interface Enemy {
  id: number;
  type: EnemyType;
  angle: number;
  r: number; // fraction of canvas half (0=center, 1=edge)
  hp: number;
  maxHp: number;
  slowTimer: number;
  hitFlash: number;
  echoTimer: number;
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

interface Projectile {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
}

interface GS {
  phase: Phase;
  wave: number;
  nexusHp: number;
  maxNexusHp: number;
  gold: number;
  karma: number;
  maxKarma: number;
  towers: Tower[];
  enemies: Enemy[];
  particles: Particle[];
  projectiles: Projectile[];
  frame: number;
  spawnQueue: { type: EnemyType; delay: number }[];
  spawnTimer: number;
  betweenTimer: number;
  pulseActive: boolean;
  pulseCooldown: number;
  pulseRing: number;
  killCount: number;
  screenShake: number;
  earnedKarma: number;
  showWaveBanner: number;
  nexusPulse: number;
}

// ─── Tower Definitions ─────────────────────────────────────────────────────────
const TOWER_DEFS: Record<TowerType, TowerDef> = {
  pulse:  { type:"pulse",  emoji:"🔮", name:"Pulse",  cost:60,  dmg:22,  rate:45,  rangeAngle:0.65, color:"#a855f7", special:"splash"     },
  arc:    { type:"arc",    emoji:"⚡", name:"Arc",    cost:90,  dmg:40,  rate:60,  rangeAngle:0.45, color:"#fbbf24", special:"chain"      },
  nova:   { type:"nova",   emoji:"💥", name:"Nova",   cost:130, dmg:90,  rate:90,  rangeAngle:0.40, color:"#f97316", special:"nova_burst" },
  chrono: { type:"chrono", emoji:"⏳", name:"Chrono", cost:140, dmg:10,  rate:75,  rangeAngle:0.60, color:"#38bdf8", special:"slow"       },
  sniper: { type:"sniper", emoji:"🎯", name:"Sniper", cost:220, dmg:250, rate:160, rangeAngle:0.20, color:"#e2e8f0", special:"pierce"     },
  echo:   { type:"echo",   emoji:"📡", name:"Echo",   cost:175, dmg:15,  rate:55,  rangeAngle:0.50, color:"#c8ff00", special:"echo"       },
};

const TOWER_ORDER: TowerType[] = ["pulse","arc","nova","chrono","sniper","echo"];

// ─── Enemy Definitions ─────────────────────────────────────────────────────────
const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  seeker: { type:"seeker", emoji:"👾", hp:80,   speed:0.010, reward:8,   armor:0,  color:"#f87171" },
  runner: { type:"runner", emoji:"💨", hp:40,   speed:0.022, reward:6,   armor:0,  color:"#fb923c" },
  tank:   { type:"tank",   emoji:"🔷", hp:400,  speed:0.004, reward:30,  armor:20, color:"#60a5fa" },
  ghost:  { type:"ghost",  emoji:"👻", hp:60,   speed:0.015, reward:15,  armor:0,  color:"#c4b5fd" },
  swarm:  { type:"swarm",  emoji:"🐝", hp:15,   speed:0.025, reward:2,   armor:0,  color:"#fbbf24" },
  boss:   { type:"boss",   emoji:"💀", hp:2000, speed:0.003, reward:200, armor:40, color:"#dc2626" },
};

// ─── Stars (static) ────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 40 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.5 + Math.random() * 1.5,
  a: 0.3 + Math.random() * 0.4,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────
let _eid = 0;
function nextId() { return ++_eid; }

function angularDist(a: number, b: number): number {
  let d = ((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return Math.abs(d);
}

function slotAngle(slot: number): number {
  return (slot / 12) * Math.PI * 2 - Math.PI / 2;
}

function initGS(): GS {
  return {
    phase: "idle",
    wave: 0,
    nexusHp: 200,
    maxNexusHp: 200,
    gold: 120,
    karma: 0,
    maxKarma: 100,
    towers: [],
    enemies: [],
    particles: [],
    projectiles: [],
    frame: 0,
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    pulseActive: false,
    pulseCooldown: 0,
    pulseRing: 0,
    killCount: 0,
    screenShake: 0,
    earnedKarma: 0,
    showWaveBanner: 0,
    nexusPulse: 0,
  };
}

function buildWave(wave: number): { type: EnemyType; delay: number }[] {
  const q: { type: EnemyType; delay: number }[] = [];
  const delay = Math.max(30, 50 - wave);

  function add(type: EnemyType, count: number) {
    for (let i = 0; i < count; i++) q.push({ type, delay });
  }

  if (wave <= 3) {
    add("seeker", 8 + wave * 2);
  } else if (wave <= 6) {
    add("seeker", 6 + wave);
    add("runner", 4 + wave);
  } else if (wave <= 10) {
    add("seeker", 5 + wave);
    add("runner", 3 + wave);
    add("ghost", 2 + Math.floor(wave / 2));
  } else if (wave <= 15) {
    add("seeker", 4 + wave);
    add("runner", 3 + wave);
    add("tank", 1 + Math.floor(wave / 4));
    add("ghost", 2 + Math.floor(wave / 3));
    add("swarm", 5 + wave);
  } else {
    add("seeker", 3 + wave);
    add("runner", 4 + wave);
    add("tank", 2 + Math.floor(wave / 5));
    add("ghost", 3 + Math.floor(wave / 3));
    add("swarm", 6 + wave);
  }

  if (wave % 5 === 0) {
    q.push({ type: "boss", delay: delay * 2 });
  }

  return q;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PetBattle({ pet, petEmoji: _petEmoji, onEnd, onWin }: PetBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>(initGS());
  const rafRef = useRef<number>(0);

  // UI state — updated at 10fps
  const [uiPhase, setUiPhase] = useState<Phase>("idle");
  const [uiWave, setUiWave] = useState(0);
  const [uiGold, setUiGold] = useState(120);
  const [uiNexusHp, setUiNexusHp] = useState(200);
  const [uiKarma, setUiKarma] = useState(0);
  const [selectedTower, setSelectedTower] = useState<TowerType>("pulse");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // ─── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gsRef.current;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = W / 2;

    const TOWER_RING = R * 0.38;
    const NEXUS_R = R * 0.14;

    // Screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (gs.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * gs.screenShake * 0.5;
      shakeY = (Math.random() - 0.5) * gs.screenShake * 0.5;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bgGrad.addColorStop(0, "#0a0015");
    bgGrad.addColorStop(0.5, "#050510");
    bgGrad.addColorStop(1, "#010108");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Zone circles
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,0,0,0.08)";
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(200,255,0,0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, TOWER_RING, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(168,85,247,0.3)";
    ctx.beginPath();
    ctx.arc(cx, cy, NEXUS_R, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle mid ring
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(100,100,150,0.06)";
    [0.6, 0.75].forEach(f => {
      ctx.beginPath();
      ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 3. Stars
    STARS.forEach(s => {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Tower range arc for selected slot
    if (selectedSlot !== null) {
      const t = gs.towers.find(tw => tw.slot === selectedSlot);
      const tType = t ? t.type : selectedTower;
      const def = TOWER_DEFS[tType];
      const sa = slotAngle(selectedSlot);
      ctx.save();
      ctx.fillStyle = `${def.color}18`;
      ctx.strokeStyle = `${def.color}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 0.92, sa - def.rangeAngle, sa + def.rangeAngle);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 5. Tower slots
    for (let s = 0; s < 12; s++) {
      const ang = slotAngle(s);
      const sx = cx + Math.cos(ang) * TOWER_RING;
      const sy = cy + Math.sin(ang) * TOWER_RING;
      const tower = gs.towers.find(tw => tw.slot === s);

      if (tower) {
        const def = TOWER_DEFS[tower.type];
        // Glow
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
        grd.addColorStop(0, `${def.color}88`);
        grd.addColorStop(1, `${def.color}00`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, 18, 0, Math.PI * 2);
        ctx.fill();

        // Circle
        ctx.fillStyle = tower.flash > 0 ? "#ffffff" : def.color;
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Emoji
        ctx.font = `${Math.round(R * 0.055)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(def.emoji, sx, sy);

        // Selected highlight
        if (selectedSlot === s) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(sx, sy, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Empty slot
        const isSelected = selectedSlot === s;
        const selDef = TOWER_DEFS[selectedTower];
        ctx.strokeStyle = isSelected ? selDef.color : "rgba(255,255,255,0.2)";
        ctx.lineWidth = isSelected ? 2 : 1;
        if (isSelected) {
          ctx.shadowColor = selDef.color;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Plus icon
        ctx.fillStyle = isSelected ? selDef.color : "rgba(255,255,255,0.2)";
        ctx.font = `${Math.round(R * 0.04)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+", sx, sy);
      }
    }

    // 6. Enemies
    gs.enemies.forEach(e => {
      const def = ENEMY_DEFS[e.type];
      const ex = cx + Math.cos(e.angle) * e.r * R;
      const ey = cy + Math.sin(e.angle) * e.r * R;

      // HP bar
      const barW = 28;
      const barH = 4;
      const barX = ex - barW / 2;
      const barY = ey - 20;
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? "#22c55e" : e.hp / e.maxHp > 0.2 ? "#eab308" : "#ef4444";
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);

      // Hit flash
      if (e.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = e.hitFlash / 8;
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(ex, ey, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Slow indicator
      if (e.slowTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(ex, ey, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Emoji
      const fontSize = e.type === "boss" ? Math.round(R * 0.08) : Math.round(R * 0.06);
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.emoji, ex, ey);
    });

    // 7. Projectiles
    gs.projectiles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / 8;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
      ctx.restore();
    });

    // 8. Particles
    gs.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 9. Nexus
    const nPulse = Math.sin(gs.frame * 0.04) * 0.3 + 1;
    for (let i = 4; i >= 0; i--) {
      const nr = NEXUS_R * (0.3 + i * 0.18) * nPulse;
      const alpha = (0.12 - i * 0.015);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nr);
      grad.addColorStop(0, `rgba(168,85,247,${alpha * 3})`);
      grad.addColorStop(0.5, `rgba(99,20,220,${alpha})`);
      grad.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rotating ring around nexus
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(gs.frame * 0.02);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rx = Math.cos(a) * NEXUS_R * 0.85;
      const ry = Math.sin(a) * NEXUS_R * 0.85;
      ctx.fillStyle = "#a855f7";
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Nexus emoji
    ctx.font = `${Math.round(NEXUS_R * 0.9)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💎", cx, cy);

    // 10. Karma pulse expanding ring
    if (gs.pulseRing > 0) {
      const progress = 1 - gs.pulseRing / 60;
      const pr = R * 0.92 * progress;
      ctx.save();
      ctx.globalAlpha = gs.pulseRing / 60;
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 4 + (1 - progress) * 8;
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 11. Wave banner
    if (gs.showWaveBanner > 0) {
      const alpha = Math.min(1, gs.showWaveBanner / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(cx - 100, cy - 22, 200, 44);
      ctx.strokeStyle = "#c8ff00";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 100, cy - 22, 200, 44);
      ctx.font = `bold ${Math.round(R * 0.08)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#c8ff00";
      ctx.fillText(`WAVE ${gs.wave}`, cx, cy);
      ctx.restore();
    }

    ctx.restore();
  }, [selectedSlot, selectedTower]);

  // ─── Game Loop ──────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gs = gsRef.current;

    const R = canvas.width / 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const TOWER_RING_F = 0.38;
    const NEXUS_RF = 0.14;

    gs.frame++;
    if (gs.screenShake > 0) gs.screenShake -= 2;
    if (gs.nexusPulse > 0) gs.nexusPulse--;

    if (gs.phase === "wave") {
      // Spawn
      gs.spawnTimer--;
      if (gs.spawnTimer <= 0 && gs.spawnQueue.length > 0) {
        const next = gs.spawnQueue.shift()!;
        gs.spawnTimer = next.delay;
        const def = ENEMY_DEFS[next.type];
        const angle = Math.random() * Math.PI * 2;
        gs.enemies.push({
          id: nextId(),
          type: next.type,
          angle,
          r: 0.92,
          hp: def.hp,
          maxHp: def.hp,
          slowTimer: 0,
          hitFlash: 0,
          echoTimer: 0,
        });
      }

      // Towers fire
      gs.towers.forEach(tower => {
        const def = TOWER_DEFS[tower.type];
        if (tower.flash > 0) tower.flash--;
        if (tower.cooldown > 0) { tower.cooldown--; return; }

        // Find targets in range
        const sa = slotAngle(tower.slot);
        const targets = gs.enemies
          .filter(e => angularDist(sa, e.angle) <= def.rangeAngle)
          .sort((a, b) => a.r - b.r); // closest to nexus first

        if (targets.length === 0) return;

        const towerX = cx + Math.cos(sa) * R * TOWER_RING_F;
        const towerY = cy + Math.sin(sa) * R * TOWER_RING_F;

        const primary = targets[0];
        const targetX = cx + Math.cos(primary.angle) * primary.r * R;
        const targetY = cy + Math.sin(primary.angle) * primary.r * R;

        // Damage
        function dealDmg(enemy: Enemy, dmg: number) {
          const actual = Math.max(1, dmg - ENEMY_DEFS[enemy.type].armor);
          enemy.hp -= actual;
          enemy.hitFlash = 8;
          gs.projectiles.push({
            x1: towerX, y1: towerY,
            x2: cx + Math.cos(enemy.angle) * enemy.r * R,
            y2: cy + Math.sin(enemy.angle) * enemy.r * R,
            color: def.color,
            life: 8,
          });
        }

        if (def.special === "splash") {
          // Hit all in range
          targets.forEach(e => dealDmg(e, def.dmg));
        } else if (def.special === "chain") {
          dealDmg(primary, def.dmg);
          if (targets.length > 1) dealDmg(targets[1], Math.floor(def.dmg * 0.5));
          if (targets.length > 2) dealDmg(targets[2], Math.floor(def.dmg * 0.25));
        } else if (def.special === "slow") {
          targets.forEach(e => {
            if (e.type !== "ghost") {
              dealDmg(e, def.dmg);
              e.slowTimer = 120;
            }
          });
        } else if (def.special === "pierce") {
          targets.forEach(e => dealDmg(e, def.dmg));
        } else if (def.special === "echo") {
          dealDmg(primary, def.dmg);
          // Secondary pulse after 20 frames
          primary.echoTimer = 20;
        } else {
          dealDmg(primary, def.dmg);
          if (def.special === "nova_burst" && targets.length > 1) {
            targets.slice(1, 4).forEach(e => dealDmg(e, Math.floor(def.dmg * 0.3)));
          }
        }

        tower.flash = 5;
        tower.cooldown = def.rate;
      });

      // Move enemies
      const dead: Enemy[] = [];
      const alive: Enemy[] = [];

      gs.enemies.forEach(e => {
        if (e.hitFlash > 0) e.hitFlash--;
        if (e.slowTimer > 0) e.slowTimer--;
        if (e.echoTimer > 0) {
          e.echoTimer--;
          if (e.echoTimer === 0) {
            const echoDmg = Math.max(1, TOWER_DEFS["echo"].dmg * 2 - ENEMY_DEFS[e.type].armor);
            e.hp -= echoDmg;
            e.hitFlash = 8;
          }
        }

        const def = ENEMY_DEFS[e.type];
        const spd = e.slowTimer > 0 ? def.speed * 0.4 : def.speed;
        e.r -= spd;

        if (e.r < NEXUS_RF) {
          // Reached nexus
          const dmg = e.type === "boss" ? 50 : e.type === "tank" ? 20 : 10;
          gs.nexusHp -= dmg;
          gs.screenShake = 10;
          gs.nexusPulse = 20;
          // Spawn red particles
          for (let i = 0; i < 8; i++) {
            gs.particles.push({
              x: cx, y: cy,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              life: 30, maxLife: 30,
              color: "#ef4444", size: 3,
            });
          }
          dead.push(e);
        } else if (e.hp <= 0) {
          dead.push(e);
        } else {
          alive.push(e);
        }
      });

      // Process kills
      dead.forEach(e => {
        if (e.hp <= 0) {
          const def = ENEMY_DEFS[e.type];
          gs.gold += def.reward;
          const karmaGain = def.reward / 3;
          gs.karma = Math.min(gs.maxKarma, gs.karma + karmaGain);
          gs.earnedKarma += karmaGain;
          gs.killCount++;

          const ex = cx + Math.cos(e.angle) * e.r * R;
          const ey = cy + Math.sin(e.angle) * e.r * R;
          for (let i = 0; i < 12; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1 + Math.random() * 2;
            gs.particles.push({
              x: ex, y: ey,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 25 + Math.random() * 20,
              maxLife: 45,
              color: def.color,
              size: 2 + Math.random() * 2,
            });
          }
        }
      });

      gs.enemies = alive;

      // Karma pulse trigger
      if (gs.pulseActive && gs.pulseCooldown <= 0) {
        gs.pulseActive = false;
        gs.karma = 0;
        gs.pulseRing = 60;
        // Kill weak enemies
        const survived: Enemy[] = [];
        gs.enemies.forEach(e => {
          const def = ENEMY_DEFS[e.type];
          if (e.hp < def.hp * 0.3) {
            // Kill it
            gs.gold += Math.floor(def.reward * 0.5);
            gs.killCount++;
            const ex = cx + Math.cos(e.angle) * e.r * R;
            const ey = cy + Math.sin(e.angle) * e.r * R;
            for (let i = 0; i < 8; i++) {
              const ang = Math.random() * Math.PI * 2;
              gs.particles.push({
                x: ex, y: ey,
                vx: Math.cos(ang) * 2,
                vy: Math.sin(ang) * 2,
                life: 30, maxLife: 30,
                color: "#c8ff00", size: 3,
              });
            }
          } else {
            survived.push(e);
          }
        });
        gs.enemies = survived;
      }
      if (gs.pulseCooldown > 0) gs.pulseCooldown--;
      if (gs.pulseRing > 0) gs.pulseRing--;

      // Check nexus death
      if (gs.nexusHp <= 0) {
        gs.nexusHp = 0;
        gs.phase = "gameover";
        onEnd?.(false, Math.floor(gs.earnedKarma));
      }

      // Check wave complete
      if (gs.spawnQueue.length === 0 && gs.enemies.length === 0) {
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
          gs.betweenTimer = 180;
        }
      }
    } else if (gs.phase === "between") {
      gs.betweenTimer--;
      gs.showWaveBanner = Math.max(0, gs.betweenTimer - 120);
      if (gs.betweenTimer <= 0) {
        gs.wave++;
        gs.spawnQueue = buildWave(gs.wave);
        gs.spawnTimer = 60;
        gs.phase = "wave";
        gs.showWaveBanner = 60;
      }
    }

    // Particles
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      return p.life > 0;
    });

    // Projectiles
    gs.projectiles = gs.projectiles.filter(p => {
      p.life--;
      return p.life > 0;
    });

    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, onEnd, onWin, pet]);

  // ─── Canvas click / touch ───────────────────────────────────────────────────
  const handleCanvasInteract = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gs = gsRef.current;
    if (gs.phase !== "wave" && gs.phase !== "between") return;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const R = canvas.width / 2;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const TOWER_RING = R * 0.38;

    // Check tower slots
    for (let s = 0; s < 12; s++) {
      const ang = slotAngle(s);
      const sx = cx + Math.cos(ang) * TOWER_RING;
      const sy = cy + Math.sin(ang) * TOWER_RING;
      const dist = Math.hypot(x - sx, y - sy);
      if (dist <= 20) {
        const existing = gs.towers.find(tw => tw.slot === s);
        if (existing) {
          // Select existing tower slot
          setSelectedSlot(prev => prev === s ? null : s);
        } else {
          if (selectedSlot === s) {
            // Second click on empty selected slot: place tower
            const def = TOWER_DEFS[selectedTower];
            if (gs.gold >= def.cost) {
              gs.gold -= def.cost;
              gs.towers.push({ slot: s, type: selectedTower, cooldown: 0, flash: 0 });
              setSelectedSlot(null);
            }
          } else {
            setSelectedSlot(s);
          }
        }
        return;
      }
    }
    // Click away → deselect
    setSelectedSlot(null);
  }, [selectedSlot, selectedTower]);

  // ─── Setup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const w = canvas.parentElement?.clientWidth ?? 360;
      canvas.width = w;
      canvas.height = w;
      draw();
    };
    window.addEventListener("resize", updateSize);
    updateSize();

    // UI sync at 10fps
    const uiTimer = setInterval(() => {
      const gs = gsRef.current;
      setUiPhase(gs.phase);
      setUiWave(gs.wave);
      setUiGold(gs.gold);
      setUiNexusHp(gs.nexusHp);
      setUiKarma(gs.karma);
    }, 100);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", updateSize);
      clearInterval(uiTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw, gameLoop]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  function startGame() {
    gsRef.current = initGS();
    gsRef.current.phase = "wave";
    gsRef.current.wave = 1;
    gsRef.current.spawnQueue = buildWave(1);
    gsRef.current.spawnTimer = 60;
    gsRef.current.showWaveBanner = 60;
    setSelectedSlot(null);
  }

  function restartGame() {
    startGame();
  }

  function sellSelected() {
    const gs = gsRef.current;
    if (selectedSlot === null) return;
    const idx = gs.towers.findIndex(tw => tw.slot === selectedSlot);
    if (idx === -1) return;
    const t = gs.towers[idx];
    const def = TOWER_DEFS[t.type];
    gs.gold += Math.floor(def.cost * 0.5);
    gs.towers.splice(idx, 1);
    setSelectedSlot(null);
  }

  function triggerPulse() {
    const gs = gsRef.current;
    if (gs.karma < gs.maxKarma) return;
    gs.pulseActive = true;
    gs.pulseCooldown = 0;
  }

  // ─── Derived UI ─────────────────────────────────────────────────────────────
  const gs = gsRef.current;
  const selectedSlotTower = selectedSlot !== null
    ? gs.towers.find(tw => tw.slot === selectedSlot)
    : null;
  const canAfford = (type: TowerType) => uiGold >= TOWER_DEFS[type].cost;
  const nexusPct = (uiNexusHp / 200) * 100;
  const karmaPct = (uiKarma / 100) * 100;
  const pulseReady = uiKarma >= 100;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#0d0d0d", borderRadius: 12, overflow: "hidden", userSelect: "none" }}>
      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 8, padding: "8px 10px",
        background: "#111", borderBottom: "1px solid #222",
        flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Nexus HP */}
        <div style={{ flex: 1, minWidth: 90 }}>
          <div style={{ fontSize: 10, color: "#a855f7", marginBottom: 2, fontWeight: 700, letterSpacing: 1 }}>NEXUS</div>
          <div style={{ background: "#1a0a2e", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${nexusPct}%`, height: "100%",
              background: nexusPct > 50 ? "#a855f7" : nexusPct > 20 ? "#f97316" : "#ef4444",
              transition: "width 0.3s",
            }} />
          </div>
          <div style={{ fontSize: 9, color: "#666", marginTop: 1 }}>{uiNexusHp}/200</div>
        </div>

        {/* Wave */}
        <div style={{ textAlign: "center", minWidth: 50 }}>
          <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700, letterSpacing: 1 }}>WAVE</div>
          <div style={{ fontSize: 16, color: "#fbbf24", fontWeight: 900 }}>
            {uiPhase === "idle" ? "–" : `${uiWave}/25`}
          </div>
        </div>

        {/* Gold */}
        <div style={{ textAlign: "center", minWidth: 50 }}>
          <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, letterSpacing: 1 }}>GOLD</div>
          <div style={{ fontSize: 16, color: "#38bdf8", fontWeight: 900 }}>⚡{uiGold}</div>
        </div>

        {/* Karma */}
        <div style={{ flex: 1, minWidth: 90 }}>
          <div style={{ fontSize: 10, color: "#c8ff00", marginBottom: 2, fontWeight: 700, letterSpacing: 1 }}>
            KARMA {pulseReady ? "⚡ READY" : `${Math.floor(karmaPct)}%`}
          </div>
          <div style={{ background: "#1a2000", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${karmaPct}%`, height: "100%",
              background: pulseReady ? "#c8ff00" : "#5a7a00",
              transition: "width 0.3s",
              boxShadow: pulseReady ? "0 0 6px #c8ff00" : "none",
            }} />
          </div>
          <button
            onClick={triggerPulse}
            disabled={!pulseReady || uiPhase !== "wave"}
            style={{
              marginTop: 3, padding: "2px 8px", fontSize: 9,
              background: pulseReady && uiPhase === "wave" ? "#c8ff00" : "#222",
              color: pulseReady && uiPhase === "wave" ? "#000" : "#555",
              border: "none", borderRadius: 4, cursor: pulseReady && uiPhase === "wave" ? "pointer" : "default",
              fontWeight: 700, letterSpacing: 1,
            }}
          >
            KARMA PULSE
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%" }}
          onClick={e => handleCanvasInteract(e.clientX, e.clientY)}
          onTouchStart={e => {
            e.preventDefault();
            const t = e.touches[0];
            handleCanvasInteract(t.clientX, t.clientY);
          }}
        />

        {/* Idle overlay */}
        {uiPhase === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💎</div>
            <div style={{
              fontSize: 22, fontWeight: 900, color: "#c8ff00",
              letterSpacing: 3, textShadow: "0 0 20px #a855f7",
              marginBottom: 4,
            }}>KARMA PULSE</div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 20, textAlign: "center", padding: "0 20px" }}>
              Place towers on the ring · Defend the nexus · Survive 25 waves
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
              START GAME
            </button>
            <div style={{ marginTop: 12, fontSize: 10, color: "#555" }}>
              Tap tower slots to place · Tap placed towers to select/sell
            </div>
          </div>
        )}

        {/* Between-wave banner */}
        {uiPhase === "between" && (
          <div style={{
            position: "absolute", top: "10%", left: 0, right: 0,
            display: "flex", justifyContent: "center",
          }}>
            <div style={{
              background: "rgba(0,0,0,0.8)",
              border: "1px solid #c8ff00",
              borderRadius: 8, padding: "8px 20px",
              color: "#c8ff00", fontWeight: 700, fontSize: 12,
              letterSpacing: 2,
            }}>
              WAVE {uiWave} COMPLETE · NEXT WAVE INCOMING…
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
              NEXUS DEFENDED
            </div>
            <div style={{ color: "#a855f7", fontSize: 13, marginBottom: 20 }}>
              All 25 waves survived!
            </div>
            <button
              onClick={restartGame}
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
            <div style={{ fontSize: 52, marginBottom: 8 }}>💀</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444", letterSpacing: 3, marginBottom: 4 }}>
              NEXUS DESTROYED
            </div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
              Wave {uiWave} · {Math.floor(gsRef.current.earnedKarma)} karma earned
            </div>
            <button
              onClick={restartGame}
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

      {/* Tower picker */}
      <div style={{
        background: "#111", borderTop: "1px solid #222",
        padding: "8px 6px", display: "flex", gap: 6,
        overflowX: "auto",
      }}>
        {TOWER_ORDER.map(type => {
          const def = TOWER_DEFS[type];
          const affordable = canAfford(type);
          const isSelected = selectedTower === type;
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedTower(type);
                // If a slot is selected and empty, offer to place
              }}
              style={{
                flex: "0 0 auto",
                padding: "6px 10px",
                background: isSelected ? `${def.color}22` : "#1a1a1a",
                border: `1px solid ${isSelected ? def.color : affordable ? "#333" : "#222"}`,
                borderRadius: 8,
                cursor: "pointer",
                opacity: affordable ? 1 : 0.45,
                minWidth: 64,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 18 }}>{def.emoji}</div>
              <div style={{ fontSize: 9, color: isSelected ? def.color : "#ccc", fontWeight: 700, letterSpacing: 1 }}>
                {def.name.toUpperCase()}
              </div>
              <div style={{ fontSize: 9, color: "#38bdf8" }}>⚡{def.cost}</div>
              <div style={{ fontSize: 8, color: "#666" }}>{def.dmg}dmg</div>
            </button>
          );
        })}
      </div>

      {/* Selected slot info */}
      {selectedSlot !== null && (
        <div style={{
          background: "#0d0d1a", borderTop: "1px solid #222",
          padding: "8px 12px", display: "flex", alignItems: "center", gap: 12,
        }}>
          {selectedSlotTower ? (
            <>
              <div>
                <div style={{ fontSize: 16 }}>{TOWER_DEFS[selectedSlotTower.type].emoji}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: TOWER_DEFS[selectedSlotTower.type].color, fontWeight: 700 }}>
                  {TOWER_DEFS[selectedSlotTower.type].name.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, color: "#888" }}>
                  {TOWER_DEFS[selectedSlotTower.type].dmg} dmg · {TOWER_DEFS[selectedSlotTower.type].special}
                </div>
              </div>
              <button
                onClick={sellSelected}
                style={{
                  padding: "5px 12px", fontSize: 10, fontWeight: 700,
                  background: "#1a0a0a", color: "#f87171",
                  border: "1px solid #7f1d1d", borderRadius: 6, cursor: "pointer",
                  letterSpacing: 1,
                }}
              >
                SELL ⚡{Math.floor(TOWER_DEFS[selectedSlotTower.type].cost * 0.5)}
              </button>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#888" }}>Slot {selectedSlot + 1} selected</div>
                <div style={{ fontSize: 9, color: "#555" }}>
                  Tap slot again to place {TOWER_DEFS[selectedTower].name} (⚡{TOWER_DEFS[selectedTower].cost})
                </div>
              </div>
              <div style={{ fontSize: 18 }}>{TOWER_DEFS[selectedTower].emoji}</div>
              <button
                onClick={() => {
                  if (selectedSlot === null) return;
                  const g = gsRef.current;
                  const def = TOWER_DEFS[selectedTower];
                  if (g.gold >= def.cost && !g.towers.find(tw => tw.slot === selectedSlot)) {
                    g.gold -= def.cost;
                    g.towers.push({ slot: selectedSlot, type: selectedTower, cooldown: 0, flash: 0 });
                    setSelectedSlot(null);
                  }
                }}
                disabled={!canAfford(selectedTower) || uiPhase === "idle" || uiPhase === "win" || uiPhase === "gameover"}
                style={{
                  padding: "5px 12px", fontSize: 10, fontWeight: 700,
                  background: canAfford(selectedTower) ? "#0a1a0a" : "#111",
                  color: canAfford(selectedTower) ? "#c8ff00" : "#555",
                  border: `1px solid ${canAfford(selectedTower) ? "#3a5a00" : "#222"}`,
                  borderRadius: 6, cursor: canAfford(selectedTower) ? "pointer" : "default",
                  letterSpacing: 1,
                }}
              >
                PLACE
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
