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
          onClick={() => showToast("Settings coming soon! 🛠️", undefined, "#4488ff", "⚙️")}
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
          }}
        >
          <div style={{ position: "absolute", top: -20, left: 18, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${classColor}20 0%, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <motion.div
              animate={{ boxShadow: [`0 0 16px ${classColor}44`, `0 0 32px ${classColor}66`, `0 0 16px ${classColor}44`] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{
                width: 76, height: 76, flexShrink: 0,
                background: "#111", border: `3px solid ${classColor}`,
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "2.6rem",
              }}
            >
              {user.avatarEmoji}
            </motion.div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fff", marginBottom: 2 }}>{user.displayName}</div>
              <div style={{ fontSize: 13, color: "#555", fontWeight: 600, marginBottom: 8 }}>@{user.username}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", background: classColor + "22", border: `1.5px solid ${classColor}66`, color: classColor, borderRadius: 6, padding: "2px 8px" }}>
                  {CLASS_ICON[user.petClass] ?? "⭐"} {user.petClass}
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, background: "#c8ff0022", border: "1.5px solid #c8ff0055", color: "#c8ff00", borderRadius: 6, padding: "2px 8px" }}>
                  RANK #{user.rank}
                </span>
              </div>
            </div>
          </div>

          {user.bio && <p style={{ fontSize: 13, color: "#666", lineHeight: 1.55, marginTop: 14 }}>{user.bio}</p>}

          <div style={{ marginTop: 14 }}>
            <XPBar xp={user.xp} xpToNext={xpToNext} progress={progress} level={user.level} />
          </div>
        </motion.div>

        {/* ── Stats grid ───────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { label: "KARMA",  value: user.karma.toLocaleString(), icon: "⚡", color: "#c8ff00", bg: "#111" },
            { label: "LEVEL",  value: `LV ${level}`,               icon: "🌟", color: "#ffcc00", bg: "#1a1200" },
            { label: "STREAK", value: `${streak}d`,                 icon: "🔥", color: "#ff6b35", bg: "#1a0800" },
          ].map(({ label, value, icon, color, bg }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: bg, border: `2px solid ${color}33`,
                borderRadius: 16, padding: "14px 8px", textAlign: "center",
                boxShadow: `0 0 16px ${color}11`,
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
            </motion.div>
          ))}
        </div>

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {ACHIEVEMENTS.map((ach, i) => {
              const unlocked = achievements.includes(ach.id);
              return (
                <motion.div key={ach.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                  title={`${ach.name}: ${ach.description}`}
                  style={{
                    background: unlocked ? "#1a1200" : "#0d0d0d",
                    border: `2px solid ${unlocked ? "#ffcc0055" : "#1a1a1a"}`,
                    borderRadius: 12, padding: "10px 4px", textAlign: "center",
                    opacity: unlocked ? 1 : 0.35,
                    boxShadow: unlocked ? "0 0 12px #ffcc0022" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 3, filter: unlocked ? "none" : "grayscale(1)" }}>
                    {unlocked ? ach.emoji : "🔒"}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: unlocked ? "#ffcc00" : "#333", lineHeight: 1.2 }}>
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
    </div>
  );
}
