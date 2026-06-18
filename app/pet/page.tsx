"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { FRIENDS } from "@/lib/mock-data";
import XPBar from "@/components/ui/XPBar";
import { xpProgress, xpToNextLevel } from "@/lib/xp-system";
import {
  getPetEmoji,
  getMoodEmoji,
  getPetClassColor,
  getEvolutionLabel,
} from "@/lib/pet-evolution";
import { WORLDS } from "@/lib/worlds";

// ─── Speech ──────────────────────────────────────────────────────────────────
const SPEECH: Record<string, string[]> = {
  excited: ["Let's go!! I'm READY!", "MAXIMUM POWER! 🔥", "I feel unstoppable today!"],
  happy: ["Life is good ✨", "Keep grinding, we got this!", "I believe in us 🌟"],
  neutral: ["Just vibing...", "What are we doing today?", "I could go for an adventure"],
  hungry: ["...I'm starving 😭", "Feed me please!!", "My stomach is empty 🥲"],
  sad: ["I miss when we used to play...", "A little love would be nice 💔", "Come back to me..."],
  sleeping: ["Zzzz... 💤", "Shh... resting...", "Don't wake me..."],
};

// ─── Evolution stages ────────────────────────────────────────────────────────
const EVO_STAGES = [
  { key: "baby",      emoji: "🐣", label: "Baby",      xpReq: 0,    abilities: ["First Steps"] },
  { key: "teen",      emoji: "🦊", label: "Teen",      xpReq: 500,  abilities: ["Power Surge", "Quick Dash"] },
  { key: "adult",     emoji: "🦁", label: "Adult",     xpReq: 2000, abilities: ["Battle Aura", "Endurance"] },
  { key: "legendary", emoji: "🌋", label: "Legendary", xpReq: 6000, abilities: ["Titan Mode", "Unstoppable", "God Tier"] },
];

// ─── Bond diary entries ───────────────────────────────────────────────────────
const DIARY_ENTRIES = [
  { emoji: "⚔️", text: "Won a battle vs tradeknight",      time: "2h ago",  xp: 80,  karma: 100 },
  { emoji: "🥩", text: "Devoured a Premium Feast",         time: "1d ago",  xp: 25,  karma: 0   },
  { emoji: "🎯", text: "Completed 5K Run bounty",          time: "2d ago",  xp: 120, karma: 0   },
  { emoji: "🔥", text: "7-day streak bonus achieved",      time: "3d ago",  xp: 150, karma: 75  },
  { emoji: "🧠", text: "Memory Palace cleared",            time: "3d ago",  xp: 0,   karma: 80  },
  { emoji: "📚", text: "Donated books bounty completed",   time: "4d ago",  xp: 100, karma: 0   },
];

const HAT_OPTIONS = ["🎩", "🎪", "🎓", "👑", "🎭", "🪖"];
const COLOR_OPTIONS = ["#ff6b35", "#a855f7", "#22c55e", "#ff2d8d"];

// ─── Karma Ville (integrated) ─────────────────────────────────────────────────
type VBuildingDef = { id: string; emoji: string; name: string; desc: string; cost: number; karmaPerHour: number; xpBonus: number; unlockLevel: number; color: string };
type VPlaced = { buildingId: string; col: number; row: number };
const VILLE_BUILDINGS: VBuildingDef[] = [
  { id: "house",   emoji: "🏠", name: "Karma Huset",  desc: "Din bas. Ger basic karma varje timme.",      cost: 0,    karmaPerHour: 2,  xpBonus: 0,  unlockLevel: 1,  color: "#c8ff00" },
  { id: "school",  emoji: "🏫", name: "XP Skolan",    desc: "+20% XP på alla aktiviteter.",               cost: 200,  karmaPerHour: 5,  xpBonus: 20, unlockLevel: 2,  color: "#4488ff" },
  { id: "gym",     emoji: "🏋️", name: "Karma Gym",    desc: "Stärker ditt husdjur dagligen.",             cost: 350,  karmaPerHour: 8,  xpBonus: 0,  unlockLevel: 3,  color: "#ff6b35" },
  { id: "cafe",    emoji: "☕", name: "Social Café",  desc: "Vänner kan besöka dig. +karma vid besök.",  cost: 500,  karmaPerHour: 10, xpBonus: 5,  unlockLevel: 4,  color: "#8b5cf6" },
  { id: "market",  emoji: "🏪", name: "Karma Market", desc: "Sälj items till vänner. Passiv inkomst.",    cost: 750,  karmaPerHour: 15, xpBonus: 0,  unlockLevel: 5,  color: "#ff2d8d" },
  { id: "lab",     emoji: "🔬", name: "DNA Lab",      desc: "Boostar DNA Breaker score med 2x.",         cost: 1000, karmaPerHour: 12, xpBonus: 10, unlockLevel: 7,  color: "#00e5ff" },
  { id: "stadium", emoji: "🏟️", name: "Battle Arena", desc: "Host Pet Battles. Vinn turnering karma.",   cost: 1500, karmaPerHour: 20, xpBonus: 15, unlockLevel: 10, color: "#ffde00" },
  { id: "bank",    emoji: "🏦", name: "Karma Bank",   desc: "Biljetter till KARMA POTTEN ×2.",           cost: 2000, karmaPerHour: 25, xpBonus: 0,  unlockLevel: 12, color: "#c8ff00" },
  { id: "tower",   emoji: "🗼", name: "Legend Tower", desc: "Syns på leaderboard. Flex status.",         cost: 3000, karmaPerHour: 35, xpBonus: 25, unlockLevel: 15, color: "#ff8c00" },
  { id: "castle",  emoji: "🏰", name: "KARMA CASTLE", desc: "Maximal prestige. Allt boostat.",            cost: 5000, karmaPerHour: 60, xpBonus: 50, unlockLevel: 20, color: "#e040fb" },
];
const VILLE_COLS = 4, VILLE_ROWS = 3, VILLE_KEY = "karma_ville_v1";
function loadVille(): VPlaced[] { try { return JSON.parse(localStorage.getItem(VILLE_KEY) ?? "[]"); } catch { return []; } }
function saveVille(p: VPlaced[]) { try { localStorage.setItem(VILLE_KEY, JSON.stringify(p)); } catch {} }
function calcVillePassive(placed: VPlaced[]): number {
  return placed.reduce((s, p) => { const b = VILLE_BUILDINGS.find(b => b.id === p.buildingId); return s + (b?.karmaPerHour ?? 0); }, 0);
}

// ─── Particle type ───────────────────────────────────────────────────────────
type Particle = { id: number; x: number; y: number };

// ─── Training target ─────────────────────────────────────────────────────────
type Target = { id: number; x: number; y: number };

// ─── Weather by world ────────────────────────────────────────────────────────
const WORLD_WEATHER: Record<string, { icon: string; label: string }> = {
  cosmic: { icon: "🌌", label: "Starry" },
  nature: { icon: "🌦️", label: "Rainy" },
  city:   { icon: "⛅", label: "Cloudy" },
  pixel:  { icon: "☀️", label: "Sunny" },
};

export default function PetPage() {
  const {
    pet, petMoodComputed, feedPet, playWithPet, restPet,
    user, addXP, addKarma, spendKarma, worldId, streak, activities,
  } = useApp();

  // ── Core UI state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"room" | "train" | "bond" | "grow" | "squad" | "ville">("room");
  // ── Ville state ─────────────────────────────────────────────────────────────
  const [villePlaced, setVillePlaced] = useState<VPlaced[]>([]);
  const [villeSelectedCell, setVilleSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const [villeShopOpen, setVilleShopOpen] = useState(false);
  const [villeCollecting, setVilleCollecting] = useState(false);
  const [challengedFriend, setChallengedFriend] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [petAction, setPetAction] = useState<string | null>(null);
  const [speechIdx, setSpeechIdx] = useState(0);

  // ── Room / accessory state ─────────────────────────────────────────────────
  const [particles, setParticles] = useState<Particle[]>([]);
  const [loveBubble, setLoveBubble] = useState(false);
  const particleId = useRef(0);
  const [equippedHat, setEquippedHat] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("karma_pet_hat_v1") ?? "" : ""
  );
  const [petColor, setPetColor] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("karma_pet_color_v1") ?? "#ff6b35" : "#ff6b35"
  );

  // ── Training state ─────────────────────────────────────────────────────────
  const [trainActive, setTrainActive] = useState(false);
  const [trainTarget, setTrainTarget] = useState<Target | null>(null);
  const [trainHits, setTrainHits] = useState(0);
  const [trainMisses, setTrainMisses] = useState(0);
  const [trainStreak, setTrainStreak] = useState(0);
  const [trainXP, setTrainXP] = useState(0);
  const [trainWindow, setTrainWindow] = useState(1500);
  const [trainDone, setTrainDone] = useState(false);
  const [trainCooldown, setTrainCooldown] = useState(0);
  const [floats, setFloats] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const floatId = useRef(0);
  const targetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TRAIN_MAX = 20;

  // ── Derived ────────────────────────────────────────────────────────────────
  const progress    = xpProgress(pet.xp);
  const xpToNext    = xpToNextLevel(pet.xp);
  const petEmoji    = getPetEmoji(pet.evolution, pet.class);
  const moodEmoji   = getMoodEmoji(petMoodComputed);
  const classColor  = getPetClassColor(pet.class);
  const evolLabel   = getEvolutionLabel(pet.evolution);
  const world       = WORLDS.find(w => w.id === worldId) ?? WORLDS[2];
  const isCritical  = pet.needs.hunger < 25 || pet.needs.happiness < 25 || pet.needs.energy < 15;
  const weather     = WORLD_WEATHER[worldId] ?? WORLD_WEATHER.city;

  const speechLines  = SPEECH[petMoodComputed] ?? SPEECH.neutral;
  const currentSpeech = speechLines[speechIdx % speechLines.length];

  // ── Rotate speech every 5s ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSpeechIdx(i => i + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Training cooldown ticker ───────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const last = parseInt(localStorage.getItem("karma_train_last") ?? "0", 10);
      const diff = Date.now() - last;
      const remaining = Math.max(0, 30 * 60 * 1000 - diff);
      setTrainCooldown(Math.ceil(remaining / 60000));
    };
    tick();
    const iv = setInterval(tick, 15000);
    return () => clearInterval(iv);
  }, [trainDone]);

  // ── Accessory persistence ─────────────────────────────────────────────────
  function selectHat(hat: string) {
    const next = hat === equippedHat ? "" : hat;
    setEquippedHat(next);
    localStorage.setItem("karma_pet_hat_v1", next);
  }
  function selectColor(c: string) {
    setPetColor(c);
    localStorage.setItem("karma_pet_color_v1", c);
  }

  // ── Toast helper ──────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  // ── Feed handlers ─────────────────────────────────────────────────────────
  function handleFeed(type: "basic" | "premium") {
    const cost = type === "basic" ? 50 : 150;
    if (user.karma < cost) { showToast("Not enough karma! 😅"); return; }
    const ok = feedPet(type);
    if (ok) {
      addXP(type === "premium" ? 25 : 10);
      setPetAction("eating");
      setTimeout(() => setPetAction(null), 1000);
      showToast(type === "basic" ? "Yummy! +30 hunger 🍖" : "FEAST! +65 hunger +20 happiness 🥩");
    }
  }

  function handlePlay() {
    if (pet.needs.energy < 18) { showToast("Too tired to play! Let them rest 💤"); return; }
    playWithPet();
    setPetAction("playing");
    setTimeout(() => setPetAction(null), 1000);
    showToast("+28 happiness, -18 energy 🎾");
  }

  function handleRest() {
    restPet();
    setPetAction("sleeping");
    setTimeout(() => setPetAction(null), 1200);
    showToast("+45 energy 💤");
  }

  // ── Tap-to-pet ────────────────────────────────────────────────────────────
  function handlePetTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const newParticles: Particle[] = Array.from({ length: 4 }, () => ({
      id: ++particleId.current,
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 900);

    setLoveBubble(true);
    setTimeout(() => setLoveBubble(false), 900);
    setPetAction("petting");
    setTimeout(() => setPetAction(null), 800);
    addXP(2);
    showToast("+3 happiness, +2 XP 💗");
  }

  // ── Training game ─────────────────────────────────────────────────────────
  const spawnTarget = useCallback((window_ms: number, hits: number) => {
    if (targetTimer.current) clearTimeout(targetTimer.current);
    const newTarget: Target = {
      id: Date.now(),
      x: Math.floor(Math.random() * 240) + 20,
      y: Math.floor(Math.random() * 140) + 20,
    };
    setTrainTarget(newTarget);
    targetTimer.current = setTimeout(() => {
      setTrainTarget(null);
      setTrainMisses(m => m + 1);
      setTrainStreak(0);
      if (hits < TRAIN_MAX - 1) {
        spawnTarget(window_ms, hits);
      } else {
        setTrainDone(true);
        setTrainActive(false);
      }
    }, window_ms);
  }, []);

  function startTraining() {
    if (trainCooldown > 0) { showToast(`Training recharges in ${trainCooldown} min ⏳`); return; }
    localStorage.setItem("karma_train_last", Date.now().toString());
    setTrainHits(0);
    setTrainMisses(0);
    setTrainStreak(0);
    setTrainXP(0);
    setTrainWindow(1500);
    setTrainDone(false);
    setTrainActive(true);
    spawnTarget(1500, 0);
  }

  function hitTarget(targetId: number, tx: number, ty: number) {
    if (!trainTarget || trainTarget.id !== targetId) return;
    if (targetTimer.current) clearTimeout(targetTimer.current);
    setTrainTarget(null);

    const newHits = trainHits + 1;
    const newStreak = trainStreak + 1;
    const multiplier = Math.min(newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1, 3);
    const earned = 5 * multiplier;
    const newXP = trainXP + earned;
    const newWindow = Math.max(800, trainWindow - (newHits % 3 === 0 ? 100 : 0));

    setTrainHits(newHits);
    setTrainStreak(newStreak);
    setTrainXP(newXP);
    setTrainWindow(newWindow);

    const fid = ++floatId.current;
    setFloats(prev => [...prev, { id: fid, text: `+${earned}${multiplier > 1 ? ` ×${multiplier}` : ""}`, x: tx, y: ty }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 900);

    if (newHits >= TRAIN_MAX) {
      addXP(newXP);
      addKarma(Math.floor(newXP / 3));
      setTrainDone(true);
      setTrainActive(false);
    } else {
      spawnTarget(newWindow, newHits);
    }
  }

  // ─── Ville init & handlers ────────────────────────────────────────────────
  useEffect(() => {
    const p = loadVille();
    if (p.length === 0) {
      const init: VPlaced[] = [{ buildingId: "house", col: 1, row: 1 }];
      setVillePlaced(init); saveVille(init);
    } else { setVillePlaced(p); }
  }, []);

  const villePlacedIds = new Set(villePlaced.map(p => p.buildingId));
  const villePassiveKarma = calcVillePassive(villePlaced);
  const villeUserLevel = Math.max(1, Math.floor(user.xp / 500) + 1);
  const villeGetCell = (col: number, row: number) => villePlaced.find(p => p.col === col && p.row === row);

  function villeBuild(building: VBuildingDef) {
    if (!villeSelectedCell) return;
    if (villePlacedIds.has(building.id)) { showToast("Redan byggt! 🚫"); return; }
    if (building.cost > 0 && !spendKarma(building.cost)) { showToast(`Behöver ${building.cost} ⚡`); return; }
    const next = [...villePlaced, { buildingId: building.id, col: villeSelectedCell.col, row: villeSelectedCell.row }];
    setVillePlaced(next); saveVille(next);
    if (building.xpBonus) addXP(building.xpBonus * 5);
    showToast(`${building.emoji} ${building.name} byggd! +${building.karmaPerHour}/h`);
    setVilleShopOpen(false); setVilleSelectedCell(null);
  }

  function villeDemolish(col: number, row: number) {
    const cell = villeGetCell(col, row);
    if (!cell || cell.buildingId === "house") return;
    const next = villePlaced.filter(p => !(p.col === col && p.row === row));
    setVillePlaced(next); saveVille(next);
    const b = VILLE_BUILDINGS.find(b => b.id === cell.buildingId);
    const refund = Math.floor((b?.cost ?? 0) * 0.5);
    if (refund > 0) addKarma(refund, "Ville demolish");
    showToast(`Rivs! +${refund} ⚡ refund 🏗️`); setVilleSelectedCell(null);
  }

  function villeCollect() {
    if (villeCollecting) return;
    setVilleCollecting(true);
    const earned = Math.round(villePassiveKarma * 0.5);
    addKarma(earned, "Ville passiv inkomst");
    showToast(`+${earned} ⚡ passiv karma! 🏙️`);
    setTimeout(() => setVilleCollecting(false), 3000);
  }

  // ─── Stats derived from pet ───────────────────────────────────────────────
  const statHP  = Math.min(100, pet.level * 5);
  const statATK = Math.min(100, pet.level * 3 + (pet.class === "Grinder Beast" ? 15 : 5));
  const statSPD = Math.min(100, pet.level * 4);
  const statLCK = Math.min(100, pet.level * 2 + (pet.class === "Merchant King" ? 20 : 0));

  // ─── Time of day ─────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const timeOfDay = hour >= 22 || hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "day" : "evening";
  const timeOverlay = { night: "rgba(10,20,60,0.32)", morning: "rgba(255,180,60,0.10)", day: "rgba(0,0,0,0)", evening: "rgba(255,90,10,0.16)" }[timeOfDay];
  const timeMood   = { night: "🌙", morning: "🌅", day: "☀️", evening: "🌆" }[timeOfDay];
  const timeLabel  = { night: "Night", morning: "Morning", day: "Day", evening: "Evening" }[timeOfDay];

  // ─── Evolution progress ────────────────────────────────────────────────────
  const currentStageIdx = EVO_STAGES.findLastIndex(s => pet.xp >= s.xpReq);
  const nextStage = EVO_STAGES[currentStageIdx + 1];
  const curStage  = EVO_STAGES[currentStageIdx];
  const evoProgress = nextStage
    ? Math.min(100, ((pet.xp - curStage.xpReq) / (nextStage.xpReq - curStage.xpReq)) * 100)
    : 100;

  // ─── Live diary entries ───────────────────────────────────────────────────
  const liveEntries = activities.slice(0, 3).map(a => ({
    emoji: a.emoji,
    text: a.title,
    time: "just now",
    xp: a.xp ?? 0,
    karma: a.karma ?? 0,
  }));
  const diaryAll = [...liveEntries, ...DIARY_ENTRIES].slice(0, 8);

  // ─── XP ring constants ────────────────────────────────────────────────────
  const RING_R = 93;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

  // ─── Tab definitions for bottom nav ──────────────────────────────────────
  const NAV_TABS = [
    { key: "room",  icon: petEmoji, label: "PET" },
    { key: "train", icon: "⚡",     label: "TRAIN" },
    { key: "bond",  icon: "🎩",     label: "STYLE" },
    { key: "grow",  icon: "🌱",     label: "GROW" },
    { key: "squad", icon: "👥",     label: "SQUAD" },
    { key: "ville", icon: "🏙️",    label: "VILLE" },
  ] as const;

  // ─── Tab title map ────────────────────────────────────────────────────────
  const TAB_TITLE: Record<string, string> = {
    train: "TRAINING DOJO",
    bond:  "STYLE STUDIO",
    grow:  "EVOLUTION",
    squad: "TON SQUAD",
    ville: "KARMA VILLE",
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh", userSelect: "none" }}>

      {/* ── Toast (fixed, floats over everything) ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
              zIndex: 200,
              background: "#c8ff00", border: "2px solid #0a0a0a",
              borderRadius: 12, padding: "10px 20px",
              fontWeight: 700, fontSize: 14,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ ROOM TAB — full-screen immersive ══════════════════ */}
      {tab === "room" && (
        <div style={{
          position: "relative",
          height: "calc(100dvh - 56px)",
          background: world.petRoomBg,
          overflow: "hidden",
        }}>

          {/* Time overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            pointerEvents: "none", background: timeOverlay,
          }} />

          {/* 10 ambient float particles */}
          {[...Array(10)].map((_, i) => (
            <motion.div key={i}
              animate={{ y: [0, -22, 0], x: [0, i % 2 === 0 ? 6 : -6, 0], opacity: [0.08, 0.4, 0.08] }}
              transition={{ duration: 3 + i * 0.55, repeat: Infinity, delay: i * 0.38, ease: "easeInOut" }}
              style={{
                position: "absolute", borderRadius: "50%",
                width: i < 3 ? 6 : 3, height: i < 3 ? 6 : 3,
                background: world.accent,
                top: `${10 + i * 8}%`, left: `${5 + i * 9}%`,
                zIndex: 2, pointerEvents: "none",
                filter: "blur(1px)",
              }}
            />
          ))}

          {/* Perspective floor */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 90,
            background: `${world.accent}18`, borderTop: `2px solid ${world.accent}55`,
            zIndex: 2,
          }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                position: "absolute", bottom: 0,
                left: `${(i + 1) * 11}%`, width: 1, height: "100%",
                background: `linear-gradient(0deg, ${world.accent}55, transparent)`,
              }} />
            ))}
          </div>

          {/* Floating world emojis */}
          {world.petRoomEmojis.slice(0, 3).map((emoji, i) => (
            <motion.div key={i}
              animate={{ y: [0, -8, 0], opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 3.5 + i, repeat: Infinity, delay: i * 0.7 }}
              style={{
                position: "absolute",
                top: 14 + i * 20,
                left: i === 0 ? 14 : i === 1 ? "38%" : undefined,
                right: i === 2 ? 14 : undefined,
                fontSize: (["1.8rem", "1.3rem", "1.1rem"] as const)[i],
                zIndex: 3, pointerEvents: "none",
              }}>
              {emoji}
            </motion.div>
          ))}

          {/* Ground decor */}
          {world.petRoomEmojis.slice(3).map((emoji, i) => (
            <div key={i} style={{
              position: "absolute", bottom: 92,
              left: i === 0 ? 10 : i === 1 ? "25%" : undefined,
              right: i === 2 ? 10 : undefined,
              fontSize: (["2.2rem", "1.6rem", "2rem"] as const)[i] ?? "1.6rem",
              opacity: 0.8, zIndex: 3, pointerEvents: "none",
            }}>{emoji}</div>
          ))}

          {/* Food bowl */}
          <div style={{
            position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)",
            zIndex: 3, pointerEvents: "none", fontSize: "1.8rem", opacity: 0.6,
          }}>🍜</div>

          {/* ── TOP FLOATING HUD ── */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
            background: "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)",
            padding: "14px 16px 36px",
          }}>
            {/* Row 1: name + right badges */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              {/* Left: name + class */}
              <div>
                <div style={{
                  fontSize: "1.7rem", fontWeight: 900, lineHeight: 1,
                  ...(({
                    background: `linear-gradient(135deg, ${world.accent}, #fff)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  } as React.CSSProperties)),
                }}>
                  {pet.name}
                </div>
                <div style={{ fontSize: 11, color: classColor, fontWeight: 700, letterSpacing: "0.06em", marginTop: 2 }}>
                  {pet.class.toUpperCase()} · {evolLabel}
                </div>
              </div>

              {/* Right: care + streak + level + game link */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isCritical && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{
                      background: "#ff2d2d", color: "#fff", borderRadius: 8,
                      padding: "3px 8px", fontSize: 10, fontWeight: 700,
                      boxShadow: "0 0 20px #ff2d2daa",
                    }}>
                    ⚠️CARE
                  </motion.div>
                )}
                <span style={{ fontSize: 13, fontWeight: 900, color: "#ff6b35" }}>🔥{streak}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#ffde00" }}>⭐{pet.level}</span>
                <Link href="/games">
                  <div style={{
                    width: 34, height: 34, background: "rgba(0,0,0,0.6)",
                    border: `1.5px solid ${world.accent}66`, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Gamepad2 size={16} color={world.accent} />
                  </div>
                </Link>
              </div>
            </div>

            {/* XP bar */}
            <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.8 }}
                style={{
                  height: "100%", borderRadius: 999,
                  background: `linear-gradient(90deg, ${world.accent}88, ${world.accent})`,
                }}
              />
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: 600 }}>
              XP {pet.xp.toLocaleString()} · {xpToNext.toLocaleString()} to Lv.{pet.level + 1}
            </div>
          </div>

          {/* ── RIGHT SIDE BADGES ── */}
          <div style={{
            position: "absolute", top: 88, right: 12, zIndex: 12,
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            {/* World badge */}
            <div style={{
              background: `${world.accent}22`, border: `1.5px solid ${world.accent}`,
              borderRadius: 8, padding: "3px 8px",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: "0.85rem" }}>{world.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: world.accent, letterSpacing: "0.06em" }}>{world.name}</span>
            </div>
            {/* Time badge */}
            <div style={{
              background: "rgba(0,0,0,0.45)", border: "1.5px solid transparent",
              borderRadius: 8, padding: "3px 8px",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: "0.8rem" }}>{timeMood}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#ccc" }}>{timeLabel}</span>
            </div>
            {/* Karma badge */}
            <div style={{
              background: "rgba(0,0,0,0.45)", border: "1.5px solid transparent",
              borderRadius: 8, padding: "3px 8px",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: "0.85rem" }}>⚡</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#c8ff00" }}>{user.karma.toLocaleString()}</span>
            </div>
          </div>

          {/* ── CENTRAL PET ── */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -58%)",
            zIndex: 10,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            {/* Outer wrapper 200×200 */}
            <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>

              {/* SVG XP ring */}
              <svg width={200} height={200} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                {/* Background circle */}
                <circle
                  cx={100} cy={100} r={RING_R}
                  fill="none"
                  stroke={world.accent}
                  strokeWidth={7}
                  opacity={0.06}
                />
                {/* Progress circle */}
                <circle
                  cx={100} cy={100} r={RING_R}
                  fill="none"
                  stroke={world.accent}
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                  style={{ filter: `drop-shadow(0 0 6px ${world.accent})`, transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>

              {/* LV badge floating on ring at top */}
              <div style={{
                position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
                background: world.accent, color: "#000",
                borderRadius: 99, padding: "2px 8px",
                fontSize: 10, fontWeight: 900, letterSpacing: "0.05em",
                zIndex: 15,
              }}>
                LV.{pet.level}
              </div>

              {/* Glow orb */}
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.15, 0.35] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute", width: 180, height: 180,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${world.glowColor} 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />

              {/* Critical pulse ring */}
              {isCritical && (
                <motion.div
                  animate={{ scale: [1, 1.45, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={{
                    position: "absolute", width: 185, height: 185,
                    borderRadius: "50%", border: "3px solid #ff2d2d",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Hat */}
              {equippedHat && (
                <div style={{
                  position: "absolute", top: 3, left: "50%", transform: "translateX(-50%)",
                  fontSize: "2rem", zIndex: 16, lineHeight: 1,
                  filter: `drop-shadow(0 3px 8px ${world.glowColor})`,
                }}>
                  {equippedHat}
                </div>
              )}

              {/* Pet circle 180×180 */}
              <motion.div
                animate={
                  petAction === "petting"  ? { scale: [1, 1.3, 0.93, 1.12, 1], rotate: [0, -10, 10, 0] } :
                  petAction === "eating"   ? { scale: [1, 1.22, 0.9, 1.12, 1], y: [0, -10, 0] } :
                  petAction === "playing"  ? { y: [0, -32, 0, -18, 0], rotate: [0, 14, -14, 0] } :
                  petAction === "sleeping" ? { rotate: [0, 8, 8], scale: [1, 0.94, 0.94] } :
                  petMoodComputed === "excited"
                    ? { y: [0, -20, 0], scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }
                    : { y: [0, -10, 0], scale: [1, 1.02, 1] }
                }
                transition={
                  petAction
                    ? { duration: 0.85, ease: "easeInOut" }
                    : { duration: petMoodComputed === "excited" ? 1.6 : 3.2, repeat: Infinity, ease: "easeInOut" }
                }
                onClick={handlePetTap}
                style={{
                  width: 180, height: 180,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.96)",
                  border: `4px solid ${petColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "5rem",
                  cursor: "pointer",
                  position: "relative", zIndex: 10,
                  boxShadow: `0 0 70px ${world.glowColor}77, 0 0 140px ${world.glowColor}22, 6px 6px 0 ${petColor}`,
                }}
              >
                {petEmoji}

                {/* Tap particles */}
                <AnimatePresence>
                  {particles.map(p => (
                    <motion.div key={p.id}
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -80, scale: 1.8 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      style={{
                        position: "absolute", left: p.x - 14, top: p.y - 90,
                        fontSize: "1.6rem", pointerEvents: "none", zIndex: 20,
                      }}>
                      💗
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Love bubble */}
                <AnimatePresence>
                  {loveBubble && (
                    <motion.div
                      key="love"
                      initial={{ opacity: 0, scale: 0.5, y: 0 }}
                      animate={{ opacity: 1, scale: 1, y: -68 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.35 }}
                      style={{
                        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                        background: "#fff", border: "2px solid #0a0a0a",
                        borderRadius: 12, padding: "4px 12px",
                        fontSize: 13, fontWeight: 700,
                        whiteSpace: "nowrap", boxShadow: "2px 2px 0px #0a0a0a", zIndex: 30,
                      }}>
                      Love! 💗
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Nameplate */}
            <div style={{
              marginTop: -6,
              background: "rgba(0,0,0,0.72)",
              color: "#fff", borderRadius: 99,
              padding: "4px 14px",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
              border: `1.5px solid ${world.accent}66`,
              zIndex: 11,
            }}>
              {moodEmoji} {pet.name} · {evolLabel}
            </div>

            {/* Speech bubble */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`speech-${speechIdx}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.22 }}
                style={{
                  marginTop: 8,
                  background: "#fff", border: "2px solid #0a0a0a",
                  borderRadius: 14, padding: "6px 12px",
                  fontSize: 12, fontWeight: 600, maxWidth: 200,
                  boxShadow: "2px 2px 0px #0a0a0a", lineHeight: 1.4,
                  textAlign: "center", color: "#111",
                  zIndex: 11,
                }}>
                <span style={{ fontSize: "1rem", marginRight: 4 }}>{moodEmoji}</span>
                {currentSpeech}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── BOTTOM NEEDS + ACTIONS ── */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 15,
            background: "linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)",
            padding: "20px 14px 10px",
          }}>
            {/* 3 needs bars */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { label: "HUNGER", icon: "🍖", color: "#ff6b35", val: pet.needs.hunger },
                { label: "HAPPY",  icon: "😊", color: "#ff2d8d", val: pet.needs.happiness },
                { label: "ENERGY", icon: "⚡", color: "#c8ff00", val: pet.needs.energy },
              ].map(n => {
                const crit = n.val < 30;
                return (
                  <div key={n.label} style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: crit ? "#ff2d2d" : n.color }}>
                        {n.icon}{crit ? " ⚠" : ""}
                      </span>
                      <span style={{ fontSize: 9, color: "#666", fontWeight: 600 }}>{n.val}%</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(0,0,0,0.5)", borderRadius: 999, overflow: "hidden", boxShadow: crit ? "0 0 6px #ff2d2d" : "none" }}>
                      <motion.div
                        animate={{ width: `${n.val}%` }}
                        transition={{ duration: 0.8 }}
                        style={{
                          height: "100%", borderRadius: 999,
                          background: crit
                            ? "linear-gradient(90deg,#ff2d2d,#ff6b35)"
                            : `linear-gradient(90deg,${n.color}88,${n.color})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5-button action grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
              {[
                { label: "FEED",   icon: "🍖", color: "#ff6b35", sub: "-50⚡",  onClick: () => handleFeed("basic") },
                { label: "FEAST",  icon: "🥩", color: "#ffde00", sub: "-150⚡", onClick: () => handleFeed("premium") },
                { label: "PLAY",   icon: "🎾", color: "#4caf50", sub: "-18nrg", onClick: handlePlay },
                { label: "REST",   icon: "💤", color: "#3b82f6", sub: "+45nrg", onClick: handleRest },
                { label: "BATTLE", icon: "⚔️", color: "#ff2d8d", sub: "+karma", href: "/games/battle" },
              ].map(a => {
                const inner = (
                  <div style={{
                    padding: "10px 2px",
                    background: `${a.color}14`,
                    border: `1.5px solid ${a.color}66`,
                    borderRadius: 14, textAlign: "center", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: "1.5rem" }}>{a.icon}</div>
                    <div style={{ fontSize: 9, fontWeight: 900, color: a.color, letterSpacing: "0.04em", marginTop: 2 }}>{a.label}</div>
                    <div style={{ fontSize: 8, color: "#555", marginTop: 1 }}>{a.sub}</div>
                  </div>
                );
                return a.href
                  ? <Link key={a.label} href={a.href} style={{ textDecoration: "none" }}>{inner}</Link>
                  : <div key={a.label} onClick={a.onClick}>{inner}</div>;
              })}
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════ NON-ROOM TABS ══════════════════ */}
      {tab !== "room" && (
        <div style={{ paddingBottom: 72 }}>

          {/* Sticky mini header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 40,
            background: "var(--bg)",
            borderBottom: "2px solid #1a1a1a",
            padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            {/* Pet avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: "55%",
              background: "#111", border: `2px solid ${world.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", flexShrink: 0,
            }}>
              {petEmoji}
            </div>

            {/* Title + subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.06em", color: "#fff" }}>
                {TAB_TITLE[tab] ?? tab.toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: classColor, fontWeight: 600 }}>
                {pet.name} · {pet.class}
              </div>
            </div>

            {/* Right: karma + level */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#c8ff00" }}>⚡ {user.karma.toLocaleString()}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>Lv.{pet.level}</span>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: "16px 16px 0" }} className="space-y-4">

            {/* ══ TRAIN TAB ══ */}
            {tab === "train" && (
              <div style={{ background: "#0c0c0c", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>⚡ Training Mini-Game</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Tap the target before it vanishes!</div>
                  </div>
                  {trainCooldown > 0 && !trainActive && !trainDone && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ff6b35" }}>
                      ⏳ {trainCooldown}m
                    </div>
                  )}
                </div>

                {/* Stats row */}
                {(trainActive || trainDone) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { label: "Hits",   val: trainHits },
                      { label: "Streak", val: `${trainStreak}${trainStreak >= 3 ? ` ×${Math.min(3, Math.floor(trainStreak / 3) + 1)}` : ""}` },
                      { label: "XP",     val: `+${trainXP}` },
                      { label: "Left",   val: TRAIN_MAX - trainHits },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, background: "#111", border: "2px solid #0a0a0a", borderRadius: 10, padding: "6px 4px", textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: "#888", fontWeight: 600, letterSpacing: "0.04em" }}>{s.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Play area */}
                {trainActive && !trainDone && (
                  <div style={{ position: "relative", width: "100%", height: 200, background: "#0a0a0a", borderRadius: 14, border: "3px solid #c8ff00", overflow: "hidden" }}>
                    <AnimatePresence>
                      {floats.map(f => (
                        <motion.div key={f.id}
                          initial={{ opacity: 1, y: f.y, x: f.x }}
                          animate={{ opacity: 0, y: f.y - 40 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          style={{ position: "absolute", fontSize: 14, fontWeight: 700, color: "#c8ff00", pointerEvents: "none", zIndex: 10 }}>
                          {f.text}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <AnimatePresence>
                      {trainTarget && (
                        <motion.button
                          key={trainTarget.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => hitTarget(trainTarget.id, trainTarget.x, trainTarget.y)}
                          style={{
                            position: "absolute",
                            left: trainTarget.x, top: trainTarget.y,
                            width: 48, height: 48, borderRadius: "50%",
                            background: `radial-gradient(circle, ${world.accent} 0%, ${world.glowColor} 100%)`,
                            border: "3px solid #fff", cursor: "pointer", fontSize: "1.2rem",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transform: "translate(-50%, -50%)",
                            boxShadow: `0 0 16px ${world.glowColor}`,
                          }}>
                          ✦
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "#222" }}>
                      <div style={{ height: "100%", background: "#c8ff00", width: `${(trainHits / TRAIN_MAX) * 100}%`, transition: "width 0.2s" }} />
                    </div>
                  </div>
                )}

                {/* Results */}
                {trainDone && (
                  <div style={{ background: "#0f0f0f", border: "2.5px solid #c8ff0044", borderRadius: 14, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 4 }}>🏆</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Training Complete!</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round((trainHits / TRAIN_MAX) * 100)}%</div>
                        <div style={{ fontSize: 10, color: "#888" }}>ACCURACY</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#4caf50", textShadow: "0 0 10px #4caf5088" }}>+{trainXP}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>XP EARNED</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#a855f7" }}>+{Math.floor(trainXP / 3)}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>KARMA</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>Next session in 30 min</div>
                  </div>
                )}

                {/* Start button */}
                {!trainActive && !trainDone && (
                  <button
                    onClick={startTraining}
                    disabled={trainCooldown > 0}
                    style={{
                      width: "100%", padding: "14px",
                      background: trainCooldown > 0 ? "#1a1a1a" : "#0a0a0a",
                      color: trainCooldown > 0 ? "#444" : "#c8ff00",
                      border: "2.5px solid #1a1a1a", borderRadius: 14,
                      fontSize: 15, fontWeight: 700,
                      cursor: trainCooldown > 0 ? "not-allowed" : "pointer",
                      letterSpacing: "0.04em",
                    }}>
                    {trainCooldown > 0 ? `⏳ Recharges in ${trainCooldown} min` : "⚡ START TRAINING"}
                  </button>
                )}

                {trainDone && (
                  <button
                    onClick={() => setTrainDone(false)}
                    style={{
                      width: "100%", padding: "12px",
                      background: "#111", border: "2.5px solid #1a1a1a",
                      borderRadius: 14, fontSize: 14, fontWeight: 700,
                      cursor: "pointer", color: "#fff",
                    }}>
                    Back
                  </button>
                )}
              </div>
            )}

            {/* ══ BOND / STYLE TAB ══ */}
            {tab === "bond" && (
              <div className="space-y-4">
                {/* Diary */}
                <div style={{ background: "#0c0c0c", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    📖 Bond Diary
                  </div>
                  <div style={{ background: "#0f0f0f", border: "2px solid #1a1a1a", borderRadius: 12, overflow: "hidden" }}>
                    {diaryAll.map((entry, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        borderBottom: i < diaryAll.length - 1 ? "1px solid #1a1a1a" : "none",
                        background: i % 2 === 0 ? "#0f0f0f" : "#111",
                      }}>
                        <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{entry.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: "#ddd" }}>{entry.text}</div>
                          <div style={{ fontSize: 10, color: "#555" }}>{entry.time}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {entry.xp > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: "#4caf50" }}>+{entry.xp} XP</div>}
                          {entry.karma > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7" }}>+{entry.karma} ⚡</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accessories */}
                <div style={{ background: "#0c0c0c", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎩 Accessories</div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>HATS</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {HAT_OPTIONS.map(hat => (
                      <button key={hat} onClick={() => selectHat(hat)}
                        style={{
                          width: 48, height: 48, borderRadius: 12,
                          border: equippedHat === hat ? `2.5px solid ${world.accent}` : "2px solid #222",
                          background: equippedHat === hat ? `${world.accent}18` : "#111",
                          fontSize: "1.6rem", cursor: "pointer",
                          boxShadow: equippedHat === hat ? `2px 2px 0px ${world.accent}` : "none",
                        }}>
                        {hat}
                      </button>
                    ))}
                  </div>

                  {equippedHat && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 12, fontWeight: 600 }}>
                      Wearing: {equippedHat} · <span style={{ color: world.accent }}>Equipped</span>
                    </div>
                  )}

                  <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>PET BORDER COLOR</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} onClick={() => selectColor(c)}
                        style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: c,
                          border: petColor === c ? "3px solid #0a0a0a" : "2px solid transparent",
                          cursor: "pointer",
                          boxShadow: petColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ GROW TAB ══ */}
            {tab === "grow" && (
              <div className="space-y-4">
                {/* Evolution tree */}
                <div style={{ background: "#0c0c0c", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🌱 Evolution Roadmap</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {EVO_STAGES.map((stage, i) => {
                      const isActive = i === currentStageIdx;
                      const isDone = i < currentStageIdx;
                      const isLocked = i > currentStageIdx;
                      return (
                        <div key={stage.key}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 14px",
                            background: isActive ? `${world.accent}15` : isDone ? "#0a1a0a" : "#111",
                            border: `2.5px solid ${isActive ? world.accent : isDone ? "#4caf50" : "#1a1a1a"}`,
                            borderRadius: 14,
                            opacity: isLocked ? 0.6 : 1,
                            boxShadow: isActive ? `0 0 16px ${world.glowColor}` : "none",
                          }}>
                            <motion.div
                              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                              style={{ fontSize: "2rem", flexShrink: 0 }}>
                              {stage.emoji}
                            </motion.div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{stage.label}</span>
                                {isActive && (
                                  <span style={{ fontSize: 9, fontWeight: 700, background: world.accent, color: "#000", borderRadius: 4, padding: "1px 5px" }}>
                                    CURRENT
                                  </span>
                                )}
                                {isDone && <span style={{ fontSize: 12 }}>✅</span>}
                              </div>
                              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                                {stage.xpReq === 0 ? "Starting stage" : `Requires ${stage.xpReq.toLocaleString()} XP`}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {stage.abilities.map(ab => (
                                  <span key={ab} style={{
                                    fontSize: 10, fontWeight: 700,
                                    background: isDone || isActive ? "#0a0a0a" : "#1a1a1a",
                                    color: isDone || isActive ? "#c8ff00" : "#444",
                                    borderRadius: 5, padding: "2px 6px",
                                  }}>{ab}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {isActive && nextStage && (
                            <div style={{ margin: "6px 12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                <span style={{ fontSize: 10, color: "#555" }}>Progress to {nextStage.label}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: world.accent }}>
                                  {Math.round(evoProgress)}%
                                </span>
                              </div>
                              <div style={{ height: 6, background: "#1a1a1a", borderRadius: 6, overflow: "hidden" }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${evoProgress}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  style={{ height: "100%", background: world.accent, borderRadius: 6 }}
                                />
                              </div>
                              <div style={{ fontSize: 11, color: "#555", marginTop: 4, fontWeight: 600 }}>
                                Next evolution at {nextStage.xpReq.toLocaleString()} XP
                                · {Math.max(0, nextStage.xpReq - pet.xp).toLocaleString()} to go
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ background: "#0c0c0c", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Pet Stats</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "HP",  value: statHP,  color: "#4caf50", icon: "❤️" },
                      { label: "ATK", value: statATK, color: "#ff6b35", icon: "⚔️" },
                      { label: "SPD", value: statSPD, color: "#00e5ff", icon: "💨" },
                      { label: "LCK", value: statLCK, color: "#a855f7", icon: "🍀" },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: "#111", border: "2px solid #222", borderRadius: 12, padding: "10px 12px", boxShadow: `0 0 16px ${stat.color}33` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ddd" }}>{stat.icon} {stat.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: stat.color, textShadow: `0 0 8px ${stat.color}` }}>{stat.value}</span>
                        </div>
                        <div style={{ height: 8, background: "#222", borderRadius: 6, overflow: "hidden" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.value}%` }}
                            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                            style={{ height: "100%", background: stat.color, borderRadius: 6, boxShadow: `0 0 6px ${stat.color}` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>UNLOCKED ABILITIES</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pet.unlockedAbilities.length > 0
                        ? pet.unlockedAbilities.map(a => (
                            <span key={a} style={{ padding: "4px 10px", background: "#0a0a0a", color: "#c8ff00", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{a}</span>
                          ))
                        : <span style={{ fontSize: 12, color: "#555" }}>Level up to unlock abilities!</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Streak */}
                <div style={{ background: "#0c0c0c", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: "2rem" }}>🔥</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{pet.streak} day streak</div>
                    <div style={{ fontSize: 12, color: "#555" }}>Keep grinding every day!</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: world.accent }}>
                    {pet.totalBountiesCompleted} bounties done
                  </div>
                </div>
              </div>
            )}

            {/* ══ SQUAD TAB ══ */}
            {tab === "squad" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <div style={{
                  background: "linear-gradient(135deg, #001a1a, #00111a)",
                  border: "2.5px solid #06b6d4", borderRadius: 20, padding: "16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                    style={{ fontSize: "2.2rem" }}>👥</motion.div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#06b6d4", letterSpacing: "0.06em" }}>TON SQUAD</div>
                    <div style={{ fontSize: 12, color: "#555" }}>Utmana vänner · Dela segrar · Klättra ligan</div>
                  </div>
                  <div style={{
                    marginLeft: "auto", background: "#06b6d422", border: "2px solid #06b6d4",
                    borderRadius: 10, padding: "4px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#06b6d4" }}>{FRIENDS.length}</div>
                    <div style={{ fontSize: 9, color: "#555" }}>VÄNNER</div>
                  </div>
                </div>

                {FRIENDS.map(friend => {
                  const isChallenged = challengedFriend === friend.id;
                  return (
                    <motion.div key={friend.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      style={{
                        background: "#0d1214", border: `2px solid ${friend.online ? "#06b6d444" : "#1a2a3a"}`,
                        borderRadius: 18, padding: "14px 16px",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 16,
                          background: friend.online ? "#002222" : "#111",
                          border: `2px solid ${friend.online ? "#06b6d4" : "#222"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1.6rem",
                        }}>{friend.emoji}</div>
                        {friend.online && (
                          <div style={{
                            position: "absolute", bottom: 2, right: 2,
                            width: 10, height: 10, borderRadius: "50%",
                            background: "#22c55e", border: "2px solid #0d1214",
                          }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>@{friend.username}</span>
                          <span style={{ fontSize: 10, color: "#555" }}>Lv.{friend.level}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                          {friend.petEmoji} {friend.petName}
                        </div>
                        <div style={{ fontSize: 10, color: friend.online ? "#22c55e" : "#444", marginTop: 2, fontWeight: 600 }}>
                          {friend.online ? (friend.currentGame ? `🎮 ${friend.currentGame}` : "🟢 Online") : `⚫ ${friend.lastActivity}`}
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setChallengedFriend(friend.id);
                          showToast(`Utmanade ${friend.emoji} @${friend.username}! ⚔️`);
                          setTimeout(() => setChallengedFriend(null), 3000);
                        }}
                        style={{
                          padding: "8px 12px",
                          background: isChallenged ? "#c8ff0022" : "#0a1a00",
                          border: `2px solid ${isChallenged ? "#c8ff00" : "#333"}`,
                          borderRadius: 12, fontSize: 11, fontWeight: 700,
                          color: isChallenged ? "#c8ff00" : "#555",
                          cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        {isChallenged ? "✅ Skickat!" : "⚔️ UTMANA"}
                      </motion.button>
                    </motion.div>
                  );
                })}

                {/* Squad Leaderboard */}
                <div style={{
                  background: "#0d1214", border: "2.5px solid #ffde0066",
                  borderRadius: 20, padding: "16px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#ffde00", letterSpacing: "0.08em", marginBottom: 12 }}>
                    👑 SQUAD LIGA — DENNA VECKA
                  </div>
                  {[
                    { emoji: "🦊", name: "Du", level: pet.level, karma: user.karma, rank: 1 },
                    ...FRIENDS.slice(0, 4).map((f, i) => ({
                      emoji: f.emoji, name: `@${f.username}`,
                      level: f.level, karma: Math.floor(user.karma * (0.9 - i * 0.15)), rank: i + 2,
                    })),
                  ].map(entry => (
                    <div key={entry.rank} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0",
                      borderBottom: entry.rank < 5 ? "1px solid #1a2a3a" : "none",
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: entry.rank === 1 ? "#ffde0022" : "#111",
                        border: `1.5px solid ${entry.rank === 1 ? "#ffde00" : entry.rank === 2 ? "#aaa" : entry.rank === 3 ? "#cd7f32" : "#222"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        color: entry.rank === 1 ? "#ffde00" : entry.rank <= 3 ? "#ccc" : "#555",
                      }}>
                        {entry.rank === 1 ? "👑" : `#${entry.rank}`}
                      </div>
                      <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{entry.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: entry.rank === 1 ? "#ffde00" : "#fff" }}>{entry.name}</div>
                        <div style={{ fontSize: 10, color: "#555" }}>Lv.{entry.level}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#c8ff00" }}>⚡ {entry.karma.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                {/* Joint challenge */}
                <div style={{
                  background: "linear-gradient(135deg, #0a0010, #100022)",
                  border: "2.5px solid #8b5cf6", borderRadius: 20, padding: "16px",
                  boxShadow: "0 0 24px #8b5cf622",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#8b5cf6", letterSpacing: "0.06em", marginBottom: 8 }}>
                    🎯 GEMENSAM UTMANING
                  </div>
                  <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, marginBottom: 4 }}>
                    Gå 50 000 steg ihop med ditt squad!
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                    3 av 5 vänner har anslutit sig · Belöning: +500⚡ var
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#8b5cf6", fontWeight: 700 }}>32 450 / 50 000 steg</span>
                      <span style={{ fontSize: 11, color: "#555" }}>65%</span>
                    </div>
                    <div style={{ height: 8, background: "#1a0a2a", borderRadius: 999, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: "65%" }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ height: "100%", background: "linear-gradient(90deg, #8b5cf6, #c084fc)", borderRadius: 999 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: -4 }}>
                    {["🦊", "🌙", "⚔️"].map((e, i) => (
                      <div key={i} style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: "#1a0a2a", border: "2px solid #8b5cf6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem", marginLeft: i > 0 ? -8 : 0,
                      }}>{e}</div>
                    ))}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "#0a0a0a", border: "2px solid #333",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#555", marginLeft: -8,
                    }}>+2</div>
                  </div>
                </div>

              </div>
            )}

            {/* ══ VILLE TAB ══ */}
            {tab === "ville" && (
              <div className="space-y-4">

                <div style={{
                  background: "linear-gradient(135deg, #0d0800, #1a1000)",
                  border: "2.5px solid #ff9d00", borderRadius: 20, padding: "14px 16px",
                  boxShadow: "0 0 28px #ff9d0022",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#ff9d00", letterSpacing: "-0.02em" }}>🏙️ {pet.name}&apos;s Ville</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Lv.{villeUserLevel} Stad · {villePlaced.length}/{VILLE_COLS * VILLE_ROWS} byggnader</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>PASSIV INKOMST</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#c8ff00" }}>+{villePassiveKarma}<span style={{ fontSize: 11, color: "#555" }}>/h</span></div>
                    </div>
                  </div>
                  <button onClick={villeCollect} disabled={villeCollecting}
                    style={{
                      width: "100%", padding: "10px",
                      background: villeCollecting ? "#1a1a1a" : "linear-gradient(135deg, #ff9d00, #ffd000)",
                      border: "2.5px solid #0a0a0a", borderRadius: 12,
                      fontSize: 14, fontWeight: 900, color: "#0a0a0a",
                      cursor: villeCollecting ? "not-allowed" : "pointer",
                      boxShadow: villeCollecting ? "none" : "3px 3px 0 #0a0a0a",
                      opacity: villeCollecting ? 0.5 : 1,
                      letterSpacing: "0.04em",
                    }}>
                    {villeCollecting ? "⏳ SAMLAR IN..." : `🪙 SAMLA IN +${Math.round(villePassiveKarma * 0.5)} ⚡`}
                  </button>
                </div>

                <div style={{
                  background: "#060e06", border: "2.5px solid #ff9d00",
                  borderRadius: 20, padding: 14,
                  boxShadow: "0 0 20px #ff9d0018",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ff9d00", letterSpacing: "0.08em", marginBottom: 10 }}>
                    🗺️ STADSVY — tryck på en ruta
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${VILLE_COLS}, 1fr)`, gap: 6 }}>
                    {Array.from({ length: VILLE_ROWS }).map((_, row) =>
                      Array.from({ length: VILLE_COLS }).map((_, col) => {
                        const placed = villeGetCell(col, row);
                        const def = placed ? VILLE_BUILDINGS.find(b => b.id === placed.buildingId) : null;
                        const isSelected = villeSelectedCell?.col === col && villeSelectedCell?.row === row;
                        return (
                          <button key={`${col}-${row}`}
                            onClick={() => {
                              if (isSelected) { setVilleSelectedCell(null); }
                              else { setVilleSelectedCell({ col, row }); setVilleShopOpen(false); }
                            }}
                            style={{
                              aspectRatio: "1",
                              background: def ? `${def.color}18` : "#0a0a0a",
                              border: isSelected
                                ? "2.5px solid #ff9d00"
                                : def ? `2px solid ${def.color}66` : "2px solid #1a1a1a",
                              borderRadius: 10,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              cursor: "pointer", fontSize: "1.4rem",
                              boxShadow: isSelected ? "0 0 12px #ff9d0066" : def ? `0 0 8px ${def.color}22` : "none",
                              transition: "all 0.15s",
                            }}>
                            {def ? def.emoji : <span style={{ color: "#222", fontSize: "1rem" }}>+</span>}
                            {def && <span style={{ fontSize: 8, color: def.color, fontWeight: 700, marginTop: 2 }}>{def.name.slice(0, 5)}</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {villeSelectedCell && (() => {
                  const placed = villeGetCell(villeSelectedCell.col, villeSelectedCell.row);
                  const def = placed ? VILLE_BUILDINGS.find(b => b.id === placed.buildingId) : null;
                  return (
                    <div style={{
                      background: def ? `${def.color}12` : "#0a0a1a",
                      border: `2.5px solid ${def ? def.color : "#4488ff"}`,
                      borderRadius: 20, padding: "14px 16px",
                      boxShadow: def ? `0 0 20px ${def.color}22` : "0 0 20px #4488ff22",
                    }}>
                      {def ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: "2rem" }}>{def.emoji}</span>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: def.color }}>{def.name}</div>
                              <div style={{ fontSize: 11, color: "#666" }}>{def.desc}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            <div style={{ flex: 1, background: "#111", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>INKOMST</div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: "#c8ff00" }}>+{def.karmaPerHour}/h</div>
                            </div>
                            <div style={{ flex: 1, background: "#111", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>XP BONUS</div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: "#00e5ff" }}>+{def.xpBonus}%</div>
                            </div>
                          </div>
                          <button onClick={() => villeDemolish(villeSelectedCell.col, villeSelectedCell.row)}
                            style={{
                              width: "100%", padding: "9px",
                              background: "#1a0000", border: "2px solid #ff2d2d",
                              borderRadius: 10, fontSize: 13, fontWeight: 700,
                              color: "#ff2d2d", cursor: "pointer",
                            }}>
                            🏗️ RIV ({def.id === "house" ? "gratis" : `+${Math.round(def.cost * 0.4)}⚡ refund`})
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#4488ff", marginBottom: 10 }}>
                            📍 Tom tomt — välj en byggnad
                          </div>
                          <button onClick={() => setVilleShopOpen(s => !s)}
                            style={{
                              width: "100%", padding: "10px",
                              background: "linear-gradient(135deg, #1a2aff, #4488ff)",
                              border: "2.5px solid #0a0a0a", borderRadius: 12,
                              fontSize: 14, fontWeight: 900, color: "#fff",
                              cursor: "pointer", boxShadow: "3px 3px 0 #0a0a0a",
                              letterSpacing: "0.04em",
                            }}>
                            🏪 {villeShopOpen ? "STÄNG BUTIK" : "ÖPPNA BUTIK"}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}

                {villeShopOpen && villeSelectedCell && !villeGetCell(villeSelectedCell.col, villeSelectedCell.row) && (
                  <div style={{ background: "#060610", border: "2.5px solid #4488ff", borderRadius: 20, padding: 14, boxShadow: "0 0 24px #4488ff22" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#4488ff", letterSpacing: "0.08em", marginBottom: 10 }}>
                      🏪 BYGGNADSBUTIK
                    </div>
                    <div className="space-y-2">
                      {VILLE_BUILDINGS.map(b => {
                        const canAfford = user.karma >= b.cost;
                        const alreadyBuilt = villePlacedIds.has(b.id);
                        const locked = b.unlockLevel > villeUserLevel;
                        const disabled = alreadyBuilt || locked || !canAfford;
                        return (
                          <button key={b.id} onClick={() => villeBuild(b)} disabled={disabled}
                            style={{
                              width: "100%", padding: "10px 12px",
                              background: alreadyBuilt ? "#0a0a0a" : canAfford && !locked ? `${b.color}14` : "#0d0d0d",
                              border: `2px solid ${alreadyBuilt ? "#222" : canAfford && !locked ? b.color : "#333"}`,
                              borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: disabled ? 0.55 : 1, textAlign: "left",
                            }}>
                            <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{b.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: alreadyBuilt ? "#555" : b.color }}>
                                {b.name}
                                {alreadyBuilt && <span style={{ marginLeft: 6, fontSize: 10, color: "#555" }}>✓ BYGGD</span>}
                                {locked && <span style={{ marginLeft: 6, fontSize: 10, color: "#ff4444" }}>🔒 Lv.{b.unlockLevel}</span>}
                              </div>
                              <div style={{ fontSize: 10, color: "#555" }}>{b.desc} · +{b.karmaPerHour}/h</div>
                            </div>
                            {!alreadyBuilt && !locked && (
                              <div style={{ fontSize: 13, fontWeight: 900, color: canAfford ? "#c8ff00" : "#ff4444", flexShrink: 0 }}>
                                {b.cost === 0 ? "GRATIS" : `⚡${b.cost}`}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ background: "#0a0a0a", border: "2px solid #222", borderRadius: 20, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.08em", marginBottom: 10 }}>📊 STADSSTATISTIK</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "BYGGNADER", value: `${villePlaced.length}/${VILLE_COLS * VILLE_ROWS}`, color: "#ff9d00" },
                      { label: "PASSIV/H",  value: `+${villePassiveKarma}⚡`,                         color: "#c8ff00" },
                      { label: "STADSNIVÅ", value: `Lv.${villeUserLevel}`,                            color: "#00e5ff" },
                      { label: "TOTAL XP",  value: user.xp.toLocaleString(),                          color: "#8b5cf6" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#111", borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ fontSize: 9, color: "#444", fontWeight: 600, letterSpacing: "0.08em" }}>{s.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: s.color, marginTop: 2 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ── FIXED BOTTOM NAV ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        background: "#050505",
        borderTop: `1.5px solid ${tab === "room" ? world.accent + "44" : "#1a1a1a"}`,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        display: "flex",
      }}>
        {NAV_TABS.map(({ key, icon, label }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              style={{
                flex: 1, border: "none", background: "transparent",
                cursor: "pointer", padding: "4px 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, position: "relative",
              }}
            >
              {/* Active top indicator line */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
                      background: world.accent,
                      borderRadius: "0 0 2px 2px",
                      boxShadow: `0 2px 8px ${world.accent}`,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.span
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontSize: "1.4rem", lineHeight: 1,
                  filter: isActive ? "none" : "grayscale(1) opacity(0.35)",
                }}
              >
                {icon}
              </motion.span>

              {/* Label */}
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                color: isActive ? world.accent : "#3a3a3a",
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
