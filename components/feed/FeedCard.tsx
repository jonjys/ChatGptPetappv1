"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react";
import type { Post } from "@/types/post";

const TYPE_CONFIG = {
  achievement: { label: "ACHIEVEMENT", bg: "#c8ff00", color: "#0a0a0a" },
  story: { label: "STORY", bg: "#00e5ff", color: "#0a0a0a" },
  bounty_complete: { label: "BOUNTY ✓", bg: "#ff6b35", color: "#fff" },
  level_up: { label: "LEVEL UP ⬆", bg: "#ff2d8d", color: "#fff" },
};

const DIFF_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  easy: { bg: "#d4f5c0", color: "#1b5e20", border: "#4caf50" },
  medium: { bg: "#fff3c4", color: "#e65100", border: "#ff9800" },
  hard: { bg: "#ffd0d0", color: "#b71c1c", border: "#f44336" },
  legendary: { bg: "#e8d5ff", color: "#4c1d95", border: "#8b5cf6" },
};

export default function FeedCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showFloatXP, setShowFloatXP] = useState(false);

  const typeConfig = TYPE_CONFIG[post.type];

  function handleLike() {
    if (!liked) {
      setLiked(true);
      setLikeCount((n) => n + 1);
      setShowFloatXP(true);
      setTimeout(() => setShowFloatXP(false), 900);
    } else {
      setLiked(false);
      setLikeCount((n) => n - 1);
    }
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="neo-card p-4 relative overflow-hidden"
    >
      {/* Type badge */}
      <div className="flex justify-between items-start mb-3">
        <span
          className="badge"
          style={{ background: typeConfig.bg, color: typeConfig.color }}
        >
          {typeConfig.label}
        </span>
        {post.xpEarned && (
          <span
            className="badge"
            style={{ background: "#0a0a0a", color: "#c8ff00" }}
          >
            +{post.xpEarned} XP
          </span>
        )}
      </div>

      {/* Author */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 42,
            height: 42,
            background: "#faf7f2",
            border: "2.5px solid #0a0a0a",
            borderRadius: "50%",
            fontSize: "1.4rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {post.authorEmoji}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15, fontWeight: 700 }}>@{post.authorUsername}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "#c8ff00",
                border: "2px solid #0a0a0a",
                borderRadius: 6,
                padding: "1px 6px",
              }}
            >
              LV {post.authorLevel}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {post.location && (
              <>
                <MapPin size={11} color="#888" />
                <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{post.location}</span>
                <span style={{ color: "#ccc" }}>·</span>
              </>
            )}
            <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 500, marginBottom: 14, color: "#1a1a1a" }}>
        {post.content}
      </p>

      {/* Bounty preview */}
      {post.bounty && (
        <div
          className="flex items-center justify-between p-3 mb-3"
          style={{
            background: "#faf7f2",
            border: "2px solid #0a0a0a",
            borderRadius: 12,
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "1.2rem" }}>{post.bounty.categoryEmoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{post.bounty.title}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="badge"
                  style={{
                    ...DIFF_STYLE[post.bounty.difficulty],
                    borderColor: DIFF_STYLE[post.bounty.difficulty].border,
                    background: DIFF_STYLE[post.bounty.difficulty].bg,
                    color: DIFF_STYLE[post.bounty.difficulty].color,
                  }}
                >
                  {post.bounty.difficulty}
                </span>
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              background: "#c8ff00",
              border: "2px solid #0a0a0a",
              borderRadius: 8,
              padding: "3px 8px",
            }}
          >
            +{post.bounty.xpReward} XP
          </span>
        </div>
      )}

      {/* Badge highlight */}
      {post.badge && (
        <div
          className="flex items-center gap-2 p-3 mb-3"
          style={{
            background: "#fff3c4",
            border: "2px solid #ff9800",
            borderRadius: 12,
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🏆</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e65100" }}>{post.badge}</span>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-1 pt-3"
        style={{ borderTop: "2px solid #e8e3d8" }}
      >
        <div className="relative">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
            style={{
              background: liked ? "#ffd0d0" : "transparent",
              border: liked ? "2px solid #f44336" : "2px solid transparent",
            }}
            onClick={handleLike}
          >
            <Heart
              size={18}
              fill={liked ? "#f44336" : "none"}
              color={liked ? "#f44336" : "#555"}
              strokeWidth={2}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: liked ? "#f44336" : "#555" }}>
              {likeCount}
            </span>
          </button>
          <AnimatePresence>
            {showFloatXP && (
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -28 }}
                exit={{}}
                transition={{ duration: 0.7 }}
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#f44336",
                  pointerEvents: "none",
                }}
              >
                ❤️
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-gray-50">
          <MessageCircle size={18} color="#555" strokeWidth={2} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>{post.comments}</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-gray-50 ml-auto">
          <Share2 size={16} color="#555" strokeWidth={2} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>Share</span>
        </button>
      </div>
    </motion.div>
  );
}
