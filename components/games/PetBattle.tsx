"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { Pet } from "@/types/pet";

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface PetBattleProps {
  pet?: Pet;
  petEmoji?: string;
  onEnd?: (won: boolean, karma: number) => void;
  onWin?: (karma: number, xp: number, name: string, rarity: string) => void;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const GW = 390;
const GH = 500;
const BATTLEFIELD_H = 420;
const LANE_Y = [40, 160, 280] as const;
const LANE_H = 100;
const SLOT_X = [80, 160, 240] as const;
const BASE_X = 340;
const ENEMY_START_X = -20;

/* ─── Tower types ────────────────────────────────────────────────────────── */
type TowerType = "karma" | "freeze" | "lightning" | "shield_gen";

interface TowerDef {
  type: TowerType;
  emoji: string;
  cost: number;
  label: string;
  fireRate: number; // frames between shots
  damage: number;
  color: string;
}

const TOWER_DEFS: Record<TowerType, TowerDef> = {
  karma: {
    type: "karma",
    emoji: "🔮",
    cost: 50,
    label: "Karma",
    fireRate: 60,
    damage: 20,
    color: "#a855f7",
  },
  freeze: {
    type: "freeze",
    emoji: "❄️",
    cost: 120,
    label: "Freeze",
    fireRate: 100,
    damage: 5,
    color: "#38bdf8",
  },
  lightning: {
    type: "lightning",
    emoji: "⚡",
    cost: 200,
    label: "Lightning",
    fireRate: 80,
    damage: 35,
    color: "#fbbf24",
  },
  shield_gen: {
    type: "shield_gen",
    emoji: "🛡️",
    cost: 150,
    label: "Shield",
    fireRate: 90,
    damage: 10,
    color: "#22d3ee",
  },
};

/* ─── Enemy types ────────────────────────────────────────────────────────── */
type EnemyType = "grunt" | "runner" | "tank" | "boss_mini" | "ghost" | "healer";

interface EnemyDef {
  type: EnemyType;
  emoji: string;
  maxHp: number;
  speed: number;
  karmaReward: number;
  color: string;
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  grunt: { type: "grunt", emoji: "👾", maxHp: 80, speed: 1, karmaReward: 8, color: "#f87171" },
  runner: { type: "runner", emoji: "💨", maxHp: 40, speed: 2.5, karmaReward: 5, color: "#fb923c" },
  tank: { type: "tank", emoji: "🔷", maxHp: 250, speed: 0.4, karmaReward: 25, color: "#60a5fa" },
  boss_mini: { type: "boss_mini", emoji: "🔥", maxHp: 500, speed: 0.6, karmaReward: 50, color: "#f43f5e" },
  ghost: { type: "ghost", emoji: "👻", maxHp: 60, speed: 1.5, karmaReward: 12, color: "#c4b5fd" },
  healer: { type: "healer", emoji: "💚", maxHp: 100, speed: 0.8, karmaReward: 15, color: "#4ade80" },
};

/* ─── Game state interfaces ───────────────────────────────────────────────── */
interface Tower {
  id: string;
  type: TowerType;
  lane: number;
  slot: number;
  cooldown: number;
}

interface Enemy {
  id: string;
  type: EnemyType;
  lane: number;
  x: number;
  hp: number;
  maxHp: number;
  frozen: number; // frames remaining frozen
  ghostPassed: boolean; // ghost ability: already bypassed first tower
  healTimer: number;
}

interface Projectile {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number; // frames remaining
}

type GamePhase = "idle" | "wave" | "between" | "gameover";

interface GameState {
  phase: GamePhase;
  wave: number;
  baseHp: number;
  baseShield: number;
  localKarma: number;
  earnedKarma: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  betweenTimer: number; // frames remaining in break
  enemySpawnQueue: { type: EnemyType; lane: number; delay: number }[];
  spawnTimer: number;
  frame: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function laneCenter(lane: number): number {
  return LANE_Y[lane] + LANE_H / 2;
}

function slotPos(lane: number, slot: number): { x: number; y: number } {
  return { x: SLOT_X[slot], y: LANE_Y[lane] + LANE_H / 2 };
}

let _idCounter = 0;
function uid(): string {
  return `${Date.now()}_${_idCounter++}`;
}

function buildWaveQueue(
  wave: number
): { type: EnemyType; lane: number; delay: number }[] {
  const queue: { type: EnemyType; lane: number; delay: number }[] = [];
  const perLane = Math.min(3 + wave, 15);
  const isBossWave = wave >= 10 && wave % 5 === 0;
  const types: EnemyType[] = ["grunt", "runner", "tank", "ghost", "healer"];
  if (wave >= 5) types.push("boss_mini");

  let delay = 0;
  for (let lane = 0; lane < 3; lane++) {
    for (let i = 0; i < perLane; i++) {
      let type: EnemyType;
      if (isBossWave && i === 0) {
        type = "boss_mini";
      } else {
        type = types[Math.floor(Math.random() * types.length)];
      }
      queue.push({ type, lane, delay: delay + i * 60 });
    }
    delay += 20;
  }
  return queue;
}

function getPetEmoji(pet?: Pet, petEmojiProp?: string): string {
  if (petEmojiProp) return petEmojiProp;
  if (!pet) return "🐾";
  const evolutionMap: Record<string, string> = {
    egg: "🥚",
    baby: "🐣",
    teen: "🐱",
    adult: "🦁",
    legendary: "🐉",
  };
  return evolutionMap[pet.evolution] ?? "🐾";
}

/* ─── Initial state ──────────────────────────────────────────────────────── */
function initState(): GameState {
  return {
    phase: "idle",
    wave: 0,
    baseHp: 100,
    baseShield: 0,
    localKarma: 200,
    earnedKarma: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    betweenTimer: 0,
    enemySpawnQueue: [],
    spawnTimer: 0,
    frame: 0,
  };
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function PetBattle({
  pet,
  petEmoji: petEmojiProp,
  onEnd,
  onWin,
}: PetBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const rafRef = useRef<number>(0);
  const [renderTick, setRenderTick] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<{
    lane: number;
    slot: number;
  } | null>(null);
  const [uiPhase, setUiPhase] = useState<GamePhase>("idle");
  const [uiWave, setUiWave] = useState(0);
  const [uiBaseHp, setUiBaseHp] = useState(100);
  const [uiKarma, setUiKarma] = useState(200);
  const [uiBetweenTimer, setUiBetweenTimer] = useState(0);

  const petEmoji = getPetEmoji(pet, petEmojiProp);

  /* ─── Game logic tick ──────────────────────────────────────────────────── */
  const tick = useCallback(() => {
    const s = stateRef.current;
    s.frame++;

    if (s.phase === "wave") {
      // Spawn enemies from queue
      s.spawnTimer++;
      const toSpawn = s.enemySpawnQueue.filter((e) => e.delay <= s.spawnTimer);
      s.enemySpawnQueue = s.enemySpawnQueue.filter(
        (e) => e.delay > s.spawnTimer
      );
      for (const spawn of toSpawn) {
        const def = ENEMY_DEFS[spawn.type];
        s.enemies.push({
          id: uid(),
          type: spawn.type,
          lane: spawn.lane,
          x: ENEMY_START_X - Math.random() * 30,
          hp: def.maxHp,
          maxHp: def.maxHp,
          frozen: 0,
          ghostPassed: false,
          healTimer: 0,
        });
      }

      // Move enemies
      const toRemove: string[] = [];
      for (const enemy of s.enemies) {
        if (enemy.frozen > 0) {
          enemy.frozen--;
          continue;
        }
        const def = ENEMY_DEFS[enemy.type];
        enemy.x += def.speed;

        // Healer heals nearby enemies
        if (enemy.type === "healer") {
          enemy.healTimer++;
          if (enemy.healTimer >= 60) {
            enemy.healTimer = 0;
            for (const other of s.enemies) {
              if (
                other.id !== enemy.id &&
                other.lane === enemy.lane &&
                Math.abs(other.x - enemy.x) < 60
              ) {
                other.hp = Math.min(other.maxHp, other.hp + 5);
              }
            }
          }
        }

        // Reached base
        if (enemy.x >= BASE_X) {
          const dmg = Math.max(1, Math.floor(def.maxHp / 10));
          const shieldAbsorb = Math.min(s.baseShield, dmg);
          s.baseShield -= shieldAbsorb;
          s.baseHp -= dmg - shieldAbsorb;
          toRemove.push(enemy.id);
          if (s.baseHp <= 0) {
            s.baseHp = 0;
            s.phase = "gameover";
          }
        }
      }
      s.enemies = s.enemies.filter((e) => !toRemove.includes(e.id));

      // Tower fire
      for (const tower of s.towers) {
        tower.cooldown--;
        if (tower.cooldown > 0) continue;
        const def = TOWER_DEFS[tower.type];
        const pos = slotPos(tower.lane, tower.slot);

        // Find targets in this lane
        const laneEnemies = s.enemies
          .filter((e) => e.lane === tower.lane && e.x > pos.x)
          .sort((a, b) => b.x - a.x); // nearest to base first

        if (laneEnemies.length === 0) continue;
        tower.cooldown = def.fireRate;

        if (tower.type === "lightning") {
          // Hit all in lane
          for (const enemy of laneEnemies) {
            enemy.hp -= def.damage;
            s.projectiles.push({
              id: uid(),
              x1: pos.x,
              y1: pos.y,
              x2: enemy.x,
              y2: laneCenter(enemy.lane),
              color: def.color,
              life: 8,
            });
            if (enemy.hp <= 0) {
              const enemyDef = ENEMY_DEFS[enemy.type];
              s.localKarma += enemyDef.karmaReward;
              s.earnedKarma += enemyDef.karmaReward;
              s.enemies = s.enemies.filter((e) => e.id !== enemy.id);
            }
          }
        } else if (tower.type === "freeze") {
          const target = laneEnemies[0];
          if (target) {
            // Ghost bypass check
            if (target.type === "ghost" && !target.ghostPassed) {
              target.ghostPassed = true;
              continue;
            }
            target.hp -= def.damage;
            target.frozen = 120; // 2 seconds at 60fps
            s.projectiles.push({
              id: uid(),
              x1: pos.x,
              y1: pos.y,
              x2: target.x,
              y2: laneCenter(target.lane),
              color: def.color,
              life: 10,
            });
            if (target.hp <= 0) {
              const enemyDef = ENEMY_DEFS[target.type];
              s.localKarma += enemyDef.karmaReward;
              s.earnedKarma += enemyDef.karmaReward;
              s.enemies = s.enemies.filter((e) => e.id !== target.id);
            }
          }
        } else {
          const target = laneEnemies[0];
          if (target) {
            if (target.type === "ghost" && !target.ghostPassed) {
              target.ghostPassed = true;
              continue;
            }
            target.hp -= def.damage;
            s.projectiles.push({
              id: uid(),
              x1: pos.x,
              y1: pos.y,
              x2: target.x,
              y2: laneCenter(target.lane),
              color: def.color,
              life: 8,
            });
            if (target.hp <= 0) {
              const enemyDef = ENEMY_DEFS[target.type];
              s.localKarma += enemyDef.karmaReward;
              s.earnedKarma += enemyDef.karmaReward;
              s.enemies = s.enemies.filter((e) => e.id !== target.id);
            }
          }
        }
      }

      // Decay projectiles
      s.projectiles = s.projectiles
        .map((p) => ({ ...p, life: p.life - 1 }))
        .filter((p) => p.life > 0);

      // Check wave cleared
      if (s.enemies.length === 0 && s.enemySpawnQueue.length === 0) {
        const karmaBonus = 20 + s.wave * 5;
        s.localKarma += karmaBonus;
        s.earnedKarma += karmaBonus;
        s.phase = "between";
        s.betweenTimer = 600; // 10 seconds
      }
    } else if (s.phase === "between") {
      s.betweenTimer--;
      s.projectiles = [];
      if (s.betweenTimer <= 0) {
        // Auto-start next wave after timer
        // (also startable manually)
      }
    }

    // Sync UI state
    setUiPhase(s.phase);
    setUiWave(s.wave);
    setUiBaseHp(s.baseHp);
    setUiKarma(s.localKarma);
    setUiBetweenTimer(s.betweenTimer);
    setRenderTick((t) => t + 1);
  }, []);

  /* ─── Animation loop ───────────────────────────────────────────────────── */
  useEffect(() => {
    const loop = () => {
      tick();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  /* ─── Draw ─────────────────────────────────────────────────────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, GH);
    bg.addColorStop(0, "#050510");
    bg.addColorStop(1, "#0a0020");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GW, GH);

    // Lane backgrounds
    const laneColors = [
      "rgba(168,85,247,0.08)",
      "rgba(59,130,246,0.08)",
      "rgba(16,185,129,0.08)",
    ];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = laneColors[i];
      ctx.fillRect(0, LANE_Y[i], GW, LANE_H);
      // Lane border
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, LANE_Y[i], GW, LANE_H);
    }

    // Tower slots (empty)
    for (let lane = 0; lane < 3; lane++) {
      for (let slot = 0; slot < 3; slot++) {
        const pos = slotPos(lane, slot);
        const hasTower = s.towers.some(
          (t) => t.lane === lane && t.slot === slot
        );
        if (!hasTower) {
          const isSelected =
            selectedSlot?.lane === lane && selectedSlot?.slot === slot;
          ctx.strokeStyle = isSelected
            ? "rgba(255,200,0,0.9)"
            : "rgba(255,255,255,0.2)";
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(pos.x - 18, pos.y - 18, 36, 36);
          ctx.setLineDash([]);
          // plus sign
          ctx.fillStyle = isSelected
            ? "rgba(255,200,0,0.6)"
            : "rgba(255,255,255,0.15)";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", pos.x, pos.y);
        }
      }
    }

    // Towers
    for (const tower of s.towers) {
      const pos = slotPos(tower.lane, tower.slot);
      const def = TOWER_DEFS[tower.type];
      // Glow
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 12;
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.emoji, pos.x, pos.y);
      ctx.shadowBlur = 0;
      // Cooldown ring
      const pct = 1 - tower.cooldown / def.fireRate;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 22, 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Projectiles
    for (const proj of s.projectiles) {
      const alpha = proj.life / 10;
      ctx.beginPath();
      ctx.moveTo(proj.x1, proj.y1);
      ctx.lineTo(proj.x2, proj.y2);
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      // Dot at target
      ctx.beginPath();
      ctx.arc(proj.x2, proj.y2, 4, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Enemies
    for (const enemy of s.enemies) {
      const def = ENEMY_DEFS[enemy.type];
      const cy = laneCenter(enemy.lane);
      // Freeze tint
      if (enemy.frozen > 0) {
        ctx.fillStyle = "rgba(56,189,248,0.3)";
        ctx.beginPath();
        ctx.arc(enemy.x, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      // Emoji
      ctx.font = enemy.type === "boss_mini" ? "28px sans-serif" : "22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 8;
      ctx.fillText(def.emoji, enemy.x, cy);
      ctx.shadowBlur = 0;

      // HP bar
      const barW = 30;
      const barH = 4;
      const barX = enemy.x - barW / 2;
      const barY = cy - (enemy.type === "boss_mini" ? 24 : 20);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(barX, barY, barW, barH);
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      const hpColor =
        hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#facc15" : "#f87171";
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpPct, barH);
    }

    // Pet Base (right side)
    const baseY = BATTLEFIELD_H / 2;
    // Shield ring
    if (s.baseShield > 0) {
      ctx.beginPath();
      ctx.arc(BASE_X + 20, baseY, 32, 0, Math.PI * 2);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(s.frame * 0.1);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // HP ring
    const hpFrac = s.baseHp / 100;
    ctx.beginPath();
    ctx.arc(BASE_X + 20, baseY, 28, -Math.PI / 2, -Math.PI / 2 + hpFrac * Math.PI * 2);
    ctx.strokeStyle =
      hpFrac > 0.5 ? "#4ade80" : hpFrac > 0.25 ? "#facc15" : "#f87171";
    ctx.lineWidth = 4;
    ctx.stroke();
    // Pet emoji
    ctx.font = "30px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 16;
    ctx.fillText(petEmoji, BASE_X + 20, baseY);
    ctx.shadowBlur = 0;
    // HP text
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${s.baseHp}HP`, BASE_X + 20, baseY + 38);

    // HUD top bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, GW, 36);
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#a855f7";
    ctx.fillText(`Wave ${s.wave}`, 10, 18);
    ctx.textAlign = "center";
    ctx.fillStyle = "#facc15";
    ctx.fillText(`⚡ ${s.localKarma}`, GW / 2, 18);
    ctx.textAlign = "right";
    ctx.fillStyle = s.baseHp > 50 ? "#4ade80" : "#f87171";
    ctx.fillText(`❤️ ${s.baseHp}`, GW - 10, 18);

    // Between-wave overlay
    if (s.phase === "between") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, BATTLEFIELD_H / 2 - 50, GW, 100);
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 20;
      ctx.fillText("✨ WAVE CLEARED! ✨", GW / 2, BATTLEFIELD_H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#a3e635";
      ctx.fillText(
        `+${20 + s.wave * 5}⚡ Karma Bonus`,
        GW / 2,
        BATTLEFIELD_H / 2 + 8
      );
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#94a3b8";
      const secs = Math.ceil(s.betweenTimer / 60);
      ctx.fillText(
        secs > 0 ? `Next wave in ${secs}s` : "Tap START WAVE",
        GW / 2,
        BATTLEFIELD_H / 2 + 30
      );
    }

    // Game over overlay
    if (s.phase === "gameover") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, GW, BATTLEFIELD_H);
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f87171";
      ctx.shadowColor = "#f87171";
      ctx.shadowBlur = 24;
      ctx.fillText("💀 GAME OVER", GW / 2, BATTLEFIELD_H / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#facc15";
      ctx.fillText(`Waves survived: ${s.wave}`, GW / 2, BATTLEFIELD_H / 2 + 5);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Earned: ${s.earnedKarma}⚡ karma`, GW / 2, BATTLEFIELD_H / 2 + 30);
    }

    // Idle overlay
    if (s.phase === "idle") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, BATTLEFIELD_H / 2 - 60, GW, 120);
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#a855f7";
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 16;
      ctx.fillText("🔮 KARMA DEFENSE 🔮", GW / 2, BATTLEFIELD_H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Place towers, then start wave", GW / 2, BATTLEFIELD_H / 2 + 12);
    }

    // Bottom panel background
    ctx.fillStyle = "rgba(10,0,30,0.95)";
    ctx.fillRect(0, BATTLEFIELD_H, GW, GH - BATTLEFIELD_H);
    ctx.strokeStyle = "rgba(168,85,247,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BATTLEFIELD_H);
    ctx.lineTo(GW, BATTLEFIELD_H);
    ctx.stroke();
  }, [petEmoji]);

  /* ─── Canvas tap handler ───────────────────────────────────────────────── */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = GW / rect.width;
      const scaleY = GH / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      const s = stateRef.current;
      if (s.phase === "gameover") return;

      // Check tower slots
      for (let lane = 0; lane < 3; lane++) {
        for (let slot = 0; slot < 3; slot++) {
          const pos = slotPos(lane, slot);
          if (
            Math.abs(cx - pos.x) < 22 &&
            Math.abs(cy - pos.y) < 22
          ) {
            const hasTower = s.towers.some(
              (t) => t.lane === lane && t.slot === slot
            );
            if (!hasTower) {
              setSelectedSlot({ lane, slot });
            } else {
              setSelectedSlot(null);
            }
            return;
          }
        }
      }
      setSelectedSlot(null);
    },
    []
  );

  /* ─── Place tower ─────────────────────────────────────────────────────── */
  const placeTower = useCallback(
    (type: TowerType) => {
      if (!selectedSlot) return;
      const s = stateRef.current;
      const def = TOWER_DEFS[type];
      if (s.localKarma < def.cost) return;
      const exists = s.towers.some(
        (t) => t.lane === selectedSlot.lane && t.slot === selectedSlot.slot
      );
      if (exists) return;
      s.localKarma -= def.cost;
      if (type === "shield_gen") {
        s.baseShield += 50;
      }
      s.towers.push({
        id: uid(),
        type,
        lane: selectedSlot.lane,
        slot: selectedSlot.slot,
        cooldown: def.fireRate,
      });
      setSelectedSlot(null);
      setUiKarma(s.localKarma);
    },
    [selectedSlot]
  );

  /* ─── Start / continue wave ────────────────────────────────────────────── */
  const startWave = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "gameover") return;
    s.wave += 1;
    s.enemySpawnQueue = buildWaveQueue(s.wave);
    s.spawnTimer = 0;
    s.enemies = [];
    s.projectiles = [];
    s.phase = "wave";
    s.betweenTimer = 0;
    setUiPhase("wave");
    setUiWave(s.wave);
  }, []);

  /* ─── Restart ─────────────────────────────────────────────────────────── */
  const restart = useCallback(() => {
    const s = stateRef.current;
    const earned = s.earnedKarma;
    const waveReached = s.wave;

    // Call callbacks
    if (onWin) {
      onWin(earned, waveReached * 10, `Wave ${waveReached}`, "covert");
    }
    if (onEnd) {
      onEnd(waveReached >= 5, earned);
    }

    // Reset
    stateRef.current = initState();
    setSelectedSlot(null);
    setUiPhase("idle");
    setUiWave(0);
    setUiBaseHp(100);
    setUiKarma(200);
  }, [onEnd, onWin]);

  /* ─── Between-wave auto-advance ────────────────────────────────────────── */
  useEffect(() => {
    if (uiPhase === "between" && uiBetweenTimer <= 0) {
      // Auto-advance after timer done, user can also click START WAVE
    }
  }, [uiPhase, uiBetweenTimer]);

  const canStart = uiPhase === "idle" || uiPhase === "between";
  const isGameOver = uiPhase === "gameover";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Canvas */}
      <div style={{ position: "relative", width: "100%", maxWidth: GW }}>
        <canvas
          ref={canvasRef}
          width={GW}
          height={GH}
          onClick={handleCanvasClick}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: 12,
            border: "2px solid rgba(168,85,247,0.4)",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        />
      </div>

      {/* Bottom UI Panel */}
      <div
        style={{
          width: "100%",
          maxWidth: GW,
          background: "rgba(10,0,30,0.97)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Selected slot info */}
        {selectedSlot && !isGameOver && (
          <div
            style={{
              fontSize: 11,
              color: "#facc15",
              textAlign: "center",
              paddingBottom: 4,
            }}
          >
            Placing in Lane {selectedSlot.lane + 1}, Slot {selectedSlot.slot + 1} — choose tower:
          </div>
        )}

        {/* Tower shop */}
        {!isGameOver && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {(Object.keys(TOWER_DEFS) as TowerType[]).map((type) => {
              const def = TOWER_DEFS[type];
              const canAfford = uiKarma >= def.cost;
              const active = !!selectedSlot;
              return (
                <button
                  key={type}
                  onClick={() => active && placeTower(type)}
                  disabled={!active || !canAfford}
                  style={{
                    background: active && canAfford
                      ? `linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.1))`
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${active && canAfford ? def.color : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8,
                    color: active && canAfford ? "#fff" : "rgba(255,255,255,0.3)",
                    padding: "6px 10px",
                    cursor: active && canAfford ? "pointer" : "not-allowed",
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    minWidth: 70,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{def.emoji}</span>
                  <span style={{ fontWeight: 700 }}>{def.label}</span>
                  <span style={{ color: canAfford ? "#facc15" : "#f87171", fontSize: 11 }}>
                    ⚡{def.cost}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Hint when no slot selected */}
        {!selectedSlot && !isGameOver && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
            Tap an empty slot (+) on the battlefield to place a tower
          </div>
        )}

        {/* Control buttons */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {canStart && (
            <button
              onClick={startWave}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 24px",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(168,85,247,0.5)",
              }}
            >
              {uiPhase === "idle" ? "▶ START WAVE 1" : `▶ START WAVE ${uiWave + 1}`}
            </button>
          )}
          {isGameOver && (
            <>
              <button
                onClick={restart}
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "10px 24px",
                  cursor: "pointer",
                }}
              >
                🔄 Play Again
              </button>
              <button
                onClick={restart}
                style={{
                  background: "linear-gradient(135deg, #1e293b, #334155)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  color: "#94a3b8",
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "10px 24px",
                  cursor: "pointer",
                }}
              >
                🏠 Exit
              </button>
            </>
          )}
        </div>

        {/* Karma display */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 6,
          }}
        >
          <span>⚡ Karma: <strong style={{ color: "#facc15" }}>{uiKarma}</strong></span>
          <span>Wave: <strong style={{ color: "#a855f7" }}>{uiWave}</strong></span>
          <span>❤️ Base HP: <strong style={{ color: uiBaseHp > 50 ? "#4ade80" : "#f87171" }}>{uiBaseHp}</strong></span>
        </div>
      </div>
    </div>
  );
}
