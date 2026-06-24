"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    emoji: "🐾",
    title: "YOUR PET IS ALIVE!",
    desc: "This is your virtual companion. Tap it, feed it, play with it — the more you care, the stronger your bond grows.",
    cta: "MEET MY PET →",
    color: "#c8ff00",
    hint: "👆 TAP YOUR PET to start bonding",
    accentBg: "linear-gradient(135deg, #0a1500, #070707)",
  },
  {
    emoji: "🍖",
    title: "NEEDS DRAIN IN REAL-TIME!",
    desc: "Hunger, happiness, and energy decay even while you're offline. A neglected pet grows sad — check in every few hours!",
    cta: "I'LL KEEP IT FED →",
    color: "#ff6b35",
    hint: "⏱️ Critical needs = sad, weak pet",
    accentBg: "linear-gradient(135deg, #1a0800, #070707)",
  },
  {
    emoji: "🎮",
    title: "GAMES POWER UP YOUR PET!",
    desc: "Every game earns karma and XP. Your pet evolves: Baby → Teen → Adult → Legendary. Build your ville for passive income.",
    cta: "LET'S EARN KARMA →",
    color: "#a855f7",
    hint: "⚡ Karma = power. Play = grow.",
    accentBg: "linear-gradient(135deg, #0a0015, #070707)",
  },
  {
    emoji: "🔥",
    title: "COME BACK EVERY DAY!",
    desc: "Daily login rewards stack with your streak. Live events drop every 30 minutes. Your squad is waiting — don't break the chain.",
    cta: "LET'S GO! 🔥",
    color: "#ff2d8d",
    hint: "🎁 Day 7 streak = massive bonus",
    accentBg: "linear-gradient(135deg, #1a0010, #070707)",
  },
];

const LS_KEY = "pet_onboarded_v2";

export default function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined"
      && !localStorage.getItem(LS_KEY)
      && localStorage.getItem("pet_created_v1")) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function advance() {
    if (isLast) { dismiss(); } else { setStep(s => s + 1); }
  }
  function dismiss() {
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, "1");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.90)", backdropFilter: "blur(8px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end",
            padding: "0 20px 52px",
          }}
          onClick={advance}
        >
          {/* SKIP */}
          <button
            onClick={e => { e.stopPropagation(); dismiss(); }}
            style={{
              position: "absolute", top: 20, right: 20,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 20, padding: "7px 16px", color: "#555",
              fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.07em",
              zIndex: 10,
            }}
          >
            SKIP →
          </button>

          {/* Hero emoji — floats in center of dark screen */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`em-${step}`}
              initial={{ scale: 0.4, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              style={{
                position: "absolute",
                top: "18%", left: "50%", transform: "translate(-50%, -50%)",
                fontSize: "7.5rem", lineHeight: 1,
                filter: `drop-shadow(0 0 50px ${cur.color}88)`,
                pointerEvents: "none",
              }}
            >
              {cur.emoji}
            </motion.div>
          </AnimatePresence>

          {/* Pulsing hint chip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`hint-${step}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: [0.75, 1, 0.75] }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                position: "absolute", top: "54%",
                background: `${cur.color}18`,
                border: `1.5px solid ${cur.color}44`,
                borderRadius: 100, padding: "9px 22px",
                fontSize: 12, fontWeight: 700, color: cur.color,
                letterSpacing: "0.06em", pointerEvents: "none",
                boxShadow: `0 0 20px ${cur.color}22`,
              }}
            >
              {cur.hint}
            </motion.div>
          </AnimatePresence>

          {/* Bottom card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 70, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -25, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 270, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 420,
                background: cur.accentBg,
                border: `2.5px solid ${cur.color}`,
                borderRadius: 28, padding: "26px 24px 22px",
                boxShadow: `0 0 80px ${cur.color}33, 0 0 160px ${cur.color}0d`,
              }}
            >
              {/* Progress pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {STEPS.map((s, i) => (
                  <motion.div
                    key={i}
                    animate={{ width: i === step ? 32 : 8 }}
                    transition={{ duration: 0.32 }}
                    style={{
                      height: 6, borderRadius: 3,
                      background: i <= step ? cur.color : "#222",
                    }}
                  />
                ))}
              </div>

              <div style={{ fontSize: 10, fontWeight: 800, color: cur.color, letterSpacing: "0.14em", marginBottom: 8 }}>
                STEP {step + 1} OF {STEPS.length}
              </div>

              <h2 style={{
                fontSize: 21, fontWeight: 900, color: "#fff",
                letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.15,
              }}>
                {cur.title}
              </h2>

              <p style={{ fontSize: 13, color: "#777", lineHeight: 1.65, marginBottom: 22 }}>
                {cur.desc}
              </p>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={advance}
                style={{
                  width: "100%", padding: "16px 0",
                  background: `linear-gradient(135deg, ${cur.color}, ${cur.color}cc)`,
                  border: "none", borderRadius: 16,
                  color: "#000", fontWeight: 900, fontSize: 16,
                  cursor: "pointer", letterSpacing: "0.06em",
                  boxShadow: `0 0 32px ${cur.color}55, 0 4px 0 ${cur.color}66`,
                }}
              >
                {cur.cta}
              </motion.button>

              <div style={{
                textAlign: "center", marginTop: 12,
                fontSize: 10, color: "#2a2a2a", fontWeight: 600,
              }}>
                tap anywhere or press button to continue
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
