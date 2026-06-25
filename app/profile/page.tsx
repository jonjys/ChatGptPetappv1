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

export default function ProfilePage() {
  const { user, worldId, setWorldId, streak, achievements, showToast, lang, setLang } = useApp();
  const progress   = xpProgress(user.xp);
  const xpToNext   = xpToNextLevel(user.xp);
  const level      = calculateLevel(user.xp);
  const classColor = getPetClassColor(user.petClass);

  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});
  const toggleFollow = (id: string, current: boolean) =>
    setFollowOverrides(prev => ({ ...prev, [id]: !current }));
  const newFollowerCount = FOLLOWERS.filter(f => f.isNew).length;
  const followList = followTab === "followers" ? FOLLOWERS : FOLLOWING;

  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [notifOn, setNotifOn] = useState(true);
  const [privacyPublic, setPrivacyPublic] = useState(true);

  return (
    <div style={{ background: "#080808", minHeight: "100dvh", color: "#fff" }}>

      {/* ── Ambient glow ─────────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -60, left: "20%", width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle, ${classColor}07 0%, transparent 70%)` }} />
        <div style={{ position: "absolute", top: 400, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, #c8ff0005 0%, transparent 70%)" }} />
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)", borderBottom: "2px solid #1a1a1a" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
          MY <span style={{ color: classColor }}>PROFILE</span>
        </h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings(true)}
          style={{
            width: 40, height: 40,
            background: "#111", border: "2px solid #333",
            borderRadius: 12, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}
        >
          <Settings size={18} color="#888" />
        </motion.button>
      </div>

      {/* ── Epic hero banner ─────────────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 140, overflow: "hidden", marginBottom: -50 }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(135deg, ${classColor}22 0%, #080808 60%, #0a0015 100%)`,
          borderBottom: `2px solid ${classColor}33`,
        }} />
        {/* Big faded class icon */}
        <div style={{
          position: "absolute", right: -10, top: -10,
          fontSize: "8rem", opacity: 0.07, lineHeight: 1,
          filter: "blur(2px)",
          userSelect: "none",
        }}>
          {CLASS_ICON[user.petClass] ?? "⭐"}
        </div>
        {/* Level badge */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          background: "rgba(0,0,0,0.6)", border: `1.5px solid ${classColor}66`,
          borderRadius: 10, padding: "4px 12px",
          display: "flex", alignItems: "center", gap: 6,
          backdropFilter: "blur(8px)",
        }}>
          <Zap size={10} color={classColor} />
          <span style={{ fontSize: 10, fontWeight: 800, color: classColor, letterSpacing: "0.08em" }}>LEVEL {level}</span>
        </div>
        {/* Rank badge */}
        <div style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(0,0,0,0.6)", border: "1.5px solid #ffd70066",
          borderRadius: 10, padding: "4px 12px",
          backdropFilter: "blur(8px)",
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#ffd700", letterSpacing: "0.08em" }}>RANK #{user.rank}</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4" style={{ position: "relative", zIndex: 1 }}>

        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `linear-gradient(135deg, #111 0%, ${classColor}11 100%)`,
            border: `2px solid ${classColor}44`,
            borderRadius: 24, padding: "20px 18px",
            boxShadow: `0 0 32px ${classColor}11`,
            position: "relative", overflow: "hidden",
            paddingTop: 60,
          }}
        >
          <div style={{ position: "absolute", top: -20, left: 18, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${classColor}20 0%, transparent 70%)`, pointerEvents: "none" }} />

          {/* Avatar overlapping banner */}
          <div style={{ position: "absolute", top: -40, left: 18 }}>
            <motion.div
              animate={{ boxShadow: [`0 0 16px ${classColor}44`, `0 0 36px ${classColor}88`, `0 0 16px ${classColor}44`] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{
                width: 80, height: 80,
                background: "#111", border: `3px solid ${classColor}`,
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "2.6rem",
              }}
            >
              {user.avatarEmoji}
            </motion.div>
          </div>

          <div style={{ paddingLeft: 96 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 2 }}>{user.displayName}</div>
            <div style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>@{user.username}</div>
          </div>

          {user.bio && <p style={{ fontSize: 13, color: "#666", lineHeight: 1.55, marginTop: 14 }}>{user.bio}</p>}

          <div style={{ marginTop: 14 }}>
            <XPBar xp={user.xp} xpToNext={xpToNext} progress={progress} level={user.level} />
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
            {[
              { label: "KARMA", value: user.karma?.toLocaleString() ?? "0", color: "#c8ff00", emoji: "⚡" },
              { label: "XP", value: user.xp.toLocaleString(), color: classColor, emoji: "🔥" },
              { label: "STREAK", value: `${streak}d`, color: "#ff6b35", emoji: "🏃" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#0a0a0a",
                border: `1.5px solid ${stat.color}33`,
                borderRadius: 12, padding: "10px 8px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{stat.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 8, color: "#555", letterSpacing: "0.1em", marginTop: 1 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── My Followers ─────────────────────────────────────────────────── */}
        <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={14} color="#ff2d8d" />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ff2d8d" }}>MINA FÖLJARE</span>
            </div>
            {newFollowerCount > 0 && (
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ fontSize: 9, fontWeight: 800, color: "#ff2d8d", background: "#ff2d8d18", border: "1.5px solid #ff2d8d55", borderRadius: 6, padding: "2px 7px" }}
              >
                +{newFollowerCount} NYA
              </motion.span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            {(["followers", "following"] as const).map(t => (
              <button key={t} onClick={() => setFollowTab(t)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 10,
                  background: followTab === t ? "#ff2d8d18" : "#0d0d0d",
                  border: `2px solid ${followTab === t ? "#ff2d8d" : "#1a1a1a"}`,
                  color: followTab === t ? "#ff2d8d" : "#666",
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>
                {t === "followers" ? `Följare (${FOLLOWERS.length})` : `Följer (${FOLLOWING.length})`}
              </button>
            ))}
          </div>

          {/* New followers strip */}
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

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence initial={false}>
              {followList.map(f => {
                const isFollowingBack = followOverrides[f.id] ?? f.youFollowBack;
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                      background: "#0d0d0d", border: "2px solid #1a1a1a", borderRadius: 12,
                    }}
                  >
                    <div style={{ width: 32, height: 32, flexShrink: 0, background: "#111", border: "2px solid #222", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                      {f.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 5 }}>
                        @{f.username}
                        {f.mutual && <span style={{ fontSize: 8, color: "#00e5ff", fontWeight: 700 }}>· MUTUAL</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#444" }}>LV {f.level} · {f.class} · {f.followedAt}</div>
                    </div>
                    {followTab === "followers" ? (
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => toggleFollow(f.id, isFollowingBack)}
                        style={{
                          flexShrink: 0, padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 800,
                          background: isFollowingBack ? "#0d0d0d" : "#ff2d8d",
                          border: `1.5px solid ${isFollowingBack ? "#333" : "#ff2d8d"}`,
                          color: isFollowingBack ? "#666" : "#000",
                          cursor: "pointer",
                        }}
                      >
                        {isFollowingBack ? "FÖLJER" : "FÖLJ TILLBAKA"}
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => toggleFollow(f.id, isFollowingBack)}
                        style={{
                          flexShrink: 0, padding: "6px 10px", borderRadius: 8, fontSize: 10, fontWeight: 800,
                          background: isFollowingBack ? "#0d0d0d" : "#222",
                          border: `1.5px solid ${isFollowingBack ? "#333" : "#444"}`,
                          color: isFollowingBack ? "#666" : "#aaa",
                          cursor: "pointer",
                        }}
                      >
                        {isFollowingBack ? "FÖLJER" : "FÖLJ"}
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Weekly karma chart ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: "#111",
            border: "2px solid #1a1a1a",
            borderRadius: 20, padding: "16px",
          }}
        >
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
              const h = heights[i];
              return (
                <div key={day + i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: isPast ? h : 6 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                    style={{
                      width: "100%",
                      background: isToday ? "#c8ff00" : isPast ? `${classColor}88` : "#1a1a1a",
                      borderRadius: 4,
                      boxShadow: isToday ? "0 0 12px #c8ff0066" : "none",
                    }}
                  />
                  <span style={{ fontSize: 8, fontWeight: isToday ? 800 : 600, color: isToday ? "#c8ff00" : "#444" }}>{day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontSize: 10, color: "#444" }}>Total: <span style={{ color: "#fff", fontWeight: 700 }}>{(user.xp * 3).toLocaleString()} ⚡</span></span>
            <span style={{ fontSize: 10, color: "#444" }}>Best day: <span style={{ color: "#c8ff00", fontWeight: 700 }}>Saturday</span></span>
          </div>
        </motion.div>

        {/* ── Spin Wheel ───────────────────────────────────────────────────── */}
        <SpinWheel />

        {/* ── Quick links ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/karma-pot" style={{ textDecoration: "none" }}>
            <motion.div whileTap={{ scale: 0.95 }} style={{ background: "#0d1400", border: "2px solid #c8ff0044", borderRadius: 16, padding: "16px 12px", textAlign: "center", boxShadow: "0 0 20px #c8ff0011" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>💰</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#c8ff00" }}>KARMA POTTEN</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>Vinn riktiga pengar</div>
            </motion.div>
          </Link>
          <Link href="/premium" style={{ textDecoration: "none" }}>
            <motion.div whileTap={{ scale: 0.95 }} style={{ background: "linear-gradient(135deg, #1a0e00, #0d1a00)", border: "2px solid #ff8c0055", borderRadius: 16, padding: "16px 12px", textAlign: "center", boxShadow: "0 0 20px #ff8c0011" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>👑</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#ff8c00" }}>KARMA PRO</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>Uppgradera nu</div>
            </motion.div>
          </Link>
        </div>

        {/* ── Class card ───────────────────────────────────────────────────── */}
        <div style={{ background: "#111", border: `2px solid ${classColor}44`, borderRadius: 18, padding: "16px", borderLeft: `4px solid ${classColor}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Zap size={15} color={classColor} fill={classColor} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: classColor }}>YOUR CLASS</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>{CLASS_ICON[user.petClass] ?? "⭐"} {user.petClass}</div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.55 }}>{CLASS_DESCRIPTION[user.petClass]}</p>
        </div>

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Trophy size={14} color="#ffaa00" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ffaa00" }}>BADGES ({user.badges.length})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {user.badges.map((badge, i) => (
              <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                style={{ background: "#0d0d0d", border: "2px solid #1a1a1a", borderRadius: 14, padding: "12px 6px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>{badge.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#666", lineHeight: 1.2 }}>{badge.name}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Leaderboard ──────────────────────────────────────────────────── */}
        <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Flame size={14} color="#ff6b35" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#ff6b35" }}>LEADERBOARD</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LEADERBOARD.map((entry) => {
              const isMe = entry.username === user.username;
              const rankColors = ["#ffde00", "#aaa", "#cd7f32"];
              return (
                <div key={entry.username} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  background: isMe ? "#c8ff0011" : "#0d0d0d",
                  border: `2px solid ${isMe ? "#c8ff0055" : "#1a1a1a"}`,
                  borderRadius: 12,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: entry.rank <= 3 ? `${rankColors[entry.rank - 1]}22` : "#111",
                    border: `1.5px solid ${entry.rank <= 3 ? rankColors[entry.rank - 1] : "#222"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    color: entry.rank <= 3 ? rankColors[entry.rank - 1] : "#444",
                  }}>
                    {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
                  </span>
                  <div style={{ width: 32, height: 32, flexShrink: 0, background: "#111", border: "2px solid #222", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                    {entry.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? "#c8ff00" : "#fff" }}>
                      @{entry.username} {isMe && <span style={{ color: "#555" }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#444" }}>LV {entry.level} · {entry.class}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#c8ff00" }}>{entry.karma.toLocaleString()} ⚡</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Achievements ─────────────────────────────────────────────────── */}
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
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  title={`${ach.name}: ${ach.description}`}
                  style={{
                    background: unlocked ? `${glowColor}12` : "#0d0d0d",
                    border: `2px solid ${unlocked ? glowColor + "66" : "#1a1a1a"}`,
                    borderRadius: 14, padding: "14px 6px", textAlign: "center",
                    opacity: unlocked ? 1 : 0.3,
                    boxShadow: unlocked ? `0 0 18px ${glowColor}44, inset 0 0 12px ${glowColor}11` : "none",
                    transition: "all 0.2s",
                    filter: unlocked ? "none" : "grayscale(1)",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: 5 }}>
                    {unlocked ? ach.emoji : "🔒"}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 800, color: unlocked ? glowColor : "#333", lineHeight: 1.2, letterSpacing: "0.02em" }}>
                    {ach.name}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Language selector ────────────────────────────────────────────── */}
        <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Languages size={14} color="#4488ff" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#4488ff" }}>
              {lang === "sv" ? "SPRÅK" : "LANGUAGE"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {(["en", "sv"] as const).map(l => (
              <motion.button key={l} whileTap={{ scale: 0.93 }} onClick={() => setLang(l)}
                style={{
                  flex: 1, padding: "12px 8px",
                  background: lang === l ? "#4488ff22" : "#0d0d0d",
                  border: `2.5px solid ${lang === l ? "#4488ff" : "#222"}`,
                  borderRadius: 14, cursor: "pointer", textAlign: "center",
                  boxShadow: lang === l ? "0 0 20px #4488ff33" : "none",
                  transition: "all 0.15s ease",
                }}>
                <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>{l === "en" ? "🇬🇧" : "🇸🇪"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: lang === l ? "#4488ff" : "#555" }}>
                  {l === "en" ? "English" : "Svenska"}
                </div>
                {lang === l && <div style={{ fontSize: 9, color: "#4488ff", marginTop: 2, fontWeight: 700 }}>✓ ACTIVE</div>}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Brand CTA ────────────────────────────────────────────────────── */}
        <Link href="/brand" style={{ textDecoration: "none", display: "block" }}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #0d1400 0%, #1a2800 100%)",
              border: "2px solid #c8ff0055",
              borderRadius: 18, padding: "18px 16px",
              boxShadow: "0 0 24px #c8ff0011",
              display: "flex", alignItems: "center", gap: 16,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "#c8ff0022", border: "2px solid #c8ff00",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>
              🚀
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#c8ff00", marginBottom: 2 }}>MY BRAND</div>
              <div style={{ fontSize: "0.78rem", color: "#888" }}>Create your brand, list products, earn karma</div>
            </div>
            <div style={{ fontSize: "1rem", color: "#c8ff00" }}>→</div>
          </motion.div>
        </Link>

        {/* ── Karma Card CTA ───────────────────────────────────────────────── */}
        <Link href="/card" style={{ textDecoration: "none", display: "block" }}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #0a0020 0%, #1a0035 100%)",
              border: "2px solid #ff2d8d55",
              borderRadius: 18, padding: "18px 16px",
              boxShadow: "0 0 24px #ff2d8d11",
              display: "flex", alignItems: "center", gap: 16,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "#ff2d8d22", border: "2px solid #ff2d8d",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>
              🃏
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#ff2d8d", marginBottom: 2 }}>MY KARMA CARD</div>
              <div style={{ fontSize: "0.78rem", color: "#888" }}>Your aura, power score &amp; shareable identity</div>
            </div>
            <div style={{ fontSize: "1rem", color: "#ff2d8d" }}>→</div>
          </motion.div>
        </Link>

        {/* ── Squad CTA ────────────────────────────────────────────────────── */}
        <Link href="/squads" style={{ textDecoration: "none", display: "block" }}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #060f06 0%, #0d1a0d 100%)",
              border: "2px solid #c8ff0055",
              borderRadius: 18, padding: "18px 16px",
              boxShadow: "0 0 24px #c8ff0011",
              display: "flex", alignItems: "center", gap: 16,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "#c8ff0022", border: "2px solid #c8ff00",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
            }}>
              ⚡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#c8ff00", marginBottom: 2 }}>MY SQUAD</div>
              <div style={{ fontSize: "0.78rem", color: "#888" }}>Team up · fight wars · earn together</div>
            </div>
            <div style={{ fontSize: "1rem", color: "#c8ff00" }}>→</div>
          </motion.div>
        </Link>

        {/* ── World selector ───────────────────────────────────────────────── */}
        <div style={{ background: "#111", border: "2px solid #222", borderRadius: 18, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Globe size={14} color="#00e5ff" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#00e5ff" }}>DIN VÄRLD</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {WORLDS.map(w => {
              const active = w.id === worldId;
              return (
                <motion.button key={w.id} whileTap={{ scale: 0.95 }} onClick={() => setWorldId(w.id)}
                  style={{
                    background: active ? `${w.accent}18` : "#0d0d0d",
                    border: `2px solid ${active ? w.accent : "#1a1a1a"}`,
                    borderRadius: 14, padding: "12px 8px",
                    cursor: "pointer", textAlign: "center",
                    boxShadow: active ? `0 0 16px ${w.glowColor}` : "none",
                    transition: "all 0.2s ease",
                  }}>
                  <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{w.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active ? w.accent : "#444", letterSpacing: "0.04em" }}>{w.name}</div>
                  {active && <div style={{ fontSize: 8, color: w.accent, marginTop: 2, fontWeight: 700 }}>● ACTIVE</div>}
                </motion.button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Settings Modal ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
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
                padding: "24px 20px 48px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.03em" }}>⚙️ SETTINGS</div>
                <button onClick={() => setShowSettings(false)} style={{ background: "#1a1a1a", border: "2px solid #333", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888", fontSize: "1rem" }}>✕</button>
              </div>

              {/* Account */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>ACCOUNT</div>
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>
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
              </div>

              {/* Preferences */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>PREFERENCES</div>
                <div style={{ background: "#111", border: "2px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>
                  {[
                    { label: "Language", icon: "🌐", value: lang === "sv" ? "Svenska" : "English", action: () => { setLang(lang === "sv" ? "en" : "sv"); showToast(lang === "sv" ? "Switched to English" : "Bytt till Svenska", undefined, "#4488ff", "🌐"); } },
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
                      {item.toggle !== undefined ? (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={item.onToggle}
                          style={{
                            width: 48, height: 26, borderRadius: 13,
                            background: item.toggle ? classColor : "#222",
                            border: "2px solid #0a0a0a",
                            cursor: "pointer", position: "relative",
                            transition: "background 0.2s",
                          }}
                        >
                          <motion.div
                            animate={{ x: item.toggle ? 22 : 2 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }}
                          />
                        </motion.button>
                      ) : (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={item.action} style={{ fontSize: 12, fontWeight: 700, color: classColor, background: "none", border: "none", cursor: "pointer" }}>
                          {item.value} ›
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { showToast("Account data cleared (demo)", undefined, "#ff3333", "🗑️"); setShowSettings(false); }}
                style={{
                  width: "100%", padding: "14px", background: "#110000",
                  border: "2px solid #ff333344", borderRadius: 14,
                  fontSize: 13, fontWeight: 700, color: "#ff3333",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                🗑️ Reset All Data
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
