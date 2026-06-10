"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getPetEmoji, getMoodEmoji } from "@/lib/pet-evolution";
import { WORLDS } from "@/lib/worlds";

const MOOD_SPEECH: Record<string, string[]> = {
  excited: ["LET'S GOOO! ⚡", "I'M ON FIRE 🔥", "UNSTOPPABLE!", "MAX POWER ⚡"],
  happy:   ["Life is good ✨", "Keep grinding!", "You got this 💪", "Proud of us 🌟"],
  neutral: ["Just vibing...", "What's next?", "Ready when you are", "Hmm..."],
  hungry:  ["I'm STARVING 😭", "Please feed me!!", "So hungry... 🥺", "Feed me or else 👀"],
  sad:     ["Miss playing... 💔", "Come back to me", "Feeling lonely...", "It's been so long..."],
  sleeping:["Zzz... 💤", "Shh... resting...", "Don't wake me...", "Just 5 more mins..."],
};

export default function FloatingPet() {
  const path = usePathname();
  const { pet, petMoodComputed, feedPet, playWithPet, restPet, worldId, user } = useApp();
  const [bubble, setBubble] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [feedMsg, setFeedMsg] = useState<string | null>(null);

  const petEmoji  = getPetEmoji(pet.evolution, pet.class);
  const moodEmoji = getMoodEmoji(petMoodComputed);
  const world     = WORLDS.find(w => w.id === worldId) ?? WORLDS[2];
  const isCritical = pet.needs.hunger < 25 || pet.needs.energy < 15;
  const glowColor  = isCritical ? "#ff3333" : world.accent;

  const showRandomBubble = useCallback(() => {
    const lines = MOOD_SPEECH[petMoodComputed] ?? MOOD_SPEECH.neutral;
    setBubble(lines[Math.floor(Math.random() * lines.length)]);
    setTimeout(() => setBubble(null), 3000);
  }, [petMoodComputed]);

  // Auto speech bubble
  useEffect(() => {
    const delay = isCritical ? 8000 : 22000;
    const t = setInterval(showRandomBubble, delay);
    return () => clearInterval(t);
  }, [showRandomBubble, isCritical]);

  if (path === "/pet") return null;

  function handleTap() {
    setShowActions(a => !a);
    setBubble(null);
  }

  function doFeed() {
    const ok = feedPet("basic");
    setShowActions(false);
    setFeedMsg(ok ? "🍖 Fed!" : "❌ Need 50⚡");
    setTimeout(() => setFeedMsg(null), 1800);
  }

  function doPlay() {
    playWithPet();
    setShowActions(false);
    setFeedMsg("🎾 +28 happy!");
    setTimeout(() => setFeedMsg(null), 1800);
  }

  function doRest() {
    restPet();
    setShowActions(false);
    setFeedMsg("😴 Resting...");
    setTimeout(() => setFeedMsg(null), 1800);
  }

  const bobAnimation = petMoodComputed === "sleeping"
    ? { y: [0, -3, 0] }
    : petMoodComputed === "excited"
    ? { y: [0, -14, 0], rotate: [-3, 3, -3] }
    : { y: [0, -9, 0] };

  const bobDuration = petMoodComputed === "sleeping" ? 4 : petMoodComputed === "excited" ? 1.2 : 2.4;

  return (
    <div className="fixed z-50" style={{ bottom: 88, right: 14 }}>
      {/* Actions panel */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              right: 0,
              background: "#0a0a0a",
              border: `2.5px solid ${world.accent}`,
              borderRadius: 18,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 160,
              boxShadow: `0 0 20px ${world.glowColor}, 4px 4px 0px #000`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: world.accent, letterSpacing: "0.08em", marginBottom: 2, textAlign: "center" }}>
              {moodEmoji} {pet.name} · LV{pet.level}
            </div>

            {/* Mini needs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {[
                { label: "🍖", val: pet.needs.hunger, color: "#ff6b35" },
                { label: "😊", val: pet.needs.happiness, color: "#ff2d8d" },
                { label: "⚡", val: pet.needs.energy, color: "#c8ff00" },
              ].map(n => (
                <div key={n.label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11 }}>{n.label}</div>
                  <div style={{ height: 4, background: "#222", borderRadius: 99, overflow: "hidden", marginTop: 2 }}>
                    <div style={{ height: "100%", width: `${n.val}%`, background: n.color, borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#555", marginTop: 1 }}>{Math.round(n.val)}%</div>
                </div>
              ))}
            </div>

            {[
              { label: "🍖 Feed (50⚡)", action: doFeed, color: "#ff6b35", disabled: user.karma < 50 },
              { label: "🎾 Play",        action: doPlay, color: "#ff2d8d", disabled: false },
              { label: "😴 Rest",        action: doRest, color: "#00e5ff", disabled: false },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action} disabled={btn.disabled}
                style={{
                  padding: "9px 12px", background: btn.disabled ? "#111" : `${btn.color}18`,
                  border: `2px solid ${btn.disabled ? "#222" : btn.color}`,
                  borderRadius: 12, fontSize: 13, fontWeight: 700,
                  color: btn.disabled ? "#333" : btn.color,
                  cursor: btn.disabled ? "default" : "pointer",
                  textAlign: "left",
                }}>
                {btn.label}
              </button>
            ))}

            <Link href="/pet" onClick={() => setShowActions(false)}
              style={{ padding: "9px 12px", background: `${world.accent}18`, border: `2px solid ${world.accent}`, borderRadius: 12, fontSize: 12, fontWeight: 700, color: world.accent, textDecoration: "none", textAlign: "center" }}>
              🐾 Pet Page →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech bubble */}
      <AnimatePresence>
        {(bubble || feedMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              right: 0,
              background: isCritical && !feedMsg ? "#2a0000" : "#0a0a0a",
              border: `2px solid ${feedMsg ? world.accent : isCritical ? "#ff3333" : world.accent}`,
              borderRadius: 12,
              padding: "7px 12px",
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 700,
              color: feedMsg ? world.accent : isCritical ? "#ff6666" : "#ddd",
              boxShadow: `0 0 10px ${isCritical && !feedMsg ? "#ff333333" : world.glowColor}`,
              pointerEvents: "none",
            }}
          >
            {feedMsg ?? bubble}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pet button */}
      <motion.button
        onClick={handleTap}
        animate={bobAnimation}
        transition={{ duration: bobDuration, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.88 }}
        style={{
          width: 58,
          height: 58,
          background: "#0a0a0a",
          border: `3px solid ${glowColor}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.85rem",
          cursor: "pointer",
          boxShadow: `0 0 16px ${glowColor}66, 3px 3px 0px #000`,
          position: "relative",
        }}
      >
        {petEmoji}
        {/* Critical pulse ring */}
        {isCritical && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid #ff3333",
              pointerEvents: "none",
            }}
          />
        )}
        {/* Level badge */}
        <div style={{
          position: "absolute",
          top: -4,
          left: -4,
          width: 20,
          height: 20,
          background: world.accent,
          borderRadius: "50%",
          border: "2px solid #000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontWeight: 700,
          color: "#000",
        }}>
          {pet.level}
        </div>
      </motion.button>
    </div>
  );
}
