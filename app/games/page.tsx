"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { getDailyQuests } from "@/lib/quests";
import SpinWheel from "@/components/ui/SpinWheel";
import { Zap, Users, Trophy, Flame } from "lucide-react";
import { useState, useEffect } from "react";

type Game = {
  id: string; href: string; emoji: string; name: string;
  tagline: string; reward: string; accent: string; bg: string;
  tag?: string; players?: number; hot?: boolean; new?: boolean;
};

const GAMES: Game[] = [
  { id: "ville",   href: "/ville",         emoji: "🏙️", name: "KARMA VILLE",   tagline: "Bygg din stad · passiv karma · vänner besöker", reward: "Passiv: 2–60 ⚡/timme", accent: "#c8ff00",  bg: "#060f06",  tag: "NY 🆕",   hot: true,  players: 421 },
  { id: "fishing", href: "/games/fishing", emoji: "🎣", name: "DEEP CATCH",    tagline: "Sonar · Charged cast · 30 fish · Battle legendaries", reward: "15–700 ⚡ per catch", accent: "#4488ff",  bg: "#010d1a",  tag: "HOT 🔥",  hot: true,  players: 342 },
  { id: "runner",  href: "/games/runner",  emoji: "🏃", name: "KARMA RUNNER",  tagline: "Ghost runners · Geometry Dash · Warp portals · Aurora", reward: "Up to 500 ⚡",      accent: "#c8ff00",  bg: "#060f06",  hot: true,  players: 218 },
  { id: "slots",   href: "/games/slots",   emoji: "🎰", name: "KARMA SLOTS",   tagline: "5 reels · Jackpot 2000⚡ · Wild WARP",           reward: "Jackpot: 2000 ⚡",    accent: "#ffaa00",  bg: "#1a0d00",  players: 189 },
  { id: "cases",   href: "/games/cases",   emoji: "🏴‍☠️", name: "SHADOW VAULT", tagline: "Unbox rare artifacts · Roll the vault",          reward: "10–800 ⚡ per vault", accent: "#cc44ff",  bg: "#080010",  tag: "NEW",  players: 156 },
  { id: "breaker", href: "/games/breaker", emoji: "🧬", name: "DNA BREAKER",   tagline: "Infinite levels · Plasma Shield · Laser",        reward: "Score → karma",       accent: "#cc55ff",  bg: "#050510",  tag: "NEW",  players: 134 },
  { id: "battle",  href: "/games/battle",  emoji: "⚔️", name: "PET BATTLE",   tagline: "Judgment Ring · Boss fights · Combo chains",     reward: "Win: 100–300 ⚡",     accent: "#ff6b35",  bg: "#150a00",  players: 98  },
  { id: "memory",  href: "/games/memory",  emoji: "🧠", name: "MEMORY PALACE", tagline: "Circular ring · Combo chain · 60 stars",        reward: "Up to 150 ⚡",        accent: "#ff44cc",  bg: "#1a0015",  players: 87  },
  { id: "blitz",   href: "/games/blitz",   emoji: "💥", name: "BOUNTY BLITZ",  tagline: "Step counter · Workout timer · Gratitude journal", reward: "Up to 500 ⚡",       accent: "#00e5ff",  bg: "#001a1a",  tag: "NEW",  players: 203 },
];

const HOT_GAMES = GAMES.filter(g => g.hot);

const LIVE_ACTIVITY = [
  { emoji: "🦅", user: "dragon99",    action: "caught Blue Whale",        karma: 300,  ago: "12s" },
  { emoji: "⚡", user: "xanax",       action: "won Pet Battle",            karma: 180,  ago: "34s" },
  { emoji: "🔥", user: "moonkid",     action: "Karma Runner — 4200 pts",  karma: 210,  ago: "1m"  },
  { emoji: "💎", user: "tradeknight", action: "Shadow Vault: LEGENDARY",  karma: 550,  ago: "2m"  },
  { emoji: "🎰", user: "zara.q",      action: "Slots JACKPOT hit!",       karma: 2000, ago: "3m"  },
];

const LEADERBOARD = [
  { rank: 1, name: "dragon99",    score: 48200, color: "#FFD700" },
  { rank: 2, name: "zara.q",      score: 39750, color: "#C0C0C0" },
  { rank: 3, name: "tradeknight", score: 31100, color: "#CD7F32" },
];

export default function GamesPage() {
  const { user, gameScores, questProgress, questClaimed } = useApp();
  const dailyQuests = getDailyQuests();
  const questsDone = dailyQuests.filter(q => questClaimed.includes(q.id)).length;
  const totalPlayers = GAMES.reduce((s, g) => s + (g.players ?? 0), 0);

  // Live ticker state
  const [liveIdx, setLiveIdx] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);

  // Featured daily challenge game — stored in state so it doesn't re-randomise on re-render
  const [featuredGame] = useState<Game>(
    () => HOT_GAMES[Math.floor(Math.random() * HOT_GAMES.length)]
  );

  // Auto-advance ticker every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => {
        setLiveIdx(i => (i + 1) % LIVE_ACTIVITY.length);
        setTickerVisible(true);
      }, 250);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const featuredScore = gameScores[featuredGame.id as keyof typeof gameScores] ?? 0;
  const featuredCompleted = featuredScore > 0;

  return (
    <div style={{ background: "#080808", minHeight: "100dvh", color: "#fff" }}>

      {/* ── Ambient glow ──────────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, left: "10%", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, #c8ff0007 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 300, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #ff2d8d05 0%, transparent 70%)" }} />
      </div>

      {/* ── Sticky Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "rgba(8,8,8,0.96)", backdropFilter: "blur(14px)", borderBottom: "2px solid #c8ff0033" }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "#fff", lineHeight: 1 }}>
                🕹️ <span style={{ color: "#c8ff00" }}>ARCADE</span>
              </h1>
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff2d8d", boxShadow: "0 0 8px #ff2d8d" }}
              />
            </div>
            <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={10} color="#555" />
              {totalPlayers} LIVE NOW · {GAMES.length} GAMES · EARN REAL KARMA
            </div>
          </div>

          <motion.div
            animate={{ boxShadow: ["0 0 12px #c8ff0033", "0 0 24px #c8ff0066", "0 0 12px #c8ff0033"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              background: "linear-gradient(135deg, #1a1a00, #0d1400)",
              border: "2px solid #c8ff0066", borderRadius: 14,
              padding: "8px 14px", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Zap size={15} color="#c8ff00" fill="#c8ff00" />
            <span style={{ fontSize: 16, fontWeight: 900, color: "#c8ff00" }}>{user.karma.toLocaleString()}</span>
          </motion.div>
        </div>

        {/* ── Live Activity Ticker ───────────────────────────────────────────── */}
        <div style={{ marginTop: 8, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {tickerVisible && (
              <motion.div
                key={liveIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#111", border: "1px solid #1a1a1a",
                  borderRadius: 20, padding: "5px 10px",
                }}
              >
                <span style={{ fontSize: 13 }}>{LIVE_ACTIVITY[liveIdx].emoji}</span>
                <span style={{ fontSize: 10, color: "#888", fontWeight: 700 }}>@{LIVE_ACTIVITY[liveIdx].user}</span>
                <span style={{ fontSize: 10, color: "#444", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {" "}{LIVE_ACTIVITY[liveIdx].action}
                </span>
                <span style={{ fontSize: 10, fontWeight: 900, color: "#c8ff00", flexShrink: 0 }}>
                  +{LIVE_ACTIVITY[liveIdx].karma}⚡
                </span>
                <span style={{ fontSize: 9, color: "#333", flexShrink: 0 }}>{LIVE_ACTIVITY[liveIdx].ago}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3" style={{ position: "relative", zIndex: 1 }}>

        {/* ── Featured Daily Challenge Banner ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href={featuredGame.href} style={{ textDecoration: "none" }}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              animate={{
                boxShadow: [
                  `0 0 24px ${featuredGame.accent}22`,
                  `0 0 48px ${featuredGame.accent}44`,
                  `0 0 24px ${featuredGame.accent}22`,
                ],
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{
                background: `linear-gradient(135deg, ${featuredGame.bg}, #0a0a0a 60%, ${featuredGame.accent}0a)`,
                border: `3px solid ${featuredGame.accent}`,
                borderRadius: 20,
                padding: "20px 18px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Background glow sweep */}
              <div style={{
                position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
                background: `linear-gradient(90deg, transparent, ${featuredGame.accent}06)`,
                pointerEvents: "none",
              }} />

              {/* Top chip */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <motion.div
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: featuredGame.accent, color: "#000",
                    fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
                    padding: "4px 10px", borderRadius: 20,
                  }}
                >
                  <Zap size={9} fill="#000" color="#000" />
                  DAILY CHALLENGE
                </motion.div>
                {featuredCompleted ? (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e" }}>✓ COMPLETED</span>
                ) : (
                  <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>resets at midnight</span>
                )}
              </div>

              {/* Main content row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Big emoji */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                  style={{ fontSize: "5rem", lineHeight: 1, flexShrink: 0 }}
                >
                  {featuredGame.emoji}
                </motion.div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 2 }}>
                    {featuredGame.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 10, lineHeight: 1.4 }}>
                    {featuredGame.tagline}
                  </div>

                  {/* Bonus reward row */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: `${featuredGame.accent}18`, border: `1px solid ${featuredGame.accent}44`,
                    borderRadius: 10, padding: "5px 10px", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#888", letterSpacing: "0.06em" }}>BONUS:</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: featuredGame.accent }}>+50 KARMA today</span>
                  </div>

                  {/* Play Now button */}
                  <div>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: featuredCompleted ? "#22c55e" : featuredGame.accent,
                        color: "#000", fontSize: 12, fontWeight: 900,
                        padding: "8px 18px", borderRadius: 10, letterSpacing: "0.04em",
                      }}
                    >
                      {featuredCompleted ? "✓ PLAY AGAIN →" : "PLAY NOW →"}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Spin Wheel ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <SpinWheel />
        </motion.div>

        {/* ── KARMA POT teaser ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/karma-pot" style={{ textDecoration: "none" }}>
            <motion.div
              whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: ["0 0 20px #c8ff0011", "0 0 40px #c8ff0022", "0 0 20px #c8ff0011"] }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{
                background: "linear-gradient(135deg, #0f1a00, #0a0a0a)",
                border: "2px solid #c8ff0055", borderRadius: 20, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Prize glow */}
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: "100%", background: "linear-gradient(90deg, transparent, #c8ff0008)", pointerEvents: "none" }} />

              <motion.div
                animate={{ scale: [1, 1.12, 1], rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                style={{ fontSize: "2.2rem", flexShrink: 0 }}
              >💰</motion.div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#c8ff00" }}>KARMA POTTEN</span>
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ fontSize: 9, fontWeight: 800, background: "#ff2d8d", color: "#fff", padding: "2px 6px", borderRadius: 4 }}
                  >LIVE 🔴</motion.span>
                </div>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Spela → tjäna biljetter → vinn riktiga pengar</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#ff6b35" }}>Daglig: 249 kr · Vecka: 1 249 kr</div>
              </div>
              <div style={{ color: "#c8ff00", fontSize: 20, flexShrink: 0 }}>→</div>
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Daily Quests ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/quests" style={{ textDecoration: "none" }}>
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                background: "linear-gradient(135deg, #0d1a00, #111)",
                border: "2px solid #c8ff0066", borderRadius: 20, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
                boxShadow: "0 0 20px #c8ff0011",
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "#c8ff0018", border: "2px solid #c8ff0055",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
              }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>DAILY QUESTS</span>
                  {questsDone < dailyQuests.length && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: "#ff2d8d", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
                      {dailyQuests.length - questsDone} LEFT
                    </span>
                  )}
                  {questsDone === dailyQuests.length && (
                    <span style={{ fontSize: 9, fontWeight: 700, background: "#c8ff00", color: "#000", padding: "2px 6px", borderRadius: 4 }}>COMPLETE ✅</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>Complete quests for huge karma bonuses</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  {/* Mini progress dots */}
                  {dailyQuests.map((q) => (
                    <div key={q.id} style={{
                      width: 20, height: 4, borderRadius: 2,
                      background: questClaimed.includes(q.id) ? "#c8ff00" : "#222",
                    }} />
                  ))}
                  <span style={{ fontSize: 10, color: "#c8ff00", fontWeight: 700, marginLeft: 4 }}>
                    {questsDone}/{dailyQuests.length} · +1000 ⚡ bonus
                  </span>
                </div>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#c8ff0022", border: "1.5px solid #c8ff0044", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>→</div>
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Section header ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
          <Flame size={14} color="#ff6b35" fill="#ff6b35" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.1em" }}>ALL GAMES</span>
          <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
          <span style={{ fontSize: 10, color: "#333", fontWeight: 600 }}>{GAMES.length} total</span>
        </div>

        {/* ── Game cards ──────────────────────────────────────────────────────── */}
        {GAMES.map((g, i) => {
          const score = gameScores[g.id as keyof typeof gameScores] ?? 0;
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={g.href} style={{ textDecoration: "none" }}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: g.bg,
                    border: `2px solid ${g.accent}44`,
                    borderRadius: 20, padding: "14px 14px",
                    display: "flex", alignItems: "center", gap: 12,
                    position: "relative", overflow: "hidden",
                    boxShadow: g.hot ? `0 0 24px ${g.accent}11` : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Background gradient accent */}
                  <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: "100%", background: `linear-gradient(90deg, transparent, ${g.accent}08)`, pointerEvents: "none" }} />

                  {/* Game icon */}
                  <motion.div
                    animate={g.hot ? { boxShadow: [`0 0 8px ${g.accent}22`, `0 0 20px ${g.accent}44`, `0 0 8px ${g.accent}22`] } : {}}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    style={{
                      width: 54, height: 54, borderRadius: 16, flexShrink: 0,
                      background: `${g.accent}18`, border: `2px solid ${g.accent}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.8rem",
                    }}
                  >
                    {g.emoji}
                  </motion.div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{g.name}</span>
                      {g.tag && (
                        <span style={{ fontSize: 8, fontWeight: 800, background: g.accent, color: "#000", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>
                          {g.tag}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#444", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {g.tagline}
                    </div>
                    {/* Personal best pill */}
                    {score > 0 && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          background: `${g.accent}18`, border: `1px solid ${g.accent}44`,
                          color: g.accent, padding: "2px 7px", borderRadius: 20,
                          letterSpacing: "0.04em",
                        }}>
                          🏆 PB: {score}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: g.accent, opacity: 0.9 }}>{g.reward}</span>
                      {g.players && (
                        <span style={{ fontSize: 9, color: "#333", display: "flex", alignItems: "center", gap: 2 }}>
                          <Users size={8} color="#333" /> {g.players}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    {score > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: g.accent, display: "flex", alignItems: "center", gap: 2 }}>
                        <Trophy size={9} color={g.accent} /> {score}
                      </span>
                    )}
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `${g.accent}22`, border: `1.5px solid ${g.accent}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1rem", color: g.accent,
                    }}>→</div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}

        {/* ── Daily Challenge mini tracker ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div style={{
            background: "linear-gradient(135deg, #0a2000, #111)",
            border: "2px solid #c8ff0066", borderRadius: 20, padding: "16px",
            boxShadow: "0 0 24px #c8ff0011",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={14} color="#c8ff00" fill="#c8ff00" />
                <span style={{ fontSize: 12, fontWeight: 900, color: "#c8ff00", letterSpacing: "0.08em" }}>DAILY CHALLENGE</span>
              </div>
              <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>Play 3 games → +500 ⚡</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["fishing", "cases", "breaker"].map(id => {
                const g = GAMES.find(x => x.id === id)!;
                const done = (gameScores[id as keyof typeof gameScores] ?? 0) > 0;
                return (
                  <div key={id} style={{
                    flex: 1, padding: "10px 4px", borderRadius: 12, textAlign: "center",
                    background: done ? `${g.accent}22` : "#111",
                    border: `1.5px solid ${done ? g.accent : "#222"}`,
                    boxShadow: done ? `0 0 12px ${g.accent}22` : "none",
                    transition: "all 0.3s",
                  }}>
                    <div style={{ fontSize: "1.3rem", marginBottom: 2 }}>{done ? "✅" : g.emoji}</div>
                    <div style={{ fontSize: 9, color: done ? g.accent : "#333", fontWeight: 800, letterSpacing: "0.04em" }}>
                      {g.name.split(" ")[0]}
                    </div>
                  </div>
                );
              })}
              <div style={{ flex: 1, padding: "10px 4px", borderRadius: 12, textAlign: "center", background: "#c8ff0011", border: "1.5px solid #c8ff0033" }}>
                <div style={{ fontSize: "1.3rem", marginBottom: 2 }}>🎁</div>
                <div style={{ fontSize: 9, color: "#c8ff00", fontWeight: 800 }}>+500 ⚡</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Weekly Leaderboard Teaser ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div style={{
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderRadius: 16, padding: "16px",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} color="#FFD700" fill="#FFD700" />
                <span style={{ fontSize: 12, fontWeight: 900, color: "#fff", letterSpacing: "0.08em" }}>WEEKLY LEADERBOARD</span>
              </div>
              <Link href="/social" style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 10, color: "#c8ff00", fontWeight: 700, letterSpacing: "0.04em" }}>View all →</span>
              </Link>
            </div>

            {/* Top 3 rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {LEADERBOARD.map((player, idx) => (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + idx * 0.07 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: idx === 0 ? "#1a1500" : "#111",
                    border: `1px solid ${idx === 0 ? "#FFD70033" : "#1a1a1a"}`,
                    borderRadius: 10, padding: "9px 12px",
                  }}
                >
                  {/* Rank badge */}
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: `${player.color}22`, border: `1.5px solid ${player.color}66`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 900, color: player.color,
                  }}>
                    {player.rank}
                  </div>

                  {/* Username */}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: idx === 0 ? "#FFD700" : "#ccc" }}>
                    @{player.name}
                  </span>

                  {/* Score */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Zap size={10} color={player.color} fill={player.color} />
                    <span style={{ fontSize: 12, fontWeight: 900, color: player.color }}>
                      {player.score.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── KARMA TV CTA ─────────────────────────────────────────────── */}
        <Link href="/karma-tv" style={{ textDecoration: "none", display: "block" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #1a0010 0%, #0d001a 50%, #050020 100%)",
              border: "2px solid #ff2d8d",
              borderRadius: 20, padding: "20px 18px",
              display: "flex", alignItems: "center", gap: 14,
              marginBottom: 8,
              boxShadow: "0 0 30px #ff2d8d22",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: "2.5rem" }}
            >
              📺
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", marginBottom: 3 }}>
                KARMA TV <span style={{ fontSize: "0.65rem", color: "#ff2d8d", letterSpacing: "0.1em", background: "#ff2d8d22", borderRadius: 8, padding: "2px 6px" }}>LIVE</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#888", lineHeight: 1.4 }}>
                Watch & react to the hottest pet moments. Duel strangers. Go viral.
              </div>
            </div>
            <div style={{ fontSize: "1.2rem", color: "#ff2d8d" }}>→</div>
          </motion.div>
        </Link>

      </div>
    </div>
  );
}
