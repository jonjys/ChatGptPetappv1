"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Flame, Gamepad2, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import PetNeedsBar from "@/components/pet/PetNeeds";
import XPBar from "@/components/ui/XPBar";
import { xpProgress, xpToNextLevel } from "@/lib/xp-system";
import { getPetEmoji, getMoodEmoji, getPetClassColor, getEvolutionLabel } from "@/lib/pet-evolution";
import { WORLDS } from "@/lib/worlds";

const SPEECH: Record<string, string[]> = {
  excited: ["Let's go!! I'm READY!", "MAXIMUM POWER! 🔥", "I feel unstoppable today!"],
  happy: ["Life is good ✨", "Keep grinding, we got this!", "I believe in us 🌟"],
  neutral: ["Just vibing...", "What are we doing today?", "I could go for an adventure"],
  hungry: ["...I'm starving 😭", "Feed me please!!", "My stomach is empty 🥲"],
  sad: ["I miss when we used to play...", "A little love would be nice 💔", "Come back to me..."],
  sleeping: ["Zzzz... 💤", "Shh... resting...", "Don't wake me..."],
};

function randomSpeech(mood: string): string {
  const lines = SPEECH[mood] ?? SPEECH.neutral;
  return lines[Math.floor(Date.now() / 1000) % lines.length];
}

const CLASS_GRADIENT: Record<string, string> = {
  "Grinder Beast": "linear-gradient(135deg, #fff5f0 0%, #ffe8d8 100%)",
  "Influencer Spirit": "linear-gradient(135deg, #fff0f8 0%, #ffd8ee 100%)",
  "Merchant King": "linear-gradient(135deg, #f7ffe0 0%, #eeff99 100%)",
};

export default function PetPage() {
  const { pet, petMoodComputed, feedPet, playWithPet, restPet, user, addXP, worldId, streak } = useApp();
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"vitals" | "history" | "room">("vitals");
  const [petAction, setPetAction] = useState<string | null>(null);
  const [speechIdx, setSpeechIdx] = useState(0);

  const progress = xpProgress(pet.xp);
  const xpToNext = xpToNextLevel(pet.xp);
  const petEmoji = getPetEmoji(pet.evolution, pet.class);
  const moodEmoji = getMoodEmoji(petMoodComputed);
  const classColor = getPetClassColor(pet.class);
  const evolLabel = getEvolutionLabel(pet.evolution);
  const world = WORLDS.find(w => w.id === worldId) ?? WORLDS[2];

  // Rotate speech bubbles every 6s
  useEffect(() => {
    const t = setInterval(() => setSpeechIdx(i => i + 1), 6000);
    return () => clearInterval(t);
  }, []);

  const speechLines = SPEECH[petMoodComputed] ?? SPEECH.neutral;
  const currentSpeech = speechLines[speechIdx % speechLines.length];

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2200); }

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
    showToast("+45 energy 💤 (slightly less happy)");
  }

  const isCritical = pet.needs.hunger < 25 || pet.needs.happiness < 25 || pet.needs.energy < 15;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center justify-between" style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {pet.name}
            <span style={{ fontSize: "1rem", color: "#888", marginLeft: 8 }}>· {evolLabel}</span>
          </h1>
          <p style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em" }}>{pet.class.toUpperCase()}</p>
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

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-3 p-3 text-center" style={{ background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Pet card */}
        <div className="neo-card-lg p-5" style={{ background: CLASS_GRADIENT[pet.class] ?? "#fff" }}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2 flex-wrap">
              <span className="badge" style={{ background: classColor, color: pet.class === "Grinder Beast" ? "#fff" : "#0a0a0a" }}>{pet.class}</span>
              <span className="badge" style={{ background: "#e8e3d8" }}>LVL {pet.level}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999" }}>MOOD</div>
              <div style={{ fontSize: 26 }}>{moodEmoji}</div>
            </div>
          </div>

          {/* Pet avatar with glow ring + orbit */}
          <div className="flex justify-center my-4" style={{ position: "relative", height: 160 }}>
            {/* World glow pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.2, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 160, height: 160, borderRadius: "50%",
                background: `radial-gradient(circle, ${world.glowColor}55 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            {/* Critical ring */}
            {isCritical && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 148, height: 148, borderRadius: "50%", border: "3px solid #ff2d2d", pointerEvents: "none" }}
              />
            )}
            {/* Orbiting items */}
            {["⭐", "💎", "✨"].map((emoji, i) => (
              <motion.div key={emoji}
                animate={{ rotate: 360 }}
                transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
                style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0, pointerEvents: "none" }}
              >
                <div style={{ position: "absolute", top: -(68 + i * 4), left: -8, fontSize: "0.75rem", opacity: 0.5 }}>{emoji}</div>
              </motion.div>
            ))}

            <motion.div
              animate={
                petAction === "eating"   ? { scale: [1, 1.2, 0.9, 1.1, 1], rotate: [0, -5, 5, 0] } :
                petAction === "playing"  ? { y: [0, -22, 0, -14, 0], rotate: [0, 12, -12, 0] } :
                petAction === "sleeping" ? { rotate: [0, 6, 6] } :
                petMoodComputed === "excited" ? { y: [0, -14, 0], scale: [1, 1.05, 1], rotate: [0, -3, 3, 0] } :
                { y: [0, -10, 0], rotate: [0, -2, 2, 0] }
              }
              transition={petAction ? { duration: 0.9 } : { duration: petMoodComputed === "excited" ? 1.8 : 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 130, height: 130,
                background: "#fff",
                border: `4px solid #0a0a0a`,
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "4.5rem",
                boxShadow: `6px 6px 0px ${classColor}, 0 0 20px ${world.glowColor}`,
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              {petEmoji}
            </motion.div>

            {/* Speech bubble */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              key={`${petMoodComputed}-${speechIdx}`}
              style={{
                position: "absolute", top: -10, right: -8,
                background: "#fff",
                border: "2px solid #0a0a0a",
                borderRadius: 12,
                padding: "5px 10px",
                fontSize: 12, fontWeight: 600,
                maxWidth: 130,
                boxShadow: "2px 2px 0px #0a0a0a",
                lineHeight: 1.3,
              }}
            >
              {currentSpeech}
            </motion.div>
          </div>

          {/* XP bar */}
          <XPBar xp={pet.xp} xpToNext={xpToNext} progress={progress} level={pet.level} compact />
        </div>

        {/* Needs + actions */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} color="#ff6b35" fill="#ff6b35" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>PET VITALS</span>
          </div>

          <PetNeedsBar needs={pet.needs} />

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {/* Feed basic */}
            <button onClick={() => handleFeed("basic")} style={{ padding: "10px 4px", background: "#fff3ee", border: "2.5px solid #ff6b35", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem" }}>🍖</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b35", marginTop: 3 }}>FEED</div>
              <div style={{ fontSize: 10, color: "#888" }}>-50 ⚡</div>
            </button>
            {/* Feed premium */}
            <button onClick={() => handleFeed("premium")} style={{ padding: "10px 4px", background: "#fff0e0", border: "2.5px solid #ffde00", borderRadius: 12, cursor: "pointer", textAlign: "center", position: "relative" }}>
              <div style={{ fontSize: "1.3rem" }}>🥩</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#e6a000", marginTop: 3 }}>FEAST</div>
              <div style={{ fontSize: 10, color: "#888" }}>-150 ⚡</div>
              <span style={{ position: "absolute", top: -6, right: -6, background: "#ff2d8d", color: "#fff", borderRadius: 4, fontSize: 8, fontWeight: 700, padding: "1px 4px", border: "1.5px solid #0a0a0a" }}>BEST</span>
            </button>
            {/* Play */}
            <button onClick={handlePlay} style={{ padding: "10px 4px", background: "#f0fff0", border: "2.5px solid #4caf50", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem" }}>🎾</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2e7d32", marginTop: 3 }}>PLAY</div>
              <div style={{ fontSize: 10, color: "#888" }}>-18 ⚡nrg</div>
            </button>
            {/* Rest */}
            <button onClick={handleRest} style={{ padding: "10px 4px", background: "#f0f4ff", border: "2.5px solid #3b82f6", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem" }}>💤</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginTop: 3 }}>REST</div>
              <div style={{ fontSize: 10, color: "#888" }}>+45 nrg</div>
            </button>
            {/* Go battle */}
            <Link href="/games/battle" style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 4px", background: "#fff5ee", border: "2.5px solid #ff6b35", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: "1.3rem" }}>⚔️</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b35", marginTop: 3 }}>BATTLE</div>
                <div style={{ fontSize: 10, color: "#888" }}>+karma</div>
              </div>
            </Link>
            {/* Shop */}
            <Link href="/shop" style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 4px", background: "#f5f0ff", border: "2.5px solid #8b5cf6", borderRadius: 12, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: "1.3rem" }}>🛒</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginTop: 3 }}>SHOP</div>
                <div style={{ fontSize: 10, color: "#888" }}>items</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats / Streak / History tabs */}
        <div className="neo-card p-4">
          <div className="flex gap-2 mb-4">
            {(["vitals", "history", "room"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 4px", background: tab === t ? "#0a0a0a" : "#f5f0e8", border: "2.5px solid #0a0a0a", borderRadius: 12, fontSize: 11, fontWeight: 700, color: tab === t ? "#c8ff00" : "#0a0a0a", letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase" }}>
                {t}
              </button>
            ))}
          </div>

          {tab === "vitals" && (
            <div className="space-y-3">
              {/* Streak */}
              <div className="flex justify-between items-center p-3" style={{ background: "#faf7f2", border: "2px solid #e8e3d8", borderRadius: 12 }}>
                <div className="flex items-center gap-2"><span>🔥</span><span style={{ fontWeight: 600, fontSize: 14 }}>Streak</span></div>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{pet.streak} days</span>
              </div>
              {[
                { label: "Bounties Done", value: pet.totalBountiesCompleted, icon: "🎯" },
                { label: "Total XP", value: `${pet.xp.toLocaleString()} XP`, icon: "⚡" },
                { label: "Abilities", value: pet.unlockedAbilities.length, icon: "✨" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center justify-between p-3" style={{ background: "#faf7f2", border: "2px solid #e8e3d8", borderRadius: 12 }}>
                  <div className="flex items-center gap-2"><span>{icon}</span><span style={{ fontWeight: 600, fontSize: 14, color: "#444" }}>{label}</span></div>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
                </div>
              ))}
              {/* Abilities */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: "0.05em" }}>ABILITIES</div>
                <div className="flex flex-wrap gap-2">
                  {pet.unlockedAbilities.map(a => (
                    <span key={a} style={{ padding: "4px 10px", background: "#0a0a0a", color: "#c8ff00", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{a}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-2">
              {[
                { action: "Won a Pet Battle vs tradeknight", reward: "+80 XP, +100 karma", time: "2h ago" },
                { action: "Fed Premium Feast", reward: "+25 XP", time: "1d ago" },
                { action: "Completed 5K Run bounty", reward: "+120 XP", time: "2d ago" },
                { action: "7-day streak bonus", reward: "+150 XP, +75 karma", time: "3d ago" },
                { action: "Memory Palace cleared!", reward: "+80 karma", time: "3d ago" },
                { action: "Donated books bounty", reward: "+100 XP", time: "4d ago" },
              ].map(({ action, reward, time }, i) => (
                <div key={i} className="flex items-center justify-between p-3" style={{ background: "#faf7f2", border: "2px solid #e8e3d8", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{action}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{time}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#4caf50", textAlign: "right", whiteSpace: "nowrap", marginLeft: 8 }}>{reward}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "room" && (
            <div>
              {/* World badge */}
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: "1.1rem" }}>{world.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: world.accent, letterSpacing: "0.06em" }}>
                  {world.name} WORLD
                </span>
                <span style={{ fontSize: 11, color: "#888" }}>· {world.tagline}</span>
              </div>

              {/* World-aware pet room */}
              <div style={{
                height: 190,
                background: world.petRoomBg,
                border: `2.5px solid ${world.accent}`,
                borderRadius: 16,
                position: "relative",
                overflow: "hidden",
                marginBottom: 12,
                boxShadow: `0 0 20px ${world.glowColor}`,
              }}>
                {/* Ambient items from world config */}
                {world.petRoomEmojis.slice(0, 3).map((emoji, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: 8 + i * 14,
                    left: [16, "38%", undefined][i] as string | number,
                    right: i === 2 ? 20 : undefined,
                    fontSize: ["1.3rem", "1.1rem", "0.9rem"][i],
                    opacity: 0.6 - i * 0.1,
                  }}>
                    {emoji}
                  </div>
                ))}
                {/* Ground items */}
                {world.petRoomEmojis.slice(3).map((emoji, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    bottom: 30,
                    left: i === 0 ? 14 : i === 1 ? "33%" : undefined,
                    right: i === 2 ? 14 : undefined,
                    fontSize: ["1.9rem", "1.3rem", "1.6rem"][i],
                  }}>
                    {emoji}
                  </div>
                ))}
                {/* Bobbing pet */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)", fontSize: "3.2rem", filter: `drop-shadow(0 0 8px ${world.glowColor})` }}
                >
                  {petEmoji}
                </motion.div>
                {/* Ground strip */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 38, background: `${world.accent}22`, borderTop: `2px solid ${world.accent}44` }} />
              </div>

              {/* Habitat items */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {world.petRoomEmojis.map((emoji, i) => {
                  const locked = i > 1;
                  return (
                    <div key={i} className="flex items-center gap-2 p-2.5" style={{
                      background: locked ? "#f5f0e8" : `${world.accent}12`,
                      border: `2px solid ${locked ? "#ccc" : world.accent}`,
                      borderRadius: 10,
                      opacity: locked ? 0.55 : 1,
                    }}>
                      <span style={{ fontSize: "1.3rem" }}>{emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{world.name} Item {i + 1}</div>
                        <div style={{ fontSize: 10, color: locked ? "#aaa" : world.accent, fontWeight: 600 }}>
                          {locked ? "🔒 Unlock in Shop" : "✓ Active"}
                        </div>
                      </div>
                      {locked && <ChevronRight size={14} color="#aaa" style={{ marginLeft: "auto" }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
