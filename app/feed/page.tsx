"use client";

import { useState } from "react";
import { Bell, Zap } from "lucide-react";
import { motion } from "framer-motion";
import FeedCard from "@/components/feed/FeedCard";
import { FEED_POSTS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { formatXP } from "@/lib/xp-system";

const FILTERS = ["ALL", "NEARBY", "HOT", "BOUNTIES"] as const;
type Filter = (typeof FILTERS)[number];

export default function FeedPage() {
  const { user } = useApp();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [notifications] = useState(3);

  const posts = filter === "BOUNTIES"
    ? FEED_POSTS.filter((p) => p.type === "bounty_complete" || p.bounty)
    : FEED_POSTS;

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

      {/* Feed */}
      <div className="px-4 pt-4 pb-4 space-y-3">
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
