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

// ─── Constants ─────────────────────────────────────────────────────────────────
const GW = 390;
const GH = 448;
const LANE_COUNT = 4;
const LANE_Y: number[] = [32, 128, 224, 328];
const LANE_H = 84;
const SLOTS: number[] = [48, 100, 152, 204, 256];
const BASE_X = 346;
const SPAWN_X = -30;
const LS_BEST = "karma_defense_best_v1";

// ─── Hero types ────────────────────────────────────────────────────────────────
type HeroId = "pet" | "frost" | "thunder" | "shadow" | "monk";

interface HeroDef {
  id: HeroId; emoji: string; name: string; color: string;
  passiveDesc: string; activeDesc: string; cooldownSec: number;
}

const HERO_DEFS: Record<HeroId, HeroDef> = {
  pet:     { id:"pet",     emoji:"🐾", name:"Your Pet",    color:"#c8ff00", passiveDesc:"+25% dmg in lane",    activeDesc:"Karma Burst +150⚡",    cooldownSec:25 },
  frost:   { id:"frost",   emoji:"❄️", name:"Frost Queen", color:"#38bdf8", passiveDesc:"Frozen take +30% dmg", activeDesc:"Blizzard: freeze ALL",   cooldownSec:30 },
  thunder: { id:"thunder", emoji:"⚡", name:"Thunder God", color:"#fbbf24", passiveDesc:"Tesla hits +1 lane",   activeDesc:"Storm: 40 dmg ALL",      cooldownSec:22 },
  shadow:  { id:"shadow",  emoji:"🗡️", name:"Shadow",      color:"#a855f7", passiveDesc:"Enemies slow -20%",   activeDesc:"Assassinate: kill top HP", cooldownSec:20 },
  monk:    { id:"monk",    emoji:"🧘", name:"Monk",         color:"#ff9d00", passiveDesc:"Towers fire faster",  activeDesc:"Meditate +200⚡ +10❤️",   cooldownSec:35 },
};
const HERO_IDS = Object.keys(HERO_DEFS) as HeroId[];

// ─── Tower types ───────────────────────────────────────────────────────────────
type TowerType = "arrow"|"karma"|"freeze"|"lightning"|"cannon"|"poison"|"sniper"|"laser";

interface TowerDef {
  type: TowerType; emoji: string; name: string;
  cost: number; fireRate: number; damage: number; color: string; special: string;
}

const TOWER_DEFS: Record<TowerType, TowerDef> = {
  arrow:     { type:"arrow",     emoji:"🏹", name:"Archer",  cost:40,  fireRate:28,  damage:15,  color:"#a3e635", special:"none" },
  karma:     { type:"karma",     emoji:"🔮", name:"Karma",   cost:80,  fireRate:55,  damage:30,  color:"#a855f7", special:"splash" },
  freeze:    { type:"freeze",    emoji:"❄️", name:"Cryo",    cost:140, fireRate:90,  damage:10,  color:"#38bdf8", special:"freeze" },
  lightning: { type:"lightning", emoji:"⚡", name:"Tesla",   cost:230, fireRate:75,  damage:50,  color:"#fbbf24", special:"chain" },
  cannon:    { type:"cannon",    emoji:"💣", name:"Cannon",  cost:200, fireRate:120, damage:100, color:"#f97316", special:"heavy" },
  poison:    { type:"poison",    emoji:"☠️", name:"Toxin",   cost:160, fireRate:70,  damage:8,   color:"#84cc16", special:"dot" },
  sniper:    { type:"sniper",    emoji:"🎯", name:"Sniper",  cost:280, fireRate:150, damage:200, color:"#e2e8f0", special:"pierce" },
  laser:     { type:"laser",     emoji:"🔴", name:"Laser",   cost:350, fireRate:8,   damage:6,   color:"#ef4444", special:"beam" },
};
const TOWER_TYPES = Object.keys(TOWER_DEFS) as TowerType[];

// ─── Enemy types ───────────────────────────────────────────────────────────────
type EnemyType = "grunt"|"runner"|"tank"|"ghost"|"healer"|"exploder"|"shielder"|"boss"|"mega_boss"|"swarm";

interface EnemyDef {
  type: EnemyType; emoji: string; maxHp: number; speed: number;
  reward: number; armor: number; color: string; shieldAmt: number;
}

const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  grunt:     { type:"grunt",     emoji:"👾", maxHp:90,   speed:1.0, reward:8,   armor:0,  color:"#f87171", shieldAmt:0 },
  runner:    { type:"runner",    emoji:"💨", maxHp:45,   speed:3.0, reward:6,   armor:0,  color:"#fb923c", shieldAmt:0 },
  tank:      { type:"tank",      emoji:"🔷", maxHp:350,  speed:0.45,reward:30,  armor:15, color:"#60a5fa", shieldAmt:0 },
  ghost:     { type:"ghost",     emoji:"👻", maxHp:65,   speed:2.0, reward:15,  armor:0,  color:"#c4b5fd", shieldAmt:0 },
  healer:    { type:"healer",    emoji:"💚", maxHp:130,  speed:0.8, reward:18,  armor:0,  color:"#4ade80", shieldAmt:0 },
  exploder:  { type:"exploder",  emoji:"💥", maxHp:100,  speed:1.2, reward:12,  armor:0,  color:"#fb923c", shieldAmt:0 },
  shielder:  { type:"shielder",  emoji:"🛡",  maxHp:200,  speed:0.7, reward:22,  armor:0,  color:"#6366f1", shieldAmt:80 },
  boss:      { type:"boss",      emoji:"🔥", maxHp:900,  speed:0.5, reward:90,  armor:20, color:"#f43f5e", shieldAmt:0 },
  mega_boss: { type:"mega_boss", emoji:"💀", maxHp:3000, speed:0.3, reward:300, armor:40, color:"#dc2626", shieldAmt:0 },
  swarm:     { type:"swarm",     emoji:"🐝", maxHp:18,   speed:2.5, reward:3,   armor:0,  color:"#fbbf24", shieldAmt:0 },
};

// ─── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  { name:"Dark Forest",  bg1:"#020810", bg2:"#041220", lane:"rgba(34,197,94,0.07)",  acc:"#22c55e" },
  { name:"Volcano",      bg1:"#150200", bg2:"#200800", lane:"rgba(239,68,68,0.08)",  acc:"#ef4444" },
  { name:"Ice Realm",    bg1:"#020d18", bg2:"#041828", lane:"rgba(56,189,248,0.08)", acc:"#38bdf8" },
  { name:"Void Space",   bg1:"#05020f", bg2:"#0a0320", lane:"rgba(168,85,247,0.08)", acc:"#a855f7" },
  { name:"Karma Heaven", bg1:"#151000", bg2:"#1a1500", lane:"rgba(200,255,0,0.07)",  acc:"#c8ff00" },
];

// ─── Talent tree ───────────────────────────────────────────────────────────────
type TalentBranch = "attack"|"economy"|"defense";
type TalentId =
  "sharp_edge"|"rapid_fire"|"death_ray"|
  "tax_collector"|"gold_rush"|"karma_overflow"|
  "reinforce"|"iron_wall"|"time_warp"|
  "transcendence";

interface TalentDef {
  id: TalentId; branch: TalentBranch|"apex"; tier: 1|2|3|4;
  name: string; desc: string; emoji: string;
  requires: TalentId|null;
}

const TALENT_DEFS: TalentDef[] = [
  // ── ATTACK ──
  { id:"sharp_edge",     branch:"attack",  tier:1, name:"Sharp Edge",      desc:"+20% tower damage",              emoji:"🗡️",  requires:null },
  { id:"rapid_fire",     branch:"attack",  tier:2, name:"Rapid Fire",       desc:"-20% tower fire delay",          emoji:"⚡",  requires:"sharp_edge" },
  { id:"death_ray",      branch:"attack",  tier:3, name:"Death Ray",        desc:"All towers pierce 2 targets",    emoji:"🔴",  requires:"rapid_fire" },
  // ── ECONOMY ──
  { id:"tax_collector",  branch:"economy", tier:1, name:"Tax Collector",    desc:"+30% gold from kills",           emoji:"💰",  requires:null },
  { id:"gold_rush",      branch:"economy", tier:2, name:"Gold Rush",        desc:"+50 bonus gold each wave",       emoji:"🤑",  requires:"tax_collector" },
  { id:"karma_overflow", branch:"economy", tier:3, name:"Karma Overflow",   desc:"Wave bonus ×3",                  emoji:"🔮",  requires:"gold_rush" },
  // ── DEFENSE ──
  { id:"reinforce",      branch:"defense", tier:1, name:"Reinforce",        desc:"+40 max base HP",                emoji:"🛡️",  requires:null },
  { id:"iron_wall",      branch:"defense", tier:2, name:"Iron Wall",        desc:"Enemies deal -30% HP dmg",       emoji:"🏰",  requires:"reinforce" },
  { id:"time_warp",      branch:"defense", tier:3, name:"Time Warp",        desc:"Wave start: all enemies frozen 3s",emoji:"⏳", requires:"iron_wall" },
  // ── APEX ──
  { id:"transcendence",  branch:"apex",    tier:4, name:"Pet Transcendence",desc:"All bonuses ×1.3 · hero CD ÷2", emoji:"✨",  requires:null },
];

const TALENT_MAP: Record<TalentId, TalentDef> = Object.fromEntries(TALENT_DEFS.map(t => [t.id, t])) as Record<TalentId, TalentDef>;

// ─── Game state interfaces ─────────────────────────────────────────────────────
interface Tower {
  id: string; type: TowerType;
  lane: number; slot: number;
  level: number; cooldown: number; damage: number; fireRate: number;
}

interface Enemy {
  id: string; type: EnemyType;
  lane: number; x: number;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  frozen: number; poisoned: number; poisonDmg: number;
  ghostPhased: boolean; healTimer: number; hitFlash: number;
}

interface Proj {
  id: string; x1: number; y1: number; x2: number; y2: number;
  color: string; life: number;
}

interface Particle {
  id: string; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

type Phase = "idle"|"wave"|"between"|"gameover";

interface GS {
  phase: Phase; wave: number;
  baseHp: number; baseShield: number;
  localKarma: number; earnedKarma: number;
  towers: Tower[];
  heroLane: Record<number, HeroId | undefined>;
  heroCd: Record<string, number>;
  enemies: Enemy[]; projectiles: Proj[]; particles: Particle[];
  betweenTimer: number;
  spawnQueue: { type: EnemyType; lane: number; delay: number }[];
  spawnTimer: number; frame: number;
  killStreak: number; killStreakTimer: number;
  comboMult: number; comboFlash: number; comboLabel: string;
  screenShake: number; waveBonus: number; bestWave: number;
  talentPts: number; talents: Set<TalentId>;
}

// ─── Talent helpers ────────────────────────────────────────────────────────────
function hasTalent(s: GS, id: TalentId) { return s.talents.has(id); }
function talentDmgMult(s: GS) {
  let m = 1;
  if (hasTalent(s, "sharp_edge"))   m *= 1.20;
  if (hasTalent(s, "transcendence")) m *= 1.30;
  return m;
}
function talentFireMult(s: GS) {
  let m = 1;
  if (hasTalent(s, "rapid_fire"))   m *= 0.80;
  if (hasTalent(s, "transcendence")) m *= 0.80;
  return m;
}
function talentGoldMult(s: GS) {
  let m = 1;
  if (hasTalent(s, "tax_collector")) m *= 1.30;
  if (hasTalent(s, "transcendence")) m *= 1.30;
  return m;
}
function talentWaveBonusMult(s: GS) {
  let m = 1;
  if (hasTalent(s, "karma_overflow")) m *= 3;
  if (hasTalent(s, "transcendence"))  m *= 1.30;
  return m;
}
function talentBaseHpBonus(s: GS) {
  let b = 0;
  if (hasTalent(s, "reinforce")) b += 40;
  return b;
}
function talentDmgReduction(s: GS) {
  let r = 1;
  if (hasTalent(s, "iron_wall")) r *= 0.70;
  return r;
}

// ─── Module-level helpers ──────────────────────────────────────────────────────
let _uid = 0;
const mkId = () => `${Date.now()}_${_uid++}`;
const laneCenter = (l: number) => LANE_Y[l] + LANE_H / 2;
const slotXY = (lane: number, slot: number) => ({ x: SLOTS[slot], y: laneCenter(lane) });
const getTheme = (wave: number) => THEMES[Math.floor(wave / 10) % THEMES.length];

function spawnBurst(s: GS, x: number, y: number, color: string, n = 7, spd = 3.5) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
    const v = spd * (0.6 + Math.random() * 0.8);
    const ml = 30 + Math.random() * 30;
    s.particles.push({ id: mkId(), x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: ml, maxLife: ml, color, size: 2 + Math.random() * 3 });
  }
}

function doKillEnemy(s: GS, enemy: Enemy) {
  const def = ENEMY_DEFS[enemy.type];
  s.killStreak++;
  s.killStreakTimer = 130;
  const prev = s.comboMult;
  s.comboMult = s.killStreak >= 20 ? 3 : s.killStreak >= 10 ? 2 : s.killStreak >= 5 ? 1.5 : 1;
  if (s.comboMult !== prev) { s.comboFlash = 90; s.comboLabel = `x${s.comboMult} COMBO!`; }
  const earned = Math.floor(def.reward * s.comboMult * talentGoldMult(s));
  s.localKarma += earned; s.earnedKarma += earned; s.waveBonus += earned;
  if (enemy.type === "exploder") {
    spawnBurst(s, enemy.x, laneCenter(enemy.lane), "#fb923c", 14, 6);
    s.baseHp = Math.max(0, s.baseHp - 5);
    s.screenShake = 8;
  } else {
    spawnBurst(s, enemy.x, laneCenter(enemy.lane), def.color, 7, 3.5);
  }
  s.enemies = s.enemies.filter(e => e.id !== enemy.id);
  if (s.baseHp <= 0) s.phase = "gameover";
}

function applyDmgToEnemy(s: GS, tower: Tower, enemy: Enemy, rawDmg: number, towerDef: TowerDef, pos: {x:number;y:number}): boolean {
  const frostLane = s.heroLane[enemy.lane] === "frost";
  const frostBonus = frostLane && enemy.frozen > 0 ? 1.3 : 1;
  const petBonus = s.heroLane[tower.lane] === "pet" ? 1.25 : 1;
  const enemyDef = ENEMY_DEFS[enemy.type];
  let dmg = Math.max(1, Math.floor(rawDmg * petBonus * frostBonus * talentDmgMult(s)) - enemyDef.armor);
  if (enemy.type === "ghost" && !enemy.ghostPhased) { enemy.ghostPhased = true; return false; }
  if (enemy.shield > 0) { enemy.shield = Math.max(0, enemy.shield - dmg); }
  else { enemy.hp -= dmg; }
  enemy.hitFlash = 5;
  s.projectiles.push({ id: mkId(), x1: pos.x, y1: pos.y, x2: enemy.x, y2: laneCenter(enemy.lane), color: towerDef.color, life: 10 });
  if (enemy.hp <= 0) { doKillEnemy(s, enemy); return true; }
  return false;
}

function buildWaveQueue(wave: number, s?: GS): GS["spawnQueue"] {
  const q: GS["spawnQueue"] = [];
  const perLane = Math.min(3 + Math.floor(wave * 1.2), 24);
  const isMega = wave % 10 === 0 && wave > 0;
  const isBoss = !isMega && wave % 5 === 0 && wave > 0;
  const pool: EnemyType[] = ["grunt"];
  if (wave >= 2) pool.push("runner");
  if (wave >= 3) pool.push("swarm");
  if (wave >= 4) pool.push("ghost");
  if (wave >= 5) pool.push("healer");
  if (wave >= 6) pool.push("tank");
  if (wave >= 7) pool.push("exploder");
  if (wave >= 8) pool.push("shielder");
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    let d = lane * 15;
    if (isMega) { q.push({ type:"mega_boss", lane, delay:d }); d += 200; }
    else if (isBoss) { q.push({ type:"boss", lane, delay:d }); d += 140; }
    for (let i = 0; i < perLane; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      if (t === "swarm") {
        for (let k = 0; k < 6; k++) q.push({ type:"swarm", lane, delay: d + k * 10 });
        d += 80;
      } else {
        q.push({ type: t, lane, delay: d });
        d += Math.max(20, 65 - wave * 3);
      }
    }
  }
  return q;
}

function scaleEnemyHp(baseHp: number, wave: number) {
  return Math.floor(baseHp * Math.pow(1.12, wave - 1));
}

function mkGS(): GS {
  const best = typeof window !== "undefined" ? parseInt(localStorage.getItem(LS_BEST) ?? "0", 10) : 0;
  return {
    phase:"idle", wave:0, baseHp:100, baseShield:0,
    localKarma:300, earnedKarma:0,
    towers:[], heroLane:{}, heroCd:{},
    enemies:[], projectiles:[], particles:[],
    betweenTimer:0, spawnQueue:[], spawnTimer:0, frame:0,
    killStreak:0, killStreakTimer:0, comboMult:1, comboFlash:0, comboLabel:"",
    screenShake:0, waveBonus:0, bestWave:best,
    talentPts:0, talents: new Set<TalentId>(),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PetBattle({ pet, petEmoji: petEmojiProp, onEnd, onWin }: PetBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sRef = useRef<GS>(mkGS());
  const rafRef = useRef<number>(0);
  const speedRef = useRef<1|2>(1);
  const selSlotRef = useRef<{lane:number;slot:number}|null>(null);
  const selTowerRef = useRef<Tower|null>(null);

  const [uiPhase, setUiPhase] = useState<Phase>("idle");
  const [uiWave, setUiWave] = useState(0);
  const [uiKarma, setUiKarma] = useState(300);
  const [uiBaseHp, setUiBaseHp] = useState(100);
  const [uiBetween, setUiBetween] = useState(0);
  const [gameSpeed, setGameSpeed] = useState<1|2>(1);
  const [selSlot, setSelSlot] = useState<{lane:number;slot:number}|null>(null);
  const [selTower, setSelTower] = useState<Tower|null>(null);
  const [selHero, setSelHero] = useState<HeroId|null>(null);
  const [heroLaneUI, setHeroLaneUI] = useState<Record<number, HeroId|undefined>>({});
  const [heroCdUI, setHeroCdUI] = useState<Record<string,number>>({});
  const [bestWave, setBestWave] = useState(() => typeof window !== "undefined" ? parseInt(localStorage.getItem(LS_BEST)??"0",10) : 0);
  const [, setTick] = useState(0);
  const [showTalents, setShowTalents] = useState(false);
  const [uiTalentPts, setUiTalentPts] = useState(0);
  const [uiTalents, setUiTalents] = useState<Set<TalentId>>(new Set());

  const petEmoji = petEmojiProp ?? (pet ? "🐾" : "🐾");

  // ─── TICK ──────────────────────────────────────────────────────────────────
  const doTick = useCallback(() => {
    const s = sRef.current;
    s.frame++;

    // Hero cooldowns
    for (const key of Object.keys(s.heroCd)) {
      if (s.heroCd[key] > 0) s.heroCd[key]--;
    }
    // Kill streak timer
    if (s.killStreakTimer > 0) { s.killStreakTimer--; if (s.killStreakTimer === 0) { s.killStreak = 0; s.comboMult = 1; } }
    if (s.comboFlash > 0) s.comboFlash--;
    if (s.screenShake > 0) s.screenShake--;

    // Particles
    for (const p of s.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; }
    s.particles = s.particles.filter(p => p.life > 0);

    if (s.phase === "wave") {
      // Time warp decay
      const gs = s as GS & { _warpFrames?: number };
      if (gs._warpFrames && gs._warpFrames > 0) gs._warpFrames--;
      // Spawn
      s.spawnTimer++;
      const ready = s.spawnQueue.filter(e => e.delay <= s.spawnTimer);
      s.spawnQueue = s.spawnQueue.filter(e => e.delay > s.spawnTimer);
      for (const sp of ready) {
        const def = ENEMY_DEFS[sp.type];
        const slowed = s.heroLane[sp.lane] === "shadow";
        const scaledHp = scaleEnemyHp(def.maxHp, s.wave);
        const warpFrz = (s as GS & { _warpFrames?: number })._warpFrames ?? 0;
        s.enemies.push({
          id: mkId(), type: sp.type, lane: sp.lane,
          x: SPAWN_X - Math.random() * 20,
          hp: scaledHp, maxHp: scaledHp,
          shield: def.shieldAmt, maxShield: def.shieldAmt,
          frozen: warpFrz, poisoned: 0, poisonDmg: 0,
          ghostPhased: false, healTimer: 0, hitFlash: 0,
        });
        if (slowed) {
          const e = s.enemies[s.enemies.length - 1];
          // shadow passive applied by reducing effective speed at move time
          e.poisonDmg = -1; // abuse field as "slowed flag" — we check in move
        }
      }

      // Move & update
      const reachedBase: string[] = [];
      for (const enemy of s.enemies) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - 1);
        // Poison
        if (enemy.poisoned > 0) {
          enemy.poisoned--;
          if (enemy.poisoned % 30 === 0 && enemy.poisoned > 0) {
            const pdmg = Math.max(1, enemy.poisonDmg);
            if (enemy.shield > 0) enemy.shield = Math.max(0, enemy.shield - pdmg);
            else { enemy.hp -= pdmg; enemy.hitFlash = 4; }
            if (enemy.hp <= 0) { doKillEnemy(s, enemy); continue; }
          }
        }
        // Healer aura
        if (enemy.type === "healer") {
          enemy.healTimer++;
          if (enemy.healTimer >= 60) {
            enemy.healTimer = 0;
            for (const o of s.enemies) {
              if (o.id !== enemy.id && o.lane === enemy.lane && Math.abs(o.x - enemy.x) < 65 && o.hp < o.maxHp)
                o.hp = Math.min(o.maxHp, o.hp + 8);
            }
          }
        }
        // Move
        if (enemy.frozen > 0) { enemy.frozen--; continue; }
        const def = ENEMY_DEFS[enemy.type];
        const slowMult = (s.heroLane[enemy.lane] === "shadow") ? 0.8 : 1;
        enemy.x += def.speed * slowMult;
        if (enemy.x >= BASE_X) {
          const rawDmgBase = Math.max(1, Math.round(def.maxHp / 12));
          const dmg = Math.max(1, Math.round(rawDmgBase * talentDmgReduction(s)));
          const sh = Math.min(s.baseShield, dmg);
          s.baseShield -= sh;
          s.baseHp = Math.max(0, s.baseHp - (dmg - sh));
          s.screenShake = 10;
          spawnBurst(s, BASE_X, laneCenter(enemy.lane), "#f87171", 5, 2.5);
          reachedBase.push(enemy.id);
          if (s.baseHp <= 0) { s.phase = "gameover"; break; }
        }
      }
      s.enemies = s.enemies.filter(e => !reachedBase.includes(e.id));

      if (s.phase !== "gameover") {
        // Tower fire
        for (const tower of s.towers) {
          const hasMonk = s.heroLane[tower.lane] === "monk";
          tower.cooldown -= hasMonk ? 2 : 1;
          if (tower.cooldown > 0) continue;
          const def = TOWER_DEFS[tower.type];
          const pos = slotXY(tower.lane, tower.slot);
          const laneEn = s.enemies.filter(e => e.lane === tower.lane && e.x > pos.x - 20).sort((a,b) => b.x - a.x);
          if (laneEn.length === 0) continue;
          tower.cooldown = Math.max(4, Math.floor(tower.fireRate * talentFireMult(s)));

          if (tower.type === "lightning") {
            for (const e of [...laneEn]) applyDmgToEnemy(s, tower, e, tower.damage, def, pos);
            // Thunder hero: also hit adjacent lane
            if (s.heroLane[tower.lane] === "thunder") {
              const adj = tower.lane < LANE_COUNT - 1 ? tower.lane + 1 : tower.lane - 1;
              const adjEn = s.enemies.filter(e => e.lane === adj && e.x > 0).sort((a,b) => b.x - a.x).slice(0, 3);
              for (const e of adjEn) applyDmgToEnemy(s, tower, e, Math.floor(tower.damage * 0.45), def, pos);
            }
          } else if (tower.type === "freeze") {
            const t = laneEn[0];
            if (t) { applyDmgToEnemy(s, tower, t, tower.damage, def, pos); if (s.enemies.find(e => e.id === t.id)) t.frozen = 180; }
          } else if (tower.type === "cannon") {
            const t = laneEn[0];
            if (t) { for (const e of laneEn.filter(e => Math.abs(e.x - t.x) < 55)) applyDmgToEnemy(s, tower, e, tower.damage, def, pos); }
          } else if (tower.type === "poison") {
            const t = laneEn[0];
            if (t) { applyDmgToEnemy(s, tower, t, tower.damage, def, pos); if (s.enemies.find(e=>e.id===t.id)) { t.poisoned = 240; t.poisonDmg = 8; } }
          } else if (tower.type === "sniper") {
            const t = [...s.enemies].filter(e => e.lane === tower.lane).sort((a,b) => b.hp - a.hp)[0];
            if (t) applyDmgToEnemy(s, tower, t, tower.damage, def, pos);
          } else if (tower.type === "karma") {
            for (let i = 0; i < Math.min(3, laneEn.length); i++)
              applyDmgToEnemy(s, tower, laneEn[i], Math.floor(tower.damage * (i === 0 ? 1 : 0.55)), def, pos);
          } else {
            applyDmgToEnemy(s, tower, laneEn[0], tower.damage, def, pos);
            if (hasTalent(s, "death_ray") && laneEn[1]) {
              applyDmgToEnemy(s, tower, laneEn[1], Math.floor(tower.damage * 0.6), def, pos);
            }
          }
        }
        s.projectiles = s.projectiles.map(p => ({...p, life: p.life - 1})).filter(p => p.life > 0);

        // Wave cleared?
        if (s.enemies.length === 0 && s.spawnQueue.length === 0) {
          const goldRushBonus = hasTalent(s, "gold_rush") ? 50 : 0;
          const baseBonus = 20 + s.wave * 5 + goldRushBonus;
          const bonus = Math.floor(baseBonus * talentWaveBonusMult(s));
          s.localKarma += bonus; s.earnedKarma += bonus; s.waveBonus += bonus;
          s.talentPts++;
          s.phase = "between"; s.betweenTimer = 600;
          const cols = ["#c8ff00","#ff2d8d","#00e5ff","#fbbf24","#a855f7"];
          for (let i = 0; i < 5; i++) spawnBurst(s, GW * 0.2 * (i+1), GH * 0.4, cols[i], 8, 4.5);
        }
      } else {
        if (s.wave > s.bestWave) { s.bestWave = s.wave; if (typeof window !== "undefined") localStorage.setItem(LS_BEST, String(s.wave)); }
      }
    } else if (s.phase === "between") {
      s.betweenTimer--;
      s.projectiles = s.projectiles.map(p => ({...p, life: p.life-1})).filter(p => p.life > 0);
    }

    // Sync UI
    setUiPhase(s.phase); setUiWave(s.wave); setUiKarma(s.localKarma);
    setUiBaseHp(s.baseHp); setUiBetween(s.betweenTimer);
    setHeroLaneUI({...s.heroLane}); setHeroCdUI({...s.heroCd});
    setBestWave(s.bestWave);
    setUiTalentPts(s.talentPts);
    setUiTalents(new Set(s.talents));
    setTick(t => t + 1);
  }, []);

  // ─── DRAW ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = sRef.current;
    const theme = getTheme(s.wave);
    const f = s.frame;

    ctx.clearRect(0, 0, GW, GH);

    // Screen shake
    const shaking = s.screenShake > 0;
    if (shaking) { ctx.save(); ctx.translate(Math.sin(f*3)*s.screenShake*0.5, Math.cos(f*2.2)*s.screenShake*0.3); }

    // ── BG gradient ────────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0,0,0,GH);
    bg.addColorStop(0, theme.bg1); bg.addColorStop(0.6, theme.bg2); bg.addColorStop(1, theme.bg1);
    ctx.fillStyle = bg; ctx.fillRect(0,0,GW,GH);

    // ── Animated stars ─────────────────────────────────────────────────────
    for (let i=0; i<40; i++) {
      const sx = (i*97+13)%GW, sy = (i*53+7)%(GH*0.55);
      const twinkle = 0.15+0.35*Math.abs(Math.sin(f*0.02+i*0.7));
      ctx.globalAlpha=twinkle; ctx.fillStyle=theme.acc;
      ctx.beginPath(); ctx.arc(sx,sy,0.8+0.6*(i%3),0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    // ── Lane gaps (between lanes) ──────────────────────────────────────────
    ctx.fillStyle="rgba(0,0,0,0.55)";
    for (let i=0; i<LANE_COUNT; i++) {
      if (i>0) ctx.fillRect(0, LANE_Y[i-1]+LANE_H, GW, LANE_Y[i]-(LANE_Y[i-1]+LANE_H));
    }
    ctx.fillRect(0, LANE_Y[LANE_COUNT-1]+LANE_H, GW, GH-(LANE_Y[LANE_COUNT-1]+LANE_H));

    // ── Lanes with rich floor ───────────────────────────────────────────────
    for (let i=0; i<LANE_COUNT; i++) {
      const ly = LANE_Y[i];
      // Lane fill with subtle gradient
      const lg = ctx.createLinearGradient(0,ly,0,ly+LANE_H);
      lg.addColorStop(0, theme.bg2+"cc"); lg.addColorStop(0.5, theme.lane); lg.addColorStop(1, theme.bg2+"cc");
      ctx.fillStyle = lg; ctx.fillRect(0,ly,GW,LANE_H);
      // Floor grid lines
      ctx.strokeStyle = theme.acc+"18"; ctx.lineWidth=1;
      for (let x=0; x<GW; x+=32) {
        ctx.beginPath(); ctx.moveTo(x,ly); ctx.lineTo(x,ly+LANE_H); ctx.stroke();
      }
      // Lane top/bottom border
      ctx.strokeStyle = theme.acc+"44"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(GW,ly); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,ly+LANE_H); ctx.lineTo(GW,ly+LANE_H); ctx.stroke();
      // Lane number badge
      ctx.fillStyle = theme.acc+"33"; ctx.fillRect(0,ly,18,LANE_H);
      ctx.fillStyle = theme.acc; ctx.font = "bold 8px monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`${i+1}`, 9, ly+LANE_H/2);
      // Spawn portal on left
      const pulse = 0.5+0.5*Math.sin(f*0.07+i);
      ctx.strokeStyle = theme.acc+"66"; ctx.lineWidth=2;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.arc(0, laneCenter(i), 14+pulse*4, -Math.PI/2, Math.PI/2);
      ctx.stroke(); ctx.setLineDash([]);
    }

    // ── Right-side base wall ────────────────────────────────────────────────
    const wallX = BASE_X - 2;
    const wallGrad = ctx.createLinearGradient(wallX,0,wallX+8,0);
    wallGrad.addColorStop(0, theme.acc+"66"); wallGrad.addColorStop(1, "transparent");
    ctx.fillStyle = wallGrad; ctx.fillRect(wallX, 0, 8, GH);

    // ── Empty slots ─────────────────────────────────────────────────────────
    for (let lane=0; lane<LANE_COUNT; lane++) {
      for (let slot=0; slot<5; slot++) {
        if (s.towers.some(t => t.lane===lane && t.slot===slot)) continue;
        const p = slotXY(lane, slot);
        const isSel = selSlotRef.current?.lane===lane && selSlotRef.current?.slot===slot;
        const pulse2 = 0.4+0.3*Math.sin(f*0.1+slot*0.8+lane*1.2);
        if (isSel) {
          ctx.fillStyle="rgba(251,191,36,0.2)"; ctx.fillRect(p.x-16,p.y-16,32,32);
          ctx.strokeStyle="#fbbf24"; ctx.lineWidth=2; ctx.setLineDash([]);
          ctx.strokeRect(p.x-16,p.y-16,32,32);
          ctx.fillStyle="#fbbf24"; ctx.font="bold 14px sans-serif";
          ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("+",p.x,p.y);
        } else {
          ctx.strokeStyle=`rgba(255,255,255,${0.1+pulse2*0.08})`; ctx.lineWidth=1;
          ctx.setLineDash([3,3]); ctx.strokeRect(p.x-12,p.y-12,24,24); ctx.setLineDash([]);
          ctx.fillStyle=`rgba(255,255,255,${pulse2*0.12})`; ctx.font="10px sans-serif";
          ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("+",p.x,p.y);
        }
      }
    }

    // ── Towers ──────────────────────────────────────────────────────────────
    for (const tower of s.towers) {
      const p = slotXY(tower.lane, tower.slot);
      const def = TOWER_DEFS[tower.type];
      const isSel = selTowerRef.current?.id === tower.id;
      const fs = tower.level===3 ? 26 : tower.level===2 ? 21 : 17;
      // Platform base
      const baseR = tower.level===3?20:tower.level===2?17:14;
      const platformGrad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,baseR);
      platformGrad.addColorStop(0, def.color+"44"); platformGrad.addColorStop(1, def.color+"08");
      ctx.fillStyle=platformGrad; ctx.beginPath(); ctx.arc(p.x,p.y,baseR,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=def.color+"66"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,baseR,0,Math.PI*2); ctx.stroke();
      // Range ring when selected
      if (isSel) {
        ctx.strokeStyle=def.color+"33"; ctx.lineWidth=1; ctx.setLineDash([4,6]);
        ctx.beginPath(); ctx.arc(p.x,laneCenter(tower.lane),70,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle="#fbbf24"; ctx.lineWidth=2;
        ctx.strokeRect(p.x-18,p.y-18,36,36);
      }
      // Tower emoji with glow
      ctx.shadowColor=def.color; ctx.shadowBlur=tower.level===3?28:tower.level===2?16:8;
      ctx.font=`${fs}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(def.emoji, p.x, p.y); ctx.shadowBlur=0;
      // Level pips (stars for L3)
      for (let lv=1;lv<=3;lv++) {
        const pip = lv<=tower.level ? def.color : "rgba(255,255,255,0.06)";
        ctx.fillStyle=pip;
        ctx.beginPath(); ctx.arc(p.x+(lv-2)*6, p.y+baseR+3, tower.level===3?3:2.5, 0, Math.PI*2); ctx.fill();
        if (lv<=tower.level) { ctx.strokeStyle=pip; ctx.lineWidth=0.5; ctx.stroke(); }
      }
      // Cooldown arc (outer ring)
      const pct = tower.fireRate>0 ? 1-tower.cooldown/tower.fireRate : 1;
      ctx.beginPath(); ctx.arc(p.x,p.y,baseR+4,-Math.PI/2,-Math.PI/2+pct*Math.PI*2);
      ctx.strokeStyle=pct>0.8?def.color:def.color+"88"; ctx.lineWidth=2.5; ctx.stroke();
    }

    // ── Projectiles ─────────────────────────────────────────────────────────
    for (const proj of s.projectiles) {
      const a = Math.min(1, proj.life/8);
      ctx.globalAlpha=a;
      // Gradient trail
      const tg = ctx.createLinearGradient(proj.x1,proj.y1,proj.x2,proj.y2);
      tg.addColorStop(0,"transparent"); tg.addColorStop(1,proj.color);
      ctx.beginPath(); ctx.moveTo(proj.x1,proj.y1); ctx.lineTo(proj.x2,proj.y2);
      ctx.strokeStyle=tg; ctx.lineWidth=2.5;
      ctx.shadowColor=proj.color; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0;
      // Impact dot
      ctx.fillStyle=proj.color;
      ctx.beginPath(); ctx.arc(proj.x2,proj.y2,3.5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }

    // ── Particles ───────────────────────────────────────────────────────────
    for (const p of s.particles) {
      const a = p.life/p.maxLife;
      ctx.globalAlpha = a*0.9; ctx.fillStyle=p.color;
      ctx.shadowColor=p.color; ctx.shadowBlur=4;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1;

    // ── Enemies ─────────────────────────────────────────────────────────────
    for (const enemy of s.enemies) {
      const def = ENEMY_DEFS[enemy.type];
      const cy = laneCenter(enemy.lane);
      const big = enemy.type==="boss"||enemy.type==="mega_boss";
      const es = enemy.type==="mega_boss"?36:big?30:enemy.type==="swarm"?13:21;
      // Status auras
      if (enemy.frozen>0) {
        const fra=0.15+0.2*Math.abs(Math.sin(f*0.15));
        ctx.fillStyle=`rgba(56,189,248,${fra})`; ctx.beginPath(); ctx.arc(enemy.x,cy,es/2+9,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#38bdf866"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(enemy.x,cy,es/2+9,0,Math.PI*2); ctx.stroke();
      }
      if (enemy.poisoned>0) {
        ctx.fillStyle="rgba(132,204,22,0.12)"; ctx.beginPath(); ctx.arc(enemy.x,cy,es/2+11,0,Math.PI*2); ctx.fill();
      }
      if (enemy.hitFlash>0) {
        ctx.fillStyle=`rgba(255,255,255,${enemy.hitFlash*0.06})`; ctx.beginPath(); ctx.arc(enemy.x,cy,es/2+6,0,Math.PI*2); ctx.fill();
      }
      // Shadow blob
      ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(enemy.x,cy+es/2+3,es/2,4,0,0,Math.PI*2); ctx.fill();
      // Emoji
      ctx.font=`${es}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.shadowColor=def.color; ctx.shadowBlur=big?24:10; ctx.fillText(def.emoji,enemy.x,cy); ctx.shadowBlur=0;
      // Health bar (gradient)
      const bw=big?50:32; const by=cy-es/2-12;
      ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect?ctx.roundRect(enemy.x-bw/2,by,bw,5,2):ctx.fillRect(enemy.x-bw/2,by,bw,5); ctx.fill();
      const hp=Math.max(0,enemy.hp/enemy.maxHp);
      const hpGrad=ctx.createLinearGradient(enemy.x-bw/2,0,enemy.x-bw/2+bw,0);
      hpGrad.addColorStop(0,hp>.5?"#22c55e":"#f59e0b"); hpGrad.addColorStop(1,hp>.5?"#4ade80":hp>.25?"#fbbf24":"#f87171");
      ctx.fillStyle=hpGrad; ctx.beginPath(); ctx.roundRect?ctx.roundRect(enemy.x-bw/2,by,bw*hp,5,2):ctx.fillRect(enemy.x-bw/2,by,bw*hp,5); ctx.fill();
      // Shield bar above
      if (enemy.maxShield>0) {
        ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(enemy.x-bw/2,by-6,bw,3);
        const sg=ctx.createLinearGradient(enemy.x-bw/2,0,enemy.x-bw/2+bw,0);
        sg.addColorStop(0,"#6366f1"); sg.addColorStop(1,"#818cf8");
        ctx.fillStyle=sg; ctx.fillRect(enemy.x-bw/2,by-6,bw*(enemy.shield/enemy.maxShield),3);
      }
      // Status icons
      if (enemy.frozen>0) { ctx.font="8px sans-serif"; ctx.fillStyle="#38bdf8"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("❄️",enemy.x-bw/2-6,by+2); }
      if (enemy.poisoned>0) { ctx.font="8px sans-serif"; ctx.fillStyle="#84cc16"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("☠",enemy.x+bw/2+6,by+2); }
    }

    // ── Heroes on right side of each lane ──────────────────────────────────
    for (let lane=0; lane<LANE_COUNT; lane++) {
      const heroId=s.heroLane[lane]; if (!heroId) continue;
      const hdef=HERO_DEFS[heroId];
      const hx=BASE_X-26; const hy=laneCenter(lane);
      // Hero circle
      const hg=ctx.createRadialGradient(hx,hy,0,hx,hy,18);
      hg.addColorStop(0,hdef.color+"44"); hg.addColorStop(1,hdef.color+"11");
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(hx,hy,18,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=hdef.color; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(hx,hy,18,0,Math.PI*2); ctx.stroke();
      ctx.font="16px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(hdef.emoji,hx,hy);
      // CD arc
      const cd=s.heroCd[heroId]??0; const maxCd=hdef.cooldownSec*60;
      const cdPct=cd>0?1-cd/maxCd:1;
      ctx.beginPath(); ctx.arc(hx,hy,22,-Math.PI/2,-Math.PI/2+cdPct*Math.PI*2);
      ctx.strokeStyle=cdPct>=1?`${hdef.color}cc`:hdef.color+"33"; ctx.lineWidth=3; ctx.stroke();
      // Ready flash
      if (cdPct>=1 && s.phase==="wave") {
        const rp=0.5+0.5*Math.sin(f*0.15);
        ctx.strokeStyle=`rgba(255,255,255,${rp*0.6})`; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(hx,hy,25,0,Math.PI*2); ctx.stroke();
      }
    }

    // ── Base / Castle ────────────────────────────────────────────────────────
    const bx=BASE_X+18; const by2=GH/2; const hf=s.baseHp/100;
    const hpColor=hf>.5?"#4ade80":hf>.25?"#facc15":"#f87171";
    // Castle glow
    ctx.shadowColor=hpColor; ctx.shadowBlur=20+Math.sin(f*0.07)*8;
    // Castle body
    ctx.fillStyle=theme.bg2+"ee"; ctx.beginPath(); ctx.arc(bx,by2,28,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=hpColor+"88"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(bx,by2,28,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    // HP arc
    ctx.beginPath(); ctx.arc(bx,by2,34,-Math.PI/2,-Math.PI/2+hf*Math.PI*2);
    ctx.strokeStyle=hpColor; ctx.lineWidth=4.5;
    ctx.shadowColor=hpColor; ctx.shadowBlur=12; ctx.stroke(); ctx.shadowBlur=0;
    // Shield dome
    if (s.baseShield>0) {
      const sa=0.4+0.35*Math.sin(f*0.12);
      ctx.globalAlpha=sa; ctx.strokeStyle="#22d3ee"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(bx,by2,40,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    }
    // Pet emoji
    ctx.font="28px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(petEmoji,bx,by2);
    // HP text
    ctx.font="bold 8px monospace"; ctx.fillStyle=hpColor; ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(`${s.baseHp}HP`,bx,by2+32);
    // Turret pips (decorative)
    for (let t=0;t<4;t++) {
      const ta=(t/4)*Math.PI*2-Math.PI/4;
      const tx=bx+Math.cos(ta)*36, ty=by2+Math.sin(ta)*36;
      ctx.fillStyle=theme.acc+"66"; ctx.beginPath(); ctx.arc(tx,ty,3,0,Math.PI*2); ctx.fill();
    }

    if (shaking) ctx.restore();

    // ── HUD top bar (no shake) ───────────────────────────────────────────────
    const hudGrad=ctx.createLinearGradient(0,0,GW,0);
    hudGrad.addColorStop(0,"rgba(0,0,0,0.9)"); hudGrad.addColorStop(0.5,"rgba(10,5,25,0.95)"); hudGrad.addColorStop(1,"rgba(0,0,0,0.9)");
    ctx.fillStyle=hudGrad; ctx.fillRect(0,0,GW,30);
    ctx.strokeStyle=theme.acc+"44"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(GW,30); ctx.stroke();
    // Wave with theme accent
    ctx.font="bold 10px monospace"; ctx.textBaseline="middle";
    ctx.textAlign="left";
    ctx.fillStyle=theme.acc; ctx.shadowColor=theme.acc; ctx.shadowBlur=6;
    ctx.fillText(`W${s.wave}`,6,15); ctx.shadowBlur=0;
    ctx.fillStyle=theme.acc+"66"; ctx.font="7px monospace"; ctx.fillText(theme.name,6+24,15);
    // Karma center
    ctx.textAlign="center"; ctx.fillStyle="#fbbf24"; ctx.font="bold 11px monospace";
    ctx.shadowColor="#fbbf24"; ctx.shadowBlur=8; ctx.fillText(`⚡${s.localKarma}`,GW/2,15); ctx.shadowBlur=0;
    // HP right
    ctx.textAlign="right"; ctx.fillStyle=hpColor; ctx.font="bold 10px monospace";
    ctx.fillText(`♥${s.baseHp}`,GW-38,15);
    ctx.fillStyle="#333"; ctx.font="bold 10px monospace"; ctx.fillText(`★${s.bestWave}`,GW-4,15);
    // Talent pts indicator
    if (s.talentPts>0) {
      ctx.fillStyle="#c8ff00"; ctx.font="bold 9px monospace";
      ctx.textAlign="left"; ctx.fillText(`✦${s.talentPts}`,GW/2-50,15);
    }

    // ── Combo flash ─────────────────────────────────────────────────────────
    if (s.comboFlash>0) {
      const ca=s.comboFlash/90;
      ctx.globalAlpha=ca;
      ctx.font="bold 24px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#fbbf24"; ctx.shadowColor="#fbbf24"; ctx.shadowBlur=28;
      ctx.fillText(s.comboLabel,GW/2,GH/2-55); ctx.shadowBlur=0;
      ctx.globalAlpha=1;
    }

    // ── Idle overlay ─────────────────────────────────────────────────────────
    if (s.phase==="idle") {
      ctx.fillStyle="rgba(0,0,0,0.65)"; ctx.fillRect(0,GH/2-90,GW,180);
      // Title glow
      ctx.shadowColor="#a855f7"; ctx.shadowBlur=30;
      ctx.font="bold 20px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#c8ff00"; ctx.fillText("🔮 KARMA DEFENSE ULTRA",GW/2,GH/2-48); ctx.shadowBlur=0;
      // Subtitle
      ctx.font="11px sans-serif"; ctx.fillStyle="#a855f7"; ctx.fillText("INFINITE WAVES · TALENT TREE · 5 HEROES",GW/2,GH/2-22);
      // Stats row
      ctx.font="10px monospace"; ctx.fillStyle="#555";
      ctx.fillText("4 lanes  ·  5 slots  ·  8 towers",GW/2,GH/2+2);
      // Best wave
      if (s.bestWave>0) { ctx.fillStyle="#fbbf24"; ctx.font="bold 10px monospace"; ctx.fillText(`🏆 Best: Wave ${s.bestWave}`,GW/2,GH/2+26); }
      // Instruction
      ctx.fillStyle="#333"; ctx.font="9px monospace"; ctx.fillText("Place towers below · then START WAVE",GW/2,GH/2+50);
    }

    // ── Between waves overlay ─────────────────────────────────────────────────
    if (s.phase==="between") {
      ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(0,GH/2-80,GW,160);
      ctx.font="bold 20px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#fbbf24"; ctx.shadowColor="#fbbf24"; ctx.shadowBlur=22;
      ctx.fillText(`⚡ WAVE ${s.wave} CLEARED! ⚡`,GW/2,GH/2-40); ctx.shadowBlur=0;
      ctx.font="13px sans-serif"; ctx.fillStyle="#a3e635";
      ctx.fillText(`+${s.waveBonus} karma earned`,GW/2,GH/2-12);
      if (s.talentPts>0) {
        ctx.font="bold 11px sans-serif"; ctx.fillStyle="#c8ff00";
        ctx.shadowColor="#c8ff00"; ctx.shadowBlur=12;
        ctx.fillText(`✦ ${s.talentPts} talent point${s.talentPts>1?"s":""} available!`,GW/2,GH/2+10); ctx.shadowBlur=0;
      }
      ctx.font="10px monospace"; ctx.fillStyle="#444";
      const sec=Math.ceil(s.betweenTimer/60);
      ctx.fillText(sec>0?`Next wave in ${sec}s — or tap START`:"Tap START WAVE",GW/2,GH/2+34);
    }

    // ── Wave milestone flash ──────────────────────────────────────────────────
    const MILESTONES=[5,10,25,50,100,200];
    if (s.phase==="between" && MILESTONES.includes(s.wave) && s.betweenTimer>540) {
      const pct=(s.betweenTimer-540)/60;
      ctx.globalAlpha=pct;
      // Full screen flash
      ctx.fillStyle=theme.acc+"18"; ctx.fillRect(0,0,GW,GH);
      // Vignette glow
      const vg=ctx.createRadialGradient(GW/2,GH/2,60,GW/2,GH/2,GW/2);
      vg.addColorStop(0,theme.acc+"00"); vg.addColorStop(1,theme.acc+"22");
      ctx.fillStyle=vg; ctx.fillRect(0,0,GW,GH);
      ctx.font="bold 32px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle=theme.acc; ctx.shadowColor=theme.acc; ctx.shadowBlur=40;
      ctx.fillText(`★ WAVE ${s.wave} ★`,GW/2,GH/2-65); ctx.shadowBlur=0;
      ctx.font="bold 15px sans-serif"; ctx.fillStyle="#fff";
      const labels: Record<number,string>={5:"WARRIOR UNLOCKED",10:"ELITE RANK",25:"MASTER CLASS",50:"LEGEND STATUS",100:"MYTHIC TIER",200:"TRANSCENDENT"};
      ctx.fillText(labels[s.wave]??`TIER ${s.wave}`,GW/2,GH/2-32);
      ctx.globalAlpha=1;
    }

    // ── Game over overlay ─────────────────────────────────────────────────────
    if (s.phase==="gameover") {
      ctx.fillStyle="rgba(0,0,0,0.88)"; ctx.fillRect(0,0,GW,GH);
      ctx.font="bold 30px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#f87171"; ctx.shadowColor="#f87171"; ctx.shadowBlur=28;
      ctx.fillText("💀 GAME OVER",GW/2,GH/2-56); ctx.shadowBlur=0;
      ctx.font="bold 16px sans-serif"; ctx.fillStyle="#fbbf24"; ctx.fillText(`Wave ${s.wave} reached`,GW/2,GH/2-22);
      ctx.font="13px monospace"; ctx.fillStyle="#a3e635"; ctx.fillText(`⚡ ${s.earnedKarma} karma earned`,GW/2,GH/2+6);
      if (s.wave>0&&s.wave>=s.bestWave) {
        ctx.fillStyle="#c8ff00"; ctx.font="bold 14px sans-serif";
        ctx.shadowColor="#c8ff00"; ctx.shadowBlur=16;
        ctx.fillText("🏆 NEW RECORD!",GW/2,GH/2+34); ctx.shadowBlur=0;
      }
      // Tap hint
      ctx.fillStyle="#333"; ctx.font="9px monospace"; ctx.fillText("Tap PLAY AGAIN to restart",GW/2,GH/2+58);
    }
  }, [petEmoji]);

  // ─── LOOP ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      const n = speedRef.current;
      for (let i=0;i<n;i++) doTick();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [doTick, draw]);

  // ─── CANVAS CLICK ─────────────────────────────────────────────────────────
  const handleCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>|React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx2 = "touches" in e ? e.touches[0]?.clientX??0 : e.clientX;
    const cy2 = "touches" in e ? e.touches[0]?.clientY??0 : e.clientY;
    const cx = (cx2-rect.left)*(GW/rect.width);
    const cy = (cy2-rect.top)*(GH/rect.height);
    const s = sRef.current;
    if (s.phase==="gameover") return;
    for (let lane=0;lane<LANE_COUNT;lane++) {
      for (let slot=0;slot<5;slot++) {
        const p = slotXY(lane,slot);
        if (Math.abs(cx-p.x)<22&&Math.abs(cy-p.y)<22) {
          const ex = s.towers.find(t=>t.lane===lane&&t.slot===slot);
          if (ex) { selTowerRef.current=ex; selSlotRef.current=null; setSelTower(ex); setSelSlot(null); }
          else { selSlotRef.current={lane,slot}; selTowerRef.current=null; setSelSlot({lane,slot}); setSelTower(null); }
          return;
        }
      }
    }
    selSlotRef.current=null; selTowerRef.current=null; setSelSlot(null); setSelTower(null);
  }, []);

  // ─── PLACE TOWER ──────────────────────────────────────────────────────────
  const placeTower = useCallback((type: TowerType) => {
    const slot=selSlotRef.current; if(!slot) return;
    const s=sRef.current; const def=TOWER_DEFS[type];
    if (s.localKarma<def.cost) return;
    if (s.towers.some(t=>t.lane===slot.lane&&t.slot===slot.slot)) return;
    s.localKarma-=def.cost;
    if (type==="freeze") s.baseShield+=30;
    s.towers.push({ id:mkId(), type, lane:slot.lane, slot:slot.slot, level:1, cooldown:def.fireRate, damage:def.damage, fireRate:def.fireRate });
    spawnBurst(s, SLOTS[slot.slot], laneCenter(slot.lane), def.color, 8, 2.5);
    selSlotRef.current=null; selTowerRef.current=null; setSelSlot(null); setSelTower(null);
    setUiKarma(s.localKarma);
  }, []);

  // ─── UPGRADE TOWER ────────────────────────────────────────────────────────
  const upgradeTower = useCallback(() => {
    const tower=selTowerRef.current; if(!tower||tower.level>=3) return;
    const s=sRef.current; const def=TOWER_DEFS[tower.type];
    const cost=Math.floor(def.cost*(tower.level===1?1.5:3));
    if (s.localKarma<cost) return;
    s.localKarma-=cost;
    const t=s.towers.find(t2=>t2.id===tower.id); if(!t) return;
    t.level++; t.damage=Math.floor(def.damage*(t.level===2?1.6:2.8)); t.fireRate=Math.max(5,Math.floor(def.fireRate*(t.level===2?0.85:0.7)));
    spawnBurst(s, SLOTS[t.slot], laneCenter(t.lane), def.color, 12, 3.5);
    selTowerRef.current=null; setSelTower(null); setUiKarma(s.localKarma);
  }, []);

  // ─── SELL TOWER ───────────────────────────────────────────────────────────
  const sellTower = useCallback(() => {
    const tower=selTowerRef.current; if(!tower) return;
    const s=sRef.current; const def=TOWER_DEFS[tower.type];
    s.localKarma+=Math.floor(def.cost*0.5*tower.level);
    s.towers=s.towers.filter(t=>t.id!==tower.id);
    selTowerRef.current=null; setSelTower(null); setUiKarma(s.localKarma);
  }, []);

  // ─── ASSIGN HERO ──────────────────────────────────────────────────────────
  const assignHero = useCallback((lane: number) => {
    if (!selHero) return;
    const s=sRef.current;
    for (let l=0;l<LANE_COUNT;l++) { if (s.heroLane[l]===selHero) delete s.heroLane[l]; }
    s.heroLane[lane]=selHero;
    if (s.heroCd[selHero]===undefined) s.heroCd[selHero]=0;
    spawnBurst(s, BASE_X-34, laneCenter(lane), HERO_DEFS[selHero].color, 10, 3);
    setHeroLaneUI({...s.heroLane}); setSelHero(null);
  }, [selHero]);

  const removeHero = useCallback((lane: number) => {
    const s=sRef.current; delete s.heroLane[lane]; setHeroLaneUI({...s.heroLane}); setSelHero(null);
  }, []);

  // ─── USE HERO ABILITY ─────────────────────────────────────────────────────
  const useAbility = useCallback((heroId: HeroId) => {
    const s=sRef.current;
    const cd=s.heroCd[heroId]??0; if (cd>0||s.phase!=="wave") return;
    s.heroCd[heroId]=HERO_DEFS[heroId].cooldownSec*60;
    switch (heroId) {
      case "pet": s.localKarma+=150; spawnBurst(s,GW/2,GH/2,"#c8ff00",14,5); break;
      case "frost": for (const e of s.enemies) e.frozen=240; spawnBurst(s,GW/2,GH/2,"#38bdf8",14,5); break;
      case "thunder":
        for (const e of [...s.enemies]) {
          const ad=ENEMY_DEFS[e.type]; const dmg=Math.max(1,40-ad.armor);
          if (e.shield>0) e.shield=Math.max(0,e.shield-dmg); else { e.hp-=dmg; e.hitFlash=8; }
          if (e.hp<=0) doKillEnemy(s,e);
        }
        spawnBurst(s,GW/2,GH/2,"#fbbf24",14,5); break;
      case "shadow": {
        const t=[...s.enemies].sort((a,b)=>b.hp-a.hp)[0];
        if (t) doKillEnemy(s,t);
        spawnBurst(s,GW/2,GH/2,"#a855f7",12,5); break;
      }
      case "monk": s.localKarma+=200; s.baseHp=Math.min(100,s.baseHp+10); spawnBurst(s,GW/2,GH/2,"#ff9d00",14,5); break;
    }
    setHeroCdUI({...s.heroCd}); setUiKarma(s.localKarma); setUiBaseHp(s.baseHp);
  }, []);

  // ─── START WAVE ───────────────────────────────────────────────────────────
  const startWave = useCallback(() => {
    const s=sRef.current; if(s.phase==="gameover") return;
    s.wave++; s.spawnQueue=buildWaveQueue(s.wave, s); s.spawnTimer=0;
    s.enemies=[]; s.projectiles=[]; s.phase="wave"; s.betweenTimer=0; s.waveBonus=0;
    if (hasTalent(s, "time_warp")) { (s as GS & { _warpFrames: number })._warpFrames = 180; }
    setUiPhase("wave"); setUiWave(s.wave);
    selSlotRef.current=null; selTowerRef.current=null; setSelSlot(null); setSelTower(null);
  }, []);

  // ─── RESTART ──────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    const s=sRef.current;
    onWin?.(s.earnedKarma, s.wave*10, `Wave ${s.wave}`, "epic");
    onEnd?.(s.wave>=5, s.earnedKarma);
    sRef.current=mkGS();
    selSlotRef.current=null; selTowerRef.current=null;
    setSelSlot(null); setSelTower(null); setSelHero(null);
    setHeroLaneUI({}); setHeroCdUI({});
    setUiPhase("idle"); setUiWave(0); setUiKarma(300); setUiBaseHp(100);
  }, [onEnd, onWin]);

  // ─── UNLOCK TALENT ────────────────────────────────────────────────────────
  const unlockTalent = useCallback((id: TalentId) => {
    const s = sRef.current;
    if (s.talentPts <= 0) return;
    if (s.talents.has(id)) return;
    const def = TALENT_MAP[id];
    if (def.requires && !s.talents.has(def.requires)) return;
    if (def.branch === "apex") {
      const branches: TalentBranch[] = ["attack","economy","defense"];
      const allTier3 = branches.every(b => {
        const t3 = TALENT_DEFS.find(t => t.branch === b && t.tier === 3);
        return t3 && s.talents.has(t3.id);
      });
      if (!allTier3) return;
    }
    s.talents = new Set([...s.talents, id]);
    s.talentPts--;
    if (id === "reinforce") s.baseHp = Math.min(140, s.baseHp + talentBaseHpBonus(s));
    setUiTalentPts(s.talentPts);
    setUiTalents(new Set(s.talents));
    setUiBaseHp(s.baseHp);
  }, []);

  // ─── SPEED TOGGLE ─────────────────────────────────────────────────────────
  const toggleSpeed = useCallback(() => {
    const n: 1|2 = speedRef.current===1?2:1;
    speedRef.current=n; setGameSpeed(n);
  }, []);

  // ─── HERO LANE REVERSE LOOKUP ─────────────────────────────────────────────
  const heroToLane: Partial<Record<HeroId,number>> = {};
  for (const [k,v] of Object.entries(heroLaneUI)) { if (v) heroToLane[v]=Number(k); }

  const canStart = uiPhase==="idle"||uiPhase==="between";
  const isOver = uiPhase==="gameover";
  const inWave = uiPhase==="wave";

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", userSelect:"none", WebkitUserSelect:"none" } as React.CSSProperties}>
      <canvas
        ref={canvasRef} width={GW} height={GH}
        onClick={handleCanvas}
        onTouchStart={e=>{ e.preventDefault(); handleCanvas(e); }}
        style={{ width:"100%", height:"auto", display:"block", cursor:"pointer", touchAction:"manipulation", borderRadius:"14px 14px 0 0", border:"2px solid rgba(168,85,247,0.35)", borderBottom:"none" }}
      />

      {/* ── Bottom UI ── */}
      <div style={{ width:"100%", background:"rgba(6,0,18,0.97)", border:"1px solid rgba(168,85,247,0.2)", borderTop:"none", borderRadius:"0 0 14px 14px", padding:"10px 10px 12px", display:"flex", flexDirection:"column", gap:8 }}>

        {/* Selected empty slot → tower shop */}
        {selSlot && !isOver && (
          <div>
            <div style={{ fontSize:10, color:"#fbbf24", fontWeight:700, letterSpacing:"0.08em", marginBottom:6 }}>
              PLACE TOWER — Lane {selSlot.lane+1}, Slot {selSlot.slot+1}
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {TOWER_TYPES.map(type => {
                const d=TOWER_DEFS[type]; const ok=uiKarma>=d.cost;
                return (
                  <button key={type} onClick={()=>placeTower(type)} disabled={!ok}
                    style={{ flex:"0 0 auto", minWidth:64, padding:"6px 6px", background:ok?`${d.color}18`:"rgba(255,255,255,0.03)", border:`1.5px solid ${ok?d.color:"#1a1a1a"}`, borderRadius:10, cursor:ok?"pointer":"not-allowed", textAlign:"center", opacity:ok?1:0.4 }}>
                    <div style={{ fontSize:18 }}>{d.emoji}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:ok?d.color:"#444", letterSpacing:"0.04em" }}>{d.name}</div>
                    <div style={{ fontSize:9, color:ok?"#fbbf24":"#f87171", fontWeight:700 }}>⚡{d.cost}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected existing tower → upgrade/sell */}
        {selTower && !isOver && (() => {
          const d=TOWER_DEFS[selTower.type];
          const uCost=Math.floor(d.cost*(selTower.level===1?1.5:3));
          const canUp=selTower.level<3&&uiKarma>=uCost;
          const refund=Math.floor(d.cost*0.5*selTower.level);
          return (
            <div style={{ background:`${d.color}12`, border:`1.5px solid ${d.color}44`, borderRadius:12, padding:"8px 10px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:"1.6rem" }}>{d.emoji}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:d.color }}>{d.name} <span style={{ color:"#444", fontWeight:400 }}>Lv.{selTower.level}</span></div>
                  <div style={{ fontSize:10, color:"#555" }}>DMG:{selTower.damage} · Fire:{selTower.fireRate}f · {d.special}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {selTower.level<3&&(
                  <button onClick={upgradeTower} disabled={!canUp}
                    style={{ flex:1, padding:"7px", background:canUp?"linear-gradient(135deg,#1a3300,#0a1a00)":"#111", border:`1.5px solid ${canUp?"#a3e635":"#222"}`, borderRadius:8, fontSize:11, fontWeight:700, color:canUp?"#a3e635":"#333", cursor:canUp?"pointer":"not-allowed" }}>
                    ⬆️ Lv.{selTower.level+1} · ⚡{uCost}
                  </button>
                )}
                <button onClick={sellTower}
                  style={{ padding:"7px 12px", background:"#1a0000", border:"1.5px solid #f87171", borderRadius:8, fontSize:11, fontWeight:700, color:"#f87171", cursor:"pointer" }}>
                  Sell +{refund}⚡
                </button>
              </div>
            </div>
          );
        })()}

        {/* Hero panel */}
        {!isOver && (
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:"#a855f7", letterSpacing:"0.1em", marginBottom:5 }}>
              HEROES {selHero && <span style={{ color:"#fbbf24" }}>→ pick lane for {HERO_DEFS[selHero].name}</span>}
            </div>
            <div style={{ display:"flex", gap:4 }}>
              {HERO_IDS.map(heroId => {
                const hd=HERO_DEFS[heroId];
                const assignedLane=heroToLane[heroId];
                const isSel=selHero===heroId;
                const cd=heroCdUI[heroId]??0;
                const ready=cd===0;
                return (
                  <div key={heroId} style={{ flex:1, display:"flex", flexDirection:"column", gap:3 }}>
                    <button onClick={()=>setSelHero(isSel?null:heroId)}
                      style={{ background:isSel?`${hd.color}33`:`${hd.color}11`, border:`1.5px solid ${isSel?hd.color:hd.color+"44"}`, borderRadius:10, padding:"5px 2px", cursor:"pointer", textAlign:"center", boxShadow:isSel?`0 0 12px ${hd.color}66`:"none" }}
                      title={hd.passiveDesc}>
                      <div style={{ fontSize:"1.2rem" }}>{hd.emoji}</div>
                      <div style={{ fontSize:8, fontWeight:700, color:hd.color, letterSpacing:"0.02em" }}>{hd.name.split(" ")[0]}</div>
                      <div style={{ fontSize:8, color:"#555" }}>{assignedLane!==undefined?`L${assignedLane+1}`:"—"}</div>
                    </button>
                    {/* Lane picker (when this hero selected) */}
                    {isSel && (
                      <div style={{ display:"flex", gap:2 }}>
                        {[0,1,2,3].map(lane=>(
                          <button key={lane} onClick={()=>heroLaneUI[lane]===heroId?removeHero(lane):assignHero(lane)}
                            style={{ flex:1, padding:"3px 1px", background:heroLaneUI[lane]===heroId?`${hd.color}33`:"#111", border:`1px solid ${hd.color}55`, borderRadius:4, fontSize:9, color:hd.color, cursor:"pointer", fontWeight:700 }}>
                            L{lane+1}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Use ability button */}
                    {assignedLane!==undefined && !isSel && inWave && (
                      <button onClick={()=>useAbility(heroId)}
                        style={{ padding:"4px 2px", background:ready?`${hd.color}22`:"#0a0a0a", border:`1px solid ${ready?hd.color:"#1a1a1a"}`, borderRadius:6, fontSize:8, fontWeight:700, color:ready?hd.color:"#333", cursor:ready?"pointer":"not-allowed" }}>
                        {ready?"✨USE":`${Math.ceil(cd/60)}s`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls row */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {canStart && (
            <button onClick={startWave}
              style={{ flex:1, padding:"11px 16px", background:"linear-gradient(135deg,#7c3aed,#a855f7)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:"0 0 20px rgba(168,85,247,0.5)" }}>
              {uiPhase==="idle"?`▶ START WAVE 1`:`▶ WAVE ${uiWave+1}`}
            </button>
          )}
          {isOver && (
            <button onClick={restart}
              style={{ flex:1, padding:"11px 16px", background:"linear-gradient(135deg,#7c3aed,#a855f7)", border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              🔄 Play Again
            </button>
          )}
          <button onClick={toggleSpeed}
            style={{ padding:"11px 14px", background:gameSpeed===2?"rgba(251,191,36,0.2)":"#111", border:`1.5px solid ${gameSpeed===2?"#fbbf24":"#222"}`, borderRadius:12, color:gameSpeed===2?"#fbbf24":"#444", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            {gameSpeed===1?"⏩ 2x":"⏸ 1x"}
          </button>
          <button onClick={()=>setShowTalents(v=>!v)}
            style={{ position:"relative", padding:"11px 12px", background:showTalents?"rgba(200,255,0,0.18)":"#111", border:`1.5px solid ${uiTalentPts>0?"#c8ff00":"#222"}`, borderRadius:12, color:uiTalentPts>0?"#c8ff00":"#666", fontWeight:700, fontSize:11, cursor:"pointer" }}>
            🌟
            {uiTalentPts>0&&<span style={{ position:"absolute", top:-5, right:-5, background:"#c8ff00", color:"#000", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center" }}>{uiTalentPts}</span>}
          </button>
        </div>

        {/* Talent tree panel */}
        {showTalents && (
          <div style={{ background:"rgba(5,0,18,0.98)", border:"1.5px solid rgba(200,255,0,0.25)", borderRadius:14, padding:"12px 10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"#c8ff00", letterSpacing:"0.1em" }}>
                🌟 TALENT TREE
              </div>
              <div style={{ fontSize:11, color:"#fbbf24", fontWeight:700 }}>
                {uiTalentPts} pts available
              </div>
            </div>

            {/* 3 branches */}
            {(["attack","economy","defense"] as TalentBranch[]).map(branch => {
              const branchColors: Record<TalentBranch, string> = { attack:"#ef4444", economy:"#fbbf24", defense:"#38bdf8" };
              const branchIcons: Record<TalentBranch, string> = { attack:"⚔️", economy:"💰", defense:"🛡️" };
              const col = branchColors[branch];
              const tiers = TALENT_DEFS.filter(t => t.branch === branch).sort((a,b)=>a.tier-b.tier);
              return (
                <div key={branch} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:col, letterSpacing:"0.12em", marginBottom:5 }}>
                    {branchIcons[branch]} {branch.toUpperCase()}
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {tiers.map((td, ti) => {
                      const unlocked = uiTalents.has(td.id);
                      const reqOk = !td.requires || uiTalents.has(td.requires);
                      const canUnlock = !unlocked && reqOk && uiTalentPts > 0;
                      return (
                        <div key={td.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          {ti>0&&<div style={{ width:16, height:2, background:unlocked?col:"#222" }} />}
                          <button onClick={()=>canUnlock&&unlockTalent(td.id)}
                            title={td.desc}
                            style={{
                              width:54, padding:"6px 4px",
                              background:unlocked?`${col}22`:"rgba(255,255,255,0.03)",
                              border:`1.5px solid ${unlocked?col:canUnlock?col+"55":"#1a1a1a"}`,
                              borderRadius:10, textAlign:"center",
                              cursor:canUnlock?"pointer":"default", opacity:reqOk||unlocked?1:0.35,
                              boxShadow:unlocked?`0 0 10px ${col}55`:"none",
                            }}>
                            <div style={{ fontSize:"1.1rem" }}>{td.emoji}</div>
                            <div style={{ fontSize:8, fontWeight:700, color:unlocked?col:"#444", lineHeight:1.2 }}>{td.name}</div>
                            {unlocked&&<div style={{ fontSize:7, color:"#4ade80", marginTop:2 }}>✓</div>}
                            {!unlocked&&canUnlock&&<div style={{ fontSize:7, color:"#fbbf24", marginTop:2 }}>1pt</div>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Apex node */}
            {(() => {
              const td = TALENT_DEFS.find(t => t.branch === "apex")!;
              const unlocked = uiTalents.has(td.id);
              const allTier3 = (["attack","economy","defense"] as TalentBranch[]).every(b => {
                const t3 = TALENT_DEFS.find(t => t.branch === b && t.tier === 3);
                return t3 && uiTalents.has(t3.id);
              });
              const canUnlock = !unlocked && allTier3 && uiTalentPts > 0;
              return (
                <button onClick={()=>canUnlock&&unlockTalent(td.id)}
                  style={{
                    width:"100%", padding:"10px 12px", marginTop:4,
                    background:unlocked?"rgba(200,255,0,0.12)":canUnlock?"rgba(200,255,0,0.06)":"rgba(255,255,255,0.02)",
                    border:`2px solid ${unlocked?"#c8ff00":canUnlock?"rgba(200,255,0,0.5)":"#1a1a1a"}`,
                    borderRadius:12, display:"flex", alignItems:"center", gap:10,
                    cursor:canUnlock?"pointer":"default",
                    boxShadow:unlocked?"0 0 20px rgba(200,255,0,0.3)":"none",
                    opacity:allTier3||unlocked?1:0.35,
                  }}>
                  <span style={{ fontSize:"1.5rem" }}>{td.emoji}</span>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:11, fontWeight:800, color:unlocked?"#c8ff00":"#555", letterSpacing:"0.06em" }}>
                      {td.name} {!allTier3&&"— unlock all 3 branches first"}
                    </div>
                    <div style={{ fontSize:9, color:unlocked?"#a3e635":"#333" }}>{td.desc}</div>
                  </div>
                  {unlocked&&<span style={{ marginLeft:"auto", fontSize:12, color:"#4ade80" }}>✓</span>}
                  {!unlocked&&canUnlock&&<span style={{ marginLeft:"auto", fontSize:10, color:"#fbbf24", fontWeight:700 }}>1pt</span>}
                </button>
              );
            })()}
          </div>
        )}

        {/* Status strip */}
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.2)", borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:6 }}>
          <span>⚡ <strong style={{ color:"#fbbf24" }}>{uiKarma}</strong></span>
          <span>Wave <strong style={{ color:"#a855f7" }}>{uiWave}</strong></span>
          <span>❤️ <strong style={{ color:uiBaseHp>50?"#4ade80":"#f87171" }}>{uiBaseHp}</strong></span>
          {uiBetween>0&&<span>⏳ <strong style={{ color:"#38bdf8" }}>{Math.ceil(uiBetween/60)}s</strong></span>}
          <span>🏆 <strong style={{ color:"#fbbf24" }}>{bestWave}</strong></span>
        </div>
      </div>
    </div>
  );
}
