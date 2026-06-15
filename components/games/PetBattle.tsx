"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleAbility } from "@/types/game";
import type { Pet } from "@/types/pet";
import { BATTLE_ENEMIES } from "@/lib/mock-data";

/* ─── New Types ───────────────────────────────────────────────────────────── */
type StatusEffectType = "BURN" | "FREEZE" | "SHOCK" | "REGEN" | "SHIELD_BUFF";

interface StatusEffect {
  type: StatusEffectType;
  turnsLeft: number;
}

interface Equipment {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effect: "damage_bonus" | "shield_buff" | "regen" | "sniper" | "max_hp";
  value?: number;
}

interface BossPhase {
  phase: 1 | 2 | 3;
  hpThreshold: number;
  label: string;
  color: string;
}

/* ─── Extended BattleEnemy with boss flag ──────────────────────────────── */
interface ExtendedEnemy {
  id: string;
  name: string;
  emoji: string;
  petEmoji: string;
  level: number;
  hp: number;
  petClass: "Grinder Beast" | "Influencer Spirit" | "Merchant King";
  abilities: ExtendedAbility[];
  isBoss?: boolean;
  bossPhase2Abilities?: ExtendedAbility[];
  bossPhase3Abilities?: ExtendedAbility[];
  karmaReward?: number;
}

interface ExtendedAbility extends BattleAbility {
  statusEffect?: StatusEffectType;
  statusTarget?: "self" | "enemy";
  scalingDmg?: boolean; // scales with enemy max HP
}

/* ─── Environments ────────────────────────────────────────────────────────── */
interface Environment {
  id: string;
  name: string;
  emoji: string;
  description: string;
  bgAccent: string;
  effect: "burn_bonus" | "freeze_extend" | "shock_start" | "regen_bonus";
}

const ENVIRONMENTS: Environment[] = [
  { id: "desert", name: "Desert", emoji: "☀️", description: "+3 burn damage", bgAccent: "#3a1500", effect: "burn_bonus" },
  { id: "tundra", name: "Tundra", emoji: "❄️", description: "Freeze lasts 2 turns", bgAccent: "#001a2a", effect: "freeze_extend" },
  { id: "storm", name: "Storm", emoji: "⚡", description: "Shock applied at battle start", bgAccent: "#1a0a2a", effect: "shock_start" },
  { id: "forest", name: "Forest", emoji: "🌿", description: "Regen heals +3 HP/turn", bgAccent: "#001a00", effect: "regen_bonus" },
];

/* ─── Equipment catalog ───────────────────────────────────────────────────── */
const EQUIPMENT_OPTIONS: Equipment[] = [
  { id: "blade", name: "Sharp Blade", emoji: "⚔️", description: "+5 to all damage", effect: "damage_bonus", value: 5 },
  { id: "shield", name: "Iron Shield", emoji: "🛡️", description: "Start with SHIELD_BUFF", effect: "shield_buff" },
  { id: "medkit", name: "Medkit", emoji: "💉", description: "Start with REGEN (3 turns)", effect: "regen" },
  { id: "scope", name: "Sniper Scope", emoji: "🎯", description: "25% chance for double damage", effect: "sniper" },
  { id: "stimpack", name: "Stimpack", emoji: "💊", description: "+20 max HP", effect: "max_hp", value: 20 },
];

/* ─── Status effect metadata ──────────────────────────────────────────────── */
const STATUS_META: Record<StatusEffectType, { emoji: string; color: string; label: string }> = {
  BURN: { emoji: "🔥", color: "#ff6b35", label: "BURN" },
  FREEZE: { emoji: "❄️", color: "#00e5ff", label: "FREEZE" },
  SHOCK: { emoji: "⚡", color: "#ffde00", label: "SHOCK" },
  REGEN: { emoji: "💚", color: "#4caf50", label: "REGEN" },
  SHIELD_BUFF: { emoji: "🛡️", color: "#8b5cf6", label: "SHIELD" },
};

/* ─── Player abilities (6 each, 3 shown at a time) ────────────────────────── */
const PLAYER_ABILITIES: Record<string, ExtendedAbility[]> = {
  "Grinder Beast": [
    { name: "Iron Will", emoji: "🛡️", damage: [14, 24], effect: "heal 10" },
    { name: "Grind Force", emoji: "⚒️", damage: [20, 32] },
    { name: "Titan Smash", emoji: "💥", damage: [26, 38] },
    { name: "Rage Strike", emoji: "😡", damage: [30, 45], statusEffect: "BURN", statusTarget: "enemy" },
    { name: "Fortress", emoji: "🏰", damage: [5, 8], statusEffect: "SHIELD_BUFF", statusTarget: "self" },
    { name: "Earthquake", emoji: "🌍", damage: [15, 25], statusEffect: "SHOCK", statusTarget: "enemy" },
  ],
  "Influencer Spirit": [
    { name: "Charm Wave", emoji: "💫", damage: [12, 20], effect: "heal 12" },
    { name: "Social Burst", emoji: "📣", damage: [18, 28] },
    { name: "Star Power", emoji: "⭐", damage: [24, 36] },
    { name: "Viral Storm", emoji: "🌪️", damage: [22, 32], statusEffect: "SHOCK", statusTarget: "enemy" },
    { name: "Self Care", emoji: "🧘", damage: [8, 12], statusEffect: "REGEN", statusTarget: "self" },
    { name: "Mind Break", emoji: "🧠", damage: [18, 28], statusEffect: "FREEZE", statusTarget: "enemy" },
  ],
  "Merchant King": [
    { name: "Trade Slash", emoji: "⚔️", damage: [16, 26] },
    { name: "Gold Strike", emoji: "💰", damage: [20, 30] },
    { name: "Market Crash", emoji: "📉", damage: [28, 40] },
    { name: "Poison Blade", emoji: "🗡️", damage: [12, 18], statusEffect: "BURN", statusTarget: "enemy" },
    { name: "Buy Time", emoji: "⏳", damage: [5, 10], statusEffect: "FREEZE", statusTarget: "enemy" },
    { name: "Debt Collector", emoji: "💸", damage: [1, 1], scalingDmg: true },
  ],
};

/* ─── Boss enemy ──────────────────────────────────────────────────────────── */
const BOSS_ENEMY: ExtendedEnemy = {
  id: "boss",
  name: "SHADOW KING",
  emoji: "👑",
  petEmoji: "🐉",
  level: 50,
  hp: 300,
  petClass: "Grinder Beast",
  karmaReward: 500,
  isBoss: true,
  abilities: [
    { name: "Shadow Strike", emoji: "🌑", damage: [18, 28] },
    { name: "Void Slash", emoji: "🌀", damage: [22, 35] },
    { name: "Dark Pulse", emoji: "💀", damage: [15, 25] },
  ],
  bossPhase2Abilities: [
    { name: "Inferno Strike", emoji: "🔥", damage: [20, 30], statusEffect: "BURN", statusTarget: "enemy" },
    { name: "Scorch Wave", emoji: "♨️", damage: [18, 28], statusEffect: "BURN", statusTarget: "enemy" },
    { name: "Ember Fist", emoji: "🌋", damage: [24, 36], statusEffect: "BURN", statusTarget: "enemy" },
  ],
  bossPhase3Abilities: [
    { name: "Frenzy Bite", emoji: "😤", damage: [12, 20] },
    { name: "Chaos Slash", emoji: "⚡", damage: [10, 18] },
    { name: "Panic Strike", emoji: "😱", damage: [14, 22] },
  ],
};

/* ─── Regular enemies ─────────────────────────────────────────────────────── */
const ALL_ENEMIES: ExtendedEnemy[] = BATTLE_ENEMIES.map((e) => ({
  ...e,
  abilities: e.abilities as ExtendedAbility[],
}));

/* ─── Phases & misc types ─────────────────────────────────────────────────── */
type Phase = "select_enemy" | "loadout" | "battle" | "result" | "round_result";
type TurnPhase = "player" | "enemy" | "animating";
type GameMode = "normal" | "best_of_3";

interface DmgNumState {
  id: number;
  value: number;
  x: number;
  y: number;
  color: string;
}

interface Projectile {
  id: number;
  emoji: string;
  fromPlayer: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function difficultyStars(level: number): number {
  if (level > 12) return 3;
  if (level > 7) return 2;
  return 1;
}

function difficultyLabel(level: number): string {
  if (level > 12) return "HARD";
  if (level > 7) return "MED";
  return "EASY";
}

function difficultyColor(level: number): string {
  if (level > 12) return "#ff2d2d";
  if (level > 7) return "#ff9800";
  return "#4caf50";
}

const CLASS_BADGE_COLOR: Record<string, string> = {
  "Grinder Beast": "#ff6b35",
  "Influencer Spirit": "#ff2d8d",
  "Merchant King": "#c8ff00",
};

function getBossPhase(hp: number): 1 | 2 | 3 {
  if (hp <= 100) return 3;
  if (hp <= 200) return 2;
  return 1;
}

function applyStatusEffect(
  effect: StatusEffect,
  currentHP: number,
  maxHP: number,
  envEffect: string | null
): { newHP: number; logLine: string | null; consumed: boolean } {
  let newHP = currentHP;
  let logLine: string | null = null;
  let consumed = false;

  switch (effect.type) {
    case "BURN": {
      const burnDmg = 8 + (envEffect === "burn_bonus" ? 3 : 0);
      newHP = Math.max(0, currentHP - burnDmg);
      logLine = `🔥 BURN -${burnDmg} HP`;
      break;
    }
    case "REGEN": {
      const regenAmt = 6 + (envEffect === "regen_bonus" ? 3 : 0);
      newHP = Math.min(maxHP, currentHP + regenAmt);
      logLine = `💚 REGEN +${regenAmt} HP`;
      break;
    }
    default:
      break;
  }
  return { newHP, logLine, consumed };
}

/* ─── Judgment Ring (Shadow Hearts-style timing mechanic) ─────────────────── */

interface JudgmentRingProps {
  onResult: (quality: "perfect" | "good" | "miss") => void;
  hitZoneWidth: number; // 0-100, percentage of ring that's the green zone
  hasCombo: boolean;
}

function JudgmentRing({ onResult, hitZoneWidth, hasCombo }: JudgmentRingProps) {
  const [markerAngle, setMarkerAngle] = useState(0);
  const [tapped, setTapped] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const SPEED = hasCombo ? 280 : 220; // degrees per second, faster with combo

  useEffect(() => {
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      setMarkerAngle((elapsed * SPEED) % 360);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [SPEED]);

  function handleTap() {
    if (tapped) return;
    setTapped(true);
    cancelAnimationFrame(rafRef.current);
    // Hit zone: perfect = center 10%, good = full hitZoneWidth%, miss = outside
    const zoneCenter = 45; // degrees offset where green starts
    const zoneEnd = zoneCenter + hitZoneWidth * 3.6;
    const normalizedAngle = markerAngle % 360;
    let quality: "perfect" | "good" | "miss";
    if (normalizedAngle >= zoneCenter && normalizedAngle <= zoneCenter + hitZoneWidth * 0.36) {
      quality = "perfect";
    } else if (normalizedAngle >= zoneCenter && normalizedAngle <= zoneEnd) {
      quality = "good";
    } else {
      quality = "miss";
    }
    setTimeout(() => onResult(quality), 300);
  }

  const size = 160;
  const r = 68;
  const cx = size / 2;
  const cy = size / 2;

  // Convert angle to SVG arc
  function angleToXY(deg: number) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Build green hit zone arc path
  const zoneStart = 45;
  const zoneEndDeg = zoneStart + hitZoneWidth * 3.6;
  const greenStart = angleToXY(zoneStart);
  const greenEnd = angleToXY(zoneEndDeg);
  const largeArc = hitZoneWidth * 3.6 > 180 ? 1 : 0;

  // Perfect zone (inner 30% of hit zone)
  const perfectEnd = angleToXY(zoneStart + hitZoneWidth * 1.08);

  // Marker position
  const markerPos = angleToXY(markerAngle);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
    >
      <div style={{ color: "#ffde00", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>
        ⚔️ JUDGMENT RING
      </div>
      <motion.div
        whileTap={{ scale: 0.96 }}
        onClick={handleTap}
        style={{ cursor: tapped ? "default" : "pointer", position: "relative" }}
      >
        <svg width={size} height={size}>
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a0a00" strokeWidth={18} />
          {/* Green hit zone */}
          <path
            d={`M ${greenStart.x} ${greenStart.y} A ${r} ${r} 0 ${largeArc} 1 ${greenEnd.x} ${greenEnd.y}`}
            fill="none" stroke="#22c55e" strokeWidth={18} strokeLinecap="round"
          />
          {/* Perfect zone (brighter) */}
          <path
            d={`M ${greenStart.x} ${greenStart.y} A ${r} ${r} 0 0 1 ${perfectEnd.x} ${perfectEnd.y}`}
            fill="none" stroke="#c8ff00" strokeWidth={18} strokeLinecap="round"
          />
          {/* Marker */}
          {!tapped && (
            <motion.circle
              cx={markerPos.x} cy={markerPos.y} r={10}
              fill="#ffffff"
              style={{ filter: "drop-shadow(0 0 6px #fff) drop-shadow(0 0 12px #ffde00)" }}
            />
          )}
          {/* Result flash */}
          {tapped && (
            <text x={cx} y={cy + 6} textAnchor="middle" fill="#c8ff00" fontSize={16} fontWeight="bold">
              TAP!
            </text>
          )}
          {/* Center */}
          <circle cx={cx} cy={cy} r={20} fill="#0a0a0a" stroke="#ffde0066" strokeWidth={2} />
          <text x={cx} y={cy + 5} textAnchor="middle" fill="#ffde00" fontSize={12}>⚔️</text>
        </svg>
      </motion.div>
      {!tapped && (
        <div style={{ color: "#888", fontSize: 10, fontWeight: 600 }}>
          Tryck när markören träffar den gröna zonen!
        </div>
      )}
    </motion.div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function DmgNum({ value, x, y, color }: { value: number; x: number; y: number; color: string }) {
  const isBig = value >= 30;
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: isBig ? 0.4 : 0.6 }}
      animate={{ opacity: 0, y: -70, scale: isBig ? 1.5 : 1.2 }}
      transition={{ duration: 1.3, ease: "easeOut" }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        color,
        fontWeight: 900,
        fontSize: isBig ? 30 : 24,
        pointerEvents: "none",
        zIndex: 20,
        textShadow: `0 0 12px ${color}, 0 0 4px ${color}`,
        letterSpacing: isBig ? -1 : 0,
      }}
    >
      -{value}
    </motion.div>
  );
}

function HealNum({ value, x, y }: { value: number; x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -50, scale: 1.1 }}
      transition={{ duration: 1.0 }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        color: "#c8ff00",
        fontWeight: 900,
        fontSize: 18,
        pointerEvents: "none",
        zIndex: 20,
        textShadow: "0 0 8px #c8ff00",
      }}
    >
      +{value}
    </motion.div>
  );
}

function SegmentedHPBar({
  current,
  max,
  color,
}: {
  current: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, (current / max) * 100);
  const barColor = pct > 50 ? color : pct > 20 ? "#ff9800" : "#ff2d2d";
  const segments = 10;
  const filledSegments = Math.round((pct / 100) * segments);

  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: segments }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            opacity: i < filledSegments ? 1 : 0.15,
            scale: i < filledSegments ? 1 : 0.85,
          }}
          transition={{ duration: 0.3, delay: i * 0.02 }}
          style={{
            flex: 1,
            height: 14,
            background: i < filledSegments ? barColor : "#222",
            border: `1.5px solid ${i < filledSegments ? barColor : "#333"}`,
            borderRadius: 3,
            boxShadow: i < filledSegments ? `0 0 6px ${barColor}88` : "none",
          }}
        />
      ))}
    </div>
  );
}

function BossHPBar({ current, max }: { current: number; max: number }) {
  const phase = getBossPhase(current);
  const colors: Record<number, string> = { 1: "#c8ff00", 2: "#ff9800", 3: "#ff2d2d" };
  const color = colors[phase];
  const pct = Math.max(0, (current / max) * 100);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Background track */}
      <div
        style={{
          height: 18,
          background: "#1a0000",
          borderRadius: 6,
          border: "2px solid #ff2d2d44",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
          style={{
            height: "100%",
            background: color,
            boxShadow: `0 0 10px ${color}88`,
            borderRadius: 4,
          }}
        />
        {/* Phase markers */}
        <div
          style={{
            position: "absolute",
            left: `${(200 / 300) * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: "#fff8",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${(100 / 300) * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: "#fff8",
          }}
        />
      </div>
      {/* Phase labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 2,
          fontSize: 8,
          color: "#666",
          fontWeight: 700,
        }}
      >
        <span style={{ color: phase === 1 ? "#c8ff00" : "#444" }}>PHASE 1</span>
        <span style={{ color: phase === 2 ? "#ff9800" : "#444" }}>PHASE 2</span>
        <span style={{ color: phase === 3 ? "#ff2d2d" : "#444" }}>PHASE 3</span>
      </div>
    </div>
  );
}

function StatusBadges({ effects }: { effects: StatusEffect[] }) {
  if (effects.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", marginTop: 3 }}>
      {effects.map((eff, i) => {
        const meta = STATUS_META[eff.type];
        return (
          <motion.div
            key={`${eff.type}-${i}`}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{
              background: `${meta.color}22`,
              border: `1px solid ${meta.color}88`,
              borderRadius: 5,
              padding: "1px 5px",
              fontSize: 9,
              fontWeight: 700,
              color: meta.color,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {meta.emoji} {eff.turnsLeft}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
type Props = { pet: Pet; onEnd: (won: boolean, karma: number) => void };

export default function PetBattle({ pet, onEnd }: Props) {
  const [phase, setPhase] = useState<Phase>("select_enemy");
  const [selectedEnemy, setSelectedEnemy] = useState<ExtendedEnemy | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [environment, setEnvironment] = useState<Environment | null>(null);

  // Loadout
  const [pendingEnemy, setPendingEnemy] = useState<ExtendedEnemy | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  // Battle state
  const [playerMaxHP, setPlayerMaxHP] = useState(100);
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("player");
  const [log, setLog] = useState<string[]>([]);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [combo, setCombo] = useState(0);
  const [dmgNums, setDmgNums] = useState<DmgNumState[]>([]);
  const [healNums, setHealNums] = useState<{ id: number; value: number; x: number; y: number }[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [playerBuff, setPlayerBuff] = useState<string | null>(null);
  const [abilityPage, setAbilityPage] = useState(0); // 0 = first 3, 1 = second 3

  // Status effects
  const [playerEffects, setPlayerEffects] = useState<StatusEffect[]>([]);
  const [enemyEffects, setEnemyEffects] = useState<StatusEffect[]>([]);

  // Best of 3
  const [roundWins, setRoundWins] = useState<(boolean | null)[]>([null, null, null]);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundResultMsg, setRoundResultMsg] = useState("");

  // Judgment Ring state
  const [showRing, setShowRing] = useState(false);
  const [pendingAbility, setPendingAbility] = useState<ExtendedAbility | null>(null);

  const dmgIdRef = useRef(0);
  const enemy = selectedEnemy;

  const allPlayerAbilities = PLAYER_ABILITIES[pet.class] ?? PLAYER_ABILITIES["Grinder Beast"];
  const visibleAbilities = allPlayerAbilities.slice(abilityPage * 3, abilityPage * 3 + 3);

  const petAvatarEmoji =
    pet.evolution === "legendary"
      ? "🌋"
      : pet.evolution === "adult"
      ? "🦁"
      : pet.evolution === "teen"
      ? "🦊"
      : "🐣";

  function spawnDmg(value: number, x: number, y: number, color: string) {
    const id = ++dmgIdRef.current;
    setDmgNums((prev) => [...prev, { id, value, x, y, color }]);
    setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== id)), 1400);
  }

  function spawnHeal(value: number, x: number, y: number) {
    const id = ++dmgIdRef.current;
    setHealNums((prev) => [...prev, { id, value, x, y }]);
    setTimeout(() => setHealNums((prev) => prev.filter((h) => h.id !== id)), 1200);
  }

  function fireProjectile(emoji: string, fromPlayer: boolean) {
    const id = ++dmgIdRef.current;
    setProjectiles((prev) => [...prev, { id, emoji, fromPlayer }]);
    setTimeout(() => setProjectiles((prev) => prev.filter((p) => p.id !== id)), 700);
  }

  function addStatusToPlayer(type: StatusEffectType, turns: number) {
    const duration = type === "FREEZE" && environment?.effect === "freeze_extend" ? turns + 1 : turns;
    setPlayerEffects((prev) => {
      const existing = prev.findIndex((e) => e.type === type);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { type, turnsLeft: duration };
        return updated;
      }
      return [...prev, { type, turnsLeft: duration }];
    });
  }

  function addStatusToEnemy(type: StatusEffectType, turns: number) {
    const duration = type === "FREEZE" && environment?.effect === "freeze_extend" ? turns + 1 : turns;
    setEnemyEffects((prev) => {
      const existing = prev.findIndex((e) => e.type === type);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { type, turnsLeft: duration };
        return updated;
      }
      return [...prev, { type, turnsLeft: duration }];
    });
  }

  function tickEffects(
    effects: StatusEffect[],
    currentHP: number,
    maxHP: number,
    envEffect: string | null
  ): { newHP: number; newEffects: StatusEffect[]; logLines: string[] } {
    let newHP = currentHP;
    const logLines: string[] = [];
    const newEffects: StatusEffect[] = [];

    for (const eff of effects) {
      const result = applyStatusEffect(eff, newHP, maxHP, envEffect);
      newHP = result.newHP;
      if (result.logLine) logLines.push(result.logLine);
      const newTurns = eff.turnsLeft - 1;
      if (newTurns > 0) {
        newEffects.push({ ...eff, turnsLeft: newTurns });
      }
    }

    return { newHP, newEffects, logLines };
  }

  function startBattle(e: ExtendedEnemy, eq: Equipment | null, env: Environment) {
    const maxHP = eq?.effect === "max_hp" ? 100 + (eq.value ?? 20) : 100;
    setPlayerMaxHP(maxHP);
    setPlayerHP(maxHP);
    setEnemyHP(e.hp);
    setSelectedEnemy(e);
    setEnvironment(env);
    setLog([`⚔️ Battle start! ${pet.name} vs ${e.petEmoji} ${e.name}${e.isBoss ? " [BOSS]" : "'s pet"}!`, `🌍 ${env.emoji} ${env.name} environment — ${env.description}`]);
    setPhase("battle");
    setTurnPhase("player");
    setCombo(0);
    setPlayerBuff(null);
    setAbilityPage(0);
    setDmgNums([]);
    setHealNums([]);
    setProjectiles([]);

    // Apply equipment effects
    const initPlayerEffects: StatusEffect[] = [];
    if (eq?.effect === "shield_buff") initPlayerEffects.push({ type: "SHIELD_BUFF", turnsLeft: 1 });
    if (eq?.effect === "regen") initPlayerEffects.push({ type: "REGEN", turnsLeft: 3 });
    setPlayerEffects(initPlayerEffects);

    // Apply environment shock
    const initEnemyEffects: StatusEffect[] = [];
    if (env.effect === "shock_start") initEnemyEffects.push({ type: "SHOCK", turnsLeft: 1 });
    setEnemyEffects(initEnemyEffects);
  }

  function selectEnemyForLoadout(e: ExtendedEnemy) {
    const env = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];
    setPendingEnemy(e);
    setEnvironment(env);
    setEquipment(null);
    setPhase("loadout");
  }

  function confirmLoadout() {
    if (!pendingEnemy || !environment) return;
    startBattle(pendingEnemy, equipment, environment);
  }

  function endRound(playerWon: boolean) {
    const roundIndex = currentRound - 1;
    const newWins = [...roundWins];
    newWins[roundIndex] = playerWon;
    setRoundWins(newWins);

    if (gameMode === "normal") {
      setPhase("result");
      const karmaBase = enemy?.isBoss
        ? (enemy.karmaReward ?? 500)
        : playerWon ? 100 + combo * 10 : 20;
      onEnd(playerWon, karmaBase);
      return;
    }

    // Best of 3
    const playerRoundWins = newWins.filter((w) => w === true).length;
    const enemyRoundWins = newWins.filter((w) => w === false).length;

    setRoundResultMsg(playerWon ? `🏆 Round ${currentRound} — YOU WIN!` : `💀 Round ${currentRound} — ENEMY WINS!`);
    setPhase("round_result");

    if (playerRoundWins >= 2 || enemyRoundWins >= 2 || currentRound >= 3) {
      setTimeout(() => {
        setPhase("result");
        const finalWon = playerRoundWins >= 2;
        const karmaBase = finalWon ? 150 + combo * 10 : 30;
        onEnd(finalWon, karmaBase);
      }, 2000);
    } else {
      setTimeout(() => {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        if (pendingEnemy && environment) {
          startBattle(pendingEnemy ?? selectedEnemy!, equipment, environment);
        } else if (selectedEnemy && environment) {
          startBattle(selectedEnemy, equipment, environment);
        }
      }, 2000);
    }
  }

  const useAbility = useCallback(
    (ability: ExtendedAbility, qualityMult = 1) => {
      if (turnPhase !== "player" || !enemy) return;

      // Check freeze
      const frozenEffect = playerEffects.find((e) => e.type === "FREEZE");
      if (frozenEffect) {
        setPlayerEffects((prev) => prev.filter((e) => e.type !== "FREEZE"));
        setLog((l) => [`❄️ FREEZE — ${pet.name} is frozen! Turn skipped.`, ...l.slice(0, 5)]);
        // Still do enemy turn
        setTurnPhase("animating");
        setTimeout(() => doEnemyTurn(playerHP, enemyHP, combo), 600);
        return;
      }

      // Check shock (50% miss)
      const shockEffect = playerEffects.find((e) => e.type === "SHOCK");
      if (shockEffect && Math.random() < 0.5) {
        const newPlayerEffects = playerEffects.map((e) =>
          e.type === "SHOCK" ? { ...e, turnsLeft: e.turnsLeft - 1 } : e
        ).filter((e) => e.turnsLeft > 0);
        setPlayerEffects(newPlayerEffects);
        setLog((l) => [`⚡ SHOCK — ${pet.name} missed the attack!`, ...l.slice(0, 5)]);
        setTurnPhase("animating");
        setTimeout(() => doEnemyTurn(playerHP, enemyHP, combo), 600);
        return;
      }

      setTurnPhase("animating");

      // Tick player effects at start of turn
      const envEffect = environment?.effect ?? null;
      const { newHP: tickedPlayerHP, newEffects: tickedPlayerEffects, logLines: playerTickLogs } = tickEffects(
        playerEffects, playerHP, playerMaxHP, envEffect
      );
      setPlayerHP(tickedPlayerHP);
      setPlayerEffects(tickedPlayerEffects);
      if (playerTickLogs.length > 0) {
        setLog((l) => [...playerTickLogs.map((ll) => `${pet.name}: ${ll}`), ...l.slice(0, 5 - playerTickLogs.length)]);
      }

      if (tickedPlayerHP <= 0) {
        setTimeout(() => endRound(false), 600);
        return;
      }

      // Calculate damage (qualityMult: 1.5 = perfect, 1.0 = good)
      let dmg = Math.round(rnd(...ability.damage) * qualityMult);

      // Debt Collector: 15% of enemy max HP
      if (ability.scalingDmg) {
        dmg = Math.floor(enemy.hp * 0.15);
      }

      // Equipment bonuses
      if (equipment?.effect === "damage_bonus") dmg += equipment.value ?? 0;
      if (equipment?.effect === "sniper" && Math.random() < 0.25) {
        dmg *= 2;
        setLog((l) => [`🎯 SNIPER — Double damage!`, ...l.slice(0, 5)]);
      }

      const heal = ability.effect?.startsWith("heal")
        ? parseInt(ability.effect.split(" ")[1])
        : 0;

      // Check SHIELD_BUFF on enemy
      const enemyShielded = enemyEffects.find((e) => e.type === "SHIELD_BUFF");
      let finalDmg = dmg;
      if (enemyShielded) {
        finalDmg = 0;
        setEnemyEffects((prev) => prev.filter((e) => e.type !== "SHIELD_BUFF"));
        setLog((l) => [`🛡️ ${enemy.name}'s SHIELD blocked the attack!`, ...l.slice(0, 5)]);
      }

      fireProjectile(ability.emoji, true);

      setTimeout(() => {
        setShakeEnemy(true);
        setTimeout(() => setShakeEnemy(false), 400);
        if (finalDmg > 0) spawnDmg(finalDmg, 180, 20, "#ff2d2d");

        if (heal) {
          spawnHeal(heal, 30, 20);
          setPlayerBuff(`+${heal} HP`);
          setTimeout(() => setPlayerBuff(null), 1500);
        }

        const newEnemyHP = Math.max(0, enemyHP - finalDmg);
        const newPlayerHP = Math.min(playerMaxHP, tickedPlayerHP + heal);
        const newCombo = combo + 1;

        setEnemyHP(newEnemyHP);
        setPlayerHP(newPlayerHP);
        setCombo(newCombo);

        // Apply status effects from ability
        if (ability.statusEffect) {
          if (ability.statusTarget === "enemy") {
            const turns = ability.statusEffect === "BURN" ? 3 : ability.statusEffect === "REGEN" ? 3 : 1;
            addStatusToEnemy(ability.statusEffect, turns);
          } else {
            const turns = ability.statusEffect === "BURN" ? 3 : ability.statusEffect === "REGEN" ? 3 : 1;
            addStatusToPlayer(ability.statusEffect, turns);
          }
        }

        // Tick enemy effects
        const { newHP: tickedEnemyHP, newEffects: tickedEnemyEffects, logLines: enemyTickLogs } = tickEffects(
          enemyEffects, newEnemyHP, enemy.hp, envEffect
        );
        setEnemyHP(tickedEnemyHP);
        setEnemyEffects(tickedEnemyEffects);

        const comboBadge = newCombo >= 3 ? ` 🔥 COMBO ×${newCombo}!` : "";
        const statusTag = ability.statusEffect ? ` · ${STATUS_META[ability.statusEffect].emoji} ${ability.statusEffect}` : "";
        const qualityBadge = qualityMult >= 1.5 ? " ⭐ PERFECT HIT!" : "";
        setLog((l) => [
          `${ability.emoji} ${pet.name} used ${ability.name}! ${finalDmg} dmg${heal ? ` · +${heal} HP` : ""}${statusTag}${comboBadge}${qualityBadge}`,
          ...enemyTickLogs.map((ll) => `${enemy.name}: ${ll}`),
          ...l.slice(0, Math.max(0, 5 - 1 - enemyTickLogs.length)),
        ]);

        if (tickedEnemyHP <= 0) {
          setTimeout(() => endRound(true), 800);
          return;
        }

        // Boss phase 3: attack twice
        const bossCurrentPhase = enemy.isBoss ? getBossPhase(tickedEnemyHP) : null;
        if (bossCurrentPhase === 3) {
          setTimeout(() => {
            doEnemyTurn(newPlayerHP, tickedEnemyHP, newCombo, () => {
              setTimeout(() => doEnemyTurn(newPlayerHP, tickedEnemyHP, 0), 900);
            });
          }, 900);
        } else {
          setTimeout(() => doEnemyTurn(newPlayerHP, tickedEnemyHP, newCombo), 900);
        }
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turnPhase, enemy, enemyHP, playerHP, combo, pet, onEnd, playerEffects, enemyEffects, equipment, environment, playerMaxHP]
  );

  function handleAbilityClick(ability: ExtendedAbility) {
    if (turnPhase !== "player" || !enemy) return;
    setPendingAbility(ability);
    setShowRing(true);
  }

  function handleRingResult(quality: "perfect" | "good" | "miss") {
    setShowRing(false);
    if (!pendingAbility) return;
    if (quality === "miss") {
      setLog((l) => [`💨 MISS! ${pet.name}'s attack whiffed!`, ...l.slice(0, 5)]);
      setCombo(0);
      setTurnPhase("animating");
      setTimeout(() => doEnemyTurn(playerHP, enemyHP, 0), 700);
      setPendingAbility(null);
      return;
    }
    const mult = quality === "perfect" ? 1.5 : 1.0;
    useAbility(pendingAbility, mult);
    setPendingAbility(null);
  }

  function doEnemyTurn(
    currentPlayerHP: number,
    currentEnemyHP: number,
    currentCombo: number,
    onDone?: () => void
  ) {
    if (!enemy) return;

    // Tick enemy effects (for FREEZE check)
    const frozenEffect = enemyEffects.find((e) => e.type === "FREEZE");
    if (frozenEffect) {
      setEnemyEffects((prev) => prev.filter((e) => e.type !== "FREEZE"));
      setLog((l) => [`❄️ FREEZE — ${enemy.name}'s pet is frozen! Attack skipped.`, ...l.slice(0, 5)]);
      setTurnPhase("player");
      onDone?.();
      return;
    }

    // Choose enemy ability based on boss phase
    let abilityPool: ExtendedAbility[];
    if (enemy.isBoss) {
      const bossPhase = getBossPhase(currentEnemyHP);
      if (bossPhase === 3 && enemy.bossPhase3Abilities) {
        abilityPool = enemy.bossPhase3Abilities;
      } else if (bossPhase === 2 && enemy.bossPhase2Abilities) {
        abilityPool = enemy.bossPhase2Abilities;
      } else {
        abilityPool = enemy.abilities;
      }
    } else {
      abilityPool = enemy.abilities as ExtendedAbility[];
    }

    // Shock check
    const shockEffect = enemyEffects.find((e) => e.type === "SHOCK");
    if (shockEffect && Math.random() < 0.5) {
      setEnemyEffects((prev) =>
        prev.map((e) => (e.type === "SHOCK" ? { ...e, turnsLeft: e.turnsLeft - 1 } : e))
          .filter((e) => e.turnsLeft > 0)
      );
      setLog((l) => [`⚡ SHOCK — ${enemy.name}'s pet missed!`, ...l.slice(0, 5)]);
      setTurnPhase("player");
      onDone?.();
      return;
    }

    const ea = abilityPool[Math.floor(Math.random() * abilityPool.length)] as ExtendedAbility;
    let edm = rnd(...ea.damage);
    const eheal = ea.effect?.startsWith("heal") ? parseInt(ea.effect.split(" ")[1]) : 0;

    // Boss phase 3: weaker attacks
    if (enemy.isBoss && getBossPhase(currentEnemyHP) === 3) {
      edm = Math.floor(edm * 0.65);
    }

    // Check player SHIELD_BUFF
    const playerShielded = playerEffects.find((e) => e.type === "SHIELD_BUFF");
    let finalEDmg = edm;
    if (playerShielded) {
      finalEDmg = 0;
      setPlayerEffects((prev) => prev.filter((e) => e.type !== "SHIELD_BUFF"));
      setLog((l) => [`🛡️ Your SHIELD blocked the enemy attack!`, ...l.slice(0, 5)]);
    }

    fireProjectile(ea.emoji, false);

    setTimeout(() => {
      setShakePlayer(true);
      setTimeout(() => setShakePlayer(false), 400);
      if (finalEDmg > 0) spawnDmg(finalEDmg, 30, 60, "#ff9800");

      // Tick player effects
      const envEffect = environment?.effect ?? null;
      const { newHP: tickedPlayerHP, newEffects: newPlayerEffects, logLines: playerTickLogs } = tickEffects(
        playerEffects.filter((e) => e.type !== "SHIELD_BUFF"),
        Math.max(0, currentPlayerHP - finalEDmg),
        playerMaxHP,
        envEffect
      );

      setPlayerHP(tickedPlayerHP);
      setPlayerEffects(newPlayerEffects);

      if (eheal) setEnemyHP((h) => Math.min(enemy.hp, h + eheal));

      const statusTag = ea.statusEffect ? ` · applies ${STATUS_META[ea.statusEffect].emoji} ${ea.statusEffect}` : "";
      setLog((l) => [
        `${ea.emoji} ${enemy.name}'s pet used ${ea.name}! ${finalEDmg} dmg${eheal ? ` · healed ${eheal}` : ""}${statusTag}`,
        ...playerTickLogs.map((ll) => `${pet.name}: ${ll}`),
        ...l.slice(0, Math.max(0, 5 - 1 - playerTickLogs.length)),
      ]);

      // Apply status from enemy ability
      if (ea.statusEffect) {
        if (ea.statusTarget === "self") {
          const turns = ea.statusEffect === "REGEN" ? 3 : 1;
          addStatusToEnemy(ea.statusEffect, turns);
        } else {
          const turns = ea.statusEffect === "BURN" ? 3 : ea.statusEffect === "REGEN" ? 3 : 1;
          addStatusToPlayer(ea.statusEffect, turns);
        }
      }

      setCombo(0);

      if (tickedPlayerHP <= 0) {
        setTimeout(() => endRound(false), 600);
        onDone?.();
      } else {
        setTurnPhase("player");
        onDone?.();
      }
    }, 350);
  }

  /* ── Enemy select screen ────────────────────────────────────────────────── */
  if (phase === "select_enemy") {
    return (
      <div>
        {/* Mode selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["normal", "best_of_3"] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setGameMode(m)}
              style={{
                flex: 1,
                padding: "8px 6px",
                background: gameMode === m ? "#ff6b3522" : "#111",
                border: `2px solid ${gameMode === m ? "#ff6b35" : "#222"}`,
                borderRadius: 10,
                color: gameMode === m ? "#ff6b35" : "#555",
                fontSize: 10,
                fontWeight: 800,
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              {m === "normal" ? "⚔️ NORMAL" : "🏆 BEST OF 3"}
            </button>
          ))}
        </div>

        <div
          style={{
            color: "#ff6b35",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 4,
            textShadow: "0 0 12px #ff6b3588",
          }}
        >
          SELECT OPPONENT
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#555",
            fontWeight: 600,
            letterSpacing: 1,
            marginBottom: 14,
          }}
        >
          CHOOSE YOUR CHALLENGE WISELY
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ALL_ENEMIES.map((e) => {
            const stars = difficultyStars(e.level);
            const label = difficultyLabel(e.level);
            const dColor = difficultyColor(e.level);
            const classBadgeColor = CLASS_BADGE_COLOR[e.petClass] ?? "#888";
            return (
              <motion.button
                key={e.id}
                whileHover={{ scale: 1.01, borderColor: "#ff6b35" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectEnemyForLoadout(e)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "linear-gradient(135deg, #150a00 0%, #1f0d00 100%)",
                  border: "2px solid #2a1200",
                  borderRadius: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 0% 50%, ${dColor}10 0%, transparent 65%)`,
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#0a0500",
                    border: `2px solid ${dColor}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.9rem",
                    flexShrink: 0,
                    boxShadow: `0 0 12px ${dColor}44`,
                  }}
                >
                  {e.petEmoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.name}&apos;s pet
                  </div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        background: `${classBadgeColor}22`,
                        border: `1px solid ${classBadgeColor}55`,
                        borderRadius: 4,
                        color: classBadgeColor,
                        letterSpacing: 0.5,
                      }}
                    >
                      {e.petClass.toUpperCase()}
                    </span>
                    <span style={{ color: "#555", fontSize: 10 }}>
                      LVL {e.level}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ marginBottom: 3 }}>
                    {Array.from({ length: 3 }).map((_, si) => (
                      <span
                        key={si}
                        style={{
                          color: si < stars ? dColor : "#333",
                          fontSize: 12,
                          textShadow: si < stars ? `0 0 6px ${dColor}` : "none",
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: dColor,
                      letterSpacing: 1,
                      textShadow: `0 0 8px ${dColor}`,
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ color: "#555", fontSize: 10, fontWeight: 700 }}>
                    {e.hp} HP
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* Boss section */}
          <div
            style={{
              color: "#ff2d2d",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 3,
              marginTop: 10,
              marginBottom: 6,
              textShadow: "0 0 10px #ff2d2d88",
            }}
          >
            ☠️ BOSS BATTLE
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => selectEnemyForLoadout(BOSS_ENEMY)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 14px",
              background: "linear-gradient(135deg, #1a0000 0%, #2a0505 100%)",
              border: "2px solid #ff2d2d66",
              borderRadius: 14,
              cursor: "pointer",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 0 20px #ff2d2d22",
            }}
          >
            <motion.div
              animate={{ boxShadow: ["0 0 10px #ff2d2d44", "0 0 25px #ff2d2d88", "0 0 10px #ff2d2d44"] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#0a0000",
                border: "2px solid #ff2d2d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.2rem",
                flexShrink: 0,
              }}
            >
              {BOSS_ENEMY.petEmoji}
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#ff2d2d", fontWeight: 900, fontSize: 15, letterSpacing: 1, textShadow: "0 0 10px #ff2d2d" }}>
                {BOSS_ENEMY.name}
              </div>
              <div style={{ color: "#888", fontSize: 10, marginTop: 2 }}>
                3 PHASES · 300 HP · ATTACKS TWICE IN PHASE 3
              </div>
              <div style={{ color: "#ff2d2d", fontSize: 10, fontWeight: 700, marginTop: 3 }}>
                REWARD: 500+ karma {BOSS_ENEMY.emoji}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 16 }}>☠️☠️☠️</div>
              <div style={{ color: "#ff2d2d", fontSize: 9, fontWeight: 800, letterSpacing: 1, marginTop: 3 }}>
                BOSS
              </div>
              <div style={{ color: "#555", fontSize: 10, fontWeight: 700 }}>300 HP</div>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  /* ── Loadout screen ─────────────────────────────────────────────────────── */
  if (phase === "loadout") {
    return (
      <div>
        <div
          style={{
            color: "#c8ff00",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 4,
            textShadow: "0 0 12px #c8ff0088",
          }}
        >
          LOADOUT SELECTION
        </div>
        {environment && (
          <div
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: 10,
              padding: "8px 12px",
              marginBottom: 14,
              fontSize: 11,
              color: "#aaa",
            }}
          >
            {environment.emoji} <strong style={{ color: "#fff" }}>{environment.name}</strong> — {environment.description}
          </div>
        )}
        <div style={{ fontSize: 10, color: "#888", marginBottom: 10, fontWeight: 600 }}>
          Choose 1 equipment item (optional):
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {EQUIPMENT_OPTIONS.map((eq) => {
            const selected = equipment?.id === eq.id;
            return (
              <motion.button
                key={eq.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setEquipment(selected ? null : eq)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: selected ? "#c8ff0011" : "#111",
                  border: `2px solid ${selected ? "#c8ff00" : "#222"}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: selected ? "0 0 10px #c8ff0033" : "none",
                }}
              >
                <div style={{ fontSize: "1.6rem" }}>{eq.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: selected ? "#c8ff00" : "#fff", fontWeight: 700, fontSize: 12 }}>
                    {eq.name}
                  </div>
                  <div style={{ color: "#888", fontSize: 10 }}>{eq.description}</div>
                </div>
                {selected && (
                  <div style={{ color: "#c8ff00", fontSize: 14, fontWeight: 900 }}>✓</div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setPhase("select_enemy")}
            style={{
              flex: 1,
              padding: "12px",
              background: "#111",
              border: "2px solid #333",
              borderRadius: 12,
              color: "#888",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← BACK
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={confirmLoadout}
            style={{
              flex: 2,
              padding: "12px",
              background: "#ff6b35",
              border: "3px solid #0a0a0a",
              borderRadius: 12,
              color: "#fff",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              letterSpacing: 2,
              boxShadow: "0 0 15px #ff6b3544",
            }}
          >
            ⚔️ FIGHT!
          </motion.button>
        </div>
      </div>
    );
  }

  /* ── Round result screen ───────────────────────────────────────────────── */
  if (phase === "round_result") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          textAlign: "center",
          padding: "32px 20px",
          background: "#0a0500",
          border: "2px solid #ff6b35",
          borderRadius: 16,
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 10 }}>
          {roundResultMsg.startsWith("🏆") ? "🏆" : "💀"}
        </div>
        <div style={{ color: "#ff6b35", fontSize: 20, fontWeight: 900, letterSpacing: 2 }}>
          {roundResultMsg}
        </div>
        <div style={{ color: "#555", fontSize: 12, marginTop: 8 }}>
          Next round starting...
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {roundWins.map((w, i) => (
            <div
              key={i}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: w === true ? "#c8ff00" : w === false ? "#ff2d2d" : "#333",
                border: `2px solid ${w === true ? "#c8ff00" : w === false ? "#ff2d2d" : "#555"}`,
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  /* ── Result screen ──────────────────────────────────────────────────────── */
  if (phase === "result") {
    const won = enemyHP <= 0;
    const playerRoundWins = roundWins.filter((w) => w === true).length;
    const bo3Won = gameMode === "best_of_3" ? playerRoundWins >= 2 : won;
    const karmaEarned = enemy?.isBoss
      ? (enemy.karmaReward ?? 500) + combo * 10
      : bo3Won ? (gameMode === "best_of_3" ? 150 : 100) + combo * 10 : (gameMode === "best_of_3" ? 30 : 20);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ position: "relative" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          style={{
            textAlign: "center",
            padding: "32px 20px",
            background: bo3Won
              ? "linear-gradient(160deg, #0a1a00 0%, #1a2800 50%, #0a1a00 100%)"
              : "linear-gradient(160deg, #1a0000 0%, #2a0505 50%, #1a0000 100%)",
            border: `3px solid ${bo3Won ? "#c8ff00" : "#ff2d2d"}`,
            borderRadius: 20,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: bo3Won
                ? "radial-gradient(ellipse at 50% 50%, #c8ff0015 0%, transparent 70%)"
                : "radial-gradient(ellipse at 50% 50%, #ff2d2d15 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Best of 3 round indicators */}
          {gameMode === "best_of_3" && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {roundWins.map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: w === true ? "#c8ff00" : w === false ? "#ff2d2d" : "#333",
                    border: `2px solid ${w === true ? "#c8ff00" : w === false ? "#ff2d2d" : "#555"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 900,
                    color: "#000",
                  }}
                >
                  {w === true ? "W" : w === false ? "L" : ""}
                </div>
              ))}
            </div>
          )}

          <motion.div
            animate={{ scale: [1, 1.12, 0.95, 1.05, 1], rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ fontSize: "4rem", marginBottom: 10 }}
          >
            {bo3Won ? (enemy?.isBoss ? "👑" : "🏆") : "💀"}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              color: bo3Won ? "#c8ff00" : "#ff2d2d",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 3,
              textShadow: `0 0 24px ${bo3Won ? "#c8ff00" : "#ff2d2d"}`,
              marginBottom: 6,
            }}
          >
            {bo3Won ? (enemy?.isBoss ? "BOSS SLAIN!" : "VICTORY!") : "DEFEATED!"}
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{ color: "#aaa", fontSize: 14, marginBottom: 6 }}
          >
            +{karmaEarned} karma earned!
          </motion.div>

          {combo >= 3 && bo3Won && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.6 }}
              style={{
                color: "#ffde00",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
                textShadow: "0 0 10px #ffde00",
              }}
            >
              🔥 Combo bonus ×{combo}!
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            onClick={() => {
              setPhase("select_enemy");
              setSelectedEnemy(null);
              setPendingEnemy(null);
              setLog([]);
              setDmgNums([]);
              setHealNums([]);
              setProjectiles([]);
              setRoundWins([null, null, null]);
              setCurrentRound(1);
              setPlayerEffects([]);
              setEnemyEffects([]);
              setEquipment(null);
            }}
            style={{
              marginTop: 14,
              padding: "12px 36px",
              background: bo3Won ? "#c8ff00" : "#ff2d2d",
              border: "3px solid #0a0a0a",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              color: bo3Won ? "#0a0a0a" : "#fff",
              cursor: "pointer",
              letterSpacing: 2,
              boxShadow: `4px 4px 0 #0a0a0a, 0 0 20px ${bo3Won ? "#c8ff0044" : "#ff2d2d44"}`,
            }}
          >
            FIGHT AGAIN
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  /* ── Battle screen ──────────────────────────────────────────────────────── */
  const playerLow = playerHP < playerMaxHP * 0.2;
  const enemyLow = enemyHP < (enemy?.hp ?? 100) * 0.2;
  const bossPhase = enemy?.isBoss ? getBossPhase(enemyHP) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Environment banner ────────────────────────────────────────────── */}
      {environment && (
        <div
          style={{
            background: environment.bgAccent,
            border: "1px solid #333",
            borderRadius: 10,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: "#ccc",
          }}
        >
          <span style={{ fontSize: 16 }}>{environment.emoji}</span>
          <strong style={{ color: "#fff" }}>{environment.name}</strong>
          <span style={{ color: "#888" }}>— {environment.description}</span>
          {gameMode === "best_of_3" && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
              {roundWins.map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: w === true ? "#c8ff00" : w === false ? "#ff2d2d" : "#333",
                    border: `1px solid ${w === true ? "#c8ff00" : w === false ? "#ff2d2d" : "#555"}`,
                    fontSize: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    fontWeight: 900,
                  }}
                >
                  {w === true ? "W" : w === false ? "L" : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Boss phase indicator ───────────────────────────────────────────── */}
      {enemy?.isBoss && bossPhase && (
        <motion.div
          key={bossPhase}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: bossPhase === 1 ? "#0a1a00" : bossPhase === 2 ? "#1a0800" : "#1a0000",
            border: `2px solid ${bossPhase === 1 ? "#c8ff00" : bossPhase === 2 ? "#ff9800" : "#ff2d2d"}`,
            borderRadius: 10,
            padding: "6px 12px",
            textAlign: "center",
            fontSize: 11,
            fontWeight: 800,
            color: bossPhase === 1 ? "#c8ff00" : bossPhase === 2 ? "#ff9800" : "#ff2d2d",
            letterSpacing: 2,
          }}
        >
          {bossPhase === 1 && "⚔️ BOSS PHASE 1 — Normal Combat"}
          {bossPhase === 2 && "🔥 BOSS PHASE 2 — All Attacks BURN!"}
          {bossPhase === 3 && "😤 BOSS PHASE 3 — FRANTIC MODE! Attacks TWICE per turn!"}
        </motion.div>
      )}

      {/* ── Epic Arena ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: environment ? environment.bgAccent : "#050010",
          border: `2px solid ${combo >= 5 ? "#ff2d8d" : combo >= 3 ? "#ffde00" : "#ff6b3544"}`,
          borderRadius: 20,
          padding: "12px 12px 8px",
          position: "relative",
          overflow: "hidden",
          boxShadow: combo >= 3 ? `0 0 30px ${combo >= 5 ? "#ff2d8d44" : "#ffde0044"} inset` : "none",
        }}
      >
        {/* Animated energy rings */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ scale: [0.4, 1.6], opacity: [0.4, 0] }}
              transition={{ duration: 2.5 + i * 0.8, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                width: 120, height: 120,
                borderRadius: "50%",
                border: `1.5px solid ${environment?.bgAccent ? "#ff9800" : "#ff6b35"}`,
                opacity: 0,
              }}
            />
          ))}
          {/* Ambient glow orbs */}
          {[
            { left: "15%", top: "30%", color: "#ff2d8d" },
            { left: "75%", top: "55%", color: "#ff6b35" },
            { left: "50%", top: "20%", color: "#8b5cf6" },
          ].map((orb, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.1, 0.35, 0.1], scale: [1, 1.3, 1] }}
              transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 40, height: 40,
                borderRadius: "50%",
                background: orb.color,
                filter: "blur(14px)",
                left: orb.left, top: orb.top,
                transform: "translate(-50%,-50%)",
              }}
            />
          ))}
        </div>
        {/* Arena floor */}
        <div
          style={{
            background: "radial-gradient(ellipse at 50% 100%, #1a0a0022 0%, transparent 70%), repeating-linear-gradient(45deg, #0a0508 0px, #0a0508 20px, #100510 20px, #100510 40px)",
            border: `1.5px solid ${combo >= 3 ? "#ffde0044" : "#ff6b3533"}`,
            boxShadow: "0 0 30px #ff6b3511 inset",
            borderRadius: 10,
            height: 70,
            position: "relative",
            marginBottom: 8,
            overflow: "hidden",
          }}
        >
          {[
            { left: "20%", top: "40%" },
            { left: "50%", top: "60%" },
            { left: "75%", top: "35%" },
          ].map((pos, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.15, 0.45, 0.15] }}
              transition={{ duration: 2 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#ff6b35",
                filter: "blur(10px)",
                ...pos,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        {/* Fighters row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 8,
            position: "relative",
            minHeight: 120,
            padding: "0 6px",
          }}
        >
          {/* Damage numbers */}
          {dmgNums.map((d) => (
            <DmgNum key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} />
          ))}
          {healNums.map((h) => (
            <HealNum key={h.id} value={h.value} x={h.x} y={h.y} />
          ))}

          {/* Projectiles */}
          <AnimatePresence>
            {projectiles.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  x: p.fromPlayer ? 20 : 220,
                  y: p.fromPlayer ? -10 : -30,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: p.fromPlayer ? 220 : 20,
                  y: p.fromPlayer ? -40 : -10,
                  opacity: 0,
                  scale: 1.6,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  fontSize: "1.6rem",
                  pointerEvents: "none",
                  zIndex: 15,
                  bottom: 30,
                  left: 0,
                }}
              >
                {p.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Player fighter */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: 1, textAlign: "center" }}>
              {pet.name}
            </div>
            <div style={{ width: "100%" }}>
              <SegmentedHPBar current={playerHP} max={playerMaxHP} color="#c8ff00" />
              <div style={{ color: "#c8ff00", fontSize: 10, fontWeight: 700, textAlign: "center", marginTop: 2 }}>
                {playerHP}/{playerMaxHP}
              </div>
            </div>
            {/* Status badges */}
            <StatusBadges effects={playerEffects} />
            {/* Avatar */}
            <motion.div
              animate={
                shakePlayer
                  ? { x: [-10, 10, -6, 6, 0] }
                  : turnPhase === "player"
                  ? { y: [0, -6, 0] }
                  : {}
              }
              transition={
                shakePlayer
                  ? { duration: 0.35 }
                  : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #1a1000, #0a0500)",
                border: `3px solid ${turnPhase === "player" ? "#c8ff00" : playerLow ? "#ff2d2d" : "#333"}`,
                boxShadow: turnPhase === "player"
                    ? "0 0 28px #c8ff0099, 0 0 8px #c8ff00, inset 0 0 12px #c8ff0022"
                    : playerLow
                    ? "0 0 20px #ff2d2d99, 0 0 6px #ff2d2d"
                    : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.4rem",
                filter: playerLow ? "grayscale(0.3) brightness(0.75) drop-shadow(0 0 4px #ff2d2d)" : "drop-shadow(0 0 4px #c8ff0044)",
                position: "relative",
              }}
            >
              {/* Turn-active pulse ring */}
              {turnPhase === "player" && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid #c8ff00", pointerEvents: "none" }}
                />
              )}
              {petAvatarEmoji}
            </motion.div>
            <AnimatePresence>
              {playerBuff && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    background: "#c8ff0033",
                    border: "1px solid #c8ff00",
                    borderRadius: 6,
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#c8ff00",
                  }}
                >
                  {playerBuff}
                </motion.div>
              )}
            </AnimatePresence>
            {combo >= 2 && (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{
                  background: "#ff6b3533",
                  border: "1px solid #ff6b35",
                  borderRadius: 6,
                  padding: "2px 7px",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#ff6b35",
                  letterSpacing: 0.5,
                }}
              >
                🔥 ×{combo}
              </motion.div>
            )}
          </div>

          {/* VS divider */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingBottom: 24,
              minWidth: 44,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.18, 1], opacity: [0.9, 1, 0.9], textShadow: ["0 0 8px #ff6b35", "0 0 20px #ff6b35", "0 0 8px #ff6b35"] as unknown as string }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                color: "#ff6b35",
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: 3,
                textShadow: "0 0 12px #ff6b35",
                background: "#ff6b3522",
                border: "1.5px solid #ff6b3566",
                borderRadius: 8,
                padding: "4px 8px",
              }}
            >
              VS
            </motion.div>
            {combo >= 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  color: "#ffde00",
                  fontSize: 10,
                  fontWeight: 900,
                  textShadow: "0 0 8px #ffde00",
                  textAlign: "center",
                  letterSpacing: 0.5,
                }}
              >
                🔥×{combo}
              </motion.div>
            )}
            <div
              style={{
                width: 1.5,
                height: 20,
                background: "linear-gradient(to bottom, #ff6b3588, transparent)",
              }}
            />
          </div>

          {/* Enemy fighter */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: enemy?.isBoss ? "#ff2d2d" : "#aaa", letterSpacing: 1, textAlign: "center" }}>
              {enemy?.isBoss ? `👑 ${enemy.name}` : `${enemy?.name}'s pet`}
            </div>
            {/* HP bar — boss gets special bar */}
            <div style={{ width: "100%" }}>
              {enemy?.isBoss ? (
                <BossHPBar current={enemyHP} max={enemy.hp} />
              ) : (
                <>
                  <SegmentedHPBar current={enemyHP} max={enemy?.hp ?? 100} color="#ff6b35" />
                  <div style={{ color: "#ff6b35", fontSize: 10, fontWeight: 700, textAlign: "center", marginTop: 2 }}>
                    {enemyHP}/{enemy?.hp}
                  </div>
                </>
              )}
            </div>
            {/* Status badges */}
            <StatusBadges effects={enemyEffects} />
            {/* Avatar */}
            <motion.div
              animate={
                shakeEnemy
                  ? { x: [8, -8, 5, -5, 0] }
                  : turnPhase === "enemy"
                  ? { y: [0, -4, 0] }
                  : {}
              }
              transition={
                shakeEnemy
                  ? { duration: 0.35 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
              style={{
                width: enemy?.isBoss ? 100 : 88,
                height: enemy?.isBoss ? 100 : 88,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #1a0800, #080400)",
                border: `3px solid ${
                  enemy?.isBoss
                    ? "#ff2d2d"
                    : turnPhase === "enemy" || turnPhase === "animating"
                    ? "#ff6b35"
                    : "#333"
                }`,
                boxShadow:
                  enemy?.isBoss
                    ? "0 0 30px #ff2d2d99, 0 0 10px #ff2d2d, inset 0 0 10px #ff2d2d22"
                    : turnPhase === "enemy" || turnPhase === "animating"
                    ? "0 0 26px #ff6b3599, 0 0 8px #ff6b35"
                    : enemyLow
                    ? "0 0 18px #ff2d2d99"
                    : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: enemy?.isBoss ? "3rem" : "2.7rem",
                filter: enemyLow
                  ? "grayscale(0.3) brightness(0.7) drop-shadow(0 0 4px #ff2d2d)"
                  : "drop-shadow(0 0 4px #ff6b3544)",
                position: "relative",
              }}
            >
              {/* Enemy turn pulse ring */}
              {(turnPhase === "enemy" || turnPhase === "animating") && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid #ff6b35", pointerEvents: "none" }}
                />
              )}
              {enemy?.petEmoji}
            </motion.div>
            {enemy && !enemy.isBoss && (
              <div
                style={{
                  background: `${difficultyColor(enemy.level)}22`,
                  border: `1px solid ${difficultyColor(enemy.level)}55`,
                  borderRadius: 5,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 800,
                  color: difficultyColor(enemy.level),
                  letterSpacing: 0.5,
                }}
              >
                LVL {enemy.level}
              </div>
            )}
            {enemy?.isBoss && bossPhase && (
              <div
                style={{
                  background: "#ff2d2d22",
                  border: "1px solid #ff2d2d55",
                  borderRadius: 5,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#ff2d2d",
                  letterSpacing: 0.5,
                }}
              >
                PHASE {bossPhase}
              </div>
            )}
          </div>
        </div>

        {/* Battle log */}
        <div
          style={{
            background: "#050200",
            borderRadius: 8,
            padding: "8px 10px",
            minHeight: 44,
            border: "1px solid #1a0900",
            marginTop: 6,
          }}
        >
          <AnimatePresence mode="popLayout">
            {log.slice(0, 3).map((line, i) => (
              <motion.div
                key={line + i}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1 - i * 0.32, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  fontSize: 11,
                  color: i === 0 ? "#fff" : "#444",
                  fontWeight: i === 0 ? 600 : 400,
                  lineHeight: 1.45,
                }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Abilities ──────────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              color: turnPhase === "player" ? "#ff6b35" : "#444",
              textShadow: turnPhase === "player" ? "0 0 10px #ff6b3566" : "none",
              transition: "all 0.3s",
            }}
          >
            {turnPhase === "player" ? "CHOOSE AN ABILITY:" : "ENEMY IS ATTACKING…"}
          </div>
          {/* More button */}
          {turnPhase === "player" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAbilityPage((p) => (p + 1) % 2)}
              style={{
                background: "#1a0800",
                border: "1.5px solid #ff6b35",
                borderRadius: 8,
                color: "#ff6b35",
                fontSize: 9,
                fontWeight: 800,
                padding: "4px 10px",
                cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >
              {abilityPage === 0 ? "More... ›" : "‹ Back"}
            </motion.button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {visibleAbilities.map((a) => {
            const active = turnPhase === "player";
            const hasStatus = !!a.statusEffect;
            const statusMeta = hasStatus ? STATUS_META[a.statusEffect!] : null;
            return (
              <motion.button
                key={a.name}
                whileHover={active ? { scale: 1.03, y: -2 } : {}}
                whileTap={active ? { scale: 0.92 } : {}}
                onClick={() => handleAbilityClick(a)}
                disabled={!active}
                style={{
                  padding: "11px 6px 9px",
                  background: active
                    ? "linear-gradient(160deg, #1a0500, #2a0800)"
                    : "#111",
                  border: `2px solid ${active ? "#ff6b35" : "#222"}`,
                  borderRadius: 14,
                  cursor: active ? "pointer" : "not-allowed",
                  textAlign: "center",
                  transition: "border-color 0.2s, background 0.2s",
                  boxShadow: active ? "0 0 10px #ff6b3533" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "radial-gradient(ellipse at 50% 0%, #ff6b350a, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <div style={{ fontSize: "1.6rem" }}>{a.emoji}</div>
                <div
                  style={{
                    color: active ? "#fff" : "#444",
                    fontSize: 10,
                    fontWeight: 700,
                    marginTop: 3,
                    letterSpacing: 0.3,
                  }}
                >
                  {a.name}
                </div>
                <div style={{ color: active ? "#ff6b35" : "#333", fontSize: 10, marginTop: 1 }}>
                  {a.scalingDmg ? "15% enemy HP" : `${a.damage[0]}–${a.damage[1]} dmg`}
                </div>
                {a.effect && (
                  <div style={{ color: active ? "#c8ff00" : "#333", fontSize: 9, marginTop: 1 }}>
                    {a.effect}
                  </div>
                )}
                {hasStatus && statusMeta && (
                  <div
                    style={{
                      color: active ? statusMeta.color : "#333",
                      fontSize: 9,
                      marginTop: 1,
                      fontWeight: 700,
                    }}
                  >
                    {statusMeta.emoji} {a.statusEffect} ({a.statusTarget === "self" ? "self" : "foe"})
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Ability page dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {[0, 1].map((p) => (
            <div
              key={p}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: abilityPage === p ? "#ff6b35" : "#333",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Judgment Ring overlay */}
      <AnimatePresence>
        {showRing && pendingAbility && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>
              USING ABILITY
            </div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>
              {pendingAbility.emoji} {pendingAbility.name}
            </div>
            <JudgmentRing
              onResult={handleRingResult}
              hitZoneWidth={combo >= 3 ? 16 : 22}
              hasCombo={combo >= 3}
            />
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
              ⭐ Perfect zone = ×1.5 damage
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combo indicator */}
      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              textAlign: "center",
              color: "#ffde00",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              textShadow: "0 0 12px #ffde00",
            }}
          >
            🔥 COMBO ×{combo} — Keep it going!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Equipment reminder */}
      {equipment && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: "#c8ff0011",
            border: "1px solid #c8ff0033",
            borderRadius: 10,
            fontSize: 10,
            color: "#c8ff0099",
          }}
        >
          <span>{equipment.emoji}</span>
          <span style={{ fontWeight: 700 }}>{equipment.name}</span>
          <span>— {equipment.description}</span>
        </div>
      )}
    </div>
  );
}
