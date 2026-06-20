"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { calculateLevel } from "@/lib/xp-system";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { getPetEmoji } from "@/lib/pet-evolution";

// ─── Aura System ──────────────────────────────────────────────────────────────
type AuraLevel = "NOVICE" | "RISING" | "BLAZING" | "LEGENDARY" | "MYTHIC";

interface AuraData {
  level: AuraLevel;
  score: number;
  label: string;
  color: string;
  glowColor: string;
  gradient: string;
  rings: { color: string; opacity: number; speed: number; size: number; reverse: boolean }[];
  rarity: string;
}

function computeAura(karma: number, streak: number, level: number, bondLevel: number): AuraData {
  const score = Math.floor(streak * 15 + level * 60 + karma * 0.015 + bondLevel * 3);

  if (score >= 800) return {
    level: "MYTHIC", score, label: "MYTHIC AURA", rarity: "TOP 0.1%",
    color: "#ff2d8d", glowColor: "#ff2d8d",
    gradient: "linear-gradient(135deg, #1a0020 0%, #2d0040 50%, #1a0020 100%)",
    rings: [
      { color: "#ff2d8d", opacity: 0.9, speed: 3, size: 1.0, reverse: false },
      { color: "#a855f7", opacity: 0.7, speed: 4.5, size: 1.15, reverse: true },
      { color: "#4488ff", opacity: 0.5, speed: 6, size: 1.3, reverse: false },
      { color: "#ff2d8d", opacity: 0.3, speed: 8, size: 1.48, reverse: true },
    ],
  };

  if (score >= 400) return {
    level: "LEGENDARY", score, label: "LEGENDARY AURA", rarity: "TOP 1%",
    color: "#ffd700", glowColor: "#ffcc00",
    gradient: "linear-gradient(135deg, #1a1000 0%, #2d2000 50%, #1a1000 100%)",
    rings: [
      { color: "#ffd700", opacity: 0.9, speed: 3.5, size: 1.0, reverse: false },
      { color: "#ff6b35", opacity: 0.6, speed: 5, size: 1.15, reverse: true },
      { color: "#ffd700", opacity: 0.4, speed: 7, size: 1.3, reverse: false },
    ],
  };

  if (score >= 150) return {
    level: "BLAZING", score, label: "BLAZING AURA", rarity: "TOP 5%",
    color: "#ff6b35", glowColor: "#ff4500",
    gradient: "linear-gradient(135deg, #1a0800 0%, #2d1200 50%, #1a0800 100%)",
    rings: [
      { color: "#ff6b35", opacity: 0.85, speed: 4, size: 1.0, reverse: false },
      { color: "#ffcc00", opacity: 0.5, speed: 6, size: 1.15, reverse: true },
      { color: "#ff6b35", opacity: 0.3, speed: 9, size: 1.3, reverse: false },
    ],
  };

  if (score >= 40) return {
    level: "RISING", score, label: "RISING AURA", rarity: "TOP 20%",
    color: "#c8ff00", glowColor: "#c8ff00",
    gradient: "linear-gradient(135deg, #0d1400 0%, #1a2800 50%, #0d1400 100%)",
    rings: [
      { color: "#c8ff00", opacity: 0.8, speed: 5, size: 1.0, reverse: false },
      { color: "#44ff88", opacity: 0.4, speed: 8, size: 1.2, reverse: true },
    ],
  };

  return {
    level: "NOVICE", score, label: "NOVICE AURA", rarity: "STARTER",
    color: "#888", glowColor: "#666",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)",
    rings: [
      { color: "#888", opacity: 0.6, speed: 7, size: 1.0, reverse: false },
    ],
  };
}

// ─── Rotating Aura Ring ───────────────────────────────────────────────────────
function AuraRing({ ring, idx }: { ring: AuraData["rings"][0]; idx: number }) {
  const size = 140 * ring.size;
  const ref = useRef<HTMLDivElement>(null);
  const angle = useRef(idx * 45);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      angle.current += (ring.reverse ? -0.4 : 0.4) / ring.speed;
      if (ref.current) {
        ref.current.style.transform = `translate(-50%, -50%) rotate(${angle.current}deg)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ring.reverse, ring.speed]);

  return (
    <div ref={ref} style={{
      position: "absolute", left: "50%", top: "50%",
      width: size, height: size,
      border: `2.5px solid ${ring.color}`,
      borderRadius: "50%",
      opacity: ring.opacity,
      boxShadow: `0 0 12px ${ring.color}66, inset 0 0 8px ${ring.color}22`,
      borderTopColor: "transparent",
      borderLeftColor: "transparent",
      pointerEvents: "none",
    }} />
  );
}

// ─── Daily Vibe Options ───────────────────────────────────────────────────────
const VIBES = [
  { id: "grind",   emoji: "🔥", label: "Grinding Hard",     color: "#ff6b35" },
  { id: "rest",    emoji: "😴", label: "Rest Day",           color: "#4488ff" },
  { id: "pb",      emoji: "🏆", label: "PB Hunting",        color: "#ffd700" },
  { id: "easy",    emoji: "🌿", label: "Taking It Easy",    color: "#44ff88" },
  { id: "battle",  emoji: "⚔️", label: "Battle Mode",       color: "#ff2d8d" },
  { id: "wealth",  emoji: "💰", label: "Wealth Building",   color: "#c8ff00" },
  { id: "gaming",  emoji: "🎮", label: "Gaming All Day",    color: "#a855f7" },
  { id: "main",    emoji: "✨", label: "Main Character",    color: "#fff" },
];
const VIBE_KEY = "karma_daily_vibe_v1";

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target, color }: { target: number; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1800;
    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{displayed.toLocaleString()}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CardPage() {
  const { user, pet, streak, achievements, bondLevel, showToast, addKarma, addXP } = useApp();
  const level = calculateLevel(user.xp);
  const aura = computeAura(user.karma, streak, level, bondLevel);

  const petEmoji = pet.skinId?.startsWith("emoji:") ? pet.skinId.slice(6) : getPetEmoji(pet.evolution, pet.class);

  const [vibe, setVibe] = useState<typeof VIBES[0]>(VIBES[0]);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const [boostPower, setBoostPower] = useState(0);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(VIBE_KEY);
      if (saved) {
        const found = VIBES.find(v => v.id === saved);
        if (found) setVibe(found);
      }
    } catch {}
  }, []);

  const handleBoost = useCallback(() => {
    if (boosted) return;
    setBoosted(true);
    setBoostPower(10);
    addKarma(10, "Karma Card Boost");
    addXP(5);
    showToast("AURA BOOSTED! 💚", 10, "#c8ff00", "⚡");
  }, [boosted, addKarma, addXP, showToast]);

  const handleShare = useCallback(() => {
    const text = `🃏 KARMA CARD\n\n${petEmoji} ${pet.name}\n⚡ POWER: ${aura.score + boostPower}\n🌟 LV ${level} | 🔥 ${streak}d streak\n💎 ${user.karma.toLocaleString()} Karma\n🎯 Aura: ${aura.label}\n\nPlay on KarmaPet 🐾`;
    try {
      navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
    showToast("Card copied! Share it 📤", undefined, "#4488ff", "📋");
    setTimeout(() => setCopied(false), 2500);
  }, [pet.name, petEmoji, aura, boostPower, level, streak, user.karma, showToast]);

  const handleVibeSelect = (v: typeof VIBES[0]) => {
    setVibe(v);
    try { localStorage.setItem(VIBE_KEY, v.id); } catch {}
    setShowVibePicker(false);
    showToast(`Vibe set: ${v.emoji} ${v.label}`, undefined, v.color, v.emoji);
  };

  const topAchievements = achievements
    .map(id => ACHIEVEMENTS.find(a => a.id === id))
    .filter(Boolean)
    .slice(0, 4) as typeof ACHIEVEMENTS;

  const totalPower = aura.score + boostPower;

  if (!mounted) return null;

  return (
    <div style={{ background: "#050505", minHeight: "100dvh", color: "#fff", overflowX: "hidden" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "rgba(5,5,5,0.95)", backdropFilter: "blur(12px)", borderBottom: "2px solid #1a1a1a" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
            KARMA <span style={{ color: aura.color }}>CARD</span>
          </h1>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 700, letterSpacing: "0.08em", marginTop: -2 }}>
            YOUR SHAREABLE IDENTITY
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            background: aura.color + "22", border: `1.5px solid ${aura.color}66`,
            color: aura.color, borderRadius: 6, padding: "3px 10px",
          }}>
            {aura.rarity}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-4">

        {/* ── THE CARD ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.75, rotateY: -25 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.1 }}
          style={{
            position: "relative",
            background: aura.gradient,
            border: `2.5px solid ${aura.color}55`,
            borderRadius: 28,
            padding: "28px 20px 24px",
            boxShadow: `0 0 60px ${aura.glowColor}22, 0 0 120px ${aura.glowColor}08, 3px 3px 0px #000`,
            overflow: "visible",
          }}
        >
          {/* Background shimmer */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", pointerEvents: "none",
          }}>
            <motion.div
              animate={{ x: ["−100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 2 }}
              style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: "40%",
                background: `linear-gradient(90deg, transparent, ${aura.color}08, transparent)`,
                transform: "skewX(-20deg)",
              }}
            />
          </div>

          {/* Aura label */}
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 900, letterSpacing: "0.18em",
              color: aura.color, textTransform: "uppercase",
              textShadow: `0 0 12px ${aura.color}88`,
            }}>
              ✦ {aura.label} ✦
            </span>
          </div>

          {/* Pet + Aura rings */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
              {aura.rings.map((ring, i) => (
                <AuraRing key={i} ring={ring} idx={i} />
              ))}
              {/* Glow pulse */}
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.05, 0.9] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 80, height: 80, borderRadius: "50%",
                  background: `radial-gradient(circle, ${aura.color}22 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              {/* Pet emoji */}
              <div style={{
                position: "absolute", left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "3.2rem", lineHeight: 1,
                filter: `drop-shadow(0 0 16px ${aura.color}88)`,
                zIndex: 2,
              }}>
                {petEmoji}
              </div>
            </div>
          </div>

          {/* Pet name + vibe */}
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", marginBottom: 4 }}>
              {pet.name}
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowVibePicker(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: vibe.color + "18", border: `1.5px solid ${vibe.color}55`,
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                fontSize: 12, fontWeight: 700, color: vibe.color,
              }}
            >
              {vibe.emoji} {vibe.label} <span style={{ color: "#555", fontWeight: 400 }}>▼</span>
            </motion.button>
          </div>

          {/* Power Score */}
          <div style={{
            background: "#00000055",
            border: `1.5px solid ${aura.color}33`,
            borderRadius: 18, padding: "16px 20px",
            textAlign: "center", marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.12em", marginBottom: 4 }}>
              POWER SCORE
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>
              <AnimatedNumber target={totalPower} color={aura.color} />
            </div>
            {boostPower > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 11, color: "#c8ff00", fontWeight: 700, marginTop: 4 }}
              >
                +{boostPower} BOOST ACTIVE ⚡
              </motion.div>
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "KARMA",  value: user.karma.toLocaleString(), icon: "⚡", color: "#c8ff00" },
              { label: "STREAK", value: `${streak}d`,                icon: "🔥", color: "#ff6b35" },
              { label: "LEVEL",  value: `LV ${level}`,               icon: "🌟", color: "#ffd700" },
              { label: "BOND",   value: `${bondLevel}`,              icon: "💚", color: "#44ff88" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#00000044",
                border: `1.5px solid ${stat.color}22`,
                borderRadius: 14, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: "1.3rem" }}>{stat.icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.08em" }}>{stat.label}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: stat.color }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          {topAchievements.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 8 }}>
                ACHIEVEMENTS UNLOCKED
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {topAchievements.map(a => (
                  <motion.div
                    key={a.id}
                    whileHover={{ scale: 1.1 }}
                    title={a.name}
                    style={{
                      background: "#111", border: "1.5px solid #333",
                      borderRadius: 10, padding: "6px 10px",
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{a.emoji}</span>
                    <span style={{ color: "#aaa", fontWeight: 600, fontSize: 11 }}>{a.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Action Buttons ───────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleBoost}
            disabled={boosted}
            style={{
              background: boosted ? "#1a2800" : "linear-gradient(135deg, #0d1400, #1a2800)",
              border: `2px solid ${boosted ? "#c8ff0033" : "#c8ff00"}`,
              borderRadius: 16, padding: "16px 12px",
              cursor: boosted ? "default" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              boxShadow: boosted ? "none" : "0 0 20px #c8ff0022, 3px 3px 0px #000",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{boosted ? "✅" : "💚"}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: boosted ? "#c8ff0066" : "#c8ff00", letterSpacing: "0.06em" }}>
              {boosted ? "BOOSTED" : "BOOST +10"}
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleShare}
            style={{
              background: copied ? "linear-gradient(135deg, #001a2d, #002d44)" : "linear-gradient(135deg, #0a0a1a, #1a1a2d)",
              border: `2px solid ${copied ? "#4488ff" : "#4488ff66"}`,
              borderRadius: 16, padding: "16px 12px",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              boxShadow: "3px 3px 0px #000",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{copied ? "✅" : "📤"}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#4488ff", letterSpacing: "0.06em" }}>
              {copied ? "COPIED!" : "SHARE CARD"}
            </span>
          </motion.button>
        </div>

        {/* ── Aura Progress ────────────────────────────────────────────────── */}
        <div style={{
          background: "#0a0a0a", border: "2px solid #1a1a1a",
          borderRadius: 20, padding: "18px 16px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#555", letterSpacing: "0.1em", marginBottom: 12 }}>
            AURA PROGRESSION
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["NOVICE", "RISING", "BLAZING", "LEGENDARY", "MYTHIC"] as AuraLevel[]).map((lvl, i) => {
              const thresholds = [0, 40, 150, 400, 800];
              const colors = ["#888", "#c8ff00", "#ff6b35", "#ffd700", "#ff2d8d"];
              const labels = ["0", "40+", "150+", "400+", "800+"];
              const isActive = aura.level === lvl;
              const isPast = aura.score >= thresholds[i];
              return (
                <div key={lvl} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isPast ? colors[i] : "#222",
                    boxShadow: isActive ? `0 0 8px ${colors[i]}` : "none",
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 800 : 500, color: isActive ? colors[i] : isPast ? "#666" : "#333" }}>
                    {lvl}
                  </div>
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600 }}>{labels[i]} pts</div>
                  {isActive && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{ fontSize: 10, fontWeight: 900, color: colors[i], letterSpacing: "0.08em" }}
                    >
                      ← YOU
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── How to level your aura ───────────────────────────────────────── */}
        <div style={{
          background: "#050505", border: "2px solid #1a1a1a",
          borderRadius: 20, padding: "16px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>
            POWER UP YOUR AURA
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { action: "Daily Login Streak", points: "+15/day", icon: "🔥" },
              { action: "Level Up", points: "+60/level", icon: "🌟" },
              { action: "Earn Karma", points: "+0.015 each", icon: "⚡" },
              { action: "Bond with Pet", points: "+3/bond", icon: "💚" },
            ].map(tip => (
              <div key={tip.action} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.1rem" }}>{tip.icon}</span>
                <span style={{ fontSize: 12, color: "#777", flex: 1 }}>{tip.action}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: aura.color }}>{tip.points}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Vibe Picker Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showVibePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVibePicker(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "flex-end",
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", background: "#0d0d0d",
                borderTop: "2.5px solid #222",
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                padding: "24px 16px 40px",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.02em" }}>SET TODAY'S VIBE</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Choose your energy for the day</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {VIBES.map(v => (
                  <motion.button
                    key={v.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVibeSelect(v)}
                    style={{
                      background: vibe.id === v.id ? v.color + "22" : "#111",
                      border: `2px solid ${vibe.id === v.id ? v.color : "#1a1a1a"}`,
                      borderRadius: 16, padding: "14px 16px",
                      cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10,
                      boxShadow: vibe.id === v.id ? `0 0 16px ${v.color}33` : "none",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>{v.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: vibe.id === v.id ? v.color : "#ccc" }}>{v.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
