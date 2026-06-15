"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";

const DAILY_REWARDS = [
  { day: 1, emoji: "💰", label: "Dag 1",  karma: 50,   bonus: null },
  { day: 2, emoji: "⚡", label: "Dag 2",  karma: 100,  bonus: null },
  { day: 3, emoji: "🎯", label: "Dag 3",  karma: 150,  bonus: "badge" },
  { day: 4, emoji: "🔥", label: "Dag 4",  karma: 200,  bonus: null },
  { day: 5, emoji: "💎", label: "Dag 5",  karma: 300,  bonus: "xp" },
  { day: 6, emoji: "👑", label: "Dag 6",  karma: 500,  bonus: null },
  { day: 7, emoji: "🏆", label: "Dag 7",  karma: 1000, bonus: "jackpot" },
];

const STORE_LAST  = "karma_daily_last_v1";
const STORE_DAY   = "karma_daily_day_v1";

export default function DailyReward() {
  const { addKarma, addXP, showToast } = useApp();
  const [show,       setShow]       = useState(false);
  const [dayIdx,     setDayIdx]     = useState(0);
  const [claimed,    setClaimed]    = useState(false);
  const [burst,      setBurst]      = useState(false);

  useEffect(() => {
    const today   = new Date().toDateString();
    const last    = localStorage.getItem(STORE_LAST) ?? "";
    const savedDay = parseInt(localStorage.getItem(STORE_DAY) ?? "0", 10);
    if (last === today) return; // already shown/claimed today

    // Determine which day in the 7-day cycle
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = last === yesterday.toDateString();
    const nextDay = isConsecutive ? ((savedDay % 7) + 1) : 1;

    setDayIdx(nextDay - 1);
    setTimeout(() => setShow(true), 1500);
  }, []);

  function handleClaim() {
    if (claimed) return;
    const reward = DAILY_REWARDS[dayIdx];
    setClaimed(true);
    setBurst(true);

    addKarma(reward.karma, "Daily Reward");
    if (reward.bonus === "xp")      addXP(200);
    if (reward.bonus === "jackpot") addXP(500);

    const today = new Date().toDateString();
    localStorage.setItem(STORE_LAST, today);
    localStorage.setItem(STORE_DAY,  String(dayIdx + 1));

    showToast(`Dag ${dayIdx + 1} belöning! +${reward.karma} karma 🎉`, reward.karma, "#c8ff00", reward.emoji);

    setTimeout(() => { setBurst(false); setShow(false); }, 2000);
  }

  const reward = DAILY_REWARDS[dayIdx];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "0 0 20px",
          }}
          onClick={e => { if (e.target === e.currentTarget && !claimed) setShow(false); }}
        >
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{
              background: "#111",
              border: "3px solid #c8ff00",
              borderRadius: 28,
              padding: "24px 20px 28px",
              width: "92%",
              maxWidth: 400,
              boxShadow: "0 0 60px #c8ff0033, 0 -8px 40px rgba(0,0,0,0.8)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.4rem" }}>🎁</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
                  Daglig Belöning
                </span>
              </div>
              <button
                onClick={() => setShow(false)}
                style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
              >×</button>
            </div>

            {/* Day strip */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24, justifyContent: "center" }}>
              {DAILY_REWARDS.map((r, i) => {
                const isPast    = i < dayIdx;
                const isCurrent = i === dayIdx;
                return (
                  <motion.div
                    key={r.day}
                    animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      flex: 1,
                      background: isCurrent ? "#c8ff0022" : isPast ? "#1a1a1a" : "#0a0a0a",
                      border: `2px solid ${isCurrent ? "#c8ff00" : isPast ? "#444" : "#222"}`,
                      borderRadius: 10,
                      padding: "6px 2px",
                      textAlign: "center",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: isCurrent ? "1.2rem" : "1rem", filter: isPast ? "grayscale(0.6)" : "none" }}>
                      {isPast ? "✅" : r.emoji}
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: isCurrent ? "#c8ff00" : "#555", marginTop: 2 }}>
                      D{r.day}
                    </div>
                    {isCurrent && (
                      <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 6, height: 6, background: "#c8ff00", borderRadius: "50%" }} />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Main reward display */}
            <div style={{ textAlign: "center", marginBottom: 24, position: "relative" }}>
              <motion.div
                animate={{ scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                style={{ fontSize: "5rem", lineHeight: 1, marginBottom: 12, display: "inline-block" }}
              >
                {reward.emoji}
              </motion.div>

              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                Dag {dayIdx + 1} Belöning!
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#c8ff00", textShadow: "0 0 20px #c8ff0066" }}>
                +{reward.karma.toLocaleString()} ⚡
              </div>
              {reward.bonus && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#ffcc00", fontWeight: 700 }}>
                  {reward.bonus === "badge" ? "🏅 + Bonus Badge" : reward.bonus === "xp" ? "✨ + 200 XP Bonus" : "🌟 JACKPOT WEEK! + 500 XP"}
                </div>
              )}

              {/* Burst particles */}
              <AnimatePresence>
                {burst && Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      x: Math.cos((i / 16) * Math.PI * 2) * (80 + Math.random() * 40),
                      y: Math.sin((i / 16) * Math.PI * 2) * (80 + Math.random() * 40),
                      opacity: 0, scale: 0,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      position: "absolute", top: "40%", left: "50%",
                      fontSize: "1rem", pointerEvents: "none",
                    }}
                  >
                    {["⚡","💎","🌟","✨"][i % 4]}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Claim button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleClaim}
              disabled={claimed}
              style={{
                width: "100%",
                padding: "18px",
                background: claimed ? "#1a1a1a" : "linear-gradient(135deg, #c8ff00, #88ff00)",
                border: claimed ? "2px solid #333" : "3px solid #0a0a0a",
                borderRadius: 16,
                fontSize: 17,
                fontWeight: 800,
                color: claimed ? "#555" : "#0a0a0a",
                cursor: claimed ? "default" : "pointer",
                letterSpacing: "0.04em",
                boxShadow: claimed ? "none" : "0 4px 20px #c8ff0044, 4px 4px 0px #0a0a0a",
                transition: "all 0.2s",
              }}
            >
              {claimed ? "✅ Belöning hämtad!" : "🎁 HÄMTA!"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
