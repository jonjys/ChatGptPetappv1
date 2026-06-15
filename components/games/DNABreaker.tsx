"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ───────────────────────────────────────────────────────────────
const CW = 360, CH = 310;
const PAD_W = 70, PAD_H = 10, PAD_Y = CH - 32;
const BALL_R = 7;
const BLOCK_COLS = 8;
const BW = Math.floor(CW / BLOCK_COLS) - 3;
const BH = 22;

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "gameover" | "levelup";

type BlockKind = "normal" | "armored" | "explosive" | "bonus";

type Block = {
  x: number; y: number;
  hp: number; maxHp: number;
  color: string;
  kind: BlockKind;
  isDNA: boolean;
};

type PowerupKind =
  | "shield"        // Plasma Shield — absorbs 1 hit
  | "timeCrystal"   // Time Crystal — slows ball 6s
  | "scoreMulti"    // Score Multiplier — 2× for 8s
  | "laser"         // Laser Mode — ball pierces blocks 5s
  | "gravityFlip"   // Gravity Flip — ball bounces off ceiling 6s
  | "bomb"          // Bomb — destroys 3×3 area
  | "dna";          // DNA pickup (legacy)

type PowerupDrop = {
  x: number; y: number; vy: number;
  kind: PowerupKind;
};

type ActiveEffect = {
  kind: PowerupKind;
  timer: number; // frames remaining (60fps units)
};

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number; color: string; r: number;
};

type Star = { x: number; y: number; speed: number; bright: number };

type GS = {
  padX: number;
  ball: { x: number; y: number; vx: number; vy: number; active: boolean };
  blocks: Block[];
  drops: PowerupDrop[];
  particles: Particle[];
  stars: Star[];
  lives: number;
  score: number;
  wave: number;
  dna: number;
  shieldHits: number;        // > 0 → shield active
  activeEffects: ActiveEffect[];
  scoreMult: number;
};

// ─── Wave colours ─────────────────────────────────────────────────────────────
const WAVE_COLORS = [
  ["#ff4444","#ff6644","#ff8844"],
  ["#4488ff","#44aaff","#44ccff"],
  ["#44ff88","#88ff44","#ccff44"],
  ["#cc44ff","#ff44cc","#ff44aa"],
  ["#ffcc44","#ffaa44","#ff8844"],
];

// ─── Powerup display config ────────────────────────────────────────────────────
const POWERUP_INFO: Record<PowerupKind, { emoji: string; color: string; label: string }> = {
  shield:      { emoji: "🛡️",  color: "#44aaff", label: "SHIELD"   },
  timeCrystal: { emoji: "❄️",  color: "#aaeeff", label: "SLOWMO"   },
  scoreMulti:  { emoji: "✨",  color: "#ffcc00", label: "2× SCORE" },
  laser:       { emoji: "🔴",  color: "#ff4488", label: "LASER"    },
  gravityFlip: { emoji: "🌀",  color: "#cc88ff", label: "GRAVITY"  },
  bomb:        { emoji: "💥",  color: "#ff8800", label: "BOMB"     },
  dna:         { emoji: "🧬",  color: "#c8ff00", label: "DNA"      },
};

// ─── Build blocks for a given wave ───────────────────────────────────────────
function buildBlocks(wave: number): Block[] {
  const blocks: Block[] = [];
  const colors = WAVE_COLORS[(wave - 1) % WAVE_COLORS.length];
  const rows = Math.min(3 + Math.floor(wave / 2), 6);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const rng = Math.random();

      // Determine kind — more exotic blocks appear in later waves
      let kind: BlockKind = "normal";
      if (wave >= 2 && rng < 0.10) kind = "explosive";
      else if (wave >= 3 && rng < 0.20) kind = "armored";
      else if (wave >= 2 && rng < 0.28) kind = "bonus";

      // hp
      let hp = 1;
      if (kind === "armored") hp = 3;
      else if (r < 2) hp = 1;
      else if (r < 4) hp = 2;
      else hp = Math.min(3, 1 + Math.floor(wave / 3));

      // Extra hp scaling per wave
      hp = Math.min(hp + Math.floor(wave / 4), 5);

      const isDNA = Math.random() < 0.15;
      const color = kind === "armored"  ? "#888899"
                  : kind === "explosive"? "#ff8800"
                  : kind === "bonus"    ? "#ffcc00"
                  : colors[Math.floor(Math.random() * colors.length)];

      blocks.push({
        x: c * (BW + 3) + 3,
        y: 70 + r * (BH + 4),
        hp, maxHp: hp,
        color, kind, isDNA,
      });
    }
  }
  return blocks;
}

// ─── Starfield ────────────────────────────────────────────────────────────────
function buildStars(): Star[] {
  return Array.from({ length: 60 }, () => ({
    x: Math.random() * CW,
    y: Math.random() * CH,
    speed: Math.random() * 0.4 + 0.05,
    bright: Math.random(),
  }));
}

// ─── Particles ───────────────────────────────────────────────────────────────
function spawnParticles(gs: GS, x: number, y: number, color: string, n = 8) {
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    gs.particles.push({
      x, y,
      vx: Math.cos(angle) * (Math.random() * 3 + 1),
      vy: Math.sin(angle) * (Math.random() * 3 + 1),
      life: 1,
      color,
      r: Math.random() * 3 + 1,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hasEffect(gs: GS, kind: PowerupKind): boolean {
  return gs.activeEffects.some(e => e.kind === kind);
}

function addEffect(gs: GS, kind: PowerupKind, frames: number) {
  const existing = gs.activeEffects.find(e => e.kind === kind);
  if (existing) { existing.timer = frames; }
  else { gs.activeEffects.push({ kind, timer: frames }); }
}

function randomPowerup(): PowerupKind {
  const pool: PowerupKind[] = ["shield","timeCrystal","scoreMulti","laser","gravityFlip","bomb","dna","dna"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Component ────────────────────────────────────────────────────────────────
type Props = { onEnd: (score: number, dna: number, wave: number) => void };

export default function DNABreaker({ onEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gsRef = useRef<GS>({
    padX: CW / 2 - PAD_W / 2,
    ball: { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 2.5, vy: -3.5, active: false },
    blocks: buildBlocks(1),
    drops: [],
    particles: [],
    stars: buildStars(),
    lives: 3,
    score: 0,
    wave: 1,
    dna: 0,
    shieldHits: 0,
    activeEffects: [],
    scoreMult: 1,
  });

  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  const touchXRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [uiWave, setUiWave] = useState(1);
  const [uiDna, setUiDna] = useState(0);
  const [uiEffects, setUiEffects] = useState<ActiveEffect[]>([]);
  const [uiShield, setUiShield] = useState(0);

  // ── Main game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // ── Draw ──────────────────────────────────────────────────────────────────
    function draw() {
      const gs = gsRef.current;
      ctx.clearRect(0, 0, CW, CH);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, "#0a0a1a");
      bg.addColorStop(1, "#050510");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      // Starfield
      gs.stars.forEach(s => {
        const alpha = 0.3 + s.bright * 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.bright > 0.8 ? 1.5 : 1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Subtle grid
      ctx.strokeStyle = "#ffffff08";
      ctx.lineWidth = 1;
      for (let x = 0; x < CW; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
      }
      for (let y = 0; y < CH; y += 36) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
      }

      // Wave indicator bar at top
      ctx.fillStyle = "#0d0d22";
      ctx.fillRect(0, 0, CW, 28);
      ctx.strokeStyle = "#4488ff44";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, CW, 28);

      // Wave label
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#4488ff";
      ctx.shadowColor = "#4488ff";
      ctx.shadowBlur = 6;
      ctx.fillText(`WAVE ${gs.wave}`, 8, 14);
      ctx.shadowBlur = 0;

      // Score — large cyberpunk style
      ctx.font = "bold 13px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffcc00";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 8;
      ctx.fillText(`${gs.score}`, CW / 2, 14);
      ctx.shadowBlur = 0;

      // Lives
      ctx.font = "11px serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const livesStr = "💀".repeat(Math.max(0, 3 - gs.lives)) + "❤️".repeat(gs.lives);
      ctx.fillText(livesStr, CW - 6, 14);

      // Blocks
      gs.blocks.forEach(bl => {
        if (bl.hp <= 0) return;
        const alpha = 0.45 + (bl.hp / bl.maxHp) * 0.55;
        ctx.globalAlpha = alpha;

        // Armored block turns redder as it takes damage
        let drawColor = bl.color;
        if (bl.kind === "armored" && bl.hp < bl.maxHp) {
          drawColor = bl.hp === 1 ? "#ff4444" : "#cc6644";
        }
        ctx.fillStyle = drawColor;
        ctx.beginPath();
        ctx.roundRect(bl.x, bl.y, BW, BH, 4);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bl.x, bl.y, BW, BH, 4);
        ctx.stroke();

        // Kind icon
        let icon = "";
        if (bl.kind === "armored")   icon = "🪨";
        else if (bl.kind === "explosive") icon = "💥";
        else if (bl.kind === "bonus")     icon = "⭐";
        else if (bl.isDNA)                icon = "🧬";
        if (icon) {
          ctx.font = "9px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(icon, bl.x + BW - 9, bl.y + BH / 2);
        }

        // hp pips for blocks with hp > 1
        if (bl.maxHp > 1) {
          for (let i = 0; i < bl.maxHp; i++) {
            ctx.fillStyle = i < bl.hp ? drawColor : "#333";
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(bl.x + 5 + i * 5, bl.y + BH - 4, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      });

      // Powerup drops
      gs.drops.forEach(d => {
        const info = POWERUP_INFO[d.kind];
        // glow ring
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = info.color;
        ctx.shadowColor = info.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        // emoji
        ctx.font = "13px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(info.emoji, d.x, d.y);
      });

      // Particles
      gs.particles.forEach(pt => {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Paddle — neon glow
      const laserActive = hasEffect(gs, "laser");
      const slowActive  = hasEffect(gs, "timeCrystal");
      let padCol1 = "#4488ff", padCol2 = "#00e5ff";
      if (laserActive) { padCol1 = "#ff4488"; padCol2 = "#ff88cc"; }
      else if (gs.shieldHits > 0) { padCol1 = "#44aaff"; padCol2 = "#aaeeff"; }

      const padGrad = ctx.createLinearGradient(gs.padX, 0, gs.padX + PAD_W, 0);
      padGrad.addColorStop(0, padCol1);
      padGrad.addColorStop(1, padCol2);
      ctx.fillStyle = padGrad;
      ctx.shadowColor = padCol2;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(gs.padX, PAD_Y, PAD_W, PAD_H, PAD_H / 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Shield indicator on paddle
      if (gs.shieldHits > 0) {
        ctx.strokeStyle = "#44aaff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#44aaff";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(gs.padX - 3, PAD_Y - 3, PAD_W + 6, PAD_H + 6, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Ball — neon glow
      if (gs.ball.active || phaseRef.current === "idle") {
        const ballColor = slowActive  ? "#aaeeff"
                        : laserActive ? "#ff4488"
                        : hasEffect(gs, "gravityFlip") ? "#cc88ff"
                        : "#44ff88";
        const bGrad = ctx.createRadialGradient(gs.ball.x - 2, gs.ball.y - 2, 1, gs.ball.x, gs.ball.y, BALL_R);
        bGrad.addColorStop(0, "#ffffff");
        bGrad.addColorStop(1, ballColor);
        ctx.fillStyle = bGrad;
        ctx.shadowColor = ballColor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Active powerup HUD bar at bottom
      const activeVisible = gs.activeEffects.filter(e => e.kind !== "bomb");
      if (activeVisible.length > 0) {
        const hudY = CH - 32;
        ctx.fillStyle = "#0a0a1a";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(0, hudY - 4, CW, 28);
        ctx.globalAlpha = 1;

        const slotW = Math.floor(CW / activeVisible.length);
        activeVisible.forEach((eff, idx) => {
          const info = POWERUP_INFO[eff.kind];
          const sx = idx * slotW;
          const progress = eff.timer / 360; // max ~6s at 60fps = 360 frames

          // timer bar background
          ctx.fillStyle = "#222";
          ctx.fillRect(sx + 2, hudY + 14, slotW - 4, 5);
          ctx.fillStyle = info.color;
          ctx.fillRect(sx + 2, hudY + 14, Math.max(0, (slotW - 4) * Math.min(1, progress)), 5);

          // icon + label
          ctx.font = "10px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = info.color;
          ctx.shadowColor = info.color;
          ctx.shadowBlur = 4;
          ctx.fillText(info.emoji + " " + info.label, sx + slotW / 2, hudY + 7);
          ctx.shadowBlur = 0;
        });
      }
    }

    // ── Tick ──────────────────────────────────────────────────────────────────
    function tick() {
      const gs = gsRef.current;
      const p = phaseRef.current;

      // ── Scroll stars ────────────────────────────────────────────────────────
      gs.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > CH) { s.y = 0; s.x = Math.random() * CW; }
      });

      // ── Decay active effects ─────────────────────────────────────────────────
      if (p === "playing") {
        gs.activeEffects = gs.activeEffects.filter(e => {
          e.timer--;
          return e.timer > 0;
        });
        // Recompute score multiplier
        gs.scoreMult = hasEffect(gs, "scoreMulti") ? 2 : 1;
      }

      if (p === "playing" && gs.ball.active) {
        const b = gs.ball;
        const slow = hasEffect(gs, "timeCrystal");
        const gFlip = hasEffect(gs, "gravityFlip");
        const laserOn = hasEffect(gs, "laser");

        const speedScale = slow ? 0.55 : 1;
        b.x += b.vx * speedScale;
        b.y += b.vy * speedScale;

        // Wall bounce
        if (b.x - BALL_R < 0)  { b.x = BALL_R;        b.vx =  Math.abs(b.vx); }
        if (b.x + BALL_R > CW) { b.x = CW - BALL_R;   b.vx = -Math.abs(b.vx); }
        if (b.y - BALL_R < 0)  { b.y = BALL_R;         b.vy =  Math.abs(b.vy); }

        // Gravity flip — also bounce off ceiling when active (already handled above by y < 0 reflect)
        // Additionally bounce off ceiling with gravity flip to enforce the concept
        if (gFlip && b.y - BALL_R < 30) {
          b.y = 30 + BALL_R;
          b.vy = Math.abs(b.vy);
        }

        // Paddle bounce (only when ball moving down toward paddle)
        if (b.vy > 0 &&
            b.y + BALL_R >= PAD_Y &&
            b.y + BALL_R <= PAD_Y + PAD_H + 6 &&
            b.x >= gs.padX - BALL_R &&
            b.x <= gs.padX + PAD_W + BALL_R) {
          const rel = (b.x - gs.padX) / PAD_W;
          b.vx = (rel - 0.5) * 7;
          b.vy = -Math.abs(b.vy) * 1.01;
          const spd = Math.hypot(b.vx, b.vy);
          const maxSpd = 4 + gs.wave * 0.25;
          if (spd > maxSpd) { b.vx = (b.vx / spd) * maxSpd; b.vy = (b.vy / spd) * maxSpd; }
        }

        // Ball lost below screen
        if (b.y > CH + 20) {
          if (gs.shieldHits > 0) {
            // Shield absorbs the hit
            gs.shieldHits--;
            setUiShield(gs.shieldHits);
            b.x = gs.padX + PAD_W / 2;
            b.y = PAD_Y - BALL_R - 2;
            b.vx = 2.5; b.vy = -(3.5 + gs.wave * 0.1);
            b.active = false;
          } else {
            gs.lives--;
            setUiLives(gs.lives);
            if (gs.lives <= 0) {
              phaseRef.current = "gameover";
              setPhase("gameover");
              onEnd(gs.score, gs.dna, gs.wave);
            } else {
              b.x = gs.padX + PAD_W / 2;
              b.y = PAD_Y - BALL_R - 2;
              b.vx = 2.5; b.vy = -(3.5 + gs.wave * 0.1);
              b.active = false;
            }
          }
        }

        // Block collision
        gs.blocks.forEach(bl => {
          if (bl.hp <= 0) return;
          const hit = b.x + BALL_R > bl.x &&
                      b.x - BALL_R < bl.x + BW &&
                      b.y + BALL_R > bl.y &&
                      b.y - BALL_R < bl.y + BH;
          if (!hit) return;

          bl.hp--;
          const pts = bl.maxHp * 10 * gs.scoreMult;
          gs.score += pts;
          setUiScore(gs.score);
          spawnParticles(gs, bl.x + BW / 2, bl.y + BH / 2, bl.color);

          // Reflect — unless laser mode active
          if (!laserOn) {
            const overlapX = Math.min(b.x + BALL_R - bl.x, bl.x + BW - (b.x - BALL_R));
            const overlapY = Math.min(b.y + BALL_R - bl.y, bl.y + BH - (b.y - BALL_R));
            if (overlapX < overlapY) b.vx = -b.vx;
            else b.vy = -b.vy;
          }

          // Block destroyed
          if (bl.hp <= 0) {
            // Explosive: chain destroy neighbors
            if (bl.kind === "explosive") {
              gs.blocks.forEach(nb => {
                if (nb === bl || nb.hp <= 0) return;
                if (Math.abs((nb.x + BW / 2) - (bl.x + BW / 2)) <= BW + 6 &&
                    Math.abs((nb.y + BH / 2) - (bl.y + BH / 2)) <= BH + 6) {
                  nb.hp = 0;
                  gs.score += nb.maxHp * 5 * gs.scoreMult;
                  spawnParticles(gs, nb.x + BW / 2, nb.y + BH / 2, "#ff8800", 12);
                }
              });
              setUiScore(gs.score);
            }

            // Bonus: drops extra DNA
            if (bl.kind === "bonus") {
              gs.dna += 2;
              setUiDna(gs.dna);
              gs.drops.push({ x: bl.x + BW / 2, y: bl.y + BH / 2, vy: 1.2, kind: "dna" });
              gs.drops.push({ x: bl.x + BW / 2 + 8, y: bl.y + BH / 2, vy: 1.4, kind: "dna" });
            }

            // DNA block
            if (bl.isDNA) {
              gs.dna++;
              setUiDna(gs.dna);
              gs.drops.push({ x: bl.x + BW / 2, y: bl.y + BH / 2, vy: 1.5, kind: "dna" });
            }

            // Random powerup drop (20% chance, non-DNA kinds)
            if (Math.random() < 0.20) {
              const k = randomPowerup();
              gs.drops.push({ x: bl.x + BW / 2, y: bl.y + BH / 2, vy: 1.0, kind: k });
            }
          }
        });

        // Collect powerup drops
        gs.drops = gs.drops.filter(d => {
          d.y += d.vy;
          const collect = Math.hypot(d.x - b.x, d.y - b.y) < 18 ||
            (d.y + 14 >= PAD_Y && d.y - 14 <= PAD_Y + PAD_H &&
             d.x >= gs.padX - 12 && d.x <= gs.padX + PAD_W + 12);
          if (collect) {
            // ── Apply powerup inline ─────────────────────────────────────────
            switch (d.kind) {
              case "dna":
                gs.dna++;
                setUiDna(gs.dna);
                break;
              case "shield":
                gs.shieldHits = Math.min(gs.shieldHits + 1, 3);
                setUiShield(gs.shieldHits);
                break;
              case "timeCrystal":
                addEffect(gs, "timeCrystal", 360);
                break;
              case "scoreMulti":
                addEffect(gs, "scoreMulti", 480);
                gs.scoreMult = 2;
                break;
              case "laser":
                addEffect(gs, "laser", 300);
                break;
              case "gravityFlip":
                addEffect(gs, "gravityFlip", 360);
                break;
              case "bomb": {
                const bombX = gs.ball.x;
                const bombY = gs.ball.y;
                gs.blocks.forEach(bl => {
                  if (bl.hp <= 0) return;
                  if (Math.abs((bl.x + BW / 2) - bombX) < BW * 1.7 &&
                      Math.abs((bl.y + BH / 2) - bombY) < BH * 1.7) {
                    bl.hp = 0;
                    gs.score += bl.maxHp * 10 * gs.scoreMult;
                    spawnParticles(gs, bl.x + BW / 2, bl.y + BH / 2, "#ff8800", 12);
                  }
                });
                setUiScore(gs.score);
                break;
              }
            }
            setUiEffects([...gs.activeEffects]);
            return false;
          }
          return d.y < CH + 20;
        });
      }

      // ── Paddle follow touch ──────────────────────────────────────────────────
      if (p === "playing" && touchXRef.current !== null) {
        const tx = touchXRef.current;
        gs.padX += (tx - PAD_W / 2 - gs.padX) * 0.25;
        gs.padX = Math.max(0, Math.min(CW - PAD_W, gs.padX));
        if (!gs.ball.active) {
          gs.ball.x = gs.padX + PAD_W / 2;
        }
      }

      // ── Particles decay ──────────────────────────────────────────────────────
      gs.particles = gs.particles.filter(pt => {
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vy += 0.08;
        pt.life -= 0.033;
        return pt.life > 0;
      });

      // ── Level clear ──────────────────────────────────────────────────────────
      if (p === "playing" && gs.blocks.every(bl => bl.hp <= 0)) {
        gs.wave++;
        setUiWave(gs.wave);
        gs.blocks = buildBlocks(gs.wave);
        gs.drops = [];
        gs.activeEffects = [];
        gs.scoreMult = 1;
        gs.shieldHits = 0;
        gs.ball.active = false;
        gs.ball.x = gs.padX + PAD_W / 2;
        gs.ball.y = PAD_Y - BALL_R - 2;
        gs.ball.vx = 2.5 + gs.wave * 0.15;
        gs.ball.vy = -(3.5 + gs.wave * 0.1);
        phaseRef.current = "levelup";
        setPhase("levelup");
        setUiEffects([]);
        setUiShield(0);
        setTimeout(() => {
          phaseRef.current = "playing";
          setPhase("playing");
        }, 1800);
      }

      draw();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Input handlers ──────────────────────────────────────────────────────────
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CW / rect.width;
    touchXRef.current = (e.touches[0].clientX - rect.left) * scaleX;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CW / rect.width;
    touchXRef.current = (e.clientX - rect.left) * scaleX;
  }, []);

  const handleStart = useCallback(() => {
    const gs = gsRef.current;
    if (phaseRef.current === "idle" || phaseRef.current === "levelup") {
      if (!gs.ball.active) {
        gs.ball.active = true;
        phaseRef.current = "playing";
        setPhase("playing");
      }
    } else if (phaseRef.current === "playing" && !gs.ball.active) {
      gs.ball.active = true;
    }
  }, []);

  const handleReset = useCallback(() => {
    const gs = gsRef.current;
    gs.padX = CW / 2 - PAD_W / 2;
    gs.ball = { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 2.5, vy: -3.5, active: false };
    gs.blocks = buildBlocks(1);
    gs.drops = [];
    gs.particles = [];
    gs.stars = buildStars();
    gs.lives = 3;
    gs.score = 0;
    gs.wave = 1;
    gs.dna = 0;
    gs.shieldHits = 0;
    gs.activeEffects = [];
    gs.scoreMult = 1;
    setUiScore(0); setUiLives(3); setUiWave(1); setUiDna(0);
    setUiEffects([]); setUiShield(0);
    phaseRef.current = "idle";
    setPhase("idle");
  }, []);

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-space-grotesk, 'Courier New', monospace)" }}>

      {/* Stats bar */}
      <div
        className="flex justify-between items-center mb-2 px-2 py-1"
        style={{ background: "#0a0a1a", border: "1px solid #4488ff33", borderRadius: 10, fontSize: 12, fontWeight: 700 }}
      >
        <span style={{ color: "#4488ff", letterSpacing: "0.05em" }}>W{uiWave}</span>
        <span style={{ color: "#c8ff00" }}>🧬 {uiDna}</span>
        <span style={{ color: "#ffcc44", fontSize: 14 }}>{uiScore.toLocaleString()}</span>
        <span style={{ color: "#ff6644" }}>
          {"💀".repeat(Math.max(0, 3 - uiLives))}{"❤️".repeat(uiLives)}
        </span>
        {uiShield > 0 && (
          <span style={{ color: "#44aaff" }}>🛡️×{uiShield}</span>
        )}
      </div>

      {/* Canvas wrapper */}
      <div
        onTouchMove={handleTouchMove}
        onMouseMove={handleMouseMove}
        onClick={handleStart}
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          border: "2px solid #4488ff55",
          cursor: "crosshair",
          touchAction: "none",
          boxShadow: "0 0 24px #4488ff22",
        } as React.CSSProperties}
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ display: "block", width: "100%", height: "auto" }}
        />

        {/* Idle overlay */}
        <AnimatePresence>
          {phase === "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(180deg, #00000099 0%, #00000066 100%)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <div style={{ fontSize: "3.2rem", filter: "drop-shadow(0 0 10px #4488ff)" }}>🧬</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textShadow: "0 0 16px #4488ff" }}>
                DNA BREAKER
              </div>
              <div style={{ fontSize: 12, color: "#888", textAlign: "center", maxWidth: 220 }}>
                Move paddle · Collect powerups · Survive waves
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 260, marginTop: 4 }}>
                {(["shield","timeCrystal","scoreMulti","laser","gravityFlip","bomb"] as PowerupKind[]).map(k => (
                  <span key={k} style={{ fontSize: 11, color: POWERUP_INFO[k].color, background: "#ffffff10", padding: "2px 6px", borderRadius: 6, border: `1px solid ${POWERUP_INFO[k].color}44` }}>
                    {POWERUP_INFO[k].emoji} {POWERUP_INFO[k].label}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 14, color: "#c8ff00", fontWeight: 700, marginTop: 10, letterSpacing: "0.12em", textShadow: "0 0 10px #c8ff00" }}>
                TAP TO LAUNCH
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level-up overlay */}
        <AnimatePresence>
          {phase === "levelup" && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              style={{
                position: "absolute", inset: 0,
                background: "#000000bb",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <div style={{ fontSize: "2.8rem" }}>🧬</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#c8ff00", textShadow: "0 0 20px #c8ff00", letterSpacing: "0.08em" }}>
                WAVE {uiWave}
              </div>
              <div style={{ fontSize: 13, color: "#4488ff" }}>DNA EVOLVING…</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>TAP WHEN READY</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game-over overlay */}
        <AnimatePresence>
          {phase === "gameover" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: "absolute", inset: 0,
                background: "#000000cc",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <div style={{ fontSize: "3rem" }}>💀</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#ff4444", letterSpacing: "0.1em", textShadow: "0 0 16px #ff4444" }}>
                GAME OVER
              </div>
              <div style={{ fontSize: 18, color: "#ffcc00", fontWeight: 700 }}>
                {uiScore.toLocaleString()} PTS
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>
                🧬 {uiDna} DNA · Wave {uiWave}
              </div>
              <button
                onClick={handleReset}
                style={{
                  marginTop: 14,
                  padding: "12px 32px",
                  background: "linear-gradient(135deg, #c8ff00, #88cc00)",
                  border: "3px solid #0a0a0a",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#0a0a0a",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  boxShadow: "4px 4px 0 #0a0a0a, 0 0 16px #c8ff0066",
                }}
              >
                RETRY
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active effects HUD (React layer, supplemental) */}
      {uiEffects.filter(e => e.kind !== "bomb").length > 0 && (
        <div className="flex gap-2 mt-2 px-1 flex-wrap">
          {uiEffects.filter(e => e.kind !== "bomb").map((eff, i) => {
            const info = POWERUP_INFO[eff.kind];
            return (
              <div key={i} style={{ fontSize: 11, color: info.color, background: "#ffffff08", padding: "3px 8px", borderRadius: 8, border: `1px solid ${info.color}55` }}>
                {info.emoji} {info.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
