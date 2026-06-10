"use client";

import { useState } from "react";
import { Bell, Zap } from "lucide-react";
import { motion } from "framer-motion";
import FeedCard from "@/components/feed/FeedCard";
import StoriesBar from "@/components/feed/StoriesBar";
import { FEED_POSTS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { formatXP } from "@/lib/xp-system";

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

export default function FeedPage() {
  const { user, activities } = useApp();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [notifications] = useState(3);

  const posts = filter === "BOUNTIES"
    ? FEED_POSTS.filter((p) => p.type === "bounty_complete" || p.bounty)
    : FEED_POSTS;

  const myActivities = filter === "BOUNTIES" ? [] : activities.slice(0, 8);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              style={{
                fontSize: "1.9rem",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              KARMA
            </h1>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.08em" }}>
              REAL-LIFE GAME ENGINE
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* XP Pill */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{
                background: "#c8ff00",
                border: "2.5px solid #0a0a0a",
                borderRadius: 12,
                boxShadow: "3px 3px 0px #0a0a0a",
              }}
            >
              <Zap size={14} color="#0a0a0a" fill="#0a0a0a" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatXP(user.xp)} XP</span>
            </div>

            {/* Notification bell */}
            <div className="relative">
              <button
                style={{
                  width: 40,
                  height: 40,
                  background: "#fff",
                  border: "2.5px solid #0a0a0a",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "3px 3px 0px #0a0a0a",
                }}
              >
                <Bell size={18} color="#0a0a0a" />
              </button>
              {notifications > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 18,
                    height: 18,
                    background: "#ff2d8d",
                    border: "2px solid #0a0a0a",
                    borderRadius: "50%",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {notifications}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-4 py-1.5"
              style={{
                background: filter === f ? "#0a0a0a" : "#fff",
                border: "2.5px solid #0a0a0a",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: filter === f ? "#c8ff00" : "#0a0a0a",
                letterSpacing: "0.04em",
                boxShadow: filter === f ? "none" : "2px 2px 0px #0a0a0a",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stories */}
      <div className="px-4 pt-2" style={{ borderBottom: "2px solid #f0ebe0" }}>
        <StoriesBar />
      </div>

      {/* Feed */}
      <div className="px-4 pt-4 pb-4 space-y-3">
        {/* My Activity Cards */}
        {myActivities.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.12em", marginBottom: 8 }}>YOUR ACTIVITY</div>
            {myActivities.map((act, i) => {
              const rarityColor = act.rarity ? (RARITY_COLOR[act.rarity] ?? "#c8ff00") : "#c8ff00";
              return (
                <motion.div key={act.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: "#fff",
                    border: "2.5px solid #0a0a0a",
                    borderRadius: 16,
                    padding: "12px 14px",
                    marginBottom: 8,
                    boxShadow: "3px 3px 0px #0a0a0a",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${rarityColor}18`, border: `2px solid ${rarityColor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.4rem", flexShrink: 0,
                  }}>{act.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.title}</div>
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
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <FeedCard post={post} />
          </motion.div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-16">
            <div style={{ fontSize: "3rem" }}>🔍</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#888", marginTop: 8 }}>
              No posts matching this filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
