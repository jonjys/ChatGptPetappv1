"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

// ─── Reel data ────────────────────────────────────────────────────────────────

type ReactionKey = "🔥" | "❤️" | "💎" | "🚀" | "💀";
const REACTION_KEYS: ReactionKey[] = ["🔥", "❤️", "💎", "🚀", "💀"];

type Reel = {
  id: string;
  user: string;
  userEmoji: string;
  petEmoji: string;
  petName: string;
  level: number;
  actionType: "bounty" | "level_up" | "battle_win" | "fishing" | "achievement" | "streak" | "case" | "brand";
  content: string;
  karmaEarned: number;
  xpEarned: number;
  reactions: Record<ReactionKey, number>;
  comments: number;
  gradient: string;
  accent: string;
  timeAgo: string;
  hashtags: string[];
};

const REELS: Reel[] = [
  {
    id: "r1", user: "lunavibes", userEmoji: "🌙", petEmoji: "🦋", petName: "Sora", level: 8,
    actionType: "bounty",
    content: "Planted 3 trees in the city park today 🌳 Real-life karma hitting different rn",
    karmaEarned: 420, xpEarned: 180,
    reactions: { "🔥": 1342, "❤️": 892, "💎": 234, "🚀": 567, "💀": 89 },
    comments: 147,
    gradient: "linear-gradient(180deg, #001a00 0%, #003300 40%, #000a00 100%)",
    accent: "#00ff88",
    timeAgo: "2m",
    hashtags: ["#RealLife", "#KarmaGrind", "#PlantingTrees"],
  },
  {
    id: "r2", user: "tradeknight", userEmoji: "⚔️", petEmoji: "🐲", petName: "Aura", level: 15,
    actionType: "level_up",
    content: "LVL 15. My dragon just evolved to LEGENDARY. The grind was REAL 👑",
    karmaEarned: 800, xpEarned: 500,
    reactions: { "🔥": 4521, "❤️": 2103, "💎": 891, "🚀": 1456, "💀": 312 },
    comments: 389,
    gradient: "linear-gradient(180deg, #1a1000 0%, #3a2000 40%, #0a0500 100%)",
    accent: "#ffde00",
    timeAgo: "15m",
    hashtags: ["#LevelUp", "#Legendary", "#DragonEvolved"],
  },
  {
    id: "r3", user: "neonmiku", userEmoji: "✨", petEmoji: "🌟", petName: "Yuki", level: 10,
    actionType: "fishing",
    content: "Caught a LEGENDARY Abyss Serpent on first cast 🎣 what are the odds??",
    karmaEarned: 650, xpEarned: 220,
    reactions: { "🔥": 892, "❤️": 445, "💎": 1203, "🚀": 334, "💀": 567 },
    comments: 213,
    gradient: "linear-gradient(180deg, #000d1a 0%, #001a33 40%, #00050d 100%)",
    accent: "#00e5ff",
    timeAgo: "1h",
    hashtags: ["#DeepCatch", "#LegendaryFish", "#OneInAMillion"],
  },
  {
    id: "r4", user: "pixelrush", userEmoji: "🎮", petEmoji: "🦊", petName: "Rex", level: 5,
    actionType: "battle_win",
    content: "Beat ironclad99 (LV31) with my LV5 fox??? Still shaking 💀",
    karmaEarned: 300, xpEarned: 150,
    reactions: { "🔥": 7823, "❤️": 3421, "💎": 567, "🚀": 4521, "💀": 8932 },
    comments: 892,
    gradient: "linear-gradient(180deg, #1a0500 0%, #3a0a00 40%, #0a0200 100%)",
    accent: "#ff6b35",
    timeAgo: "2h",
    hashtags: ["#Upset", "#PetBattle", "#DavidVsGoliath"],
  },
  {
    id: "r5", user: "voltfox", userEmoji: "🦊", petEmoji: "🦁", petName: "Blaze", level: 7,
    actionType: "streak",
    content: "30-DAY STREAK UNLOCKED 🏆 Not a single miss. What's YOUR record?",
    karmaEarned: 500, xpEarned: 250,
    reactions: { "🔥": 5621, "❤️": 2891, "💎": 1203, "🚀": 3421, "💀": 234 },
    comments: 445,
    gradient: "linear-gradient(180deg, #1a0a00 0%, #2a1500 40%, #0a0500 100%)",
    accent: "#ff8c00",
    timeAgo: "3h",
    hashtags: ["#30DayStreak", "#MonthlyMaster", "#KarmaGrind"],
  },
  {
    id: "r6", user: "zenmaster", userEmoji: "🧘", petEmoji: "🌙", petName: "Zen", level: 28,
    actionType: "achievement",
    content: "10,000 karma milestone. Started from 0. This app changed my life fr 🌟",
    karmaEarned: 1000, xpEarned: 400,
    reactions: { "🔥": 12043, "❤️": 8921, "💎": 3421, "🚀": 9832, "💀": 445 },
    comments: 1203,
    gradient: "linear-gradient(180deg, #0d0020 0%, #1a0040 40%, #050010 100%)",
    accent: "#a855f7",
    timeAgo: "4h",
    hashtags: ["#KarmaLord", "#10k", "#Milestone"],
  },
  {
    id: "r7", user: "ironforge", userEmoji: "⚒️", petEmoji: "🌋", petName: "Titan", level: 25,
    actionType: "case",
    content: "Shadow Vault LEGENDARY UNBOX on free daily key 😭 RNG gods are real",
    karmaEarned: 800, xpEarned: 0,
    reactions: { "🔥": 3421, "❤️": 1203, "💎": 7823, "🚀": 2103, "💀": 4521 },
    comments: 567,
    gradient: "linear-gradient(180deg, #050005 0%, #0a0015 40%, #020005 100%)",
    accent: "#cc44ff",
    timeAgo: "5h",
    hashtags: ["#ShadowVault", "#Legendary", "#FreeKey"],
  },
  {
    id: "r8", user: "wildrose88", userEmoji: "🌹", petEmoji: "🌸", petName: "Rosa", level: 6,
    actionType: "brand",
    content: "My brand 'Rosa Drip' just hit 500 followers and sold 20 items in one day 🚀",
    karmaEarned: 1200, xpEarned: 300,
    reactions: { "🔥": 2103, "❤️": 4521, "💎": 892, "🚀": 3421, "💀": 123 },
    comments: 334,
    gradient: "linear-gradient(180deg, #1a0010 0%, #2a0020 40%, #0a0008 100%)",
    accent: "#ff2d8d",
    timeAgo: "6h",
    hashtags: ["#Creator", "#BrandLife", "#RosaDrip"],
  },
];

// ─── Action badge labels ──────────────────────────────────────────────────────

const ACTION_LABELS: Record<Reel["actionType"], string> = {
  bounty:      "🎯 BOUNTY COMPLETE",
  level_up:    "⭐ LEVEL UP",
  battle_win:  "⚔️ BATTLE WIN",
  fishing:     "🎣 LEGENDARY CATCH",
  achievement: "🏆 ACHIEVEMENT",
  streak:      "🔥 STREAK MILESTONE",
  case:        "📦 VAULT UNBOX",
  brand:       "🚀 BRAND FLEX",
};

// ─── Duel modal ───────────────────────────────────────────────────────────────

function DuelModal({ reel, onClose, onChallenge }: { reel: Reel; onClose: () => void; onChallenge: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d0d0d", border: `3px solid ${reel.accent}`,
          borderRadius: 24, padding: "28px 24px",
          width: "100%", maxWidth: 340,
          boxShadow: `0 0 60px ${reel.accent}44`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "3.5rem", marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: reel.accent, marginBottom: 8 }}>
            KARMA CLASH
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
            Challenge {reel.userEmoji} @{reel.user}?
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#888", lineHeight: 1.5 }}>
            30-minute karma duel. Most karma earned wins. Loser sends winner 100⚡.
          </p>
        </div>

        <div style={{ background: "#111", borderRadius: 14, padding: "14px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "#888" }}>Your pet</span>
            <span style={{ fontSize: "0.8rem", color: "#888" }}>Their pet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem" }}>🦊</div>
              <div style={{ fontSize: "0.7rem", color: "#c8ff00", fontWeight: 700 }}>YOU</div>
            </div>
            <div style={{ fontSize: "1.2rem", color: "#555", fontWeight: 900 }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem" }}>{reel.petEmoji}</div>
              <div style={{ fontSize: "0.7rem", color: reel.accent, fontWeight: 700 }}>{reel.user.toUpperCase()}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "14px 0",
            background: "transparent", border: "2px solid #333",
            borderRadius: 12, color: "#888",
            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            CANCEL
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onChallenge} style={{
            flex: 2, padding: "14px 0",
            background: reel.accent, border: "none",
            borderRadius: 12, color: "#000",
            fontWeight: 900, fontSize: "1rem",
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: `0 0 24px ${reel.accent}66`,
          }}>
            ⚔️ CHALLENGE!
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Single Reel Card ─────────────────────────────────────────────────────────

function ReelCard({
  reel, isActive, userReactions, onReact, onFollow, following, onDuel, index,
}: {
  reel: Reel;
  isActive: boolean;
  userReactions: Set<ReactionKey>;
  onReact: (reelId: string, key: ReactionKey) => void;
  onFollow: (user: string) => void;
  following: boolean;
  onDuel: (reel: Reel) => void;
  index: number;
}) {
  const [burstKey, setBurstKey] = useState<ReactionKey | null>(null);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTapRef = useRef(0);

  function handleReact(key: ReactionKey) {
    onReact(reel.id, key);
    setBurstKey(key);
    setTimeout(() => setBurstKey(null), 600);
  }

  function handleCardTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setDoubleTapHeart(true);
      onReact(reel.id, "❤️");
      setTimeout(() => setDoubleTapHeart(false), 1000);
    }
    lastTapRef.current = now;
  }

  return (
    <div
      onClick={handleCardTap}
      style={{
        scrollSnapAlign: "start",
        height: "calc(100dvh - 65px)",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: reel.gradient,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Ambient glow orb */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 300, height: 300, borderRadius: "50%",
        background: `radial-gradient(circle, ${reel.accent}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {doubleTapHeart && (
          <motion.div
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 2.5, y: -80 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", top: "45%", left: "50%",
              transform: "translateX(-50%)",
              fontSize: "4rem", pointerEvents: "none", zIndex: 10,
            }}
          >
            ❤️
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "16px 16px 0",
        background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
        zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(0,0,0,0.5)", borderRadius: 20,
            padding: "6px 12px", backdropFilter: "blur(8px)",
          }}>
            <motion.div
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff2d8d", boxShadow: "0 0 6px #ff2d8d" }}
            />
            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#fff", letterSpacing: "0.2em" }}>KARMA TV</span>
          </div>

          <div style={{
            background: `${reel.accent}22`, border: `1.5px solid ${reel.accent}`,
            borderRadius: 20, padding: "4px 12px",
            fontSize: "0.65rem", fontWeight: 800, color: reel.accent, letterSpacing: "0.1em",
          }}>
            {ACTION_LABELS[reel.actionType]}
          </div>
        </div>
      </div>

      {/* Center — Pet display */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* Pet with animated glow */}
        <div style={{ textAlign: "center" }}>
          <motion.div
            animate={isActive ? {
              scale: [1, 1.06, 1],
              rotate: [0, -3, 3, 0],
              filter: [`drop-shadow(0 0 20px ${reel.accent}66)`, `drop-shadow(0 0 40px ${reel.accent}cc)`, `drop-shadow(0 0 20px ${reel.accent}66)`],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: "7rem", display: "block", lineHeight: 1 }}
          >
            {reel.petEmoji}
          </motion.div>

          {/* Karma earned badge */}
          <motion.div
            initial={isActive ? { scale: 0, opacity: 0 } : false}
            animate={isActive ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 16, padding: "8px 18px",
              background: `${reel.accent}22`, border: `2px solid ${reel.accent}`,
              borderRadius: 30,
              boxShadow: `0 0 20px ${reel.accent}44`,
            }}
          >
            <span style={{ fontSize: "1rem", fontWeight: 900, color: reel.accent }}>+{reel.karmaEarned}⚡</span>
            <span style={{ fontSize: "0.75rem", color: "#888" }}>·</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#aaa" }}>+{reel.xpEarned} XP</span>
          </motion.div>
        </div>

        {/* Floating particles */}
        {isActive && Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              left: `${10 + (i * 11) % 80}%`,
              top: `${15 + (i * 13) % 60}%`,
              fontSize: "1rem",
              pointerEvents: "none",
              opacity: 0.4,
            }}
            animate={{
              y: [-20, -50, -20],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 2 + (i % 3),
              repeat: Infinity,
              delay: i * 0.4,
            }}
          >
            {["⭐", "✨", "💫", "⚡"][i % 4]}
          </motion.div>
        ))}
      </div>

      {/* Right sidebar — Reactions */}
      <div style={{
        position: "absolute", right: 14, bottom: 160,
        display: "flex", flexDirection: "column", gap: 18, alignItems: "center",
        zIndex: 5,
      }}>
        {REACTION_KEYS.map(key => {
          const reacted = userReactions.has(key);
          const count = (reel.reactions[key] ?? 0) + (reacted ? 1 : 0);
          const isBursting = burstKey === key;
          return (
            <motion.div
              key={key}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); handleReact(key); }}
            >
              <motion.div
                animate={isBursting ? { scale: [1, 1.8, 1], rotate: [0, -15, 15, 0] } : reacted ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.4 }}
                style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: reacted ? `${reel.accent}33` : "rgba(0,0,0,0.5)",
                  border: `2px solid ${reacted ? reel.accent : "rgba(255,255,255,0.15)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.4rem",
                  backdropFilter: "blur(4px)",
                  boxShadow: reacted ? `0 0 16px ${reel.accent}66` : "none",
                  transition: "all 0.2s",
                }}
              >
                {key}
              </motion.div>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: reacted ? reel.accent : "rgba(255,255,255,0.7)" }}>
                {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
            </motion.div>
          );
        })}

        {/* Comments */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: 0.7 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)",
            border: "2px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", backdropFilter: "blur(4px)",
          }}>
            💬
          </div>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            {reel.comments >= 1000 ? `${(reel.comments / 1000).toFixed(1)}k` : reel.comments}
          </span>
        </div>

        {/* DUEL button */}
        <motion.div
          whileTap={{ scale: 0.9 }}
          onClick={e => { e.stopPropagation(); onDuel(reel); }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}
        >
          <motion.div
            animate={{ boxShadow: [`0 0 8px ${reel.accent}44`, `0 0 18px ${reel.accent}88`, `0 0 8px ${reel.accent}44`] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 46, height: 46, borderRadius: "50%",
              background: `${reel.accent}22`,
              border: `2px solid ${reel.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem", backdropFilter: "blur(4px)",
            }}
          >
            ⚔️
          </motion.div>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: reel.accent }}>DUEL</span>
        </motion.div>
      </div>

      {/* Bottom info */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "80px 16px 20px",
        background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
        zIndex: 5,
      }}>
        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: `${reel.accent}22`,
            border: `2.5px solid ${reel.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", flexShrink: 0,
            boxShadow: `0 0 12px ${reel.accent}44`,
          }}>
            {reel.userEmoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#fff" }}>@{reel.user}</span>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, color: reel.accent,
                background: `${reel.accent}22`, border: `1px solid ${reel.accent}44`,
                borderRadius: 6, padding: "1px 6px", letterSpacing: "0.05em",
              }}>
                LV{reel.level}
              </span>
              <span style={{ fontSize: "0.6rem", color: "#555" }}>· {reel.petEmoji} {reel.petName}</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              {reel.timeAgo} ago
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onFollow(reel.user); }}
            style={{
              padding: "7px 14px",
              background: following ? "rgba(255,255,255,0.1)" : reel.accent,
              border: `1.5px solid ${following ? "rgba(255,255,255,0.2)" : reel.accent}`,
              borderRadius: 20,
              fontSize: "0.75rem", fontWeight: 800,
              color: following ? "#aaa" : "#000",
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {following ? "Following" : "Follow"}
          </motion.button>
        </div>

        {/* Content */}
        <p style={{ fontSize: "0.9rem", color: "#fff", lineHeight: 1.5, marginBottom: 8, fontWeight: 500 }}>
          {reel.content}
        </p>

        {/* Hashtags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {reel.hashtags.map(tag => (
            <span key={tag} style={{ fontSize: "0.78rem", color: reel.accent, fontWeight: 600 }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Index dot position indicator */}
      <div style={{
        position: "absolute", right: 6, top: "50%",
        transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 4,
        zIndex: 5,
      }}>
        {REELS.map((_, i) => (
          <div key={i} style={{
            width: 3, height: i === index ? 16 : 6,
            borderRadius: 2,
            background: i === index ? "#fff" : "rgba(255,255,255,0.3)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KarmaTVPage() {
  const { addKarma, addXP, showToast, user, pet } = useApp();
  const [activeIdx, setActiveIdx] = useState(0);
  const [userReactions, setUserReactions] = useState<Record<string, Set<ReactionKey>>>({});
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [duelTarget, setDuelTarget] = useState<Reel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track which reel is visible
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIdx(Math.max(0, Math.min(REELS.length - 1, idx)));
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // Award karma for watching reels
  useEffect(() => {
    const t = setTimeout(() => {
      addKarma(5, "Karma TV watch bonus");
    }, 8000);
    return () => clearTimeout(t);
  }, [activeIdx, addKarma]);

  const handleReact = useCallback((reelId: string, key: ReactionKey) => {
    setUserReactions(prev => {
      const set = new Set(prev[reelId] ?? []);
      if (set.has(key)) {
        set.delete(key);
      } else {
        set.add(key);
        addXP(2);
      }
      return { ...prev, [reelId]: set };
    });
  }, [addXP]);

  const handleFollow = useCallback((username: string) => {
    setFollowedUsers(prev => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
        showToast(`Unfollowed @${username}`, undefined, "#555", "👋");
      } else {
        next.add(username);
        addKarma(5, "New follow");
        showToast(`Following @${username}!`, 5, "#ff2d8d", "❤️");
      }
      return next;
    });
  }, [addKarma, showToast]);

  const handleDuel = useCallback((reel: Reel) => {
    setDuelTarget(reel);
  }, []);

  const handleChallenge = useCallback(() => {
    if (!duelTarget) return;
    addKarma(20, "Duel challenge");
    addXP(50);
    showToast(`⚔️ Challenged @${duelTarget.user}! 30 min duel started!`, 20, duelTarget.accent, "⚔️");
    setDuelTarget(null);
  }, [duelTarget, addKarma, addXP, showToast]);

  const petEmoji = pet.skinId?.startsWith("emoji:") ? pet.skinId.slice(6) : "🦊";

  return (
    <div style={{ background: "#000", height: "calc(100dvh - 65px)", position: "relative", overflow: "hidden" }}>
      {/* Back button */}
      <Link href="/social" style={{ textDecoration: "none" }}>
        <div style={{
          position: "absolute", top: 16, left: 16, zIndex: 100,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", border: "1.5px solid rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1rem", backdropFilter: "blur(8px)",
        }}>
          ←
        </div>
      </Link>

      {/* You bubble */}
      <div style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        border: "1.5px solid rgba(255,255,255,0.15)",
        borderRadius: 20, padding: "4px 12px",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: "0.85rem" }}>{user.avatarEmoji}</span>
        <span style={{ fontSize: "0.65rem", color: "#aaa", fontWeight: 600 }}>@{user.username}</span>
        <span style={{ fontSize: "0.6rem", color: "#c8ff00", fontWeight: 700 }}>·</span>
        <span style={{ fontSize: "0.7rem", color: "#c8ff00", fontWeight: 700 }}>{followedUsers.size} following</span>
      </div>

      {/* Main scroll container */}
      <div
        ref={scrollRef}
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        } as React.CSSProperties}
      >
        {REELS.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            index={i}
            isActive={i === activeIdx}
            userReactions={userReactions[reel.id] ?? new Set()}
            onReact={handleReact}
            onFollow={handleFollow}
            following={followedUsers.has(reel.user)}
            onDuel={handleDuel}
          />
        ))}
      </div>

      {/* Swipe hint (shows only on first load) */}
      <AnimatePresence>
        {activeIdx === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            style={{
              position: "absolute", bottom: 90, left: "50%",
              transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              pointerEvents: "none", zIndex: 10,
            }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.2, repeat: 3 }}
              style={{ fontSize: "1.2rem" }}
            >
              👆
            </motion.div>
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em" }}>
              SWIPE UP
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duel modal */}
      <AnimatePresence>
        {duelTarget && (
          <DuelModal
            reel={duelTarget}
            onClose={() => setDuelTarget(null)}
            onChallenge={handleChallenge}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
