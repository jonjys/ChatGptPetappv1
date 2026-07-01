"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

// ─── Live ticker events ────────────────────────────────────────────────────────

const LIVE_TICKER_EVENTS = [
  { id: "lt1", text: "dragon99 just hit Level 12", time: "3s", color: "#ffcc00", dot: "🟡" },
  { id: "lt2", text: "lunavibes completed a bounty +800 ⚡", time: "12s", color: "#00ff88", dot: "🟢" },
  { id: "lt3", text: "pixelrush won a Karma War ⚔️", time: "28s", color: "#ff2d8d", dot: "🔴" },
  { id: "lt4", text: "neonmiku's pet evolved to ★★★", time: "1m", color: "#a855f7", dot: "🟣" },
  { id: "lt5", text: "voltfox caught a LEGENDARY fish 🐟", time: "2m", color: "#ff6b35", dot: "🟠" },
  { id: "lt6", text: "tradeknight ranked #1 globally 👑", time: "5m", color: "#c8ff00", dot: "🟡" },
];

// ─── Trending topics ──────────────────────────────────────────────────────────

const TRENDING = [
  { tag: "#KarmaChallenge", count: "24k", fire: "🔥🔥🔥", color: "#ff2d8d" },
  { tag: "#PetEvolution", count: "18k", fire: "🔥🔥", color: "#a855f7" },
  { tag: "#BountyKing", count: "12k", fire: "🔥🔥", color: "#c8ff00" },
  { tag: "#NeonGrind", count: "9k", fire: "🔥", color: "#00e5ff" },
  { tag: "#LegendaryFish", count: "6k", fire: "🔥", color: "#ff6b35" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["FLASH", "FRIENDS", "TOP", "WARS"] as const;
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

const CREATE_TYPE_META: Record<string, { icon: string; label: string; desc: string }> = {
  BOUNTY: { icon: "🎯", label: "BOUNTY", desc: "Share a completed challenge" },
  STORY:  { icon: "📖", label: "STORY",  desc: "Tell your pet's story" },
  FLEX:   { icon: "💪", label: "FLEX",   desc: "Show off an achievement" },
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

// ─── Live Ticker ──────────────────────────────────────────────────────────────

function LiveTicker() {
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    let raf: number;
    let x = 0;
    const speed = 0.5;
    function step() {
      x -= speed;
      if (Math.abs(x) > el!.scrollWidth / 2) x = 0;
      el!.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doubled = [...LIVE_TICKER_EVENTS, ...LIVE_TICKER_EVENTS];

  return (
    <div style={{
      overflow: "hidden",
      borderBottom: "1px solid #1a1a1a",
      borderTop: "1px solid #1a1a1a",
      background: "#050505",
      padding: "8px 0",
    }}>
      <div ref={tickerRef} style={{ display: "flex", gap: 32, whiteSpace: "nowrap", willChange: "transform" }}>
        {doubled.map((ev, i) => (
          <span key={`${ev.id}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa", flexShrink: 0 }}>
            <span style={{ fontSize: 7, color: ev.color }}>●</span>
            <span style={{ fontWeight: 700, color: ev.color }}>@{ev.text.split(" ")[0]}</span>
            <span>{ev.text.slice(ev.text.indexOf(" ") + 1)}</span>
            <span style={{ color: "#444", marginLeft: 8 }}>· {ev.time} ago</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Flash Card ───────────────────────────────────────────────────────────────

function FlashCard({
  post,
  onLike,
  onDoubleTap,
  onComment,
  onBookmark,
  onShare,
  isBookmarked,
}: {
  post: LocalPost;
  onLike: (id: string) => void;
  onDoubleTap: (id: string) => void;
  onComment: (id: string) => void;
  onBookmark: (id: string) => void;
  onShare: (post: LocalPost) => void;
  isBookmarked: boolean;
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
        minHeight: 420,
        maxHeight: 520,
        flexShrink: 0,
        background: gradient,
        borderRadius: 20,
        border: `1.5px solid ${accent}33`,
        boxShadow: `0 0 40px ${accent}18, 0 8px 32px rgba(0,0,0,0.7)`,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Animated bg pulse */}
      <motion.div
        animate={{ opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 60% 40%, ${accent}40 0%, transparent 70%)`,
        }}
      />

      {/* Top banner row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px 0", position: "relative", zIndex: 1 }}>
        <div style={{
          background: `${accent}1a`,
          border: `1px solid ${accent}55`,
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: 9,
          fontWeight: 800,
          color: accent,
          letterSpacing: "0.14em",
        }}>
          {POST_BANNER[post.type]}
        </div>
        {post.xpEarned && (
          <div style={{
            background: "#090909",
            border: `1.5px solid ${accent}`,
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
            color: accent,
            boxShadow: `0 0 10px ${accent}44`,
          }}>
            +{post.xpEarned} XP
          </div>
        )}
      </div>

      {/* Center content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, padding: "16px 60px 16px 16px", position: "relative", zIndex: 1 }}>
        <motion.div
          animate={post.type === "level_up"
            ? { scale: [1, 1.18, 0.95, 1.06, 1], rotate: [0, -8, 8, -4, 0] }
            : { scale: [1, 1.05, 1] }}
          transition={{ duration: post.type === "level_up" ? 2 : 3.5, repeat: Infinity, repeatDelay: 1.5 }}
          style={{
            fontSize: "5.5rem",
            filter: `drop-shadow(0 0 22px ${accent}88)`,
            lineHeight: 1,
          }}
        >
          {post.authorEmoji}
        </motion.div>
        {post.badge && (
          <div style={{
            background: `${accent}1a`,
            border: `1.5px solid ${accent}`,
            borderRadius: 8,
            padding: "3px 12px",
            fontSize: 11,
            fontWeight: 700,
            color: accent,
          }}>
            {post.badge}
          </div>
        )}
        <div style={{
          maxWidth: "100%",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.82)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {post.content}
        </div>
      </div>

      {/* Right side TikTok-style action buttons */}
      <div style={{
        position: "absolute",
        right: 12,
        bottom: 70,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        zIndex: 2,
      }}>
        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); onLike(post.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
        >
          <motion.div
            animate={post.localLiked ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
            style={{
              width: 44, height: 44,
              background: post.localLiked ? "#ff2d8d22" : "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              border: `1.5px solid ${post.localLiked ? "#ff2d8d66" : "rgba(255,255,255,0.12)"}`,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem",
              boxShadow: post.localLiked ? "0 0 14px #ff2d8d55" : "none",
            }}
          >
            {post.localLiked ? "❤️" : "🤍"}
          </motion.div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{post.localLikes}</span>
        </button>

        {/* Comment */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={e => { e.stopPropagation(); onComment(post.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
        >
          <div style={{
            width: 44, height: 44,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
          }}>💬</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{post.comments}</span>
        </motion.button>

        {/* Bookmark */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={e => { e.stopPropagation(); onBookmark(post.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
        >
          <div style={{
            width: 44, height: 44,
            background: isBookmarked ? "#ffd70022" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
            border: `1.5px solid ${isBookmarked ? "#ffd70066" : "rgba(255,255,255,0.12)"}`,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
            boxShadow: isBookmarked ? "0 0 12px #ffd70044" : "none",
          }}>
            {isBookmarked ? "🔖" : "🏷️"}
          </div>
        </motion.button>

        {/* Share */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={e => { e.stopPropagation(); onShare(post); }}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
        >
          <div style={{
            width: 44, height: 44,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
          }}>↗️</div>
        </motion.button>
      </div>

      {/* Bottom author row */}
      <div style={{ padding: "0 60px 14px 14px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40,
            background: `${accent}1a`,
            border: `2px solid ${accent}55`,
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem",
            position: "relative",
            flexShrink: 0,
          }}>
            {post.authorEmoji}
            {isOnline && (
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, background: "#4caf50", border: "2px solid #050505", borderRadius: "50%" }} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>@{post.authorUsername}</span>
              {isOnline && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ fontSize: 8, fontWeight: 800, color: "#4caf50", letterSpacing: "0.1em" }}
                >
                  ● LIVE
                </motion.span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.42)" }}>
              LV{post.authorLevel} · {post.location ?? timeAgo(new Date(post.createdAt))}
            </div>
          </div>
        </div>
      </div>

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {heartBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "3rem",
              pointerEvents: "none",
              zIndex: 10,
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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUrl(URL.createObjectURL(file));
    setMediaType(file.type.startsWith("video") ? "video" : "image");
    e.target.value = "";
  }

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
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          background: "linear-gradient(180deg, #0d0d0d 0%, #080808 100%)",
          border: `1.5px solid ${accent}33`,
          borderBottom: "none",
          borderRadius: "28px 28px 0 0",
          padding: "8px 20px 40px",
          boxShadow: `0 -12px 60px ${accent}18`,
          maxHeight: "90dvh",
          overflowY: "auto",
        }}
      >
        {/* Drag pill */}
        <div style={{ width: 40, height: 4, background: "#333", borderRadius: 2, margin: "10px auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff" }}>Create Post</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Share your karma moment</div>
          </div>
          <button onClick={onClose} style={{
            background: "#1a1a1a", border: "1.5px solid #333",
            borderRadius: "50%", width: 34, height: 34,
            cursor: "pointer", color: "#888", fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Hidden file inputs */}
        <input ref={mediaInputRef}  type="file" accept="image/*,video/*"                style={{ display: "none" }} onChange={handleMedia} />
        <input ref={cameraInputRef} type="file" accept="image/*"  capture="environment" style={{ display: "none" }} onChange={handleMedia} />

        {posted ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ textAlign: "center", padding: "48px 0" }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6 }}
              style={{ fontSize: "4rem", marginBottom: 12 }}
            >🎉</motion.div>
            <div style={{ fontSize: 18, fontWeight: 900, color: accent }}>Posted!</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Your moment is live</div>
          </motion.div>
        ) : (
          <>
            {/* Type selector — visual cards */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.12em", marginBottom: 10 }}>POST TYPE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {(["BOUNTY", "STORY", "FLEX"] as CreateType[]).map(t => {
                  const meta = CREATE_TYPE_META[t];
                  const active = type === t;
                  return (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setType(t)}
                      style={{
                        padding: "12px 6px",
                        background: active ? `${accent}18` : "#111",
                        border: `1.5px solid ${active ? accent : "#222"}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        boxShadow: active ? `0 0 16px ${accent}33` : "none",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      }}
                    >
                      <span style={{ fontSize: "1.6rem" }}>{meta.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: active ? accent : "#666", letterSpacing: "0.08em" }}>{meta.label}</span>
                      <span style={{ fontSize: 9, color: "#444", lineHeight: 1.3 }}>{meta.desc}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Emoji picker */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.12em", marginBottom: 10 }}>PICK EMOJI</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {POST_EMOJIS.map(e => (
                  <motion.button
                    key={e}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => setSelectedEmoji(e)}
                    style={{
                      background: selectedEmoji === e ? `${accent}1a` : "#111",
                      border: `1.5px solid ${selectedEmoji === e ? accent : "#1e1e1e"}`,
                      borderRadius: 12,
                      padding: "10px 4px",
                      fontSize: "1.4rem",
                      cursor: "pointer",
                      transition: "all 0.1s",
                      boxShadow: selectedEmoji === e ? `0 0 12px ${accent}44` : "none",
                    }}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Media */}
            <div style={{ marginBottom: 18 }}>
              {mediaUrl ? (
                <div style={{ position: "relative", marginBottom: 10 }}>
                  {mediaType === "image"
                    ? <img src={mediaUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 16, border: `1.5px solid ${accent}33` }} />
                    : <video src={mediaUrl} controls style={{ width: "100%", maxHeight: 200, borderRadius: 16, border: `1.5px solid ${accent}33` }} />
                  }
                  <button type="button" onClick={() => setMediaUrl(null)}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", border: "1px solid #ff4444", borderRadius: "50%", width: 28, height: 28, color: "#ff4444", fontSize: 13, cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "📷 Camera", action: () => cameraInputRef.current?.click() },
                    { label: "🖼️ Gallery", action: () => mediaInputRef.current?.click() },
                    { label: "🎥 Video",  action: () => mediaInputRef.current?.click() },
                  ].map(btn => (
                    <motion.button key={btn.label} type="button" whileTap={{ scale: 0.95 }} onClick={btn.action} style={{
                      flex: 1, padding: "12px 4px",
                      background: "#111", border: "1.5px solid #1e1e1e",
                      borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#666",
                      cursor: "pointer", transition: "all 0.12s",
                    }}>
                      {btn.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Caption */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.12em" }}>CAPTION</span>
                <span style={{ fontSize: 11, color: caption.length > 120 ? "#ff4444" : "#444" }}>{caption.length}/140</span>
              </div>
              <textarea
                maxLength={140}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="What's happening in your world? 🌍"
                style={{
                  width: "100%",
                  background: "#111",
                  border: `1.5px solid ${caption.length > 0 ? accent + "44" : "#1e1e1e"}`,
                  borderRadius: 16,
                  padding: "14px 16px",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                  minHeight: 90,
                  lineHeight: 1.5,
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* Post button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePost}
              disabled={!caption.trim()}
              style={{
                width: "100%",
                padding: "16px",
                background: caption.trim()
                  ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                  : "#1a1a1a",
                border: "none",
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 900,
                color: caption.trim() ? "#000" : "#444",
                cursor: caption.trim() ? "pointer" : "not-allowed",
                letterSpacing: "0.06em",
                boxShadow: caption.trim() ? `0 0 24px ${accent}44` : "none",
                transition: "all 0.2s",
              }}
            >
              POST {selectedEmoji}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const { user, worldId, activities, showToast } = useApp();
  const [tab, setTab] = useState<Tab>("FLASH");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("ALL");
  const [lbPeriod, setLbPeriod] = useState<"TODAY" | "WEEK" | "ALL">("WEEK");
  const [showCreate, setShowCreate] = useState(false);
  const [activeStory, setActiveStory] = useState<typeof STORY_DATA[0] | null>(null);
  const [seenStories, setSeenStories] = useState<Set<string>>(new Set());
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleComment = useCallback((id: string) => { setCommentPostId(id); setCommentText(""); }, []);
  const handleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); showToast("Removed bookmark", undefined, "#888", "🏷️"); }
      else { next.add(id); showToast("Bookmarked! 🔖", undefined, "#ffd700", "🔖"); }
      return next;
    });
  }, [showToast]);
  const handleShare = useCallback((post: LocalPost) => {
    const text = `@${post.authorUsername}: "${post.content.slice(0, 80)}" — KarmaPet 🐾`;
    try { navigator.clipboard.writeText(text); } catch {}
    showToast("Post copied! Share it 📤", undefined, "#4488ff", "↗️");
  }, [showToast]);
  const handleAddFriend = useCallback((username: string) => {
    setAddedFriends(prev => { const n = new Set(prev); n.add(username); return n; });
    showToast(`Added @${username}! 🤝`, undefined, "#c8ff00", "✅");
  }, [showToast]);
  const handleCopyInvite = useCallback(() => {
    const code = `KARMA-${user.username.toUpperCase().slice(0, 6)}`;
    try { navigator.clipboard.writeText(code); } catch {}
    setInviteCopied(true);
    showToast("Invite code copied! 📋", undefined, "#c8ff00", "🎉");
    setTimeout(() => setInviteCopied(false), 2500);
  }, [user.username, showToast]);
  const world = WORLDS.find(w => w.id === worldId) ?? WORLDS[2];
  const onlineFriends = FRIENDS.filter(f => f.online);

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
    <div style={{ background: "#050505", minHeight: "100dvh" }}>

      {/* ─── Instagram-style sticky header ─── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(5,5,5,0.95)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid #111`,
      }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 8px" }}>
          {/* Brand + stats */}
          <div>
            <h1 style={{
              fontSize: "1.7rem",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              background: `linear-gradient(135deg, ${world.accent} 0%, #ff2d8d 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>KARMA</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ fontSize: 10, color: "#4caf50", fontWeight: 700 }}
              >● {onlineFriends.length} online</motion.span>
              <span style={{ fontSize: 10, color: "#333" }}>·</span>
              <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>⚡ 847k community karma</span>
            </div>
          </div>

          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{
              background: "none", border: "none", cursor: "pointer",
              width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", color: "#fff",
            }}>🔔</button>
            <Link href="/chat" style={{ textDecoration: "none" }}>
              <button style={{
                background: "none", border: "none", cursor: "pointer",
                width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", color: "#fff",
              }}>💬</button>
            </Link>
            <div style={{
              width: 34, height: 34,
              background: `${world.accent}22`,
              border: `2px solid ${world.accent}`,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem",
              boxShadow: `0 0 10px ${world.accent}44`,
            }}>
              {user.avatarEmoji}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderTop: "1px solid #0f0f0f" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "11px 2px",
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === t ? world.accent : "transparent"}`,
                fontSize: 11, fontWeight: 700,
                color: tab === t ? world.accent : "#555",
                letterSpacing: "0.06em", cursor: "pointer",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
              {t === "WARS" && (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontSize: 10 }}>⚔️</motion.span>
              )}
              {t === "FLASH" && "⚡ "}
              {t === "TOP" && "🏆 "}
              {t === "FRIENDS" && "👥 "}
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
              background: "rgba(0,0,0,0.96)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 20px",
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 40 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 360,
                background: `linear-gradient(145deg, #0d0d0d, #111)`,
                border: `2px solid ${activeStory.color}55`,
                borderRadius: 28, padding: "24px 22px",
                boxShadow: `0 0 60px ${activeStory.color}33`,
                position: "relative",
              }}
            >
              <div style={{ height: 3, background: "#1e1e1e", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
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
                  width: 44, height: 44, borderRadius: "50%",
                  background: `${activeStory.color}22`,
                  border: `2px solid ${activeStory.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.4rem",
                  boxShadow: `0 0 12px ${activeStory.color}44`,
                }}>
                  {activeStory.emoji}
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>@{activeStory.username}</div>
                  <div style={{ fontSize: "0.72rem", color: "#555" }}>{activeStory.time} ago</div>
                </div>
              </div>
              <div style={{ fontSize: "1.1rem", color: "#fff", lineHeight: 1.65, fontWeight: 600, marginBottom: 22 }}>
                {activeStory.content}
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveStory(null)}
                style={{
                  width: "100%", padding: "13px 0",
                  background: activeStory.color, border: "none",
                  borderRadius: 14, color: "#000",
                  fontWeight: 900, fontSize: "0.9rem",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: `0 0 20px ${activeStory.color}55`,
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
          {/* Stories strip — Instagram style */}
          <div style={{
            display: "flex", gap: 12,
            overflowX: "auto", padding: "14px 16px 16px",
            scrollbarWidth: "none",
            background: "#050505",
          }}>
            {/* My story */}
            <motion.div whileTap={{ scale: 0.9 }} onClick={() => setShowCreate(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#0d0d0d",
                border: "2px dashed #2a2a2a",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", fontSize: "1.6rem",
              }}>
                {user.avatarEmoji}
                <div style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: "50%",
                  background: world.accent, border: "2.5px solid #050505",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", color: "#000", fontWeight: 900,
                }}>+</div>
              </div>
              <div style={{ fontSize: 10, color: "#444", maxWidth: 64, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Your story
              </div>
            </motion.div>

            {/* Friend stories */}
            {STORY_DATA.map(story => {
              const seen = seenStories.has(story.id);
              return (
                <motion.div
                  key={story.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setActiveStory(story); setSeenStories(s => new Set([...s, story.id])); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}
                >
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    padding: seen ? 0 : 2.5,
                    background: seen
                      ? "transparent"
                      : `conic-gradient(${story.color} 0%, #ff2d8d 40%, ${story.color} 70%, #a855f7 100%)`,
                    boxShadow: seen ? "none" : `0 0 16px ${story.color}55`,
                    transition: "all 0.3s",
                  }}>
                    <div style={{
                      width: "100%", height: "100%", borderRadius: "50%",
                      background: seen ? "#111" : "#050505",
                      border: seen ? "2px solid #222" : `2.5px solid #050505`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.5rem",
                    }}>
                      {story.emoji}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: seen ? "#333" : "#bbb", maxWidth: 64, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {story.username}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Live activity ticker */}
          <LiveTicker />

          {/* KARMA TV banner */}
          <div style={{ padding: "12px 16px 0" }}>
            <Link href="/karma-tv" style={{ textDecoration: "none", display: "block" }}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                animate={{ boxShadow: ["0 0 16px #ff2d8d18", "0 0 32px #ff2d8d44", "0 0 16px #ff2d8d18"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{
                  background: "linear-gradient(135deg, #150010 0%, #0a001a 100%)",
                  border: "1.5px solid #ff2d8d33",
                  borderRadius: 16, padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: "#ff2d8d18", border: "1.5px solid #ff2d8d44",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.6rem", flexShrink: 0,
                }}>📺</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#fff" }}>KARMA TV</span>
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: "#ff2d8d18", border: "1px solid #ff2d8d33", borderRadius: 8, padding: "2px 7px" }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff2d8d", display: "block" }} />
                      <span style={{ fontSize: "0.6rem", color: "#ff2d8d", fontWeight: 700 }}>LIVE</span>
                    </motion.div>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#555" }}>TikTok-style pet moments · Duel friends · Go viral</div>
                </div>
                <div style={{ fontSize: "1rem", color: "#ff2d8d44" }}>›</div>
              </motion.div>
            </Link>
          </div>

          {/* Feed cards */}
          <div style={{
            padding: "14px 16px 100px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}>
            {posts.map(post => (
              <FlashCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onDoubleTap={handleDoubleTap}
                onComment={handleComment}
                onBookmark={handleBookmark}
                onShare={handleShare}
                isBookmarked={bookmarks.has(post.id)}
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
              width: 52,
              height: 52,
              background: `linear-gradient(135deg, ${world.accent}, ${world.accent}bb)`,
              border: "none",
              borderRadius: "50%",
              boxShadow: `0 0 24px ${world.accent}88, 0 4px 16px rgba(0,0,0,0.5)`,
              fontSize: "1.3rem",
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

      {/* ── FRIENDS tab ── */}
      {tab === "FRIENDS" && (
        <div className="px-4 pt-4 pb-24 space-y-4">

          {/* Squad banner */}
          <Link href="/squads" style={{ textDecoration: "none", display: "block" }}>
            <motion.div
              whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: ["0 0 16px #c8ff0018", "0 0 32px #c8ff0038", "0 0 16px #c8ff0018"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                background: "linear-gradient(135deg, #060f06, #0d1a0d)",
                border: "1.5px solid #c8ff0033",
                borderRadius: 18, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#c8ff0018", border: "1.5px solid #c8ff0044", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#c8ff00", marginBottom: 2 }}>KARMA LORDS · #3</div>
                <div style={{ fontSize: 11, color: "#444" }}>Squad wars · 6 members · Join the fight</div>
              </div>
              <div style={{ fontSize: "1rem", color: "#c8ff0066" }}>›</div>
            </motion.div>
          </Link>

          {/* Online story-bar */}
          {onlineFriends.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4caf50", letterSpacing: "0.12em", marginBottom: 10 }}>● ACTIVE NOW</div>
              <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
                {onlineFriends.map(f => (
                  <div key={f.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <div style={{
                      width: 60, height: 60,
                      borderRadius: "50%", padding: 2.5,
                      background: "conic-gradient(#4caf50 0%, #00e5ff 50%, #c8ff00 100%)",
                      boxShadow: "0 0 18px #4caf5033",
                    }}>
                      <div style={{ width: "100%", height: "100%", background: "#111", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", position: "relative" }}>
                        {f.emoji}
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, background: "#4caf50", border: "2px solid #050505", borderRadius: "50%" }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#aaa", maxWidth: 60, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              <div style={{ fontSize: 10, fontWeight: 700, color: "#ff6b35", letterSpacing: "0.12em", marginBottom: 10 }}>🎮 IN GAME — CHALLENGE NOW</div>
              <div className="space-y-3">
                {onlineFriends.filter(f => f.currentGame).map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <div style={{
                      background: "linear-gradient(135deg, #150800, #200f00)",
                      border: "1.5px solid #ff6b3533",
                      borderRadius: 18,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      boxShadow: "0 0 24px #ff6b3520",
                    }}>
                      <div style={{ fontSize: "1.8rem" }}>{f.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>@{f.username}</div>
                        <div style={{ fontSize: 12, color: "#ff6b35", fontWeight: 600, marginTop: 2 }}>
                          {GAME_LABELS[f.currentGame!] ?? f.currentGame}
                        </div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{f.petEmoji} {f.petName} · LV{f.level}</div>
                      </div>
                      <Link href={`/games/${f.currentGame}`}
                        style={{
                          padding: "10px 16px",
                          background: "#ff6b35",
                          border: "none",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#000",
                          textDecoration: "none",
                          boxShadow: "0 0 14px #ff6b3555",
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
              <div style={{ fontSize: 10, fontWeight: 700, color: "#4caf50", letterSpacing: "0.12em", marginBottom: 10 }}>● ONLINE</div>
              <div className="space-y-2">
                {onlineFriends.filter(f => !f.currentGame).map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div style={{ background: "#0d0d0d", border: "1.5px solid #4caf5022", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 46, height: 46, background: "#111", border: "1.5px solid #4caf5022", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>{f.emoji}</div>
                        <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, background: "#4caf50", border: "2px solid #0d0d0d", borderRadius: "50%", boxShadow: "0 0 6px #4caf50" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>@{f.username}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, background: "#c8ff00", borderRadius: 5, padding: "1px 5px", color: "#000" }}>LV{f.level}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{f.lastActivity} · {f.petEmoji} {f.petName}</div>
                      </div>
                      <Link href="/games"
                        style={{ padding: "8px 14px", background: "#111", border: "1.5px solid #c8ff0022", borderRadius: 10, fontSize: 11, fontWeight: 700, color: "#c8ff00", textDecoration: "none" }}>
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
            <div style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.12em", marginBottom: 10 }}>OFFLINE</div>
            <div className="space-y-2">
              {FRIENDS.filter(f => !f.online).map(f => (
                <div key={f.id} style={{ background: "#0a0a0a", border: "1.5px solid #1a1a1a", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, opacity: 0.55 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 40, height: 40, background: "#111", border: "1.5px solid #1e1e1e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{f.emoji}</div>
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, background: "#333", border: "2px solid #0a0a0a", borderRadius: "50%" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#888" }}>@{f.username}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>{f.lastActivity} · {f.petEmoji} {f.petName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Find Friends */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: world.accent, letterSpacing: "0.12em", marginBottom: 10 }}>🔍 FIND FRIENDS</div>
            <div className="space-y-2">
              {LEADERBOARD.filter(e => e.username !== user.username && !FRIENDS.some(f => f.username === e.username)).map((e, i) => (
                <motion.div key={e.username} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div style={{ background: "#0a0a0a", border: `1.5px solid ${world.accent}18`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: "1.4rem" }}>{e.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>@{e.username}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>LV{e.level} · {e.karma.toLocaleString()} ⚡</div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => !addedFriends.has(e.username) && handleAddFriend(e.username)}
                      style={{
                        padding: "7px 14px",
                        background: addedFriends.has(e.username) ? "#111" : world.accent,
                        border: `1.5px solid ${addedFriends.has(e.username) ? "#222" : "transparent"}`,
                        borderRadius: 10, fontSize: 11, fontWeight: 700,
                        color: addedFriends.has(e.username) ? "#555" : "#000",
                        cursor: addedFriends.has(e.username) ? "default" : "pointer",
                        boxShadow: addedFriends.has(e.username) ? "none" : `0 0 10px ${world.accent}44`,
                      }}>
                      {addedFriends.has(e.username) ? "✓ ADDED" : "+ ADD"}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Invite */}
          <div style={{ background: `${world.accent}10`, border: `1.5px solid ${world.accent}33`, borderRadius: 18, padding: "18px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🎁</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Invite Friends</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Share your code and earn 200 ⚡ each</div>
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyInvite}
              style={{
                background: inviteCopied ? world.accent + "22" : "#0a0a0a",
                color: world.accent, borderRadius: 12, padding: "10px 18px",
                fontSize: 13, fontWeight: 800, letterSpacing: "0.1em",
                display: "inline-flex", alignItems: "center", gap: 8,
                cursor: "pointer", border: `1.5px solid ${world.accent}33`,
              }}>
              {inviteCopied ? "✅ COPIED!" : `KARMA-${user.username.toUpperCase().slice(0, 6)}`}
              {!inviteCopied && <span style={{ fontSize: 11, opacity: 0.45 }}>tap to copy</span>}
            </motion.div>
          </div>
        </div>
      )}

      {/* ── TOP tab ── */}
      {tab === "TOP" && (
        <div className="px-4 pt-4 pb-28">

          {/* TRENDING header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ fontSize: "1.6rem" }}>🔥</motion.span>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em" }}>TRENDING</span>
          </div>

          {/* Trending hashtag pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 22, scrollbarWidth: "none" }}>
            {TRENDING.map((t, i) => (
              <motion.div
                key={t.tag}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  background: `${t.color}12`,
                  border: `1.5px solid ${t.color}33`,
                  borderRadius: 100, padding: "8px 14px",
                  flexShrink: 0, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: t.color }}>{t.tag}</span>
                <span style={{ fontSize: 10 }}>{t.fire}</span>
                <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>{t.count}</span>
              </motion.div>
            ))}
          </div>

          {/* Time period selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, background: "#0a0a0a", borderRadius: 12, padding: 4 }}>
            {(["TODAY","WEEK","ALL"] as const).map(p => (
              <button key={p} onClick={() => setLbPeriod(p)} style={{
                flex: 1, padding: "8px 0",
                background: lbPeriod === p ? world.accent : "transparent",
                border: "none",
                borderRadius: 9, fontSize: 10, fontWeight: 800,
                color: lbPeriod === p ? "#000" : "#444",
                cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.06em", transition: "all 0.2s",
              }}>{p === "TODAY" ? "⚡ TODAY" : p === "WEEK" ? "🔥 WEEK" : "🏆 ALL TIME"}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.12em", marginBottom: 12 }}>GLOBAL KARMA RANKING</div>

          {/* Podium top 3 */}
          {LEADERBOARD.filter(e => e.rank <= 3).map((entry, i) => {
            const podiumColors = [
              { bg: "linear-gradient(135deg, #1c1200, #3d2800)", border: "#ffcc00", crown: "👑", glow: "#ffcc0033" },
              { bg: "linear-gradient(135deg, #111, #1e1e1e)", border: "#c0c0c0", crown: "🥈", glow: "#c0c0c015" },
              { bg: "linear-gradient(135deg, #120800, #261400)", border: "#cd7f32", crown: "🥉", glow: "#cd7f3215" },
            ];
            const c = podiumColors[i];
            const isMe = entry.username === user.username;
            return (
              <motion.div key={entry.username} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ marginBottom: 10 }}>
                <div style={{
                  background: isMe ? `${world.accent}18` : c.bg,
                  border: `1.5px solid ${isMe ? world.accent : c.border + "66"}`,
                  borderRadius: 20,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: `0 0 20px ${isMe ? world.glowColor : c.glow}`,
                }}>
                  {/* Rank badge */}
                  <div style={{
                    width: 38, height: 38,
                    background: i === 0 ? "linear-gradient(135deg, #ffcc00, #ff8c00)" : i === 1 ? "linear-gradient(135deg, #ccc, #888)" : "linear-gradient(135deg, #cd7f32, #8b4513)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: i === 0 ? "1.3rem" : "1.1rem",
                    boxShadow: `0 0 14px ${c.border}66`,
                    flexShrink: 0,
                  }}>
                    {i === 0 ? (
                      <motion.span animate={{ scale: [1, 1.2, 1], rotate: [0, -6, 6, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }} style={{ display: "inline-block" }}>
                        {c.crown}
                      </motion.span>
                    ) : c.crown}
                  </div>
                  <div style={{ width: 50, height: 50, background: "#111", border: `2px solid ${c.border}44`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>
                    {entry.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>@{entry.username} {isMe && <span style={{ color: "#555", fontSize: 12 }}>(you)</span>}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>LV {entry.level} · {entry.class}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c.border }}>
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
              const indicatorColor = indicator === "↑" ? "#00ff88" : indicator === "↓" ? "#ff4444" : "#555";
              return (
                <motion.div key={entry.username} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                  <div style={{
                    background: isMe ? `${world.accent}12` : "#0a0a0a",
                    border: `1.5px solid ${isMe ? world.accent + "44" : "#111"}`,
                    borderRadius: 14,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: indicatorColor, width: 14, textAlign: "center" }}>{indicator}</div>
                    <div style={{ width: 26, height: 26, background: "#111", border: "1.5px solid #1e1e1e", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#555" }}>#{entry.rank}</div>
                    <div style={{ width: 36, height: 36, background: "#111", border: "1.5px solid #1e1e1e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{entry.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>@{entry.username} {isMe && <span style={{ color: "#555", fontSize: 11 }}>(you)</span>}</div>
                      <div style={{ fontSize: 11, color: "#444" }}>LV {entry.level} · {entry.class}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isMe ? world.accent : "#666" }}>{entry.karma.toLocaleString()} ⚡</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* YOUR RANK sticky banner */}
          {myRank && (
            <div style={{
              position: "sticky",
              bottom: 80,
              background: world.accent,
              border: "none",
              borderRadius: 16,
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: `0 0 24px ${world.accent}66`,
              marginTop: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#000" }}>YOUR RANK</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: "1.3rem" }}>{user.avatarEmoji}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#000" }}>#{myRank.rank}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#000" }}>{myRank.karma.toLocaleString()} ⚡</div>
            </div>
          )}

          {/* KARMA WARS promo */}
          <Link href="/squads" style={{ textDecoration: "none", display: "block", marginTop: 12 }}>
            <motion.div
              animate={{ boxShadow: ["0 0 16px #ff2d8d18", "0 0 32px #ff2d8d44", "0 0 16px #ff2d8d18"] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: "linear-gradient(135deg, #150010, #0a0a0a)",
                border: "1.5px solid #ff2d8d33",
                borderRadius: 18, padding: "16px",
                display: "flex", alignItems: "center", gap: 14,
              }}
            >
              <div style={{ fontSize: "2.2rem" }}>⚔️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#ff2d8d", letterSpacing: "0.06em" }}>KARMA WARS</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Squad vs squad. Weekly prize pool. Join now.</div>
              </div>
              <div style={{ background: "#ff2d8d", color: "#fff", fontWeight: 900, fontSize: 11, borderRadius: 10, padding: "7px 14px" }}>JOIN →</div>
            </motion.div>
          </Link>
        </div>
      )}

      {/* ── WARS tab ── */}
      {tab === "WARS" && (
        <div className="px-4 pt-4 pb-28">
          {/* Epic header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ fontSize: "3.5rem", marginBottom: 8 }}
            >⚔️</motion.div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em" }}>KARMA WARS</div>
            <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Squad vs Squad · Weekly Prize Pool</div>
          </div>

          {/* Live war cards */}
          {[
            { squad1: "IRON WOLVES", emoji1: "🐺", squad2: "NEON FOXES", emoji2: "🦊", karma1: 12843, karma2: 11234, color: "#ff6b35", timeLeft: "2h 14m", urgent: false },
            { squad1: "SHADOW GUILD", emoji1: "🌑", squad2: "LIGHT KINGS", emoji2: "👑", karma1: 8921, karma2: 9102, color: "#a855f7", timeLeft: "5h 32m", urgent: false },
            { squad1: "KARMA LORDS", emoji1: "⚡", squad2: "BOUNTY CREW", emoji2: "🎯", karma1: 15600, karma2: 14800, color: "#c8ff00", timeLeft: "FINAL HOUR", urgent: true },
          ].map((war, i) => {
            const total = war.karma1 + war.karma2;
            const pct1 = Math.round((war.karma1 / total) * 100);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                style={{
                  background: war.urgent ? `linear-gradient(135deg, #0a0a0a, #0d0d0d)` : "#0a0a0a",
                  border: `1.5px solid ${war.color}${war.urgent ? "88" : "33"}`,
                  borderRadius: 22, padding: "18px",
                  marginBottom: 14,
                  boxShadow: war.urgent ? `0 0 40px ${war.color}33, inset 0 0 30px ${war.color}08` : "none",
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Urgent badge */}
                {war.urgent && (
                  <div style={{ marginBottom: 12, textAlign: "center" }}>
                    <motion.span
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 0.7, repeat: Infinity }}
                      style={{
                        fontSize: 9, fontWeight: 900, color: "#ff2d8d",
                        letterSpacing: "0.2em", background: "#ff2d8d18",
                        border: "1px solid #ff2d8d33", borderRadius: 8,
                        padding: "3px 10px",
                      }}
                    >
                      🔴 FINAL HOUR — WINNER TAKES ALL
                    </motion.span>
                  </div>
                )}

                {/* VS display */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: "2rem", marginBottom: 4 }}>{war.emoji1}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{war.squad1}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: war.color, marginTop: 4 }}>{war.karma1.toLocaleString()}</div>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#111", border: `2px solid ${war.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 900, color: "#555",
                    flexShrink: 0,
                  }}>VS</div>
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: "2rem", marginBottom: 4 }}>{war.emoji2}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{war.squad2}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#555", marginTop: 4 }}>{war.karma2.toLocaleString()}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 8, background: "#111", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct1}%` }}
                    transition={{ delay: 0.6 + i * 0.2, duration: 1, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${war.color}, ${war.color}88)`, borderRadius: 4 }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: war.color }}>{pct1}%</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#555" }}>Ends in <span style={{ color: war.color }}>{war.timeLeft}</span></span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#555" }}>{100 - pct1}%</span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: war.urgent ? `linear-gradient(135deg, ${war.color}, ${war.color}bb)` : `${war.color}22`,
                    border: `1.5px solid ${war.color}55`,
                    color: war.urgent ? "#000" : war.color,
                    fontSize: 12, fontWeight: 900,
                    borderRadius: 12, cursor: "pointer",
                    fontFamily: "inherit", letterSpacing: "0.08em",
                    boxShadow: war.urgent ? `0 0 20px ${war.color}55` : "none",
                  }}
                >JOIN WAR ⚔️</motion.button>
              </motion.div>
            );
          })}

          {/* My squad CTA */}
          <Link href="/squads" style={{ textDecoration: "none" }}>
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                background: "linear-gradient(135deg, #0a100a, #0a0a0a)",
                border: "1.5px solid #c8ff0033",
                borderRadius: 20, padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🏴</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#c8ff00" }}>JOIN A SQUAD</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 5 }}>Team up, compete in wars, share rewards</div>
            </motion.div>
          </Link>
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

      {/* ── Comment Sheet ── */}
      <AnimatePresence>
        {commentPostId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommentPostId(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "flex-end",
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", background: "#0a0a0a",
                border: "1.5px solid #1a1a1a", borderBottom: "none",
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                padding: "8px 16px 40px",
              }}
            >
              {/* Drag pill */}
              <div style={{ width: 36, height: 4, background: "#222", borderRadius: 2, margin: "10px auto 18px" }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 16 }}>💬 ADD COMMENT</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#111", border: "1.5px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                  {user.avatarEmoji}
                </div>
                <input
                  autoFocus
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && commentText.trim()) {
                      showToast("Comment posted! 💬", undefined, world.accent, "💬");
                      setCommentPostId(null);
                      setCommentText("");
                    }
                  }}
                  placeholder="Write something..."
                  style={{
                    flex: 1, background: "#111", border: "1.5px solid #1e1e1e",
                    borderRadius: 14, padding: "10px 14px",
                    fontSize: 14, color: "#fff", outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (!commentText.trim()) return;
                    showToast("Comment posted! 💬", undefined, world.accent, "💬");
                    setCommentPostId(null);
                    setCommentText("");
                  }}
                  style={{
                    width: 42, height: 42, borderRadius: 14,
                    background: commentText.trim() ? world.accent : "#111",
                    border: "1.5px solid #1e1e1e",
                    cursor: "pointer", fontSize: "1.2rem", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.2s",
                  }}
                >
                  ↑
                </motion.button>
              </div>
              {/* Quick reactions */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {["🔥 Fire!", "⚡ Based!", "🏆 W", "🐾 Pet goals", "💪 Let's go"].map(q => (
                  <motion.button
                    key={q}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      showToast("Comment posted! 💬", undefined, world.accent, "💬");
                      setCommentPostId(null);
                      setCommentText("");
                    }}
                    style={{
                      background: "#0d0d0d", border: "1.5px solid #1a1a1a",
                      borderRadius: 100, padding: "7px 14px",
                      fontSize: 12, color: "#888", cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >{q}</motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
