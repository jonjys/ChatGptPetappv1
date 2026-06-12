"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Flame, Gamepad2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import PetNeedsBar from "@/components/pet/PetNeeds";
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
    user, addXP, addKarma, worldId, streak, activities,
  } = useApp();

  // ── Core UI state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"room" | "train" | "bond" | "grow">("room");
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

  // ─── Stats derived from pet ───────────────────────────────────────────────
  const statHP  = Math.min(100, pet.level * 5);
  const statATK = Math.min(100, pet.level * 3 + (pet.class === "Grinder Beast" ? 15 : 5));
  const statSPD = Math.min(100, pet.level * 4);
  const statLCK = Math.min(100, pet.level * 2 + (pet.class === "Merchant King" ? 20 : 0));

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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {pet.name}
            <span style={{ fontSize: "1rem", color: "#888", marginLeft: 8 }}>· {evolLabel}</span>
          </h1>
          <p style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em" }}>
            {pet.class.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCritical && (
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }}
              style={{ background: "#ff2d2d", color: "#fff", border: "2px solid #0a0a0a", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
              ⚠️ NEEDS CARE
            </motion.div>
          )}
          <Link href="/games">
            <div style={{ width: 36, height: 36, background: "#0a0a0a", border: "2px solid #0a0a0a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 3px 0px #c8ff00" }}>
              <Gamepad2 size={18} color="#c8ff00" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-3 p-3 text-center"
            style={{ background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 50, position: "relative" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-3 pb-6 space-y-4">

        {/* ── XP Bar (always visible) ── */}
        <div className="neo-card p-3">
          <XPBar xp={pet.xp} xpToNext={xpToNext} progress={progress} level={pet.level} compact />
        </div>

        {/* ── Tab Nav ── */}
        <div className="flex gap-2">
          {(["room", "train", "bond", "grow"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "9px 4px",
                background: tab === t ? "#0a0a0a" : "#f5f0e8",
                border: "2.5px solid #0a0a0a",
                borderRadius: 12,
                fontSize: 11, fontWeight: 700,
                color: tab === t ? "#c8ff00" : "#0a0a0a",
                letterSpacing: "0.04em",
                cursor: "pointer",
                textTransform: "uppercase",
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* ══════════════════ ROOM TAB ══════════════════ */}
        {tab === "room" && (
          <div className="space-y-4">

            {/* Immersive pet room */}
            <div className="neo-card" style={{ overflow: "hidden", position: "relative" }}>

              {/* World badge top-right */}
              <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10,
                background: `${world.accent}22`, border: `1.5px solid ${world.accent}`,
                borderRadius: 8, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.85rem" }}>{world.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: world.accent, letterSpacing: "0.06em" }}>{world.name}</span>
              </div>

              {/* Weather badge top-left */}
              <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10,
                background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: "3px 8px",
                display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.85rem" }}>{weather.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{weather.label}</span>
              </div>

              {/* Room area */}
              <div
                style={{
                  height: 280,
                  background: world.petRoomBg,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Floating dust particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div key={i}
                    animate={{ y: [0, -18, 0], x: [0, (i % 2 === 0 ? 4 : -4), 0], opacity: [0.15, 0.4, 0.15] }}
                    transition={{ duration: 3.5 + i * 0.7, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      width: 4, height: 4,
                      borderRadius: "50%",
                      background: world.accent,
                      top: `${20 + i * 12}%`,
                      left: `${10 + i * 14}%`,
                      pointerEvents: "none",
                    }}
                  />
                ))}

                {/* World ambient emojis */}
                {world.petRoomEmojis.slice(0, 3).map((emoji, i) => (
                  <motion.div key={i}
                    animate={{ y: [0, -5, 0], opacity: [0.5, 0.7, 0.5] }}
                    transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8 }}
                    style={{
                      position: "absolute",
                      top: 14 + i * 16,
                      left: i === 0 ? 18 : i === 1 ? "38%" : undefined,
                      right: i === 2 ? 18 : undefined,
                      fontSize: ["1.4rem", "1.1rem", "1rem"][i],
                      pointerEvents: "none",
                    }}>
                    {emoji}
                  </motion.div>
                ))}

                {/* Ground items */}
                {world.petRoomEmojis.slice(3).map((emoji, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    bottom: 36,
                    left: i === 0 ? 14 : i === 1 ? "30%" : undefined,
                    right: i === 2 ? 14 : undefined,
                    fontSize: ["1.8rem", "1.3rem", "1.6rem"][i],
                    opacity: 0.75,
                  }}>
                    {emoji}
                  </div>
                ))}

                {/* Food bowl (drag target visual) */}
                <div style={{ position: "absolute", bottom: 38, left: "50%", transform: "translateX(-50%)" }}>
                  <div style={{ fontSize: "1.5rem", opacity: 0.6 }}>🍜</div>
                </div>

                {/* Ground strip */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 36,
                  background: `${world.accent}22`,
                  borderTop: `2px solid ${world.accent}44`,
                }} />

                {/* Glow pulse behind pet */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.15, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    bottom: 52, left: "50%", transform: "translateX(-50%)",
                    width: 120, height: 120, borderRadius: "50%",
                    background: `radial-gradient(circle, ${world.glowColor} 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />

                {/* Critical ring */}
                {isCritical && (
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    style={{
                      position: "absolute",
                      bottom: 44, left: "50%", transform: "translateX(-50%)",
                      width: 100, height: 100, borderRadius: "50%",
                      border: "3px solid #ff2d2d",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Pet container with hat + tap */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 36,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={handlePetTap}
                >
                  {/* Tap particles */}
                  <AnimatePresence>
                    {particles.map(p => (
                      <motion.div key={p.id}
                        initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -50, scale: 1.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.85, ease: "easeOut" }}
                        style={{
                          position: "absolute",
                          left: p.x - 10,
                          top: p.y - 60,
                          fontSize: "1.2rem",
                          pointerEvents: "none",
                          zIndex: 20,
                        }}>
                        💗
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Hat */}
                  {equippedHat && (
                    <div style={{
                      fontSize: "1.4rem",
                      lineHeight: 1,
                      marginBottom: -4,
                      filter: `drop-shadow(0 2px 4px ${world.glowColor})`,
                    }}>
                      {equippedHat}
                    </div>
                  )}

                  {/* Pet emoji */}
                  <motion.div
                    animate={
                      petAction === "petting"  ? { scale: [1, 1.25, 0.95, 1.1, 1], rotate: [0, -8, 8, 0] } :
                      petAction === "eating"   ? { scale: [1, 1.2, 0.9, 1.1, 1], rotate: [0, -5, 5, 0] } :
                      petAction === "playing"  ? { y: [0, -22, 0, -14, 0], rotate: [0, 12, -12, 0] } :
                      petAction === "sleeping" ? { rotate: [0, 6, 6] } :
                      petMoodComputed === "excited"
                        ? { y: [0, -14, 0], scale: [1, 1.05, 1], rotate: [0, -3, 3, 0] }
                        : { y: [0, -10, 0], rotate: [0, -2, 2, 0] }
                    }
                    transition={
                      petAction
                        ? { duration: 0.8 }
                        : { duration: petMoodComputed === "excited" ? 1.8 : 3, repeat: Infinity, ease: "easeInOut" }
                    }
                    style={{
                      width: 80, height: 80,
                      background: "#fff",
                      border: `3px solid #0a0a0a`,
                      borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "2.8rem",
                      boxShadow: `4px 4px 0px ${petColor}, 0 0 16px ${world.glowColor}`,
                      position: "relative",
                    }}
                  >
                    {petEmoji}

                    {/* Love bubble */}
                    <AnimatePresence>
                      {loveBubble && (
                        <motion.div
                          key="love"
                          initial={{ opacity: 0, scale: 0.6, y: 0 }}
                          animate={{ opacity: 1, scale: 1, y: -44 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.4 }}
                          style={{
                            position: "absolute",
                            top: 0, left: "50%",
                            transform: "translateX(-50%)",
                            background: "#fff",
                            border: "2px solid #0a0a0a",
                            borderRadius: 10,
                            padding: "3px 8px",
                            fontSize: 12, fontWeight: 700,
                            whiteSpace: "nowrap",
                            boxShadow: "2px 2px 0px #0a0a0a",
                            zIndex: 30,
                          }}>
                          Love! 💗
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Nameplate */}
                  <div style={{
                    marginTop: 4,
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}>
                    {pet.name}
                  </div>
                </div>

                {/* Speech bubble */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`speech-${speechIdx}`}
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: "absolute",
                      top: 48, right: 14,
                      background: "#fff",
                      border: "2px solid #0a0a0a",
                      borderRadius: 12,
                      padding: "5px 10px",
                      fontSize: 11, fontWeight: 600,
                      maxWidth: 120,
                      boxShadow: "2px 2px 0px #0a0a0a",
                      lineHeight: 1.3,
                      zIndex: 5,
                    }}>
                    {currentSpeech}
                  </motion.div>
                </AnimatePresence>

                {/* Mood emoji top-left */}
                <div style={{ position: "absolute", top: 46, left: 12, fontSize: "1.3rem", zIndex: 5 }}>
                  {moodEmoji}
                </div>
              </div>

              {/* Needs bar under room */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={15} color="#ff6b35" fill="#ff6b35" />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em" }}>PET VITALS</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>Tap pet to love! 💗</span>
                </div>
                <PetNeedsBar needs={pet.needs} />
              </div>
            </div>

            {/* Action bar */}
            <div className="neo-card p-4">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10, color: "#555" }}>
                ACTIONS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {/* FEED */}
                <button onClick={() => handleFeed("basic")}
                  style={{ padding: "10px 4px", background: "#fff3ee", border: "2.5px solid #ff6b35", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem" }}>🍖</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b35", marginTop: 3 }}>FEED</div>
                  <div style={{ fontSize: 10, color: "#888" }}>-50 ⚡</div>
                </button>
                {/* FEAST */}
                <button onClick={() => handleFeed("premium")}
                  style={{ padding: "10px 4px", background: "#fff0e0", border: "2.5px solid #ffde00", borderRadius: 12, cursor: "pointer", textAlign: "center", position: "relative" }}>
                  <div style={{ fontSize: "1.3rem" }}>🥩</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e6a000", marginTop: 3 }}>FEAST</div>
                  <div style={{ fontSize: 10, color: "#888" }}>-150 ⚡</div>
                  <span style={{ position: "absolute", top: -6, right: -6, background: "#ff2d8d", color: "#fff", borderRadius: 4, fontSize: 8, fontWeight: 700, padding: "1px 4px", border: "1.5px solid #0a0a0a" }}>BEST</span>
                </button>
                {/* PLAY */}
                <button onClick={handlePlay}
                  style={{ padding: "10px 4px", background: "#f0fff0", border: "2.5px solid #4caf50", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem" }}>🎾</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2e7d32", marginTop: 3 }}>PLAY</div>
                  <div style={{ fontSize: 10, color: "#888" }}>-18 ⚡</div>
                </button>
                {/* REST */}
                <button onClick={handleRest}
                  style={{ padding: "10px 4px", background: "#f0f4ff", border: "2.5px solid #3b82f6", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: "1.3rem" }}>💤</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginTop: 3 }}>REST</div>
                  <div style={{ fontSize: 10, color: "#888" }}>+45 ⚡</div>
                </button>
                {/* BATTLE */}
                <Link href="/games/battle" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "10px 4px", background: "#fff5ee", border: "2.5px solid #ff6b35", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem" }}>⚔️</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b35", marginTop: 3 }}>BATTLE</div>
                    <div style={{ fontSize: 10, color: "#888" }}>+karma</div>
                  </div>
                </Link>
                {/* HEAL / SHOP */}
                <Link href="/shop" style={{ textDecoration: "none" }}>
                  <div style={{ padding: "10px 4px", background: "#f5f0ff", border: "2.5px solid #8b5cf6", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem" }}>💊</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginTop: 3 }}>HEAL</div>
                    <div style={{ fontSize: 10, color: "#888" }}>shop</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TRAIN TAB ══════════════════ */}
        {tab === "train" && (
          <div className="neo-card p-4 space-y-4">
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
                  { label: "Hits", val: trainHits },
                  { label: "Streak", val: `${trainStreak}${trainStreak >= 3 ? ` ×${Math.min(3, Math.floor(trainStreak / 3) + 1)}` : ""}` },
                  { label: "XP", val: `+${trainXP}` },
                  { label: "Left", val: TRAIN_MAX - trainHits },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: "#f5f0e8", border: "2px solid #0a0a0a", borderRadius: 10, padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: "#888", fontWeight: 600, letterSpacing: "0.04em" }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Play area */}
            {trainActive && !trainDone && (
              <div style={{ position: "relative", width: "100%", height: 200, background: "#0a0a0a", borderRadius: 14, border: "3px solid #c8ff00", overflow: "hidden" }}>
                {/* Float indicators */}
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
                        left: trainTarget.x,
                        top: trainTarget.y,
                        width: 48, height: 48,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${world.accent} 0%, ${world.glowColor} 100%)`,
                        border: "3px solid #fff",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transform: "translate(-50%, -50%)",
                        boxShadow: `0 0 16px ${world.glowColor}`,
                      }}>
                      ✦
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Progress strip */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "#222" }}>
                  <div style={{ height: "100%", background: "#c8ff00", width: `${(trainHits / TRAIN_MAX) * 100}%`, transition: "width 0.2s" }} />
                </div>
              </div>
            )}

            {/* Results */}
            {trainDone && (
              <div style={{ background: "#f5f0e8", border: "2.5px solid #0a0a0a", borderRadius: 14, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: 4 }}>🏆</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Training Complete!</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round((trainHits / TRAIN_MAX) * 100)}%</div>
                    <div style={{ fontSize: 10, color: "#888" }}>ACCURACY</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#4caf50" }}>+{trainXP}</div>
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
                  background: trainCooldown > 0 ? "#e8e3d8" : "#0a0a0a",
                  color: trainCooldown > 0 ? "#aaa" : "#c8ff00",
                  border: "2.5px solid #0a0a0a",
                  borderRadius: 14,
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
                  background: "#f5f0e8", border: "2.5px solid #0a0a0a",
                  borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>
                Back
              </button>
            )}
          </div>
        )}

        {/* ══════════════════ BOND TAB ══════════════════ */}
        {tab === "bond" && (
          <div className="space-y-4">
            {/* Diary */}
            <div className="neo-card p-4">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                📖 Bond Diary
              </div>
              <div style={{
                background: "#fffef5",
                border: "2px solid #e8e3d8",
                borderRadius: 12,
                overflow: "hidden",
              }}>
                {diaryAll.map((entry, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px",
                    borderBottom: i < diaryAll.length - 1 ? "1px solid #e8e3d8" : "none",
                    background: i % 2 === 0 ? "#fffef5" : "#fffdf0",
                  }}>
                    <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{entry.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{entry.text}</div>
                      <div style={{ fontSize: 10, color: "#aaa" }}>{entry.time}</div>
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
            <div className="neo-card p-4">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🎩 Accessories</div>

              {/* Hat picker */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>HATS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {HAT_OPTIONS.map(hat => (
                  <button key={hat} onClick={() => selectHat(hat)}
                    style={{
                      width: 48, height: 48,
                      borderRadius: 12,
                      border: equippedHat === hat ? `2.5px solid ${world.accent}` : "2px solid #e8e3d8",
                      background: equippedHat === hat ? `${world.accent}18` : "#f5f0e8",
                      fontSize: "1.6rem",
                      cursor: "pointer",
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

              {/* Color picker */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>PET BORDER COLOR</div>
              <div style={{ display: "flex", gap: 8 }}>
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => selectColor(c)}
                    style={{
                      width: 36, height: 36,
                      borderRadius: "50%",
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

        {/* ══════════════════ GROW TAB ══════════════════ */}
        {tab === "grow" && (
          <div className="space-y-4">
            {/* Evolution tree */}
            <div className="neo-card p-4">
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
                        background: isActive ? `${world.accent}15` : isDone ? "#f0fff4" : "#f5f0e8",
                        border: `2.5px solid ${isActive ? world.accent : isDone ? "#4caf50" : "#e8e3d8"}`,
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
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{stage.label}</span>
                            {isActive && (
                              <span style={{ fontSize: 9, fontWeight: 700, background: world.accent, color: "#fff", borderRadius: 4, padding: "1px 5px" }}>
                                CURRENT
                              </span>
                            )}
                            {isDone && <span style={{ fontSize: 12 }}>✅</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                            {stage.xpReq === 0 ? "Starting stage" : `Requires ${stage.xpReq.toLocaleString()} XP`}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {stage.abilities.map(ab => (
                              <span key={ab} style={{
                                fontSize: 10, fontWeight: 700,
                                background: isDone || isActive ? "#0a0a0a" : "#e8e3d8",
                                color: isDone || isActive ? "#c8ff00" : "#aaa",
                                borderRadius: 5,
                                padding: "2px 6px",
                              }}>{ab}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar between current and next */}
                      {isActive && nextStage && (
                        <div style={{ margin: "6px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: "#888" }}>Progress to {nextStage.label}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: world.accent }}>
                              {Math.round(evoProgress)}%
                            </span>
                          </div>
                          <div style={{ height: 6, background: "#e8e3d8", borderRadius: 6, overflow: "hidden" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${evoProgress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              style={{ height: "100%", background: world.accent, borderRadius: 6 }}
                            />
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 4, fontWeight: 600 }}>
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
            <div className="neo-card p-4">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Pet Stats</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "HP", value: statHP,  color: "#4caf50", icon: "❤️" },
                  { label: "ATK", value: statATK, color: "#ff6b35", icon: "⚔️" },
                  { label: "SPD", value: statSPD, color: "#00e5ff", icon: "💨" },
                  { label: "LCK", value: statLCK, color: "#a855f7", icon: "🍀" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: "#f5f0e8", border: "2px solid #e8e3d8", borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{stat.icon} {stat.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                    </div>
                    <div style={{ height: 6, background: "#e8e3d8", borderRadius: 6, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                        style={{ height: "100%", background: stat.color, borderRadius: 6 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Abilities */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>UNLOCKED ABILITIES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pet.unlockedAbilities.length > 0
                    ? pet.unlockedAbilities.map(a => (
                        <span key={a} style={{ padding: "4px 10px", background: "#0a0a0a", color: "#c8ff00", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{a}</span>
                      ))
                    : <span style={{ fontSize: 12, color: "#aaa" }}>Level up to unlock abilities!</span>
                  }
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="neo-card p-4 flex items-center gap-4">
              <div style={{ fontSize: "2rem" }}>🔥</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{pet.streak} day streak</div>
                <div style={{ fontSize: 12, color: "#888" }}>Keep grinding every day!</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: world.accent }}>
                {pet.totalBountiesCompleted} bounties done
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
