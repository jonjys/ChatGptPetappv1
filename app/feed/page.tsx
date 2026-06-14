"use client";

import { useState } from "react";
import { Bell, Zap, Flame, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FeedCard from "@/components/feed/FeedCard";
import StoriesBar from "@/components/feed/StoriesBar";
import { FEED_POSTS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { formatXP, calculateLevel } from "@/lib/xp-system";

const FILTERS = ["ALL", "NEARBY", "HOT", "BOUNTIES"] as const;
type Filter = (typeof FILTERS)[number];

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const RARITY_COLOR: Record<string, string> = {
  legendary: "#ffcc00", covert: "#ff3333", restricted: "#ff44cc",
  classified: "#9933ff", industrial: "#4488ff", common: "#aaaaaa",
};

const NOTIFS = [
  { emoji: "⚡", text: "Your karma hit 1,000!", time: "2m ago", color: "#c8ff00" },
  { emoji: "🔥", text: "3-day streak! Keep going!", time: "1h ago", color: "#ff6b35" },
  { emoji: "🎉", text: "tradeknight liked your activity", time: "3h ago", color: "#ff2d8d" },
];

export default function FeedPage() {
  const { user, activities, streak } = useApp();
  const [filter, setFilter]       = useState<Filter>("ALL");
  const [showNotifs, setShowNotifs] = useState(false);
  const level = calculateLevel(user.xp);

  const posts = filter === "BOUNTIES"
    ? FEED_POSTS.filter((p) => p.type === "bounty_complete" || p.bounty)
    : FEED_POSTS;

  const myActivities = filter === "BOUNTIES" ? [] : activities.slice(0, 8);
  const liveActivities = activities.filter(a => Date.now() - a.timestamp < 3600000).slice(0, 3);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh", position: "relative" }}>
      {/* Notification drawer */}
      <AnimatePresence>
        {showNotifs && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "#fff", border: "3px solid #0a0a0a", borderTop: "none", borderRadius: "0 0 20px 20px", padding: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.06em" }}>NOTIFICATIONS</span>
              <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {NOTIFS.map((n, i) => (
              <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < NOTIFS.length-1 ? "1px solid #f0ebe0" : "none" }}>
                <div style={{ width: 36, height: 36, background: `${n.color}18`, border: `2px solid ${n.color}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{n.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.text}</div>
                  <div style={{ fontSize: 10, color: "#aaa" }}>{n.time}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>KARMA</h1>
              {streak >= 2 && (
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ background: "#ff6b35", border: "2px solid #0a0a0a", borderRadius: 8, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Flame size={12} color="#fff" fill="#fff" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{streak}d</span>
                </motion.div>
              )}
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.08em" }}>
              REAL-LIFE GAME ENGINE · LV{level}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5"
              style={{ background: "#c8ff00", border: "2.5px solid #0a0a0a", borderRadius: 12, boxShadow: "3px 3px 0px #0a0a0a" }}>
              <Zap size={14} color="#0a0a0a" fill="#0a0a0a" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatXP(user.xp)} XP</span>
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{ width: 40, height: 40, background: showNotifs ? "#0a0a0a" : "#fff", border: "2.5px solid #0a0a0a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "3px 3px 0px #0a0a0a", cursor: "pointer" }}>
                <Bell size={18} color={showNotifs ? "#c8ff00" : "#0a0a0a"} />
              </button>
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, background: "#ff2d8d", border: "2px solid #0a0a0a", borderRadius: "50%", fontSize: 10, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {NOTIFS.length}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="flex-shrink-0 px-4 py-1.5"
              style={{
                background: filter === f ? "#0a0a0a" : "#fff",
                border: "2.5px solid #0a0a0a", borderRadius: 10,
                fontSize: 12, fontWeight: 700,
                color: filter === f ? "#c8ff00" : "#0a0a0a",
                letterSpacing: "0.04em",
                boxShadow: filter === f ? "none" : "2px 2px 0px #0a0a0a",
                cursor: "pointer",
              }}>
              {f === "HOT" ? "🔥 HOT" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Streak hero banner */}
      {streak >= 3 && filter === "ALL" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3"
          style={{
            background: "linear-gradient(135deg, #ff6b35, #ff2d8d)",
            border: "3px solid #0a0a0a",
            borderRadius: 18, padding: "14px 16px",
            boxShadow: "4px 4px 0px #0a0a0a",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "3rem", opacity: 0.2 }}>🔥</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>YOU&apos;RE ON FIRE 🔥</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 2 }}>{streak}-DAY STREAK!</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Keep playing daily to grow your multiplier</div>
          <div className="flex gap-2 mt-3">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <div key={i} style={{ width: 28, height: 28, background: i < streak ? "#ffcc00" : "rgba(255,255,255,0.2)", border: "2px solid rgba(0,0,0,0.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                {i < streak ? "🔥" : "·"}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick action cards */}
      {filter === "ALL" && (
        <div style={{ display: "flex", gap: 8, padding: "12px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { href: "/karma-pot", emoji: "💰", label: "POTTEN", sub: "249 kr idag", color: "#c8ff00" },
            { href: "/ville",     emoji: "🏙️", label: "MIN STAD", sub: "Bygg & tjäna", color: "#ff6b35" },
            { href: "/chat",      emoji: "💬", label: "CHATT",    sub: "137 online", color: "#00e5ff" },
            { href: "/premium",   emoji: "👑", label: "PREMIUM",  sub: "Från 19 kr", color: "#ff8c00" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none", flexShrink: 0 }}>
              <motion.div
                whileTap={{ scale: 0.93 }}
                style={{
                  background: "#111",
                  border: `1.5px solid ${item.color}44`,
                  borderRadius: 14, padding: "10px 14px",
                  textAlign: "center", minWidth: 76,
                }}
              >
                <div style={{ fontSize: "1.4rem", marginBottom: 3 }}>{item.emoji}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: item.color }}>{item.label}</div>
                <div style={{ fontSize: 9, color: "#444", marginTop: 1 }}>{item.sub}</div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {/* Karma Pot teaser */}
      {filter === "ALL" && (
        <Link href="/karma-pot" style={{ textDecoration: "none" }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            className="mx-4 mt-3"
            style={{
              background: "linear-gradient(135deg, #0a0a0a, #111)",
              border: "2px solid #c8ff0044",
              borderRadius: 16, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 0 20px #c8ff0011",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              style={{ fontSize: "2rem", flexShrink: 0 }}
            >💰</motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#c8ff00", letterSpacing: "0.04em" }}>
                DAGLIG POTT — 249 kr
              </div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>
                Var aktiv idag → tjäna biljetter → vinn riktiga pengar
              </div>
            </div>
            <div style={{
              background: "#c8ff00", color: "#0a0a0a",
              fontSize: 10, fontWeight: 800,
              borderRadius: 8, padding: "5px 10px", whiteSpace: "nowrap",
            }}>SE POTTEN →</div>
          </motion.div>
        </Link>
      )}

      {/* Live activity ticker */}
      {liveActivities.length > 0 && filter === "ALL" && (
        <div className="mx-4 mt-3" style={{ background: "#0a0a0a", border: "2px solid #c8ff0033", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 8, height: 8, background: "#c8ff00", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <motion.div
              key={liveActivities[0].id}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              style={{ fontSize: 12, color: "#c8ff00", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              LIVE · {liveActivities[0].emoji} {liveActivities[0].title}
            </motion.div>
          </div>
          <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>{timeAgo(liveActivities[0].timestamp)}</span>
        </div>
      )}

      {/* Stories */}
      <div className="px-4 pt-3" style={{ borderBottom: "2px solid #f0ebe0" }}>
        <StoriesBar />
      </div>

      {/* Feed */}
      <div className="px-4 pt-4 pb-4 space-y-3">
        {/* My Activity Cards */}
        {myActivities.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.12em", marginBottom: 8 }}>
              ⚡ YOUR RECENT ACTIVITY
            </div>
            {myActivities.map((act, i) => {
              const rarityColor = act.rarity ? (RARITY_COLOR[act.rarity] ?? "#c8ff00") : "#c8ff00";
              const isRecent = Date.now() - act.timestamp < 300000;
              return (
                <motion.div key={act.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: "#fff",
                    border: `2.5px solid ${act.rarity && act.rarity !== "common" ? rarityColor : "#0a0a0a"}`,
                    borderRadius: 16, padding: "12px 14px", marginBottom: 8,
                    boxShadow: act.rarity && act.rarity !== "common" ? `3px 3px 0px #0a0a0a, 0 0 12px ${rarityColor}22` : "3px 3px 0px #0a0a0a",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${rarityColor}18`, border: `2px solid ${rarityColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
                  }}>{act.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isRecent && (
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ width: 6, height: 6, background: "#4caf50", borderRadius: "50%", flexShrink: 0 }} />
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.title}</div>
                    </div>
                    {act.detail && <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{act.detail}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {act.karma ? <div style={{ fontSize: 12, fontWeight: 700, color: "#c8ff00", background: "#0a0a0a", borderRadius: 8, padding: "2px 7px" }}>+{act.karma}⚡</div> : null}
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>{timeAgo(act.timestamp)}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Static feed posts */}
        {posts.map((post, i) => (
          <motion.div key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{ position: "relative" }}>
            {filter === "HOT" && i < 3 && (
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                style={{ position: "absolute", top: -2, right: -2, background: "#ff6b35", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "0 14px 0 8px", padding: "3px 8px", zIndex: 1 }}>
                🔥 HOT
              </motion.div>
            )}
            <FeedCard post={post} />
          </motion.div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-16">
            <div style={{ fontSize: "3rem" }}>🔍</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#888", marginTop: 8 }}>No posts matching this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
