"use client";

import Link from "next/link";
import { ChevronLeft, Trophy, Heart, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getPetEmoji, getPetClassColor } from "@/lib/pet-evolution";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── KARMA GUNNER — Auto-shooting turret vs falling element enemies ──

type Elem = "fire" | "ice" | "electric" | "void";
const ELEMS: Elem[] = ["fire", "ice", "electric", "void"];
const ECFG: Record<Elem, { emoji: string; color: string; beats: Elem | null }> = {
  fire:     { emoji: "🔥", color: "#ff4422", beats: "ice"      },
  ice:      { emoji: "💧", color: "#44aaff", beats: "electric" },
  electric: { emoji: "⚡", color: "#ccff00", beats: "fire"     },
  void:     { emoji: "🌀", color: "#cc44ff", beats: null       },
};

type Bullet   = { id: number; x: number; y: number; vy: number; elem: Elem; dmg: number };
type Enemy    = { id: number; x: number; y: number; vx: number; vy: number; elem: Elem; hp: number; maxHp: number; size: number; phase: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number };
type Kdrop    = { id: number; x: number; y: number; vy: number };
type FloatTxt = { id: number; x: number; y: number; text: string; color: string; life: number };
type Boss     = { x: number; y: number; vx: number; hp: number; maxHp: number; fireTimer: number; size: number; emoji: string; color: string };

type GS = {
  turretX: number;
  dragging: boolean;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  drops: Kdrop[];
  floats: FloatTxt[];
  boss: Boss | null;
  bossBullets: Array<{ id: number; x: number; y: number; vy: number }>;
  score: number; karma: number; wave: number; hp: number;
  frame: number; idCounter: number;
  fireTimer: number; fireInterval: number;
  bulletDmg: number; splitShot: boolean; magnet: boolean;
  shields: number;
  fusionElem: Elem | null; fusionFrames: number;
  streak: number; streakElem: Elem | null;
  shakeFrames: number;
  spawnDone: boolean; spawnTimer: number; spawnQueue: Array<{ x: number; y: number; elem: Elem; hp: number; size: number; vx: number; vy: number }>;
  waveCleared: boolean;
  bossSpawned: boolean;
  upgrades: Record<string, number>;
};

function mkGS(w: number): GS {
  return {
    turretX: w / 2, dragging: false,
    bullets: [], enemies: [], particles: [], drops: [], floats: [], boss: null, bossBullets: [],
    score: 0, karma: 0, wave: 0, hp: 5,
    frame: 0, idCounter: 0,
    fireTimer: 0, fireInterval: 28,
    bulletDmg: 1, splitShot: false, magnet: false,
    shields: 0,
    fusionElem: null, fusionFrames: 0,
    streak: 0, streakElem: null,
    shakeFrames: 0,
    spawnDone: false, spawnTimer: 0, spawnQueue: [],
    waveCleared: false, bossSpawned: false,
    upgrades: {},
  };
}

function buildWave(wave: number, w: number): GS["spawnQueue"] {
  const q: GS["spawnQueue"] = [];
  const count = Math.min(4 + wave * 2, 20);
  const hp = 1 + Math.floor(wave / 3);
  const spd = 0.5 + wave * 0.08;
  const elems: Elem[] = ["fire", "ice", "electric", "void"];
  if (wave % 5 === 0 && wave > 0) return q; // boss wave — handled separately
  for (let i = 0; i < count; i++) {
    const cols = Math.min(5, 3 + Math.floor(wave / 4));
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (w / (cols + 1)) * (col + 1);
    q.push({
      x, y: -40 - row * 55,
      elem: elems[Math.floor(Math.abs(Math.sin(wave * 13 + i * 7)) * 4) % 4],
      hp, size: 18, vx: (col % 2 === 0 ? 0.4 : -0.4) * (wave > 8 ? 1.5 : 1), vy: spd,
    });
  }
  return q;
}

const UPGRADES = [
  { id: "rapid",   emoji: "🔫", name: "RAPID FIRE",  desc: "−20% fire delay",    baseCost: 30, maxLevel: 3 },
  { id: "heavy",   emoji: "💥", name: "HEAVY SHOT",  desc: "+1 bullet damage",   baseCost: 40, maxLevel: 3 },
  { id: "split",   emoji: "📡", name: "SPLIT SHOT",  desc: "Fire 3 bullets",     baseCost: 60, maxLevel: 1 },
  { id: "shield",  emoji: "🛡️", name: "SHIELD",      desc: "Absorb 1 hit",       baseCost: 50, maxLevel: 5 },
  { id: "magnet",  emoji: "🧲", name: "MAGNET",      desc: "Auto-collect karma",  baseCost: 45, maxLevel: 1 },
  { id: "nuke",    emoji: "☢️", name: "NUKE",        desc: "Clear all enemies",  baseCost: 80, maxLevel: 99 },
] as const;

const BOSS_DATA = [
  { emoji: "👹", color: "#ff2244", name: "DEMON" },
  { emoji: "💀", color: "#cc44ff", name: "SKULL" },
  { emoji: "🔥", color: "#ff8800", name: "INFERNO" },
  { emoji: "⚡", color: "#ffdd00", name: "THUNDERGOD" },
];

export default function KarmaGunnerPage() {
  const { pet, addKarma, addXP, updateScore, gameScores } = useApp();
  const petEmoji  = getPetEmoji(pet.evolution, pet.class);
  const classColor = getPetClassColor(pet.class);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gs        = useRef<GS | null>(null);
  const rafRef    = useRef<number>(0);

  type Phase = "idle" | "on" | "shop" | "over";
  const [phase, setPhase] = useState<Phase>("idle");
  const [ui, setUi] = useState({ score: 0, karma: 0, wave: 1, hp: 5, fusion: false, bossHp: 0, bossMax: 0, shieldsLeft: 0 });
  const [shopKarma, setShopKarma] = useState(0);
  const [shopUpgrades, setShopUpgrades] = useState<Record<string, number>>({});
  const [shopTimer, setShopTimer] = useState(10);
  const [finalScore, setFinalScore] = useState({ score: 0, karma: 0, wave: 0 });

  // ── drawing ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const g = gs.current;
    if (!canvas || !g) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const TURRET_Y = H - 44;

    // shake offset
    const sx = g.shakeFrames > 0 ? (Math.random() * 6 - 3) : 0;
    const sy = g.shakeFrames > 0 ? (Math.random() * 4 - 2) : 0;
    ctx.save();
    if (g.shakeFrames > 0) ctx.translate(sx, sy);

    // background
    ctx.fillStyle = "#030308";
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = "#0a1a3a";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // fusion overlay
    if (g.fusionFrames > 0) {
      const fc = ECFG[g.fusionElem ?? "fire"].color;
      ctx.globalAlpha = (g.fusionFrames / 120) * 0.12;
      ctx.fillStyle = fc;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // karma drops
    g.drops.forEach(d => {
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#ffdd00";
      ctx.shadowBlur = 8;
      ctx.fillText("⚡", d.x, d.y);
      ctx.shadowBlur = 0;
    });

    // particles
    g.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // enemies
    g.enemies.forEach(e => {
      const cfg = ECFG[e.elem];
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 10 + Math.sin(g.frame * 0.1 + e.phase) * 4;
      ctx.fillStyle = cfg.color + "33";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = `${e.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(cfg.emoji, e.x, e.y);
      // HP bar
      if (e.maxHp > 1) {
        const bw = e.size * 2;
        ctx.fillStyle = "#111";
        ctx.fillRect(e.x - bw / 2, e.y - e.size - 7, bw, 4);
        ctx.fillStyle = cfg.color;
        ctx.fillRect(e.x - bw / 2, e.y - e.size - 7, bw * (e.hp / e.maxHp), 4);
      }
    });

    // boss
    if (g.boss) {
      const b = g.boss;
      const pulse = 1 + Math.sin(g.frame * 0.07) * 0.08;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = b.color + "22";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = `${b.size * 1.1}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.emoji, b.x, b.y);
      // boss HP bar
      const bw = 140;
      ctx.fillStyle = "#111";
      ctx.fillRect(W / 2 - bw / 2, 8, bw, 10);
      ctx.fillStyle = b.color;
      ctx.fillRect(W / 2 - bw / 2, 8, bw * (b.hp / b.maxHp), 10);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - bw / 2, 8, bw, 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOSS", W / 2, 13);
    }

    // boss bullets
    g.bossBullets.forEach(bb => {
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#ff2244";
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // player bullets
    g.bullets.forEach(b => {
      const cfg = ECFG[b.elem];
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // floating text
    g.floats.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life / 20);
      ctx.fillStyle = f.color;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 6;
      ctx.fillText(f.text, f.x, f.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // turret platform
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, TURRET_Y + 20, W, H - TURRET_Y - 20);

    // turret barrel
    const bx = g.turretX;
    ctx.shadowColor = classColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = classColor;
    ctx.fillRect(bx - 4, TURRET_Y - 16, 8, 20);
    ctx.shadowBlur = 0;

    // turret emoji
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = classColor;
    ctx.shadowBlur = 14;
    ctx.fillText(petEmoji, bx, TURRET_Y + 10);
    ctx.shadowBlur = 0;

    // shield indicator
    if (g.shields > 0) {
      ctx.globalAlpha = 0.4 + Math.sin(g.frame * 0.1) * 0.2;
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(bx, TURRET_Y + 4, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [petEmoji, classColor]);

  // ── game loop ────────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const g = gs.current;
    const canvas = canvasRef.current;
    if (!g || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const TURRET_Y = H - 44;

    g.frame++;
    if (g.shakeFrames > 0) g.shakeFrames--;
    if (g.fusionFrames > 0) g.fusionFrames--;
    if (g.fusionFrames === 0) { g.fusionElem = null; }

    // spawn enemies from queue
    if (!g.spawnDone && g.spawnQueue.length > 0) {
      g.spawnTimer++;
      if (g.spawnTimer >= 20) {
        g.spawnTimer = 0;
        const e = g.spawnQueue.shift()!;
        g.enemies.push({ ...e, id: g.idCounter++, maxHp: e.hp, phase: Math.random() * Math.PI * 2 });
        if (g.spawnQueue.length === 0) g.spawnDone = true;
      }
    }

    // boss spawn
    if (g.wave > 0 && g.wave % 5 === 0 && !g.bossSpawned && g.spawnDone && g.enemies.length === 0) {
      const bd = BOSS_DATA[Math.floor((g.wave / 5 - 1)) % BOSS_DATA.length];
      const bossHp = 8 + g.wave * 2;
      g.boss = { x: W / 2, y: 60, vx: 1.2, hp: bossHp, maxHp: bossHp, fireTimer: 0, size: 30, emoji: bd.emoji, color: bd.color };
      g.bossSpawned = true;
      g.floats.push({ id: g.idCounter++, x: W / 2, y: H / 2 - 40, text: `⚠ ${bd.name} ⚠`, color: bd.color, life: 120 });
    }

    // move boss
    if (g.boss) {
      const b = g.boss;
      b.x += b.vx;
      if (b.x < b.size || b.x > W - b.size) b.vx *= -1;
      b.fireTimer++;
      if (b.fireTimer >= 90) {
        b.fireTimer = 0;
        g.bossBullets.push({ id: g.idCounter++, x: b.x, y: b.y + b.size, vy: 3.5 });
      }
    }

    // move boss bullets
    g.bossBullets = g.bossBullets.filter(bb => {
      bb.y += bb.vy;
      if (bb.y > H) return false;
      // hit player
      const dx = bb.x - g.turretX;
      const dy = bb.y - TURRET_Y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) {
        if (g.shields > 0) {
          g.shields--;
          g.floats.push({ id: g.idCounter++, x: g.turretX, y: TURRET_Y - 30, text: "🛡️ BLOCK!", color: "#00e5ff", life: 45 });
        } else {
          g.hp--;
          g.shakeFrames = 18;
          g.floats.push({ id: g.idCounter++, x: g.turretX, y: TURRET_Y - 30, text: "💔", color: "#ff2244", life: 40 });
          if (g.hp <= 0) { g.hp = 0; return false; }
        }
        return false;
      }
      return true;
    });

    // auto-fire
    g.fireTimer++;
    if (g.fireTimer >= g.fireInterval) {
      g.fireTimer = 0;
      const bx = g.turretX;
      const activeElem = g.fusionElem ?? (g.streakElem && g.streak >= 3 ? g.streakElem : ELEMS[g.frame % 4]);
      const spd = -9;
      if (g.splitShot) {
        [-12, 0, 12].forEach((off, i) => {
          g.bullets.push({ id: g.idCounter++, x: bx + off, y: TURRET_Y - 20, vy: spd + (i === 1 ? 0 : -1), elem: activeElem, dmg: g.bulletDmg });
        });
      } else {
        g.bullets.push({ id: g.idCounter++, x: bx, y: TURRET_Y - 20, vy: spd, elem: activeElem, dmg: g.bulletDmg });
      }
    }

    // move bullets + collision
    g.bullets = g.bullets.filter(b => {
      b.y += b.vy;
      if (b.y < -10) return false;

      // vs boss
      if (g.boss) {
        const bos = g.boss;
        const dx = b.x - bos.x;
        const dy = b.y - bos.y;
        if (Math.sqrt(dx * dx + dy * dy) < bos.size + 4) {
          bos.hp -= b.dmg;
          g.score += 3;
          for (let i = 0; i < 5; i++) {
            const a = Math.random() * Math.PI * 2;
            g.particles.push({ x: bos.x, y: bos.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 20, maxLife: 20, color: bos.color, size: 4 });
          }
          if (bos.hp <= 0) {
            g.boss = null;
            g.karma += 5;
            g.score += 300;
            g.shakeFrames = 25;
            g.floats.push({ id: g.idCounter++, x: W / 2, y: H / 2 - 20, text: "BOSS DEFEATED! +5⚡", color: "#ffdd00", life: 90 });
            for (let i = 0; i < 5; i++) g.drops.push({ id: g.idCounter++, x: W / 2 + (i - 2) * 20, y: 60, vy: 1.5 });
          }
          return false;
        }
      }

      // vs enemies
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (Math.sqrt(dx * dx + dy * dy) < e.size + 4) {
          const advantage = ECFG[b.elem].beats === e.elem;
          const dmg = advantage ? b.dmg * 2 : b.dmg;
          e.hp -= dmg;

          // streak
          if (g.streakElem === b.elem) {
            g.streak++;
            if (g.streak >= 5 && g.fusionFrames === 0) {
              g.fusionElem = b.elem;
              g.fusionFrames = 120;
              g.streak = 0;
              g.floats.push({ id: g.idCounter++, x: e.x, y: e.y - 20, text: `FUSION ${ECFG[b.elem].emoji}!`, color: ECFG[b.elem].color, life: 60 });
            }
          } else { g.streakElem = b.elem; g.streak = 1; }

          if (advantage) g.floats.push({ id: g.idCounter++, x: e.x, y: e.y - 14, text: "2×", color: ECFG[b.elem].color, life: 30 });

          if (e.hp <= 0) {
            g.score += 10 + (e.maxHp - 1) * 5;
            g.drops.push({ id: g.idCounter++, x: e.x, y: e.y, vy: 1.2 });
            for (let j = 0; j < 6; j++) {
              const a = (j / 6) * Math.PI * 2;
              g.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * (2 + Math.random() * 2), vy: Math.sin(a) * (2 + Math.random() * 2), life: 25, maxLife: 25, color: ECFG[e.elem].color, size: 3 + Math.random() * 3 });
            }
            g.enemies.splice(i, 1);
          }
          return false;
        }
      }
      return true;
    });

    // move enemies
    g.enemies.forEach(e => {
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < e.size || e.x > W - e.size) e.vx *= -1;
      // reached bottom
      if (e.y > TURRET_Y - 10) {
        const idx = g.enemies.indexOf(e);
        if (idx !== -1) g.enemies.splice(idx, 1);
        if (g.shields > 0) {
          g.shields--;
          g.floats.push({ id: g.idCounter++, x: g.turretX, y: TURRET_Y - 30, text: "🛡️", color: "#00e5ff", life: 40 });
        } else {
          g.hp--;
          g.shakeFrames = 15;
          g.floats.push({ id: g.idCounter++, x: g.turretX, y: TURRET_Y - 30, text: "💔", color: "#ff2244", life: 40 });
        }
      }
    });

    // karma drops
    g.drops = g.drops.filter(d => {
      d.y += d.vy;
      const collect = g.magnet ? d.y > TURRET_Y - 100 : Math.abs(d.x - g.turretX) < 24 && Math.abs(d.y - TURRET_Y) < 24;
      if (collect || d.y > H) {
        if (collect) g.karma++;
        return false;
      }
      if (g.magnet) { d.x += (g.turretX - d.x) * 0.05; }
      return true;
    });

    // particles
    g.particles = g.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life--; return p.life > 0; });

    // float texts
    g.floats = g.floats.filter(f => { f.y -= 0.6; f.life--; return f.life > 0; });

    // wave cleared?
    if (g.spawnDone && g.enemies.length === 0 && !g.boss && !g.waveCleared) {
      if (!g.bossSpawned || (g.wave % 5 !== 0)) {
        g.waveCleared = true;
      } else if (g.bossSpawned && !g.boss) {
        g.waveCleared = true;
      }
    }

    draw();

    if (g.hp <= 0) {
      setFinalScore({ score: g.score, karma: g.karma, wave: g.wave });
      setPhase("over");
      return;
    }
    if (g.waveCleared) {
      setShopKarma(g.karma);
      setShopUpgrades({ ...g.upgrades });
      setPhase("shop");
      setShopTimer(10);
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  // ── start wave ───────────────────────────────────────────────────────────────
  const startWave = useCallback((nextWave: number) => {
    const canvas = canvasRef.current;
    const g = gs.current;
    if (!g || !canvas) return;
    g.wave = nextWave;
    g.waveCleared = false;
    g.bossSpawned = false;
    g.spawnDone = false;
    g.spawnTimer = 0;
    g.enemies = [];
    g.bullets = [];
    g.bossBullets = [];
    g.drops = [];
    g.floats = [];
    g.boss = null;
    g.spawnQueue = buildWave(nextWave, canvas.width);
    if (nextWave % 5 === 0 && nextWave > 0) {
      g.spawnDone = true; // boss wave - spawned in loop
    }
    setPhase("on");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    gs.current = mkGS(canvas.width);
    startWave(1);
  }, [startWave]);

  const continueFromShop = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    g.karma = shopKarma;
    startWave(g.wave + 1);
  }, [shopKarma, startWave]);

  // stop rAF on phase change
  useEffect(() => {
    if (phase !== "on") cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      if (gs.current) gs.current.turretX = canvas.width / 2;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // UI sync
  useEffect(() => {
    if (phase !== "on") return;
    const iv = setInterval(() => {
      const g = gs.current;
      if (!g) return;
      setUi({ score: g.score, karma: g.karma, wave: g.wave, hp: g.hp, fusion: g.fusionFrames > 0, bossHp: g.boss?.hp ?? 0, bossMax: g.boss?.maxHp ?? 0, shieldsLeft: g.shields });
    }, 100);
    return () => clearInterval(iv);
  }, [phase]);

  // shop auto-continue
  useEffect(() => {
    if (phase !== "shop") return;
    let t = shopTimer;
    const iv = setInterval(() => {
      t--;
      setShopTimer(t);
      if (t <= 0) { clearInterval(iv); continueFromShop(); }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, shopTimer, continueFromShop]);

  // on game over
  useEffect(() => {
    if (phase !== "over") return;
    if (finalScore.karma > 0) addKarma(finalScore.karma, "Karma Gunner");
    addXP(finalScore.score > 500 ? 60 : finalScore.score > 200 ? 40 : 20);
    updateScore("battle", Math.max(gameScores.battle ?? 0, finalScore.score));
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // touch/mouse handling
  const handlePointerMove = useCallback((clientX: number) => {
    const g = gs.current;
    const canvas = canvasRef.current;
    if (!g || !canvas || phase !== "on") return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(20, Math.min(canvas.width - 20, (clientX - rect.left) * (canvas.width / rect.width)));
    g.turretX = x;
  }, [phase]);

  const buyUpgrade = useCallback((id: string) => {
    const g = gs.current;
    if (!g) return;
    const upg = UPGRADES.find(u => u.id === id);
    if (!upg) return;
    const lvl = shopUpgrades[id] ?? 0;
    if (lvl >= upg.maxLevel) return;
    const cost = upg.baseCost + lvl * Math.floor(upg.baseCost * 0.5);
    if (shopKarma < cost) return;
    const newK = shopKarma - cost;
    const newU = { ...shopUpgrades, [id]: lvl + 1 };
    setShopKarma(newK);
    setShopUpgrades(newU);
    g.karma = newK;
    g.upgrades = newU;
    // apply
    if (id === "rapid")  g.fireInterval = Math.max(8, 28 - (lvl + 1) * 5);
    if (id === "heavy")  g.bulletDmg = 1 + lvl + 1;
    if (id === "split")  g.splitShot = true;
    if (id === "shield") g.shields++;
    if (id === "magnet") g.magnet = true;
    if (id === "nuke") {
      g.enemies = [];
      g.boss = null;
      for (let i = 0; i < 10; i++) g.drops.push({ id: g.idCounter++, x: 30 + i * 30, y: 40, vy: 1.5 });
      g.waveCleared = true;
      continueFromShop();
    }
  }, [shopKarma, shopUpgrades, continueFromShop]);

  return (
    <div style={{ background: "#030308", minHeight: "100dvh", color: "#fff", userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}>
      {/* header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "#030308", borderBottom: "2px solid #ff4422" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#0d0020", border: "2px solid #ff4422", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#ff4422" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ff4422", fontSize: 16, fontWeight: 700 }}>🔫 KARMA GUNNER</div>
          <div style={{ color: "#555", fontSize: 11 }}>{pet.name} · {pet.class} · auto-shooter · element wars</div>
        </div>
        {ui.score > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {ui.score}
          </div>
        )}
      </div>

      {/* canvas container */}
      <div style={{ position: "relative", margin: "8px 12px 0", borderRadius: 16, overflow: "hidden", height: "calc(100dvh - 200px)", background: "#030308", border: "1px solid #1a1a40" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
          onTouchStart={e => handlePointerMove(e.touches[0].clientX)}
          onTouchMove={e => { e.preventDefault(); handlePointerMove(e.touches[0].clientX); }}
          onMouseMove={e => handlePointerMove(e.clientX)}
          onClick={e => {
            if (phase === "idle") startGame();
          }}
        />

        {/* idle */}
        <AnimatePresence>
          {phase === "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(3,3,8,0.92)", gap: 12 }}>
              <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
                style={{ fontSize: "3.5rem" }}>{petEmoji}</motion.div>
              <div style={{ color: "#ff4422", fontSize: 26, fontWeight: 900, letterSpacing: 3, textShadow: "0 0 20px #ff4422" }}>KARMA GUNNER</div>
              <div style={{ color: "#555", fontSize: 12 }}>Drag to aim · Shoot element enemies · Collect ⚡</div>
              <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                {ELEMS.map(e => <span key={e} style={{ fontSize: "1.4rem" }}>{ECFG[e].emoji}</span>)}
              </div>
              <motion.button whileTap={{ scale: 0.93 }} onClick={startGame}
                style={{ marginTop: 10, padding: "12px 36px", background: "#ff4422", border: "3px solid #fff", borderRadius: 14, fontSize: 17, fontWeight: 900, color: "#fff", cursor: "pointer", boxShadow: "0 0 20px #ff442288" }}>
                ▶ START
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* game over */}
        <AnimatePresence>
          {phase === "over" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(3,3,8,0.95)", gap: 10 }}>
              <div style={{ fontSize: "2.5rem" }}>💀</div>
              <div style={{ color: "#ff2244", fontSize: 22, fontWeight: 900, letterSpacing: 3, textShadow: "0 0 16px #ff2244" }}>GAME OVER</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginTop: 6 }}>
                {[["📊 SCORE", finalScore.score.toString(), "#c8ff00"], ["⚡ KARMA", finalScore.karma.toString(), "#ffdd00"], ["🌊 WAVE", finalScore.wave.toString(), "#00e5ff"]].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ color: c as string, fontSize: 22, fontWeight: 900 }}>{v}</div>
                    <div style={{ color: "#444", fontSize: 9 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <motion.button whileTap={{ scale: 0.93 }} onClick={startGame}
                  style={{ padding: "10px 28px", background: "#c8ff00", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 900, color: "#0a0a0a", cursor: "pointer" }}>
                  ↺ RETRY
                </motion.button>
                <Link href="/games">
                  <button style={{ padding: "10px 18px", background: "#111", border: "2px solid #333", borderRadius: 12, fontSize: 13, color: "#888", cursor: "pointer" }}>
                    ← BACK
                  </button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* shop overlay */}
        <AnimatePresence>
          {phase === "shop" && (
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              style={{ position: "absolute", inset: 0, background: "rgba(3,3,8,0.97)", overflowY: "auto", padding: "16px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ color: "#c8ff00", fontSize: 17, fontWeight: 900 }}>⚡ WAVE {(gs.current?.wave ?? 0) + 1} UPGRADES</div>
                  <div style={{ color: "#555", fontSize: 11 }}>Auto-continue in {shopTimer}s</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Zap size={14} color="#ffdd00" fill="#ffdd00" />
                  <span style={{ color: "#ffdd00", fontWeight: 800, fontSize: 16 }}>{shopKarma}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {UPGRADES.map(upg => {
                  const lvl = shopUpgrades[upg.id] ?? 0;
                  const maxed = lvl >= upg.maxLevel;
                  const cost = upg.baseCost + lvl * Math.floor(upg.baseCost * 0.5);
                  const canAfford = shopKarma >= cost;
                  return (
                    <motion.button key={upg.id} whileTap={{ scale: 0.95 }} onClick={() => buyUpgrade(upg.id)}
                      disabled={maxed}
                      style={{
                        background: maxed ? "#0d0d0d" : "#111",
                        border: `2px solid ${maxed ? "#333" : canAfford ? "#c8ff00" : "#333"}`,
                        borderRadius: 12, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                        cursor: maxed ? "default" : canAfford ? "pointer" : "not-allowed",
                        boxShadow: canAfford && !maxed ? "0 0 10px #c8ff0033" : "none",
                        textAlign: "left",
                      }}>
                      <div style={{ fontSize: "1.4rem" }}>{upg.emoji}</div>
                      <div style={{ color: maxed ? "#444" : "#fff", fontWeight: 700, fontSize: 12 }}>{upg.name}</div>
                      <div style={{ color: "#555", fontSize: 10 }}>{upg.desc}</div>
                      {upg.maxLevel > 1 && <div style={{ color: "#666", fontSize: 9 }}>LV {lvl}/{upg.maxLevel}</div>}
                      {!maxed && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                          <Zap size={10} color={canAfford ? "#ffdd00" : "#444"} fill={canAfford ? "#ffdd00" : "#444"} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: canAfford ? "#ffdd00" : "#444" }}>{cost}</span>
                        </div>
                      )}
                      {maxed && <div style={{ color: "#c8ff00", fontSize: 9, fontWeight: 700 }}>✓ MAX</div>}
                    </motion.button>
                  );
                })}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={continueFromShop}
                style={{ marginTop: 14, width: "100%", padding: "14px", background: "#c8ff00", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 900, color: "#0a0a0a", cursor: "pointer" }}>
                CONTINUE → WAVE {(gs.current?.wave ?? 0) + 1}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HUD below canvas */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", margin: "8px 12px 0", background: "#0a0a14", borderRadius: 12, border: "1px solid #1a1a40" }}>
        <div style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart key={i} size={14} color={i < ui.hp ? "#ff2244" : "#222"} fill={i < ui.hp ? "#ff2244" : "#222"} />
          ))}
          {ui.shieldsLeft > 0 && <span style={{ marginLeft: 4, fontSize: 12 }}>🛡️×{ui.shieldsLeft}</span>}
        </div>
        <div style={{ color: "#888", fontSize: 11, fontWeight: 700 }}>WAVE {ui.wave}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {ui.fusion && <span style={{ color: "#cc44ff", fontSize: 10, fontWeight: 700 }}>FUSION!</span>}
          <Zap size={12} color="#ffdd00" fill="#ffdd00" />
          <span style={{ color: "#ffdd00", fontSize: 12, fontWeight: 700 }}>{ui.karma}</span>
        </div>
      </div>
    </div>
  );
}
