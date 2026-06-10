"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { FRIENDS, LEADERBOARD, FEED_POSTS } from "@/lib/mock-data";
import { WORLDS } from "@/lib/worlds";

const TABS = ["FRIENDS", "LEADERBOARD", "ACTIVITY"] as const;
type Tab = typeof TABS[number];

const GAME_LABELS: Record<string, string> = {
  "runner":  "🏃 Karma Runner",
  "fishing": "🎣 Deep Catch",
  "cases":   "📦 Case Opening",
  "breaker": "🧬 DNA Breaker",
  "slots":   "🎰 Karma Slots",
  "memory":  "🧠 Memory Palace",
  "battle":  "⚔️ Pet Battle",
  "blitz":   "💥 Bounty Blitz",
};

export default function SocialPage() {
  const { user, worldId, activities } = useApp();
  const [tab, setTab] = useState<Tab>("FRIENDS");
  const world = WORLDS.find(w => w.id === worldId) ?? WORLDS[2];
  const onlineFriends = FRIENDS.filter(f => f.online);

  const allActivity = [
    ...activities.map(a => ({
      id: a.id,
      emoji: a.emoji,
      title: a.title,
      detail: a.detail,
      value: a.karma ? `+${a.karma} ⚡` : a.xp ? `+${a.xp} XP` : undefined,
      time: new Date(a.timestamp),
      isYou: true,
      username: user.username,
      rarity: a.rarity,
    })),
    ...FEED_POSTS.map(p => ({
      id: p.id,
      emoji: p.authorEmoji,
      title: `@${p.authorUsername} ${p.type === "level_up" ? "leveled up!" : p.type === "bounty_complete" ? "completed a bounty" : "posted"}`,
      detail: p.content.slice(0, 60) + "...",
      value: p.xpEarned ? `+${p.xpEarned} XP` : undefined,
      time: new Date(p.createdAt),
      isYou: false,
      username: p.authorUsername,
      rarity: undefined as string | undefined,
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 30);

  function timeAgo(d: Date) {
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-0" style={{ background: "var(--bg)", borderBottom: `3px solid ${world.accent}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>SOCIAL</h1>
            <p style={{ fontSize: 11, color: "#888", fontWeight: 600, marginTop: 2 }}>
              <span style={{ color: "#4caf50", fontWeight: 700 }}>● {onlineFriends.length} online</span> · {FRIENDS.length} friends
            </p>
          </div>
          <div style={{ background: world.accent, border: "2.5px solid #0a0a0a", borderRadius: 12, padding: "8px 14px", boxShadow: "3px 3px 0px #0a0a0a" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{user.avatarEmoji} @{user.username}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px 4px", background: "none", border: "none",
                borderBottom: `3px solid ${tab === t ? world.accent : "transparent"}`,
                fontSize: 11, fontWeight: 700, color: tab === t ? world.accent : "#666",
                letterSpacing: "0.06em", cursor: "pointer",
                transition: "all 0.15s",
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-24">
        {/* ── FRIENDS tab ── */}
        {tab === "FRIENDS" && (
          <div className="space-y-3">
            {/* Online section */}
            {onlineFriends.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#4caf50", letterSpacing: "0.1em", marginBottom: 10 }}>● ONLINE NOW</div>
                <div className="space-y-2">
                  {onlineFriends.map((f, i) => (
                    <motion.div key={f.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                      <div style={{ background: "#fff", border: "2.5px solid #0a0a0a", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "3px 3px 0px #0a0a0a" }}>
                        <div style={{ position: "relative" }}>
                          <div style={{ width: 46, height: 46, background: "#faf7f2", border: "2.5px solid #0a0a0a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
                            {f.emoji}
                          </div>
                          <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, background: "#4caf50", border: "2px solid #fff", borderRadius: "50%" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14, fontWeight: 700 }}>@{f.username}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 6, padding: "1px 5px" }}>LV{f.level}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            {f.currentGame ? <span style={{ color: "#ff6b35", fontWeight: 600 }}>🎮 {GAME_LABELS[f.currentGame] ?? f.currentGame}</span> : f.lastActivity}
                            · {f.petEmoji} {f.petName}
                          </div>
                        </div>
                        <Link href={f.currentGame ? `/games/${f.currentGame}` : "/games"}
                          style={{ padding: "8px 14px", background: "#0a0a0a", border: "2px solid #0a0a0a", borderRadius: 10, fontSize: 11, fontWeight: 700, color: "#c8ff00", textDecoration: "none" }}>
                          {f.currentGame ? "JOIN" : "CHALLENGE"}
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline section */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", marginBottom: 10, marginTop: 6 }}>OFFLINE</div>
              <div className="space-y-2">
                {FRIENDS.filter(f => !f.online).map((f, i) => (
                  <div key={f.id} style={{ background: "#f5f0e8", border: "2px solid #e0dbd0", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, opacity: 0.75 }}>
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 40, height: 40, background: "#faf7f2", border: "2px solid #ccc", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{f.emoji}</div>
                      <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: "#aaa", border: "2px solid #fff", borderRadius: "50%" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>@{f.username}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{f.lastActivity} · {f.petEmoji} {f.petName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Friend suggestion */}
            <div style={{ background: `${world.accent}18`, border: `2px solid ${world.accent}`, borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Invite Friends</div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Share your code and earn 200 ⚡ each</div>
              <div style={{ background: "#0a0a0a", color: world.accent, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", display: "inline-block" }}>
                KARMA-{user.username.toUpperCase().slice(0, 6)}
              </div>
            </div>
          </div>
        )}

        {/* ── LEADERBOARD tab ── */}
        {tab === "LEADERBOARD" && (
          <div className="space-y-2">
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.1em", marginBottom: 12 }}>GLOBAL KARMA RANKING</div>
            {LEADERBOARD.map((entry, i) => {
              const isMe = entry.username === user.username;
              const medals = ["🥇","🥈","🥉"];
              return (
                <motion.div key={entry.username} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div style={{
                    background: isMe ? `${world.accent}18` : "#fff",
                    border: `2.5px solid ${isMe ? world.accent : "#e8e3d8"}`,
                    borderRadius: 16,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: isMe ? `0 0 16px ${world.glowColor}, 3px 3px 0px #0a0a0a` : "2px 2px 0px #e8e3d8",
                  }}>
                    <div style={{ width: 34, height: 34, background: entry.rank <= 3 ? "#0a0a0a" : "#f5f0e8", border: "2px solid #0a0a0a", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: entry.rank <= 3 ? "1.2rem" : 11, fontWeight: 700, flexShrink: 0 }}>
                      {entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`}
                    </div>
                    <div style={{ width: 36, height: 36, background: "#faf7f2", border: "2px solid #0a0a0a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                      {entry.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>@{entry.username} {isMe && <span style={{ color: "#888", fontSize: 11 }}>(you)</span>}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>LV {entry.level} · {entry.class}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? world.accent : "#0a0a0a" }}>
                      {entry.karma.toLocaleString()} ⚡
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── ACTIVITY tab ── */}
        {tab === "ACTIVITY" && (
          <div className="space-y-2">
            {allActivity.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📡</div>
                <div style={{ fontWeight: 600 }}>No activity yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Play games and complete bounties!</div>
              </div>
            )}
            {allActivity.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div style={{
                  background: a.isYou ? `${world.accent}10` : "#fff",
                  border: `2px solid ${a.isYou ? world.accent + "44" : "#e8e3d8"}`,
                  borderRadius: 14, padding: "10px 12px",
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}>
                  <div style={{ width: 36, height: 36, background: a.isYou ? `${world.accent}22` : "#faf7f2", border: `2px solid ${a.isYou ? world.accent : "#0a0a0a"}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {a.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {a.isYou && <span style={{ color: world.accent }}>@{a.username} </span>}
                      {!a.isYou && <span style={{ color: "#0a0a0a" }}>@{a.username} </span>}
                      {a.title.replace(`@${a.username} `, "")}
                    </div>
                    {a.detail && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{a.detail}</div>}
                    {a.rarity && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: a.rarity === "legendary" ? "#ffcc00" : a.rarity === "covert" ? "#ff3333" : a.rarity === "restricted" ? "#ff44cc" : "#888", marginRight: 6 }}>
                        {a.rarity.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    {a.value && <span style={{ fontSize: 12, fontWeight: 700, color: "#c8ff00", background: "#0a0a0a", padding: "2px 7px", borderRadius: 6 }}>{a.value}</span>}
                    <span style={{ fontSize: 10, color: "#aaa" }}>{timeAgo(a.time)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
