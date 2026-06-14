"use client";

import { motion } from "framer-motion";
import { Settings, Trophy, Zap, Flame, Globe, Star, Languages } from "lucide-react";
import Link from "next/link";
import XPBar from "@/components/ui/XPBar";
import { useApp } from "@/context/AppContext";
import { xpProgress, xpToNextLevel, calculateLevel } from "@/lib/xp-system";
import { LEADERBOARD } from "@/lib/mock-data";
import { getPetClassColor } from "@/lib/pet-evolution";
import { WORLDS } from "@/lib/worlds";
import { ACHIEVEMENTS } from "@/lib/achievements";

const CLASS_DESCRIPTION: Record<string, string> = {
  "Grinder Beast": "You dominate through action. Relentless hustle, maximum output.",
  "Influencer Spirit": "Your energy moves people. You lead by example and inspire.",
  "Merchant King": "You see opportunity everywhere. Trade, deal, accumulate.",
};

export default function ProfilePage() {
  const { user, worldId, setWorldId, streak, achievements, showToast, lang, setLang } = useApp();
  const progress = xpProgress(user.xp);
  const xpToNext = xpToNextLevel(user.xp);
  const level = calculateLevel(user.xp);
  const classColor = getPetClassColor(user.petClass);
  const currentWorld = WORLDS.find(w => w.id === worldId);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: "3px solid #0a0a0a" }}
      >
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
          PROFILE
        </h1>
        <button
          onClick={() => showToast("Settings coming soon! 🛠️", undefined, "#4488ff", "⚙️")}
          style={{
            width: 40, height: 40, background: "#fff",
            border: "2.5px solid #0a0a0a", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "3px 3px 0px #0a0a0a", cursor: "pointer",
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-card-lg p-5"
          style={{
            background: `linear-gradient(135deg, #fff 60%, ${classColor}22)`,
          }}
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              style={{
                width: 72,
                height: 72,
                background: "#faf7f2",
                border: "3px solid #0a0a0a",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
                boxShadow: `4px 4px 0px ${classColor}`,
                flexShrink: 0,
              }}
            >
              {user.avatarEmoji}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{user.displayName}</div>
              <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>@{user.username}</div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="badge"
                  style={{ background: classColor, color: user.petClass === "Grinder Beast" ? "#fff" : "#0a0a0a", fontSize: 10 }}
                >
                  {user.petClass}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#0a0a0a",
                    color: "#c8ff00",
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  RANK #{user.rank}
                </span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 14, color: "#555", fontWeight: 500, marginTop: 12, lineHeight: 1.5 }}>
            {user.bio}
          </p>

          <div className="mt-4">
            <XPBar xp={user.xp} xpToNext={xpToNext} progress={progress} level={user.level} />
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "KARMA",  value: user.karma.toLocaleString(), icon: "⚡", color: "#c8ff00" },
            { label: "LEVEL",  value: `LV ${level}`,               icon: "🌟", color: "#ffcc00" },
            { label: "STREAK", value: `${streak}d 🔥`,             icon: "🔥", color: "#ff2d8d" },
          ].map(({ label, value, icon, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="neo-card p-3 text-center"
              style={{ background: color + "18" }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.06em" }}>
                {label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Premium + Pot quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/karma-pot" style={{ textDecoration: "none" }}>
            <motion.div whileTap={{ scale: 0.95 }} style={{
              background: "#0a0a0a", border: "2.5px solid #c8ff00",
              borderRadius: 16, padding: "14px 12px", textAlign: "center",
              boxShadow: "0 0 20px #c8ff0022",
            }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>💰</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#c8ff00" }}>KARMA POTTEN</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Vinn riktiga pengar</div>
            </motion.div>
          </Link>
          <Link href="/premium" style={{ textDecoration: "none" }}>
            <motion.div whileTap={{ scale: 0.95 }} style={{
              background: "linear-gradient(135deg, #1a0e00, #0d1a00)",
              border: "2.5px solid #ff8c00",
              borderRadius: 16, padding: "14px 12px", textAlign: "center",
              boxShadow: "0 0 20px #ff8c0022",
            }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>👑</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ff8c00" }}>KARMA PRO</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Uppgradera nu</div>
            </motion.div>
          </Link>
        </div>

        {/* Class card */}
        <div className="neo-card p-4" style={{ borderLeft: `5px solid ${classColor}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} color={classColor} fill={classColor} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              YOUR CLASS
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{user.petClass}</div>
          <p style={{ fontSize: 14, color: "#555", fontWeight: 500, lineHeight: 1.5 }}>
            {CLASS_DESCRIPTION[user.petClass]}
          </p>
        </div>

        {/* Badges */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} color="#ff9800" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              BADGES ({user.badges.length})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {user.badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="neo-card-flat p-3 text-center"
                style={{ background: "#faf7f2" }}
              >
                <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>{badge.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{badge.name}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Leaderboard section */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} color="#ff6b35" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              LEADERBOARD
            </span>
          </div>
          <div className="space-y-2">
            {LEADERBOARD.map((entry, i) => {
              const isMe = entry.username === user.username;
              const isTop3 = entry.rank <= 3;
              return (
                <div
                  key={entry.username}
                  className="flex items-center gap-3 p-3"
                  style={{
                    background: isMe ? "#c8ff0022" : "#faf7f2",
                    border: isMe ? "2.5px solid #c8ff00" : "2px solid #e8e3d8",
                    borderRadius: 12,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      background: isTop3 ? ["#ffde00", "#aaa", "#cd7f32"][entry.rank - 1] : "#e8e3d8",
                      border: "2px solid #0a0a0a",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "#fff",
                      border: "2px solid #0a0a0a",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                    }}
                  >
                    {entry.emoji}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      @{entry.username} {isMe && <span style={{ color: "#888" }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>
                      LVL {entry.level} · {entry.class}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {entry.karma.toLocaleString()} ⚡
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Achievements wall */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} color="#ffcc00" fill="#ffcc00" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              ACHIEVEMENTS ({achievements.length}/{ACHIEVEMENTS.length})
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ACHIEVEMENTS.map((ach, i) => {
              const unlocked = achievements.includes(ach.id);
              return (
                <motion.div key={ach.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  title={`${ach.name}: ${ach.description}`}
                  style={{
                    background: unlocked ? "#ffcc0018" : "#f5f0e8",
                    border: `2px solid ${unlocked ? "#ffcc00" : "#e8e3d8"}`,
                    borderRadius: 12, padding: "10px 4px",
                    textAlign: "center", opacity: unlocked ? 1 : 0.35,
                    boxShadow: unlocked ? "0 0 10px #ffcc0033" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: 3, filter: unlocked ? "none" : "grayscale(1)" }}>
                    {unlocked ? ach.emoji : "🔒"}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: unlocked ? "#ffcc00" : "#aaa", lineHeight: 1.2, wordBreak: "break-word" }}>
                    {ach.name}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Language selector */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages size={16} color="#4488ff" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              {lang === "sv" ? "SPRÅK" : "LANGUAGE"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {(["en", "sv"] as const).map(l => (
              <motion.button
                key={l}
                whileTap={{ scale: 0.93 }}
                onClick={() => setLang(l)}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  background: lang === l ? "#4488ff" : "#faf7f2",
                  border: `2.5px solid ${lang === l ? "#4488ff" : "#e8e3d8"}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  textAlign: "center",
                  boxShadow: lang === l ? "3px 3px 0px #0a0a0a, 0 0 14px #4488ff44" : "2px 2px 0px #e8e3d8",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: 3 }}>
                  {l === "en" ? "🇬🇧" : "🇸🇪"}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: lang === l ? "#fff" : "#555" }}>
                  {l === "en" ? "English" : "Svenska"}
                </div>
                {lang === l && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: 700 }}>
                    ✓ ACTIVE
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* World selector */}
        <div className="neo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} color="#00e5ff" />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
              DIN VÄRLD
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {WORLDS.map(w => {
              const active = w.id === worldId;
              return (
                <button
                  key={w.id}
                  onClick={() => setWorldId(w.id)}
                  style={{
                    background: active ? `${w.accent}18` : "#faf7f2",
                    border: `2.5px solid ${active ? w.accent : "#e8e3d8"}`,
                    borderRadius: 12,
                    padding: "10px 8px",
                    cursor: "pointer",
                    textAlign: "center",
                    boxShadow: active ? `0 0 12px ${w.glowColor}` : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 3 }}>{w.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active ? w.accent : "#555", letterSpacing: "0.04em" }}>
                    {w.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
