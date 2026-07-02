"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPetEmoji } from "@/lib/pet-evolution";

// ─── Storage key ──────────────────────────────────────────────────────────────
const MINIMIZED_KEY = "karma_companion_minimized_v1";

// ─── Contextual messages by pathname ─────────────────────────────────────────
const CONTEXT_MESSAGES: Record<string, string> = {
  "/games":   "Let's play! 🎮",
  "/shop":    "I want treats! 🍖",
  "/map":     "Adventure time! 🗺️",
  "/feed":    "Check out this post! 📱",
  "/profile": "We're doing great! ⭐",
};

const MOTIVATIONAL = [
  "You've got this! 💪",
  "Keep grinding! ⚡",
  "Stay awesome! 🌟",
  "Level up time! 🚀",
  "On a roll! 🔥",
  "Proud of you! 🥇",
];

function getContextMessage(pathname: string): string {
  if (CONTEXT_MESSAGES[pathname]) return CONTEXT_MESSAGES[pathname];
  for (const key of Object.keys(CONTEXT_MESSAGES)) {
    if (pathname.startsWith(key + "/")) return CONTEXT_MESSAGES[key];
  }
  return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
}

// ─── Mood display helper ──────────────────────────────────────────────────────
function getMoodLabel(hunger: number, energy: number, happiness: number): { label: string; emoji: string; color: string } {
  if (hunger < 25) return { label: "Hungry", emoji: "😮", color: "#ff6b35" };
  if (energy < 20) return { label: "Tired", emoji: "😴", color: "#00e5ff" };
  if (happiness > 70 && hunger > 50 && energy > 40) return { label: "Happy", emoji: "😊", color: "#c8ff00" };
  return { label: "Neutral", emoji: "😐", color: "#888" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PetCompanion() {
  const pathname = usePathname();
  const { pet, petMoodComputed, feedPet, playWithPet, restPet, addKarma, addXP, user } = useApp();

  const [minimized, setMinimized] = useState(false);
  const [open, setOpen] = useState(false);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [wobble, setWobble] = useState(false);

  // Hydrate minimized state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MINIMIZED_KEY);
      if (saved === "true") setMinimized(true);
    } catch {
      // ignore
    }
  }, []);

  // Show contextual speech bubble when pathname changes
  useEffect(() => {
    const msg = getContextMessage(pathname);
    setSpeechText(msg);
    const t = setTimeout(() => setSpeechText(null), 3500);
    return () => clearTimeout(t);
  }, [pathname]);

  const toggleMinimized = useCallback(() => {
    setMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem(MINIMIZED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
    setOpen(false);
  }, []);

  // ── Hide on game pages (after all hooks) ─────────────────────────────────
  const hideOnRoutes = ['/games/runner', '/games/breaker', '/games/battle', '/games/fishing', '/games/memory', '/games/blitz', '/games/slots', '/games/cases'];
  const shouldHide = hideOnRoutes.some(r => pathname.startsWith(r));
  if (shouldHide) return null;

  function handleTap() {
    setWobble(true);
    setTimeout(() => setWobble(false), 500);
    setOpen(prev => !prev);
    setSpeechText(null);
  }

  function doFeed() {
    const ok = feedPet("basic");
    setOpen(false);
    setFeedbackMsg(ok ? "🍖 Yum! +hunger" : "❌ Need 50⚡");
    setTimeout(() => setFeedbackMsg(null), 2000);
  }

  function doRest() {
    restPet();
    setOpen(false);
    setFeedbackMsg("💤 Resting...");
    setTimeout(() => setFeedbackMsg(null), 2000);
  }

  function doPet() {
    playWithPet();
    addKarma(2, "Pet cuddle");
    addXP(5);
    setOpen(false);
    setFeedbackMsg("❤️ +happy +2⚡");
    setTimeout(() => setFeedbackMsg(null), 2000);
  }

  const petEmoji = pet.skinId?.startsWith("emoji:") ? pet.skinId.slice(6) : getPetEmoji(pet.evolution, pet.class);
  const mood = getMoodLabel(pet.needs.hunger, pet.needs.energy, pet.needs.happiness);
  const isCritical = pet.needs.hunger < 25 || pet.needs.energy < 15;

  // Bounce animation — gentle bob
  const bounceAnim = petMoodComputed === "sleeping"
    ? { y: [0, -2, 0] }
    : petMoodComputed === "excited"
    ? { y: [0, -10, 0], rotate: [-4, 4, -4] }
    : { y: [0, -7, 0] };

  const bounceDuration = petMoodComputed === "sleeping" ? 4 : petMoodComputed === "excited" ? 1.1 : 2.2;

  // Minimized dot — just show a small coloured dot
  if (minimized) {
    return (
      <motion.button
        onClick={toggleMinimized}
        whileTap={{ scale: 0.85 }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        title="Show pet companion"
        style={{
          position: "fixed",
          bottom: 80,
          right: "max(10px, calc(50vw - 280px + 10px))",
          zIndex: 48,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: isCritical ? "#ff3333" : "#c8ff00",
          border: "2px solid #0a0a0a",
          cursor: "pointer",
          boxShadow: isCritical ? "0 0 8px #ff333388" : "0 0 8px #c8ff0088",
        }}
      />
    );
  }

  return (
    <>
      {/* ── Centered modal overlay ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="companion-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background: "rgba(0,0,0,0.7)",
              }}
            />

            {/* Centered card */}
            <motion.div
              key="companion-modal"
              initial={{ opacity: 0, scale: 0.82, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.82, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              style={{
                position: "fixed",
                bottom: 90,
                left: "50%",
                transform: "translateX(-50%)",
                maxWidth: 320,
                width: "calc(100% - 32px)",
                zIndex: 1001,
                background: "#0d0d0d",
                border: "2px solid #c8ff00",
                borderRadius: 24,
                padding: 20,
                boxShadow: "0 0 40px #c8ff0033, 0 20px 60px rgba(0,0,0,0.8)",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 28,
                  height: 28,
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#888",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>

              {/* Mood header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: "2rem" }}>{petEmoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{pet.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 15 }}>{mood.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: mood.color }}>{mood.label}</span>
                  </div>
                </div>
              </div>

              {/* Needs mini-bars */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "🍖", val: pet.needs.hunger, color: "#ff6b35" },
                  { label: "❤️", val: pet.needs.happiness, color: "#ff2d8d" },
                  { label: "⚡", val: pet.needs.energy, color: "#c8ff00" },
                ].map(n => (
                  <div key={n.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 11 }}>{n.label}</div>
                    <div style={{ height: 5, background: "#1e1e1e", borderRadius: 99, overflow: "hidden", marginTop: 3 }}>
                      <div style={{
                        height: "100%",
                        width: `${n.val}%`,
                        background: n.color,
                        borderRadius: 99,
                        transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "🍖 Feed", action: doFeed, color: "#ff6b35", disabled: user.karma < 50, sub: "50⚡" },
                  { label: "💤 Rest", action: doRest, color: "#00e5ff", disabled: false, sub: "+energy" },
                  { label: "❤️ Pet",  action: doPet,  color: "#ff2d8d", disabled: false, sub: "+happy" },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    disabled={btn.disabled}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: btn.disabled ? "#111" : `${btn.color}18`,
                      border: `2px solid ${btn.disabled ? "#222" : btn.color}`,
                      borderRadius: 14,
                      fontSize: 13,
                      fontWeight: 700,
                      color: btn.disabled ? "#333" : btn.color,
                      cursor: btn.disabled ? "default" : "pointer",
                      width: "100%",
                    }}
                  >
                    <span>{btn.label}</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{btn.sub}</span>
                  </button>
                ))}
              </div>

              {/* Minimize button */}
              <button
                onClick={toggleMinimized}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 10,
                  padding: "6px",
                  background: "transparent",
                  border: "none",
                  fontSize: 11,
                  color: "#444",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                — minimize
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FAB + speech bubble (corner) ── */}
      <div
        style={{
          position: "fixed",
          bottom: 80,
          right: "max(10px, calc(50vw - 280px + 10px))",
          zIndex: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 0,
        }}
      >
        {/* ── Speech bubble ── */}
        <AnimatePresence>
          {(speechText || feedbackMsg) && !open && (
            <motion.div
              key="speech"
              initial={{ opacity: 0, y: 6, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              style={{
                background: isCritical && !feedbackMsg ? "#1a0000" : "#0e0e0e",
                border: `2px solid ${feedbackMsg ? "#c8ff00" : isCritical ? "#ff3333" : "#c8ff00"}`,
                borderRadius: 12,
                padding: "7px 12px",
                marginBottom: 8,
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 700,
                color: feedbackMsg ? "#c8ff00" : isCritical ? "#ff6666" : "#e0e0e0",
                boxShadow: `0 0 10px ${isCritical && !feedbackMsg ? "#ff333333" : "#c8ff0022"}`,
                pointerEvents: "none",
              }}
            >
              {feedbackMsg ?? speechText}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pet FAB button ── */}
        <motion.button
          onClick={handleTap}
          animate={wobble
            ? { rotate: [-8, 8, -6, 6, 0], scale: [1, 1.1, 0.95, 1.05, 1] }
            : bounceAnim
          }
          transition={wobble
            ? { duration: 0.45, ease: "easeInOut" }
            : { duration: bounceDuration, repeat: Infinity, ease: "easeInOut" }
          }
          whileTap={{ scale: 0.86 }}
          aria-label="Open pet companion"
          style={{
            width: 44,
            height: 44,
            background: "#0d0d0d",
            border: "none",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            cursor: "pointer",
            boxShadow: `0 0 14px ${isCritical ? "#ff333366" : "#c8ff0044"}, 3px 3px 0px #000`,
            position: "relative",
            flexShrink: 0,
          }}
        >
          {petEmoji}

          {/* Critical pulse ring */}
          {isCritical && (
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: -5,
                borderRadius: "50%",
                border: "2px solid #ff3333",
                pointerEvents: "none",
              }}
            />
          )}
        </motion.button>
      </div>
    </>
  );
}
