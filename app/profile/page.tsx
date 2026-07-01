"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Trophy, Zap, Flame, Globe, Star, Languages, Users } from "lucide-react";
import Link from "next/link";
import SpinWheel from "@/components/ui/SpinWheel";
import XPBar from "@/components/ui/XPBar";
import { useApp } from "@/context/AppContext";
import { xpProgress, xpToNextLevel, calculateLevel } from "@/lib/xp-system";
import { LEADERBOARD, FOLLOWERS, FOLLOWING } from "@/lib/mock-data";
import { getPetClassColor } from "@/lib/pet-evolution";
import { WORLDS } from "@/lib/worlds";
import { ACHIEVEMENTS } from "@/lib/achievements";

const CLASS_DESCRIPTION: Record<string, string> = {
  "Grinder Beast":      "You dominate through action. Relentless hustle, maximum output.",
  "Influencer Spirit":  "Your energy moves people. You lead by example and inspire.",
  "Merchant King":      "You see opportunity everywhere. Trade, deal, accumulate.",
};
const CLASS_ICON: Record<string, string> = {
  "Grinder Beast": "💪", "Influencer Spirit": "✨", "Merchant King": "💰",
};

type ProfileTab = "stats" | "social" | "achievements" | "settings";

function Toggle({ on, onToggle, color }: { on: boolean; onToggle: () => void; color: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      style={{ width: 48, height: 26, borderRadius: 13, background: on ? color : "#222", border: "2px solid #0a0a0a", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
    >
      <motion.div
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }}
      />
    </motion.button>
  );
}

export default function ProfilePage() {
  const { user, worldId, setWorldId, streak, achievements, showToast, lang, setLang } = useApp();
  const progress   = xpProgress(user.xp);
  const xpToNext   = xpToNextLevel(user.xp);
  const level      = calculateLevel(user.xp);
  const classColor = getPetClassColor(user.petClass);

  const [tab, setTab] = useState<ProfileTab>("stats");
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});
  const toggleFollow = (id: string, current: boolean) =>
    setFollowOverrides(prev => ({ ...prev, [id]: !current }));
  const newFollowerCount = FOLLOWERS.filter(f => f.isNew).length;
  const followList = followTab === "followers" ? FOLLOWERS : FOLLOWING;

  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [notifOn, setNotifOn] = useState(true);
  const [privacyPublic, setPrivacyPublic] = useState(true);

  const TABS: { id: ProfileTab; label: string; icon: string }[] = [
    { id: "stats",        label: "STATS",    icon: "⚡" },
    { id: "social",       label: "SOCIAL",   icon: "👥" },
    { id: "achievements", label: "TROPHIES", icon: "🏆" },
    { id: "settings",     label: "SETTINGS", icon: "⚙️" },
  ];

  return (
    <div style={{ background: "#080808", minHeight: "100dvh", color: "#fff" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -60, left: "20%", width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle, ${classColor}07 0%, transparent 70%)` }} />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", borderBottom: "2px solid #1a1a1a" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
          MY <span style={{ color: classColor }}>PROFILE</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: "#c8ff0022", border: "1.5px solid #c8ff0044", borderRadius: 10,
            padding: "4px 10px", fontSize: 11, fontWeight: 800, color: "#c8ff00",
          }}>
            RANK #{user.rank}
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div style={{ position: "relative", height: 120, overflow: "hidden", marginBottom: -50 }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${classColor}22 0%, #080808 60%, #0a0015 100%)`, borderBottom: `2px solid ${classColor}22` }} />
        <div style={{ position: "absolute", right: -10, top: -10, fontSize: "7rem", opacity: 0.06, lineHeight: 1, filter: "blur(2px)", userSelect: "none" }}>
          {CLASS_ICON[user.petClass] ?? "⭐"}
        </div>
        <div style={{ position: "absolute", top: 14, left: 16, background: "rgba(0,0,0,0.6)", border: `1.5px solid ${classColor}66`, borderRadius: 10, padding: "4px 12px", backdropFilter: "blur(8px)" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: classColor, letterSpacing: "0.08em" }}>LEVEL {level}</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3" style={{ position: "relative", zIndex: 1 }}>

        {/* Profile card — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `linear-gradient(135deg, #111 0%, ${classColor}11 100%)`,
            border: `2px solid ${classColor}44`, borderRadius: 24, padding: "20px 18px",
            boxShadow: `0 0 32px ${classColor}11`, position: "relative", overflow: "hidden", paddingTop: 56,
          }}
        >
          <div style={{ position: "absolute", top: -40, left: 18 }}>
            <motion.div
              animate={{ boxShadow: [`0 0 16px ${classColor}44`, `0 0 36px ${classColor}88`, `0 0 16px ${classColor}44`] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{ width: 76, height: 76, background: "#111", border: `3px solid ${classColor}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem" }}
            >
              {user.avatarEmoji}
            </motion.div>
          </div>
          <div style={{ paddingLeft: 90 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 1 }}>{user.displayName}</div>
            <div style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>@{user.username} · {CLASS_ICON[user.petClass]} {user.petClass}</div>
          </div>
          {user.bio && <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5, marginTop: 10 }}>{user.bio}</p>}
          <div style={{ marginTop: 12 }}>
            <XPBar xp={user.xp} xpToNext={xpToNext} progress={progress} level={user.level} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
            {[
              { label: "KARMA", value: user.karma?.toLocaleString() ?? "0", color: "#c8ff00", emoji: "⚡" },
              { label: "XP", value: user.xp.toLocaleString(), color: classColor, emoji: "🔥" },
              { label: "STREAK", value: `${streak}d`, color: "#ff6b35", emoji: "🏃" },
            ].map(stat => (
              <div key={stat.label} style={{ background: "#0a0a0a", border: `1.5px solid ${stat.color}33`, borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 15, marginBottom: 2 }}>{stat.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.08em", marginTop: 1 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Inner tabs */}
        <div style={{ display: "flex", gap: 6, background: "#0d0d0d", border: "2px solid #1a1a1a", borderRadius: 16, padding: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer",
                background: tab === t.id ? classColor : "transparent",
                color: tab === t.id ? "#000" : "#555",
                fontWeight: 800, fontSize: 9, letterSpacing: "0.06em",
                transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {/* ── STATS tab ───────────────────────────────────────────── */}
            {tab === "stats" && (
              <>
                {/* Weekly chart */}
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.1em" }}>WEEKLY ACTIVITY</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#c8ff00" }}>THIS WEEK</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
                    {["M","T","W","T","F","S","S"].map((day, i) => {
                      const heights = [35, 55, 20, 70, 45, 90, 60];
                      const today = new Date().getDay();
                      const adjustedDay = (i + 1) % 7;
                      const isPast = adjustedDay <= today;
                      const isToday = adjustedDay === today;
                      return (
                        <div key={day + i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: isPast ? heights[i] : 6 }}
                            transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: "easeOut" }}
                            style={{ width: "100%", background: isToday ? "#c8ff00" : isPast ? `${classColor}88` : "#1a1a1a", borderRadius: 4, boxShadow: isToday ? "0 0 12px #c8ff0066" : "none" }}
                          />
                          <span style={{ fontSize: 8, fontWeight: isToday ? 800 : 600, color: isToday ? "#c8ff00" : "#444" }}>{day}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: "#444" }}>Total: <span style={{ color: "#fff", fontWeight: 700 }}>{(user.xp * 3).toLocaleString()} ⚡</span></span>
                    <span style={{ fontSize: 10, color: "#444" }}>Best: <span style={{ color: "#c8ff00", fontWeight: 700 }}>Saturday</span></span>
                  </div>
                </div>

                {/* Spin wheel */}
                <SpinWheel />

                {/* Class card */}
                <div style={{ background: "#111", border: `2px solid ${classColor}44`, borderRadius: 18, padding: "14px", borderLeft: `4px solid ${classColor}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Zap size={14} color={classColor} fill={classColor} />
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: classColor }}>YOUR CLASS</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 5 }}>{CLASS_ICON[user.petClass] ?? "⭐"} {user.petClass}</div>
                  <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{CLASS_DESCRIPTION[user.petClass]}</p>
                </div>

                {/* Quick links */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { href: "/brand", emoji: "🚀", label: "MY BRAND", sub: "Create & earn karma", color: "#c8ff00", bg: "#0d1400" },
                    { href: "/card",  emoji: "🃏", label: "KARMA CARD", sub: "Your shareable identity", color: "#ff2d8d", bg: "#0a0020" },
                    { href: "/squads", emoji: "⚡", label: "MY SQUAD", sub: "Team up & fight wars", color: "#c8ff00", bg: "#060f06" },
                    { href: "/premium", emoji: "👑", label: "KARMA PRO", sub: "Upgrade now", color: "#ff8c00", bg: "#1a0e00" },
                  ].map(item => (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                      <motion.div whileTap={{ scale: 0.95 }} style={{ background: item.bg, border: `2px solid ${item.color}44`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.6rem", marginBottom: 5 }}>{item.emoji}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: item.color }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{item.sub}</div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* ── SOCIAL tab ──────────────────────────────────────────── */}
            {tab === "social" && (
              <>
                {/* Followers */}
                <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Users size={14} color="#ff2d8d" />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ff2d8d" }}>MINA FÖLJARE</span>
                    </div>
                    {newFollowerCount > 0 && (
                      <motion.span
                        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ fontSize: 9, fontWeight: 800, color: "#ff2d8d", background: "#ff2d8d18", border: "1.5px solid #ff2d8d55", borderRadius: 6, padding: "2px 7px" }}
                      >
                        +{newFollowerCount} NYA
                      </motion.span>
                    )}
                  </div>
                  <div className="flex gap-2 mb-3">
                    {(["followers", "following"] as const).map(t => (
                      <button key={t} onClick={() => setFollowTab(t)} style={{ flex: 1, padding: "8px", borderRadius: 10, background: followTab === t ? "#ff2d8d18" : "#0d0d0d", border: `2px solid ${followTab === t ? "#ff2d8d" : "#1a1a1a"}`, color: followTab === t ? "#ff2d8d" : "#666", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        {t === "followers" ? `Följare (${FOLLOWERS.length})` : `Följer (${FOLLOWING.length})`}
                      </button>
                    ))}
                  </div>
                  {followTab === "followers" && newFollowerCount > 0 && (
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
                      {FOLLOWERS.filter(f => f.isNew).map(f => (
                        <div key={f.id} style={{ flexShrink: 0, textAlign: "center", width: 56 }}>
                          <motion.div
                            animate={{ boxShadow: ["0 0 0px #ff2d8d00", "0 0 12px #ff2d8d88", "0 0 0px #ff2d8d00"] }}
                            transition={{ repeat: Infinity, duration: 1.6 }}
                            style={{ width: 44, height: 44, margin: "0 auto", borderRadius: "50%", background: "#0d0d0d", border: "2px solid #ff2d8d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}
                          >
                            {f.emoji}
                          </motion.div>
                          <div style={{ fontSize: 8, color: "#888", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.username}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {followList.map(f => {
                      const isFollowingBack = followOverrides[f.id] ?? f.youFollowBack;
                      return (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "#0d0d0d", border: "2px solid #1a1a1a", borderRadius: 12 }}>
                          <div style={{ width: 32, height: 32, flexShrink: 0, background: "#111", border: "2px solid #222", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>{f.emoji}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>@{f.username} {f.mutual && <span style={{ fontSize: 8, color: "#00e5ff" }}>· MUTUAL</span>}</div>
                            <div style={{ fontSize: 10, color: "#444" }}>LV {f.level} · {f.class}</div>
                          </div>
                          <motion.button whileTap={{ scale: 0.93 }} onClick={() => toggleFollow(f.id, isFollowingBack)}
                            style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 800, background: isFollowingBack ? "#0d0d0d" : "#ff2d8d", border: `1.5px solid ${isFollowingBack ? "#333" : "#ff2d8d"}`, color: isFollowingBack ? "#666" : "#000", cursor: "pointer" }}>
                            {isFollowingBack ? "FÖLJER" : followTab === "followers" ? "FÖLJ TILLBAKA" : "FÖLJJ"}
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leaderboard */}
                <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Flame size={14} color="#ff6b35" />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ff6b35" }}>LEADERBOARD</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {LEADERBOARD.map(entry => {
                      const isMe = entry.username === user.username;
                      const rankColors = ["#ffde00", "#aaa", "#cd7f32"];
                      return (
                        <div key={entry.username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isMe ? "#c8ff0011" : "#0d0d0d", border: `2px solid ${isMe ? "#c8ff0055" : "#1a1a1a"}`, borderRadius: 12 }}>
                          <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: entry.rank <= 3 ? `${rankColors[entry.rank - 1]}22` : "#111", border: `1.5px solid ${entry.rank <= 3 ? rankColors[entry.rank - 1] : "#222"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: entry.rank <= 3 ? rankColors[entry.rank - 1] : "#444" }}>
                            {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
                          </span>
                          <div style={{ width: 32, height: 32, flexShrink: 0, background: "#111", border: "2px solid #222", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>{entry.emoji}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? "#c8ff00" : "#fff" }}>@{entry.username} {isMe && <span style={{ color: "#555", fontSize: 10 }}>(you)</span>}</div>
                            <div style={{ fontSize: 10, color: "#444" }}>LV {entry.level} · {entry.class}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#c8ff00" }}>{entry.karma.toLocaleString()} ⚡</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── ACHIEVEMENTS tab ────────────────────────────────────── */}
            {tab === "achievements" && (
              <>
                {/* Badges */}
                <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Trophy size={14} color="#ffaa00" />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ffaa00" }}>BADGES ({user.badges.length})</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {user.badges.map((badge, i) => (
                      <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        style={{ background: "#0d0d0d", border: "2px solid #1a1a1a", borderRadius: 14, padding: "12px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>{badge.icon}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#666", lineHeight: 1.2 }}>{badge.name}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Achievements */}
                <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Star size={14} color="#ffcc00" fill="#ffcc00" />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ffcc00" }}>
                      ACHIEVEMENTS ({achievements.length}/{ACHIEVEMENTS.length})
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {ACHIEVEMENTS.map((ach, i) => {
                      const unlocked = achievements.includes(ach.id);
                      const glowColors = ["#c8ff00", "#ff2d8d", "#00e5ff", "#ff6b35", "#a855f7", "#ffcc00", "#4488ff", "#ff8c00"];
                      const glowColor = glowColors[i % glowColors.length];
                      return (
                        <motion.div key={ach.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} title={`${ach.name}: ${ach.description}`}
                          style={{ background: unlocked ? `${glowColor}12` : "#0d0d0d", border: `2px solid ${unlocked ? glowColor + "66" : "#1a1a1a"}`, borderRadius: 14, padding: "12px 6px", textAlign: "center", opacity: unlocked ? 1 : 0.35, boxShadow: unlocked ? `0 0 14px ${glowColor}44` : "none", filter: unlocked ? "none" : "grayscale(1)" }}>
                          <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{unlocked ? ach.emoji : "🔒"}</div>
                          <div style={{ fontSize: 8, fontWeight: 800, color: unlocked ? glowColor : "#333", lineHeight: 1.2 }}>{ach.name}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── SETTINGS tab ────────────────────────────────────────── */}
            {tab === "settings" && (
              <>
                {/* Account info */}
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#444", letterSpacing: "0.1em" }}>ACCOUNT</div>
                  </div>
                  {[
                    { label: "Username", value: `@${user.username}` },
                    { label: "Email", value: "••••@gmail.com" },
                    { label: "Member since", value: "Jun 2026" },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                      <span style={{ fontSize: 13, color: "#888" }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Preferences */}
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 18, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#444", letterSpacing: "0.1em" }}>PREFERENCES</div>
                  </div>
                  {[
                    { label: "Sound FX", icon: "🔊", toggle: soundOn, onToggle: () => setSoundOn(v => !v) },
                    { label: "Haptics", icon: "📳", toggle: hapticsOn, onToggle: () => setHapticsOn(v => !v) },
                    { label: "Notifications", icon: "🔔", toggle: notifOn, onToggle: () => setNotifOn(v => !v) },
                    { label: "Public Profile", icon: "👁️", toggle: privacyPublic, onToggle: () => setPrivacyPublic(v => !v) },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                        <span style={{ fontSize: 13, color: "#ccc" }}>{item.label}</span>
                      </div>
                      <Toggle on={item.toggle} onToggle={item.onToggle} color={classColor} />
                    </div>
                  ))}
                </div>

                {/* Language */}
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 18, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Languages size={14} color="#4488ff" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#4488ff", letterSpacing: "0.06em" }}>LANGUAGE</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {(["en", "sv"] as const).map(l => (
                      <motion.button key={l} whileTap={{ scale: 0.93 }} onClick={() => setLang(l)}
                        style={{ flex: 1, padding: "12px 8px", background: lang === l ? "#4488ff22" : "#0d0d0d", border: `2.5px solid ${lang === l ? "#4488ff" : "#222"}`, borderRadius: 14, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                        <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{l === "en" ? "🇬🇧" : "🇸🇪"}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: lang === l ? "#4488ff" : "#555" }}>{l === "en" ? "English" : "Svenska"}</div>
                        {lang === l && <div style={{ fontSize: 9, color: "#4488ff", marginTop: 2, fontWeight: 700 }}>✓ ACTIVE</div>}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* World selector */}
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 18, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Globe size={14} color="#00e5ff" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#00e5ff", letterSpacing: "0.06em" }}>YOUR WORLD</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {WORLDS.map(w => {
                      const active = w.id === worldId;
                      return (
                        <motion.button key={w.id} whileTap={{ scale: 0.95 }} onClick={() => setWorldId(w.id)}
                          style={{ background: active ? `${w.accent}18` : "#0d0d0d", border: `2px solid ${active ? w.accent : "#1a1a1a"}`, borderRadius: 14, padding: "12px 8px", cursor: "pointer", textAlign: "center", boxShadow: active ? `0 0 16px ${w.glowColor}` : "none", transition: "all 0.2s" }}>
                          <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{w.emoji}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: active ? w.accent : "#444" }}>{w.name}</div>
                          {active && <div style={{ fontSize: 8, color: w.accent, marginTop: 2, fontWeight: 700 }}>● ACTIVE</div>}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Settings actions */}
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 18, overflow: "hidden" }}>
                  {[
                    { label: "Privacy Policy", icon: "🔒", href: "#" },
                    { label: "Terms of Service", icon: "📋", href: "#" },
                    { label: "Help & Support", icon: "💬", href: "#" },
                  ].map((item, i, arr) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid #1a1a1a" : "none", cursor: "pointer" }}>
                      <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                      <span style={{ fontSize: 13, color: "#ccc", flex: 1 }}>{item.label}</span>
                      <span style={{ color: "#444", fontSize: 14 }}>›</span>
                    </div>
                  ))}
                </div>

                {/* Danger zone */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => showToast("Account data cleared (demo)", undefined, "#ff3333", "🗑️")}
                  style={{ width: "100%", padding: "14px", background: "#110000", border: "2px solid #ff333344", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "#ff3333", cursor: "pointer", fontFamily: "inherit" }}
                >
                  🗑️ Reset All Data
                </motion.button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
