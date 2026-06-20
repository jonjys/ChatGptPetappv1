"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { FRIENDS, LEADERBOARD, FEED_POSTS } from "@/lib/mock-data";
import { WORLDS } from "@/lib/worlds";
import type { Post, PostType } from "@/types/post";

// ─── Story data ───────────────────────────────────────────────────────────────

const STORY_DATA = [
  { id: "s1", username: "lunavibes",   emoji: "🌙", color: "#ff2d8d", content: "🌙 Just hit level 8! Grind never stops ⚡", time: "2m" },
  { id: "s2", username: "tradeknight", emoji: "⚔️", color: "#c8ff00", content: "⚔️ Killed the bounty board today. +1,200 karma!", time: "15m" },
  { id: "s3", username: "pixelrush",   emoji: "🎮", color: "#a855f7", content: "🎮 New highscore in Karma Runner — 8,400pts 🏆", time: "1h" },
  { id: "s4", username: "neonmiku",    emoji: "✨", color: "#00e5ff", content: "✨ My pet Yuki just evolved! 🦋→🌟", time: "2h" },
  { id: "s5", username: "voltfox",     emoji: "🦊", color: "#ff6b35", content: "🦊 Deep Catch gang — caught a legendary fish! 🐟", time: "4h" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["FLASH", "FRIENDS", "TOP", "LIVE"] as const;
type Tab = typeof TABS[number];

type LiveFilter = "ALL" | "GAMES" | "BOUNTIES" | "LEVEL-UPS";
const LIVE_FILTERS: LiveFilter[] = ["ALL", "GAMES", "BOUNTIES", "LEVEL-UPS"];

const GAME_LABELS: Record<string, string> = {
  runner:  "🏃 Karma Runner",
  fishing: "🎣 Deep Catch",
  cases:   "📦 Case Opening",
  breaker: "🧬 DNA Breaker",
  slots:   "🎰 Karma Slots",
  memory:  "🧠 Memory Palace",
  battle:  "⚔️ Pet Battle",
  blitz:   "💥 Bounty Blitz",
};

const POST_EMOJIS = ["🔥","⚡","🎯","💎","🌟","🏆","🎮","🦁","🦋","🌙","✨","⚔️","🎣","💪","🧬"];

const POST_GRADIENTS: Record<PostType, string> = {
  bounty_complete: "linear-gradient(160deg, #001a00 0%, #003300 60%, #004d00 100%)",
  level_up:        "linear-gradient(160deg, #1a1000 0%, #3a2000 60%, #5a3500 100%)",
  story:           "linear-gradient(160deg, #0d0020 0%, #1a0040 60%, #2a0060 100%)",
  achievement:     "linear-gradient(160deg, #001a1a 0%, #003a3a 60%, #005555 100%)",
};

const POST_ACCENT: Record<PostType, string> = {
  bounty_complete: "#00ff88",
  level_up:        "#ffcc00",
  story:           "#cc88ff",
  achievement:     "#00e5ff",
};

const POST_BANNER: Record<PostType, string> = {
  bounty_complete: "🎯 BOUNTY COMPLETE",
  level_up:        "⭐ LEVEL UP!",
  story:           "📖 STORY",
  achievement:     "🏆 ACHIEVEMENT",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalPost = Post & { localLikes: number; localLiked: boolean };

type CreateType = "BOUNTY" | "STORY" | "FLEX";

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Flash Card ───────────────────────────────────────────────────────────────

function FlashCard({
  post,
  onLike,
  onDoubleTap,
}: {
  post: LocalPost;
  onLike: (id: string) => void;
  onDoubleTap: (id: string) => void;
}) {
  const accent = POST_ACCENT[post.type];
  const gradient = POST_GRADIENTS[post.type];
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDoubleTap(post.id);
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    }
    lastTapRef.current = now;
  }, [post.id, onDoubleTap]);

  const isOnline = FRIENDS.some(f => f.online && f.username === post.authorUsername);

  return (
    <div
      onClick={handleTap}
      style={{
        scrollSnapAlign: "start",
        width: "100%",
        height: "85vw",
        maxHeight: 520,
        minHeight: 340,
        flexShrink: 0,
        background: gradient,
        borderRadius: 24,
        border: `2px solid ${accent}33`,
        boxShadow: `0 0 32px ${accent}22, 0 4px 24px rgba(0,0,0,0.6)`,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" }}>
        <div style={{
          background: `${accent}22`,
          border: `1.5px solid ${accent}66`,
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: 10,
          fontWeight: 800,
          color: accent,
          letterSpacing: "0.12em",
        }}>
          {POST_BANNER[post.type]}
        </div>
        {/* XP badge */}
        {post.xpEarned && (
          <div style={{
            background: "#0a0a0a",
            border: `2px solid ${accent}`,
            borderRadius: 10,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 800,
            color: accent,
            boxShadow: `0 0 10px ${accent}55`,
          }}>
            +{post.xpEarned} XP
          </div>
        )}
      </div>

      {/* Center emoji art */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
        <motion.div
          animate={post.type === "level_up"
            ? { scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, -8, 8, -4, 0] }
            : { scale: [1, 1.04, 1] }}
          transition={{ duration: post.type === "level_up" ? 2 : 3, repeat: Infinity, repeatDelay: 1 }}
          style={{
            fontSize: "4.5rem",
            filter: `drop-shadow(0 0 18px ${accent}88)`,
            lineHeight: 1,
          }}
        >
          {post.authorEmoji}
        </motion.div>
        {post.badge && (
          <div style={{
            background: `${accent}22`,
            border: `1.5px solid ${accent}`,
            borderRadius: 8,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: accent,
          }}>
            {post.badge}
          </div>
        )}
        {/* Content preview */}
        <div style={{
          maxWidth: "75%",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {post.content}
        </div>
      </div>

      {/* Bottom author row */}
      <div style={{ padding: "0 16px 14px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 42,
            height: 42,
            background: `${accent}22`,
            border: `2px solid ${accent}66`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            position: "relative",
          }}>
            {post.authorEmoji}
            {isOnline && (
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, background: "#4caf50", border: "2px solid #0a0a0a", borderRadius: "50%" }} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>@{post.authorUsername}</span>
              {isOnline && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ fontSize: 9, fontWeight: 800, color: "#4caf50", letterSpacing: "0.08em" }}
                >
                  ● LIVE
                </motion.span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              LV{post.authorLevel} · {post.location ?? timeAgo(new Date(post.createdAt))}
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <button
            onClick={e => { e.stopPropagation(); onLike(post.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
          >
            <motion.span
              animate={post.localLiked ? { scale: [1, 1.4, 1] } : {}}
              style={{ fontSize: "1.5rem", filter: post.localLiked ? "drop-shadow(0 0 8px #ff2d8d)" : "none" }}
            >
              {post.localLiked ? "❤️" : "🤍"}
            </motion.span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{post.localLikes}</span>
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem" }}>💬</button>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem" }}>🔖</button>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem" }}>↗️</button>
        </div>
      </div>

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {heartBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "3rem",
              pointerEvents: "none",
            }}
          >
            ❤️
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Post Modal ────────────────────────────────────────────────────────

function CreatePostModal({ onClose, onPost, accent }: {
  onClose: () => void;
  onPost: (emoji: string, caption: string, type: CreateType) => void;
  accent: string;
}) {
  const [selectedEmoji, setSelectedEmoji] = useState("🔥");
  const [caption, setCaption] = useState("");
  const [type, setType] = useState<CreateType>("STORY");
  const [posted, setPosted] = useState(false);

  function handlePost() {
    if (!caption.trim()) return;
    onPost(selectedEmoji, caption, type);
    setPosted(true);
    setTimeout(onClose, 1200);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#0f0f0f",
          border: `2px solid ${accent}44`,
          borderRadius: "28px 28px 0 0",
          padding: "20px 20px 36px",
          boxShadow: `0 -8px 40px ${accent}22`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.04em" }}>NEW POST</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {posted ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: "center", padding: "32px 0" }}
          >
            <div style={{ fontSize: "3rem" }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, color: accent }}>Posted!</div>
          </motion.div>
        ) : (
          <>
            {/* Emoji picker */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.1em", marginBottom: 8 }}>PICK EMOJI</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {POST_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setSelectedEmoji(e)}
                    style={{
                      background: selectedEmoji === e ? `${accent}22` : "#1a1a1a",
                      border: `2px solid ${selectedEmoji === e ? accent : "#333"}`,
                      borderRadius: 12,
                      padding: "10px 4px",
                      fontSize: "1.4rem",
                      cursor: "pointer",
                      transition: "all 0.12s",
                      boxShadow: selectedEmoji === e ? `0 0 10px ${accent}55` : "none",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.1em" }}>CAPTION</span>
                <span style={{ fontSize: 11, color: caption.length > 120 ? "#ff4444" : "#666" }}>{caption.length}/140</span>
              </div>
              <textarea
                maxLength={140}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="What's happening in your world? 🌍"
                style={{
                  width: "100%",
                  background: "#1a1a1a",
                  border: `2px solid ${accent}33`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                  minHeight: 80,
                }}
              />
            </div>

            {/* Type selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {(["BOUNTY", "STORY", "FLEX"] as CreateType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: type === t ? `${accent}22` : "#1a1a1a",
                    border: `2px solid ${type === t ? accent : "#333"}`,
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    color: type === t ? accent : "#666",
                    cursor: "pointer",
                    letterSpacing: "0.08em",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Post button */}
            <button
              onClick={handlePost}
              disabled={!caption.trim()}
              style={{
                width: "100%",
                padding: "14px",
                background: caption.trim() ? accent : "#333",
                border: "none",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 800,
                color: caption.trim() ? "#000" : "#666",
                cursor: caption.trim() ? "pointer" : "not-allowed",
                letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}
            >
              POST {selectedEmoji}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const { user, worldId, activities } = useApp();
  const [tab, setTab] = useState<Tab>("FLASH");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [activeStory, setActiveStory] = useState<typeof STORY_DATA[0] | null>(null);
  const [seenStories, setSeenStories] = useState<Set<string>>(new Set());
  const world = WORLDS.find(w => w.id === worldId) ?? WORLDS[2];
  const onlineFriends = FRIENDS.filter(f => f.online);

  // Local like state initialized from mock data
  const [posts, setPosts] = useState<LocalPost[]>(
    () => FEED_POSTS.map(p => ({ ...p, localLikes: p.likes, localLiked: p.liked }))
  );

  const handleLike = useCallback((id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id
        ? { ...p, localLiked: !p.localLiked, localLikes: p.localLiked ? p.localLikes - 1 : p.localLikes + 1 }
        : p
    ));
  }, []);

  const handleDoubleTap = useCallback((id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id && !p.localLiked
        ? { ...p, localLiked: true, localLikes: p.localLikes + 1 }
        : p
    ));
  }, []);

  const handleNewPost = useCallback((emoji: string, caption: string, type: CreateType) => {
    const postTypeMap: Record<CreateType, PostType> = {
      BOUNTY: "bounty_complete",
      STORY: "story",
      FLEX: "achievement",
    };
    const newPost: LocalPost = {
      id: `new_${Date.now()}`,
      authorId: "u1",
      authorUsername: user.username,
      authorEmoji: emoji,
      authorLevel: user.level,
      type: postTypeMap[type],
      content: caption,
      xpEarned: 50,
      likes: 0,
      comments: 0,
      liked: false,
      createdAt: new Date().toISOString(),
      localLikes: 0,
      localLiked: false,
    };
    setPosts(prev => [newPost, ...prev]);
  }, [user.username, user.level]);

  // Activity data for LIVE tab
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
      category: "GAMES" as LiveFilter,
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
      category: (p.type === "level_up" ? "LEVEL-UPS" : p.type === "bounty_complete" ? "BOUNTIES" : "GAMES") as LiveFilter,
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 30);

  const filteredActivity = liveFilter === "ALL"
    ? allActivity
    : allActivity.filter(a => a.category === liveFilter);

  const borderColor: Record<LiveFilter, string> = {
    ALL: "#888",
    GAMES: "#c8ff00",
    BOUNTIES: "#00ff88",
    "LEVEL-UPS": "#ffcc00",
  };

  const myRank = LEADERBOARD.find(e => e.username === user.username);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-0" style={{ background: "var(--bg)", borderBottom: `3px solid ${world.accent}`, boxShadow: `0 2px 20px ${world.accent}33` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{
              fontSize: "2.4rem",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #c8ff00, #ff2d8d)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>SOCIAL</h1>
            {/* Live community stats bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#4caf50", fontWeight: 700 }}>● {onlineFriends.length} online</span>
              <span style={{ fontSize: 11, color: "#555" }}>·</span>
              <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{FRIENDS.length} friends</span>
              <span style={{ fontSize: 11, color: "#555" }}>·</span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#c8ff00",
                background: "#c8ff0011",
                border: "1px solid #c8ff0033",
                borderRadius: 20,
                padding: "2px 8px",
                letterSpacing: "0.06em",
              }}>⚡ 847,291 COMMUNITY KARMA</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/chat" style={{ textDecoration: "none" }}>
              <div style={{
                background: "#0a0a0a", border: "2.5px solid #0a0a0a",
                borderRadius: 12, padding: "8px 12px",
                boxShadow: "3px 3px 0px #c8ff00",
                fontSize: 13, fontWeight: 700, color: "#c8ff00",
              }}>💬</div>
            </Link>
            <div style={{ background: world.accent, border: "2.5px solid #0a0a0a", borderRadius: 12, padding: "8px 14px", boxShadow: `3px 3px 0px #0a0a0a, 0 0 20px ${world.accent}44` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{user.avatarEmoji} @{user.username}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px 2px", background: "none", border: "none",
                borderBottom: `3px solid ${tab === t ? world.accent : "transparent"}`,
                fontSize: 10, fontWeight: 700, color: tab === t ? world.accent : "#666",
                letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                boxShadow: tab === t ? `0 2px 8px ${world.accent}55` : "none",
              }}>
              {t === "LIVE" && (
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4caf50", boxShadow: tab === "LIVE" ? "0 0 6px #4caf50" : "none" }}
                />
              )}
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Story Viewer Overlay ── */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveStory(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.95)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 20px",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 360,
                background: `linear-gradient(145deg, #0d0d0d, #111)`,
                border: `2.5px solid ${activeStory.color}`,
                borderRadius: 24, padding: "28px 24px",
                boxShadow: `0 0 40px ${activeStory.color}44`,
                position: "relative",
              }}
            >
              {/* Progress bar */}
              <div style={{ height: 3, background: "#222", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  onAnimationComplete={() => setActiveStory(null)}
                  style={{ height: "100%", background: activeStory.color, borderRadius: 2 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: `${activeStory.color}22`,
                  border: `2px solid ${activeStory.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.3rem",
                }}>
                  {activeStory.emoji}
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>@{activeStory.username}</div>
                  <div style={{ fontSize: "0.7rem", color: "#666" }}>{activeStory.time} ago</div>
                </div>
              </div>
              <div style={{
                fontSize: "1.1rem", color: "#fff", lineHeight: 1.6,
                fontWeight: 600, marginBottom: 20,
              }}>
                {activeStory.content}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveStory(null)}
                style={{
                  width: "100%", padding: "12px 0",
                  background: activeStory.color, border: "none",
                  borderRadius: 12, color: "#000",
                  fontWeight: 900, fontSize: "0.9rem",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ↩ CLOSE
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLASH tab ── */}
      {tab === "FLASH" && (
        <div style={{ position: "relative" }}>
          {/* Stories strip */}
          <div style={{
            display: "flex", gap: 14,
            overflowX: "auto", padding: "14px 16px",
            scrollbarWidth: "none",
            borderBottom: "1px solid #111",
          }}>
            {/* My story */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}>
              <div style={{
                width: 58, height: 58, borderRadius: "50%",
                background: "#111", border: "2.5px dashed #333",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", fontSize: "1.4rem",
              }}>
                {user.avatarEmoji}
                <div style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#c8ff00", border: "2px solid #000",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", color: "#000", fontWeight: 900,
                }}>+</div>
              </div>
              <div style={{ fontSize: "0.6rem", color: "#555", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Add Story
              </div>
            </div>

            {/* Friend stories */}
            {STORY_DATA.map(story => {
              const seen = seenStories.has(story.id);
              return (
                <motion.div
                  key={story.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setActiveStory(story); setSeenStories(s => new Set([...s, story.id])); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flexShrink: 0 }}
                >
                  <div style={{
                    width: 58, height: 58, borderRadius: "50%",
                    background: seen ? "#111" : `${story.color}22`,
                    border: `2.5px solid ${seen ? "#333" : story.color}`,
                    boxShadow: seen ? "none" : `0 0 12px ${story.color}66`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.4rem",
                    transition: "all 0.3s",
                  }}>
                    {story.emoji}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: seen ? "#444" : "#aaa", maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {story.username}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div style={{
            padding: "16px 16px 100px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            maxHeight: "calc(100dvh - 180px)",
          }}>
            {posts.map(post => (
              <FlashCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onDoubleTap={handleDoubleTap}
              />
            ))}
          </div>
          {/* NEW POST FAB */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowCreate(true)}
            style={{
              position: "fixed",
              bottom: 92,
              right: 20,
              width: 54,
              height: 54,
              background: world.accent,
              border: "2.5px solid #0a0a0a",
              borderRadius: "50%",
              boxShadow: `0 0 20px ${world.accent}99, 0 0 30px ${world.accent}66, 3px 3px 0px #0a0a0a`,
              fontSize: "1.4rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            ✏️
          </motion.button>
        </div>
      )}

      {/* ── KARMA TV banner (shown in FLASH) ── */}
      {tab === "FLASH" && (
        <Link href="/karma-tv" style={{ textDecoration: "none", display: "block", padding: "0 16px 12px" }}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            animate={{ boxShadow: ["0 0 20px #ff2d8d22", "0 0 40px #ff2d8d55", "0 0 20px #ff2d8d22"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              background: "linear-gradient(135deg, #1a0010 0%, #0d001a 100%)",
              border: "2px solid #ff2d8d",
              borderRadius: 18, padding: "16px",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: "#ff2d8d22", border: "2px solid #ff2d8d",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem", flexShrink: 0,
            }}>
              📺
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: "1rem", fontWeight: 900, color: "#fff" }}>KARMA TV</span>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "#ff2d8d22", border: "1px solid #ff2d8d44", borderRadius: 10, padding: "2px 7px" }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff2d8d", display: "block" }} />
                  <span style={{ fontSize: "0.6rem", color: "#ff2d8d", fontWeight: 700 }}>LIVE</span>
                </motion.div>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#888" }}>TikTok-style pet moments · Duel friends · Go viral</div>
            </div>
            <div style={{ fontSize: "1.2rem", color: "#ff2d8d" }}>→</div>
          </motion.div>
        </Link>
      )}

      {/* ── FRIENDS tab ── */}
      {tab === "FRIENDS" && (
        <div className="px-4 pt-4 pb-24 space-y-4">
          {/* Online story-bar */}
          {onlineFriends.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4caf50", letterSpacing: "0.1em", marginBottom: 10, textShadow: "0 0 8px #4caf50" }}>● ACTIVE NOW</div>
              <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
                {onlineFriends.map(f => (
                  <div key={f.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <div style={{
                      width: 58,
                      height: 58,
                      background: "linear-gradient(135deg, #4caf50, #00e5ff, #c8ff00)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.6rem",
                      padding: 4,
                      position: "relative",
                      boxShadow: "0 0 20px #4caf5033",
                    }}>
                      <div style={{ width: "100%", height: "100%", background: "#111", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                        {f.emoji}
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, background: "#4caf50", border: "2px solid #0a0a0a", borderRadius: "50%", boxShadow: "0 0 8px #4caf50" }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#ccc", maxWidth: 60, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      @{f.username}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenge cards for gaming friends */}
          {onlineFriends.filter(f => f.currentGame).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b35", letterSpacing: "0.1em", marginBottom: 10 }}>🎮 IN GAME — CHALLENGE NOW</div>
              <div className="space-y-3">
                {onlineFriends.filter(f => f.currentGame).map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <div style={{
                      background: "linear-gradient(135deg, #1a0a00, #2a1500)",
                      border: "2.5px solid #ff6b3566",
                      borderRadius: 18,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      boxShadow: "0 0 30px #ff6b3544",
                    }}>
                      <div style={{ fontSize: "2rem" }}>{f.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>@{f.username}</div>
                        <div style={{ fontSize: 12, color: "#ff6b35", fontWeight: 600, marginTop: 2 }}>
                          {GAME_LABELS[f.currentGame!] ?? f.currentGame}
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{f.petEmoji} {f.petName} · LV{f.level}</div>
                      </div>
                      <Link href={`/games/${f.currentGame}`}
                        style={{
                          padding: "10px 16px",
                          background: "#ff6b35",
                          border: "2px solid #0a0a0a",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#000",
                          textDecoration: "none",
                          boxShadow: "2px 2px 0px #0a0a0a, 0 0 16px #ff6b3566",
                          letterSpacing: "0.04em",
                        }}>
                        JOIN ⚡
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Online without game */}
          {onlineFriends.filter(f => !f.currentGame).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4caf50", letterSpacing: "0.1em", marginBottom: 10 }}>● ONLINE</div>
              <div className="space-y-2">
                {onlineFriends.filter(f => !f.currentGame).map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div style={{ background: "#111", border: "2.5px solid #4caf5044", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 0 20px #4caf5022" }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 46, height: 46, background: "#1a1a1a", border: "2.5px solid #4caf5044", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{f.emoji}</div>
                        <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, background: "#4caf50", border: "2px solid #111", borderRadius: "50%", boxShadow: "0 0 8px #4caf50" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>@{f.username}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 6, padding: "1px 5px", color: "#000", boxShadow: "0 0 8px #c8ff0066" }}>LV{f.level}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{f.lastActivity} · {f.petEmoji} {f.petName}</div>
                      </div>
                      <Link href="/games"
                        style={{ padding: "8px 14px", background: "#0a0a0a", border: "2px solid #c8ff0033", borderRadius: 10, fontSize: 11, fontWeight: 700, color: "#c8ff00", textDecoration: "none", boxShadow: "0 0 8px #c8ff0044" }}>
                        CHALLENGE
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Offline */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", marginBottom: 10 }}>OFFLINE</div>
            <div className="space-y-2">
              {FRIENDS.filter(f => !f.online).map(f => (
                <div key={f.id} style={{ background: "#111", border: "2px solid #333", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, opacity: 0.7 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 40, height: 40, background: "#1a1a1a", border: "2px solid #333", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{f.emoji}</div>
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: "#555", border: "2px solid #111", borderRadius: "50%" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>@{f.username}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{f.lastActivity} · {f.petEmoji} {f.petName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Find Friends */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: world.accent, letterSpacing: "0.1em", marginBottom: 10 }}>🔍 FIND FRIENDS</div>
            <div className="space-y-2">
              {LEADERBOARD.filter(e => e.username !== user.username && !FRIENDS.some(f => f.username === e.username)).map((e, i) => (
                <motion.div key={e.username} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div style={{ background: `${world.accent}0d`, border: `2px solid ${world.accent}33`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: "1.4rem" }}>{e.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>@{e.username}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>LV{e.level} · {e.karma.toLocaleString()} ⚡</div>
                    </div>
                    <button style={{ padding: "6px 12px", background: world.accent, border: "2px solid #0a0a0a", borderRadius: 10, fontSize: 11, fontWeight: 700, color: "#000", cursor: "pointer" }}>
                      + ADD
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Invite */}
          <div style={{ background: `${world.accent}18`, border: `2px solid ${world.accent}`, borderRadius: 16, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Invite Friends</div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Share your code and earn 200 ⚡ each</div>
            <div style={{ background: "#0a0a0a", color: world.accent, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", display: "inline-block" }}>
              KARMA-{user.username.toUpperCase().slice(0, 6)}
            </div>
          </div>
        </div>
      )}

      {/* ── TOP tab ── */}
      {tab === "TOP" && (
        <div className="px-4 pt-4 pb-28 space-y-3">
          <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.1em", marginBottom: 4 }}>GLOBAL KARMA RANKING</div>

          {/* Podium top 3 */}
          {LEADERBOARD.filter(e => e.rank <= 3).map((entry, i) => {
            const podiumColors = [
              { bg: "linear-gradient(135deg, #2a1c00, #5a3d00)", border: "#ffcc00", crown: "👑", glow: "#ffcc0044", extraGlow: "0 0 40px #ffcc0044" },
              { bg: "linear-gradient(135deg, #1a1a1a, #333)", border: "#c0c0c0", crown: "🥈", glow: "#c0c0c022", extraGlow: "" },
              { bg: "linear-gradient(135deg, #1a0c00, #3a1800)", border: "#cd7f32", crown: "🥉", glow: "#cd7f3222", extraGlow: "" },
            ];
            const c = podiumColors[i];
            const isMe = entry.username === user.username;
            return (
              <motion.div key={entry.username} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div style={{
                  background: isMe ? `${world.accent}22` : c.bg,
                  border: `2.5px solid ${isMe ? world.accent : c.border}`,
                  borderRadius: 20,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: `0 0 24px ${isMe ? world.glowColor : c.glow}`,
                }}>
                  <div style={{ fontSize: i === 0 ? "2rem" : "1.6rem", flexShrink: 0 }}>
                    {i === 0 ? (
                      <motion.span
                        animate={{ scale: [1, 1.2, 1], rotate: [0, -6, 6, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        style={{ display: "inline-block" }}
                      >
                        {c.crown}
                      </motion.span>
                    ) : c.crown}
                  </div>
                  <div style={{ width: 50, height: 50, background: "#1a1a1a", border: `2.5px solid ${c.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>
                    {entry.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>@{entry.username} {isMe && <span style={{ color: "#888", fontSize: 12 }}>(you)</span>}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>LV {entry.level} · {entry.class}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.border }}>
                    {entry.karma.toLocaleString()} ⚡
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Rest of leaderboard */}
          <div className="space-y-2">
            {LEADERBOARD.filter(e => e.rank > 3).map((entry, i) => {
              const isMe = entry.username === user.username;
              const changeIndicators = ["↑", "=", "↓"];
              const indicator = changeIndicators[i % 3];
              const indicatorColor = indicator === "↑" ? "#00ff88" : indicator === "↓" ? "#ff4444" : "#888";
              return (
                <motion.div key={entry.username} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}>
                  <div style={{
                    background: isMe ? `${world.accent}18` : "#111",
                    border: `2px solid ${isMe ? world.accent : "#2a2a2a"}`,
                    borderRadius: 14,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: isMe ? `0 0 12px ${world.glowColor}` : "none",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: indicatorColor, width: 16, textAlign: "center" }}>{indicator}</div>
                    <div style={{ width: 28, height: 28, background: "#1a1a1a", border: "2px solid #333", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#ccc" }}>#{entry.rank}</div>
                    <div style={{ width: 36, height: 36, background: "#1a1a1a", border: "2px solid #333", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{entry.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>@{entry.username} {isMe && <span style={{ color: "#888", fontSize: 11 }}>(you)</span>}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>LV {entry.level} · {entry.class}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isMe ? world.accent : "#ccc" }}>{entry.karma.toLocaleString()} ⚡</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* YOUR RANK sticky-ish banner */}
          {myRank && (
            <div style={{
              position: "sticky",
              bottom: 80,
              background: world.accent,
              border: "2.5px solid #0a0a0a",
              borderRadius: 16,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: `0 0 20px ${world.accent}66, 3px 3px 0px #0a0a0a`,
              marginTop: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#000" }}>YOUR RANK</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: "1.3rem" }}>{user.avatarEmoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>#{myRank.rank}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{myRank.karma.toLocaleString()} ⚡</div>
            </div>
          )}
        </div>
      )}

      {/* ── LIVE tab ── */}
      {tab === "LIVE" && (
        <div className="px-4 pt-4 pb-24">
          {/* Filter buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
            {LIVE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setLiveFilter(f)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  background: liveFilter === f ? world.accent : "#1a1a1a",
                  border: `2px solid ${liveFilter === f ? world.accent : "#333"}`,
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  color: liveFilter === f ? "#000" : "#888",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  transition: "all 0.12s",
                  boxShadow: liveFilter === f ? `0 0 12px ${world.accent}66` : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredActivity.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📡</div>
              <div style={{ fontWeight: 700, color: "#c8ff00", fontSize: 14 }}>No activity yet</div>
              <div style={{ fontSize: 12, marginTop: 4, color: "#555" }}>Play games and complete bounties!</div>
            </div>
          )}

          <div className="space-y-2">
            {filteredActivity.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <div style={{
                  background: a.isYou ? `${world.accent}10` : "#111",
                  border: a.isYou ? `2px solid ${world.accent}66` : "2px solid #2a2a2a",
                  borderLeft: `4px solid ${borderColor[a.category]}`,
                  borderRadius: 14,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  boxShadow: a.isYou ? `0 0 16px ${world.accent}22` : "none",
                }}>
                  <div style={{ width: 36, height: 36, background: a.isYou ? `${world.accent}22` : "#1a1a1a", border: `2px solid ${a.isYou ? world.accent : "#333"}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {a.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      <span style={{ color: a.isYou ? world.accent : "#ccc" }}>@{a.username} </span>
                      {a.title.replace(`@${a.username} `, "")}
                    </div>
                    {a.detail && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{a.detail}</div>}
                    {a.rarity && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: a.rarity === "legendary" ? "#ffcc00" : a.rarity === "covert" ? "#ff3333" : "#888" }}>
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
        </div>
      )}

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreatePostModal
            accent={world.accent}
            onClose={() => setShowCreate(false)}
            onPost={handleNewPost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
