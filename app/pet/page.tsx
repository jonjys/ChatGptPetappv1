"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Flame } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import PetDisplay from "@/components/pet/PetDisplay";
import XPBar from "@/components/ui/XPBar";
import { xpProgress, xpToNextLevel } from "@/lib/xp-system";

export default function PetPage() {
  const { user, pet, feedPet, spendKarma, addXP } = useApp();
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"stats" | "history">("stats");

  const progress = xpProgress(pet.xp);
  const xpToNext = xpToNextLevel(pet.xp);

  function handleFeed() {
    const success = spendKarma(75);
    if (!success) {
      setFeedMessage("Not enough KARMA! 😅");
    } else {
      feedPet();
      addXP(20);
      setFeedMessage("+20 XP! Pet is happy! 🎉");
    }
    setTimeout(() => setFeedMessage(null), 2500);
  }

  const streakDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const completedDays = pet.streak;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}
      >
        <Link href="/feed">
          <div
            style={{
              width: 38,
              height: 38,
              background: "#fff",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "2px 2px 0px #0a0a0a",
            }}
          >
            <ChevronLeft size={20} />
          </div>
        </Link>
        <div>
          <h1
            style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            YOUR COMPANION
          </h1>
          <p style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>
            {pet.class.toUpperCase()} · EVOLUTION: {pet.evolution.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Feed message toast */}
        <AnimatePresence>
          {feedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="neo-card-flat p-3 text-center"
              style={{ background: "#c8ff00", fontWeight: 700, fontSize: 15 }}
            >
              {feedMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pet display */}
        <PetDisplay pet={pet} onFeed={handleFeed} />

        {/* XP Progress */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} color="#ff6b35" fill="#ff6b35" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              EXPERIENCE
            </span>
          </div>
          <XPBar xp={pet.xp} xpToNext={xpToNext} progress={progress} level={pet.level} />
        </div>

        {/* Streak */}
        <div className="neo-card p-4">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              🔥 STREAK
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                background: "#ff6b35",
                color: "#fff",
                border: "2px solid #0a0a0a",
                borderRadius: 10,
                padding: "2px 12px",
              }}
            >
              {pet.streak}
            </span>
          </div>
          <div className="flex justify-between">
            {streakDays.map((day, i) => (
              <div key={day} className="flex flex-col items-center gap-1.5">
                <div
                  style={{
                    width: 34,
                    height: 34,
                    background: i < completedDays ? "#ff6b35" : "#e8e3d8",
                    border: "2px solid #0a0a0a",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: i < completedDays ? "1rem" : "0.5rem",
                  }}
                >
                  {i < completedDays ? "🔥" : "·"}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#888" }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats tabs */}
        <div className="neo-card p-4">
          <div className="flex gap-2 mb-4">
            {(["stats", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: tab === t ? "#0a0a0a" : "#f5f0e8",
                  border: "2.5px solid #0a0a0a",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: tab === t ? "#c8ff00" : "#0a0a0a",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {tab === "stats" && (
            <div className="space-y-3">
              {[
                { label: "Bounties Completed", value: pet.totalBountiesCompleted, icon: "🎯" },
                { label: "Total XP Earned", value: `${pet.xp.toLocaleString()} XP`, icon: "⚡" },
                { label: "Current Level", value: `LVL ${pet.level}`, icon: "🏆" },
                { label: "Abilities Unlocked", value: pet.unlockedAbilities.length, icon: "✨" },
              ].map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between p-3"
                  style={{ background: "#faf7f2", border: "2px solid #e8e3d8", borderRadius: 12 }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#444" }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-2">
              {[
                { action: "Completed 5K Run bounty", xp: 120, time: "2h ago" },
                { action: "Fed pet", xp: 20, time: "1d ago" },
                { action: "Helped with groceries", xp: 80, time: "2d ago" },
                { action: "7-day streak bonus", xp: 150, time: "3d ago" },
                { action: "Donated books", xp: 100, time: "4d ago" },
              ].map(({ action, xp, time }, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3"
                  style={{ background: "#faf7f2", border: "2px solid #e8e3d8", borderRadius: 12 }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{action}</div>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>{time}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      background: "#c8ff00",
                      border: "2px solid #0a0a0a",
                      borderRadius: 8,
                      padding: "2px 8px",
                    }}
                  >
                    +{xp} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
