"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import SpinWheel from "@/components/ui/SpinWheel";
import { Zap, Users, Trophy } from "lucide-react";
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

type FilterKey = "ALL" | "HOT" | "NEW" | "RANKED" | "EARN";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "ALL",    label: "ALL" },
  { key: "HOT",    label: "🔥 HOT" },
  { key: "NEW",    label: "⭐ NEW" },
  { key: "RANKED", label: "🏆 RANKED" },
  { key: "EARN",   label: "💰 EARN" },
];

function filterGames(games: Game[], filter: FilterKey): Game[] {
  switch (filter) {
    case "HOT":    return games.filter(g => g.hot === true);
    case "NEW":    return games.filter(g => g.tag?.includes("NEW") || g.tag?.includes("NY"));
    case "RANKED": return [...games].sort((a, b) => (b.players ?? 0) - (a.players ?? 0));
    case "EARN":   return [...games].sort((a, b) => (b.players ?? 0) - (a.players ?? 0));
    default:       return games;
  }
}

export default function GamesPage() {
  const { user, gameScores } = useApp();
  const totalPlayers = GAMES.reduce((s, g) => s + (g.players ?? 0), 0);

  const [liveIdx, setLiveIdx] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [gameFilter, setGameFilter] = useState<FilterKey>("ALL");
  const [gameCat, setGameCat] = useState("ALL");

  const [featuredGame] = useState<Game>(
    () => HOT_GAMES[Math.floor(Math.random() * HOT_GAMES.length)]
  );

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

  const filteredGames = filterGames(GAMES, gameFilter);
  const heroGame = filteredGames[0];
  const gridGames = filteredGames.slice(1);

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

        {/* Tournament banner */}
        <Link href="/games/battle" style={{ textDecoration: "none", display: "block", margin: "0 0 0px" }}>
          <motion.div
            animate={{ boxShadow: ["0 0 20px #ff2d8d22", "0 0 40px #ff2d8d66", "0 0 20px #ff2d8d22"] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: "linear-gradient(135deg, #1a0010, #0a0a0a)",
              border: "2.5px solid #ff2d8d",
              borderRadius: 18, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: "2.5rem", flexShrink: 0 }}
            >🏆</motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff2d8d", boxShadow: "0 0 6px #ff2d8d" }}
                />
                <span style={{ fontSize: 9, fontWeight: 900, color: "#ff2d8d", letterSpacing: "0.15em" }}>LIVE TOURNAMENT</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>KARMA DEFENSE WARS</div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>147 players · Prize: 500 karma</div>
            </div>
            <div style={{ background: "#ff2d8d", color: "#fff", fontWeight: 900, fontSize: 11, borderRadius: 10, padding: "7px 13px" }}>JOIN →</div>
          </motion.div>
        </Link>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 8, paddingLeft: 0, paddingRight: 0, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" as const }}>
          {(["ALL", "⚔️ BATTLE", "🧠 BRAIN", "🎰 LUCK", "🏃 ACTION"] as const).map(cat => (
            <button key={cat} onClick={() => setGameCat(cat)} style={{
              flexShrink: 0, padding: "6px 14px",
              background: gameCat === cat ? "#c8ff00" : "#111",
              border: `2px solid ${gameCat === cat ? "#c8ff00" : "#222"}`,
              borderRadius: 10, fontSize: 11, fontWeight: 800,
              color: gameCat === cat ? "#000" : "#555",
              cursor: "pointer", fontFamily: "inherit",
            }}>{cat}</button>
          ))}
        </div>

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
                padding: "14px 18px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
                background: `linear-gradient(90deg, transparent, ${featuredGame.accent}06)`,
                pointerEvents: "none",
              }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
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

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                  style={{ fontSize: "3rem", lineHeight: 1, flexShrink: 0 }}
                >
                  {featuredGame.emoji}
                </motion.div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 2 }}>
                    {featuredGame.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 8, lineHeight: 1.4 }}>
                    {featuredGame.tagline}
                  </div>

                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: `${featuredGame.accent}18`, border: `1px solid ${featuredGame.accent}44`,
                    borderRadius: 10, padding: "4px 10px", marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#888", letterSpacing: "0.06em" }}>BONUS:</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: featuredGame.accent }}>+50 KARMA today</span>
                  </div>

                  <div>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: featuredCompleted ? "#22c55e" : featuredGame.accent,
                        color: "#000", fontSize: 12, fontWeight: 900,
                        padding: "7px 16px", borderRadius: 10, letterSpacing: "0.04em",
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

        {/* ── Live Stats Bar ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ display: "flex", gap: 8 }}
        >
          {[
            { emoji: "👾", label: "LIVE",   value: String(totalPlayers) },
            { emoji: "🏆", label: "TODAY",  value: "48.2K ⚡" },
            { emoji: "🔥", label: "STREAK", value: `${user.streak}d` },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                background: "#111",
                border: "1px solid #1a1a1a",
                borderRadius: 14,
                padding: "10px 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{stat.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{stat.value}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "0.08em" }}>{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Category Filter Tabs ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
            padding: "2px 0",
          }}
        >
          {FILTER_TABS.map((tab) => {
            const selected = gameFilter === tab.key;
            return (
              <motion.button
                key={tab.key}
                onClick={() => setGameFilter(tab.key)}
                whileTap={{ scale: 0.93 }}
                style={{
                  flexShrink: 0,
                  background: selected ? "#c8ff00" : "#1a1a1a",
                  color: selected ? "#000" : "#666",
                  border: selected ? "2px solid #c8ff00" : "2px solid #222",
                  borderRadius: 999,
                  padding: "6px 16px",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                  boxShadow: selected ? "0 0 14px #c8ff0066" : "none",
                  transition: "all 0.18s",
                  outline: "none",
                }}
              >
                {tab.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Premium Card Grid ────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={gameFilter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {/* HERO CARD — first game in filtered list */}
            {heroGame && (
              <Link href={heroGame.href} style={{ textDecoration: "none", display: "block", marginBottom: 8 }}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  animate={{
                    boxShadow: [
                      `0 0 20px ${heroGame.accent}22`,
                      `0 0 40px ${heroGame.accent}44`,
                      `0 0 20px ${heroGame.accent}22`,
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2.8 }}
                  style={{
                    height: 140,
                    borderRadius: 20,
                    border: `2px solid ${heroGame.accent}`,
                    background: `linear-gradient(135deg, ${heroGame.bg} 0%, #0a0a0a 55%, ${heroGame.accent}12 100%)`,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 20px",
                    gap: 18,
                  }}
                >
                  {/* Background sweep */}
                  <div style={{
                    position: "absolute", top: 0, right: 0, width: "45%", height: "100%",
                    background: `linear-gradient(90deg, transparent, ${heroGame.accent}09)`,
                    pointerEvents: "none",
                  }} />

                  {/* Tag badge */}
                  {heroGame.tag && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      fontSize: 8, fontWeight: 900,
                      background: heroGame.accent, color: "#000",
                      padding: "3px 7px", borderRadius: 6,
                      letterSpacing: "0.06em", zIndex: 2,
                    }}>
                      {heroGame.tag}
                    </div>
                  )}

                  {/* Big emoji left */}
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 0.8 }}
                    style={{ fontSize: "5rem", lineHeight: 1, flexShrink: 0, filter: `drop-shadow(0 0 18px ${heroGame.accent}88)` }}
                  >
                    {heroGame.emoji}
                  </motion.div>

                  {/* Text right */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 3 }}>
                      {heroGame.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.35, marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {heroGame.tagline}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: `${heroGame.accent}22`, border: `1px solid ${heroGame.accent}55`,
                        borderRadius: 8, padding: "3px 8px",
                        fontSize: 10, fontWeight: 800, color: heroGame.accent,
                      }}>
                        ⚡ {heroGame.reward}
                      </div>
                      <div style={{
                        display: "inline-flex", alignItems: "center",
                        background: heroGame.accent, color: "#000",
                        fontSize: 11, fontWeight: 900,
                        padding: "5px 12px", borderRadius: 8,
                      }}>
                        PLAY →
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )}

            {/* 2-column grid for the rest */}
            {gridGames.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {gridGames.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, scale: 0.93 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link href={g.href} style={{ textDecoration: "none", display: "block" }}>
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        animate={g.hot ? { boxShadow: [`0 0 0px ${g.accent}00`, `0 0 18px ${g.accent}55`, `0 0 0px ${g.accent}00`] } : {}}
                        transition={g.hot ? { repeat: Infinity, duration: 2.5 } : {}}
                        style={{
                          height: 148,
                          background: `linear-gradient(160deg, ${g.bg} 0%, #0a0a0a 70%, ${g.accent}08 100%)`,
                          border: `2px solid ${g.hot ? g.accent : g.accent+"66"}`,
                          borderRadius: 18,
                          position: "relative",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "10px 8px 28px",
                          gap: 3,
                        }}
                      >
                        {/* Background glow */}
                        <div style={{
                          position: "absolute", inset: 0,
                          background: `radial-gradient(ellipse at 50% 20%, ${g.accent}10 0%, transparent 65%)`,
                          pointerEvents: "none",
                        }} />

                        {/* Tag badge top-right */}
                        {g.tag && (
                          <div style={{
                            position: "absolute", top: 7, right: 7,
                            fontSize: 7, fontWeight: 900,
                            background: g.accent, color: "#000",
                            padding: "2px 6px", borderRadius: 4,
                            letterSpacing: "0.04em", zIndex: 2,
                          }}>
                            {g.tag}
                          </div>
                        )}

                        {/* Bottom bar: players + arrow */}
                        <div style={{
                          position: "absolute", bottom: 0, left: 0, right: 0,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: `${g.accent}12`, borderTop: `1px solid ${g.accent}30`,
                          padding: "5px 10px",
                        }}>
                          <span style={{ fontSize: 9, color: g.accent+"99", fontWeight: 700 }}>👤 {g.players} live</span>
                          <span style={{ fontSize: 12, color: g.accent, fontWeight: 900 }}>PLAY →</span>
                        </div>

                        {/* Emoji */}
                        <div style={{
                          fontSize: "3.2rem", lineHeight: 1,
                          filter: `drop-shadow(0 0 14px ${g.accent}77)`,
                        }}>
                          {g.emoji}
                        </div>

                        {/* Name */}
                        <div style={{
                          fontSize: 12, fontWeight: 900, color: "#fff",
                          letterSpacing: "-0.01em", textAlign: "center",
                          lineHeight: 1.1,
                        }}>
                          {g.name}
                        </div>

                        {/* Reward chip */}
                        <div style={{
                          fontSize: 9, fontWeight: 800, color: g.accent,
                          background: `${g.accent}18`, border: `1px solid ${g.accent}44`,
                          borderRadius: 6, padding: "2px 7px", textAlign: "center",
                        }}>
                          {g.reward}
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {filteredGames.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#444", fontSize: 13, fontWeight: 700 }}>
                No games in this category yet.
              </div>
            )}
          </motion.div>
        </AnimatePresence>

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
                border: "2px solid #c8ff0055", borderRadius: 16, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 12,
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: "100%", background: "linear-gradient(90deg, transparent, #c8ff0008)", pointerEvents: "none" }} />

              <motion.div
                animate={{ scale: [1, 1.12, 1], rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                style={{ fontSize: "1.8rem", flexShrink: 0 }}
              >💰</motion.div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#c8ff00" }}>KARMA POTTEN</span>
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ fontSize: 9, fontWeight: 800, background: "#ff2d8d", color: "#fff", padding: "2px 6px", borderRadius: 4 }}
                  >LIVE 🔴</motion.span>
                </div>
                <div style={{ fontSize: 10, color: "#555" }}>Spela → tjäna biljetter → vinn riktiga pengar</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#ff6b35" }}>Daglig: 249 kr · Vecka: 1 249 kr</div>
              </div>
              <div style={{ color: "#c8ff00", fontSize: 18, flexShrink: 0 }}>→</div>
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Weekly Leaderboard Teaser ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div style={{
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderRadius: 14, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} color="#FFD700" fill="#FFD700" />
                <span style={{ fontSize: 12, fontWeight: 900, color: "#fff", letterSpacing: "0.08em" }}>WEEKLY LEADERBOARD</span>
              </div>
              <Link href="/social" style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 10, color: "#c8ff00", fontWeight: 700, letterSpacing: "0.04em" }}>View all →</span>
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LEADERBOARD.map((player, idx) => (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + idx * 0.07 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: idx === 0 ? "#1a1500" : "#111",
                    border: `1px solid ${idx === 0 ? "#FFD70033" : "#1a1a1a"}`,
                    borderRadius: 10, padding: "8px 10px",
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: `${player.color}22`, border: `1.5px solid ${player.color}66`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 900, color: player.color,
                  }}>
                    {player.rank}
                  </div>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: idx === 0 ? "#FFD700" : "#ccc" }}>
                    @{player.name}
                  </span>
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
            transition={{ delay: 0.65 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #1a0010 0%, #0d001a 50%, #050020 100%)",
              border: "2px solid #ff2d8d",
              borderRadius: 16, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
              marginBottom: 8,
              boxShadow: "0 0 30px #ff2d8d22",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: "2rem" }}
            >
              📺
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#fff", marginBottom: 2 }}>
                KARMA TV <span style={{ fontSize: "0.65rem", color: "#ff2d8d", letterSpacing: "0.1em", background: "#ff2d8d22", borderRadius: 8, padding: "2px 6px" }}>LIVE</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.4 }}>
                Watch & react to the hottest pet moments. Duel strangers. Go viral.
              </div>
            </div>
            <div style={{ fontSize: "1.1rem", color: "#ff2d8d" }}>→</div>
          </motion.div>
        </Link>

      </div>
    </div>
  );
}
