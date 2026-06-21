"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { calculateLevel } from "@/lib/xp-system";

// ─── Event Engine ─────────────────────────────────────────────────────────────
const EVENTS = [
  {
    id: "surge", name: "KARMA SURGE", emoji: "⚡", tagline: "ALL karma sources = 2× tonight!",
    color: "#c8ff00", glow: "#c8ff0055", bg: "linear-gradient(160deg, #0d1400 0%, #1a2800 60%, #0d1400 100%)",
    headerBg: "linear-gradient(135deg, #c8ff0022, #88ff0011)",
    multiplier: 2, type: "all",
    bonusKarma: 150, bonusXP: 75,
    description: "Every action gives double karma. Feed your pet, play games, complete bounties — all 2×.",
  },
  {
    id: "bounty", name: "BOUNTY STORM", emoji: "🎯", tagline: "Bounty rewards = 3× — hunt NOW!",
    color: "#00ff88", glow: "#00ff8855", bg: "linear-gradient(160deg, #001a00 0%, #003300 60%, #001a00 100%)",
    headerBg: "linear-gradient(135deg, #00ff8822, #00cc6611)",
    multiplier: 3, type: "bounties",
    bonusKarma: 200, bonusXP: 100,
    description: "Complete any bounty for triple the karma reward. Real-world actions pay off big.",
  },
  {
    id: "pet", name: "PET PARADISE", emoji: "🐾", tagline: "Pet XP = 5× + needs never drop!",
    color: "#ff2d8d", glow: "#ff2d8d55", bg: "linear-gradient(160deg, #1a0010 0%, #2d0020 60%, #1a0010 100%)",
    headerBg: "linear-gradient(135deg, #ff2d8d22, #cc007011)",
    multiplier: 5, type: "pet",
    bonusKarma: 100, bonusXP: 150,
    description: "Your pet earns 5× XP from every interaction. Bond level grows faster. Happiness locked at 100.",
  },
  {
    id: "battle", name: "BATTLE ROYALE", emoji: "⚔️", tagline: "Win any game = +500 bonus karma!",
    color: "#ff6b35", glow: "#ff6b3555", bg: "linear-gradient(160deg, #1a0800 0%, #2d1200 60%, #1a0800 100%)",
    headerBg: "linear-gradient(135deg, #ff6b3522, #cc330011)",
    multiplier: 1, type: "games",
    bonusKarma: 250, bonusXP: 125,
    description: "Win any game during this event and instantly earn +500 bonus karma on top of your score.",
  },
  {
    id: "mystery", name: "MYSTERY DROP", emoji: "🎁", tagline: "Surprise drops every 2 minutes!",
    color: "#a855f7", glow: "#a855f755", bg: "linear-gradient(160deg, #0d0020 0%, #1a0040 60%, #0d0020 100%)",
    headerBg: "linear-gradient(135deg, #a855f722, #66007711)",
    multiplier: 1, type: "mystery",
    bonusKarma: 300, bonusXP: 50,
    description: "Random karma drops land on random players every 2 minutes. Stay in-app to catch them.",
  },
];

const LEADERBOARD_NAMES = [
  { u: "tradeknight", e: "⚔️" }, { u: "lunavibes", e: "🌙" }, { u: "pixelrush", e: "🎮" },
  { u: "neonmiku", e: "✨" }, { u: "voltfox", e: "🦊" }, { u: "dragon99", e: "🐉" },
  { u: "zara.q", e: "💫" }, { u: "moonkid", e: "🌙" },
];

const EVENT_INTERVAL = 30 * 60; // 30 minutes in seconds

function getEventState() {
  const nowSec = Math.floor(Date.now() / 1000);
  const slot = Math.floor(nowSec / EVENT_INTERVAL);
  const eventIdx = slot % EVENTS.length;
  const secondsInSlot = nowSec % EVENT_INTERVAL;
  const secondsLeft = EVENT_INTERVAL - secondsInSlot;
  const nextIdx = (eventIdx + 1) % EVENTS.length;
  return { event: EVENTS[eventIdx], nextEvent: EVENTS[nextIdx], secondsLeft };
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Mystery Drop ─────────────────────────────────────────────────────────────
function MysteryDrop({ color, onDismiss }: { color: string; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -60 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
      style={{
        position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
        zIndex: 9000, background: "#0d0d0d", border: `2.5px solid ${color}`,
        borderRadius: 20, padding: "14px 24px",
        boxShadow: `0 0 40px ${color}88, 0 8px 32px rgba(0,0,0,0.8)`,
        display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap",
      }}
    >
      <motion.span animate={{ rotate: [0, -20, 20, 0], scale: [1, 1.3, 1] }} transition={{ duration: 0.6 }} style={{ fontSize: "2rem" }}>🎁</motion.span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color }}>MYSTERY DROP!</div>
        <div style={{ fontSize: 12, color: "#ccc" }}>+{Math.floor(Math.random() * 80 + 20)} karma landed on you!</div>
      </div>
    </motion.div>
  );
}

// ─── Particle Ring ────────────────────────────────────────────────────────────
function ParticleRing({ color, joined }: { color: string; joined: boolean }) {
  const PARTICLES = 12;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: PARTICLES }).map((_, i) => (
        <motion.div
          key={i}
          animate={joined
            ? { opacity: [0, 1, 0], scale: [0.5, 1.2, 0], x: Math.cos((i / PARTICLES) * Math.PI * 2) * 80, y: Math.sin((i / PARTICLES) * Math.PI * 2) * 80 }
            : { opacity: [0.3, 0.7, 0.3] }
          }
          transition={joined
            ? { duration: 1.2, delay: i * 0.05, ease: "easeOut" }
            : { duration: 2 + i * 0.2, repeat: Infinity, delay: i * 0.15 }
          }
          style={{
            position: "absolute", left: "50%", top: "50%",
            width: 6, height: 6, borderRadius: "50%",
            background: color, marginLeft: -3, marginTop: -3,
          }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EventPage() {
  const { user, addKarma, addXP, showToast } = useApp();
  const level = calculateLevel(user.xp);

  const [{ event, nextEvent, secondsLeft }, setEventState] = useState(getEventState);
  const [joined, setJoined] = useState(false);
  const [joinedEventId, setJoinedEventId] = useState<string | null>(null);
  const [myEarned, setMyEarned] = useState(0);
  const [globalEarned, setGlobalEarned] = useState(() => Math.floor(Math.random() * 40000 + 20000));
  const [players, setPlayers] = useState(() => Math.floor(Math.random() * 1800 + 600));
  const [showDrop, setShowDrop] = useState(false);
  const [leaderboard, setLeaderboard] = useState(() =>
    LEADERBOARD_NAMES.slice(0, 7).map((n, i) => ({
      ...n, karma: Math.floor(Math.random() * 2000 + 500) - i * 200, isMe: false,
    })).sort((a, b) => b.karma - a.karma)
  );
  const [pastEvents, setPastEvents] = useState<{ name: string; emoji: string; earned: number }[]>([]);
  const mysteryDropRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick countdown + refresh event state
  useEffect(() => {
    const tick = () => setEventState(getEventState());
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate live players & global karma ticking up
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalEarned(v => v + Math.floor(Math.random() * 180 + 40));
      setPlayers(v => v + Math.floor(Math.random() * 5) - 2);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Reset join state when event changes
  useEffect(() => {
    if (joinedEventId && joinedEventId !== event.id) {
      setJoined(false);
      if (myEarned > 0) {
        setPastEvents(prev => [{ name: event.name, emoji: event.emoji, earned: myEarned }, ...prev.slice(0, 4)]);
        setMyEarned(0);
      }
    }
  }, [event.id, joinedEventId, myEarned]);

  // Mystery drop timer
  useEffect(() => {
    if (joined && event.id === "mystery") {
      mysteryDropRef.current = setInterval(() => {
        const karma = Math.floor(Math.random() * 80 + 20);
        setShowDrop(true);
        addKarma(karma, "Mystery Drop");
        setMyEarned(v => v + karma);
        setTimeout(() => setShowDrop(false), 3600);
      }, 25000); // Every 25s for demo (25min IRL)
    }
    return () => { if (mysteryDropRef.current) clearInterval(mysteryDropRef.current); };
  }, [joined, event.id, addKarma]);

  const handleJoin = useCallback(() => {
    if (joined) return;
    setJoined(true);
    setJoinedEventId(event.id);
    addKarma(event.bonusKarma, `${event.name} join bonus`);
    addXP(event.bonusXP);
    setMyEarned(event.bonusKarma);
    setLeaderboard(prev => {
      const sorted = [...prev, { u: user.username, e: user.avatarEmoji, karma: event.bonusKarma, isMe: true }]
        .sort((a, b) => b.karma - a.karma);
      return sorted;
    });
    showToast(`${event.emoji} ${event.name} — JOINED! +${event.bonusKarma} karma`, event.bonusKarma, event.color, event.emoji);
  }, [joined, event, addKarma, addXP, user, showToast]);

  const handleCollect = useCallback(() => {
    if (!joined) return;
    const bonus = Math.floor(Math.random() * 80 + 30) * event.multiplier;
    addKarma(bonus, event.name);
    addXP(Math.floor(bonus / 3));
    setMyEarned(v => v + bonus);
    setLeaderboard(prev =>
      prev.map(p => p.isMe ? { ...p, karma: p.karma + bonus } : p).sort((a, b) => b.karma - a.karma)
    );
    showToast(`+${bonus} ⚡ during ${event.emoji} ${event.name}!`, bonus, event.color, event.emoji);
  }, [joined, event, addKarma, addXP, showToast]);

  const urgentSeconds = secondsLeft < 120;
  const myRank = leaderboard.findIndex(p => p.isMe) + 1;

  return (
    <div style={{ background: "#050505", minHeight: "100dvh", color: "#fff", overflowX: "hidden" }}>

      {/* Mystery drop overlay */}
      <AnimatePresence>
        {showDrop && <MysteryDrop color={event.color} onDismiss={() => setShowDrop(false)} />}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ background: "rgba(5,5,5,0.96)", backdropFilter: "blur(12px)", borderBottom: `2px solid ${event.color}44` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
              KARMA <span style={{ color: event.color }}>RUSH</span>
            </h1>
            <motion.div
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff2d8d", boxShadow: "0 0 8px #ff2d8d" }}
            />
          </div>
          <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.08em" }}>
            LIVE GLOBAL EVENTS · {players.toLocaleString()} IN RUSH
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: event.color, background: event.color + "22", border: `1.5px solid ${event.color}55`, borderRadius: 8, padding: "4px 10px", letterSpacing: "0.08em" }}>
          ● LIVE
        </div>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">

        {/* ── EVENT HERO ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: event.bg,
            border: `2.5px solid ${event.color}66`,
            borderRadius: 28, padding: "28px 20px 24px",
            boxShadow: `0 0 60px ${event.glow}, 0 0 120px ${event.glow.replace("55", "22")}`,
            position: "relative", overflow: "hidden", textAlign: "center",
          }}
        >
          {/* Background shimmer */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 1.5 }}
            style={{
              position: "absolute", top: 0, bottom: 0, left: 0, width: "35%",
              background: `linear-gradient(90deg, transparent, ${event.color}08, transparent)`,
              transform: "skewX(-15deg)", pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative" }}>
            {/* Event emoji with particle ring */}
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 100, height: 100, marginBottom: 16 }}>
              <ParticleRing color={event.color} joined={joined} />
              <motion.div
                animate={{ scale: [1, 1.08, 1], filter: [`drop-shadow(0 0 16px ${event.color}88)`, `drop-shadow(0 0 32px ${event.color}cc)`, `drop-shadow(0 0 16px ${event.color}88)`] }}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{ fontSize: "4rem", lineHeight: 1, zIndex: 1 }}
              >
                {event.emoji}
              </motion.div>
            </div>

            {/* Event name */}
            <div style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", marginBottom: 6, textShadow: `0 0 30px ${event.color}66` }}>
              {event.name}
            </div>
            <div style={{ fontSize: 13, color: event.color, fontWeight: 700, marginBottom: 20 }}>
              {event.tagline}
            </div>

            {/* COUNTDOWN */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#555", letterSpacing: "0.1em", marginBottom: 6 }}>ENDS IN</div>
              <motion.div
                animate={urgentSeconds ? { scale: [1, 1.05, 1], color: ["#ff3333", "#ff6b35", "#ff3333"] } : {}}
                transition={{ repeat: Infinity, duration: 0.6 }}
                style={{ fontSize: "3.5rem", fontWeight: 900, letterSpacing: "-0.05em", color: urgentSeconds ? "#ff3333" : event.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(secondsLeft)}
              </motion.div>
              {urgentSeconds && (
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  style={{ fontSize: 12, fontWeight: 800, color: "#ff3333", marginTop: 4 }}
                >
                  ⚠️ ENDING SOON — RUSH!
                </motion.div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: "#00000044", borderRadius: 3, overflow: "hidden", marginBottom: 20 }}>
              <motion.div
                animate={{ width: `${(1 - secondsLeft / EVENT_INTERVAL) * 100}%` }}
                transition={{ duration: 1 }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${event.color}, ${event.color}88)`, borderRadius: 3, boxShadow: `0 0 10px ${event.color}88` }}
              />
            </div>

            {/* JOIN / COLLECT button */}
            {!joined ? (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleJoin}
                style={{
                  width: "100%", padding: "18px",
                  background: `linear-gradient(135deg, ${event.color}, ${event.color}aa)`,
                  border: "3px solid #0a0a0a",
                  borderRadius: 18, fontSize: 17, fontWeight: 900,
                  color: "#0a0a0a", cursor: "pointer", fontFamily: "inherit",
                  boxShadow: `4px 4px 0px #000, 0 0 30px ${event.color}66`,
                  letterSpacing: "0.04em",
                }}
              >
                {event.emoji} JOIN RUSH — +{event.bonusKarma} KARMA FREE
              </motion.button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  background: event.color + "22", border: `2px solid ${event.color}55`,
                  borderRadius: 14, padding: "12px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: event.color }}>✓ YOU&apos;RE IN THE RUSH</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>+{myEarned} ⚡</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCollect}
                  style={{
                    width: "100%", padding: "15px",
                    background: "linear-gradient(135deg, #111, #1a1a1a)",
                    border: `2.5px solid ${event.color}`,
                    borderRadius: 16, fontSize: 15, fontWeight: 800,
                    color: event.color, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: `3px 3px 0px #000, 0 0 20px ${event.color}33`,
                  }}
                >
                  ⚡ COLLECT {event.multiplier > 1 ? `${event.multiplier}× ` : ""}KARMA BONUS
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── LIVE STATS ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { label: "PLAYERS", value: players.toLocaleString(), icon: "👥", color: "#4488ff" },
            { label: "GLOBAL ⚡", value: `${(globalEarned / 1000).toFixed(1)}K`, icon: "⚡", color: event.color },
            { label: "YOUR RANK", value: joined && myRank > 0 ? `#${myRank}` : "—", icon: "🏆", color: "#ffd700" },
          ].map(s => (
            <motion.div
              key={s.label}
              animate={{ borderColor: [s.color + "22", s.color + "55", s.color + "22"] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: Math.random() }}
              style={{ background: "#0d0d0d", border: `2px solid ${s.color}22`, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}
            >
              <div style={{ fontSize: "1.3rem", marginBottom: 3 }}>{s.icon}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#444", letterSpacing: "0.08em" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── LEADERBOARD ─────────────────────────────────────────────────── */}
        <div style={{ background: "#0a0a0a", border: "2px solid #1a1a1a", borderRadius: 22, padding: "18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#444", letterSpacing: "0.1em" }}>🏆 EVENT LEADERBOARD</div>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ fontSize: 10, fontWeight: 700, color: "#ff2d8d", background: "#ff2d8d22", borderRadius: 6, padding: "2px 8px" }}
            >● LIVE</motion.div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leaderboard.slice(0, 8).map((p, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isMe = p.isMe;
              return (
                <motion.div
                  key={p.u}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: isMe ? event.color + "11" : "transparent",
                    border: isMe ? `1.5px solid ${event.color}44` : "1.5px solid transparent",
                    borderRadius: 12, padding: "8px 10px",
                  }}
                >
                  <span style={{ fontSize: i < 3 ? "1.2rem" : "0.9rem", width: 24, textAlign: "center", color: i >= 3 ? "#444" : undefined }}>
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </span>
                  <span style={{ fontSize: "1.2rem" }}>{p.e}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isMe ? event.color : "#ccc" }}>
                    @{p.u} {isMe && <span style={{ fontSize: 10, color: event.color }}>(you)</span>}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: i < 3 ? event.color : "#888" }}>
                    +{p.karma.toLocaleString()} ⚡
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── EVENT DESCRIPTION ───────────────────────────────────────────── */}
        <div style={{ background: "#0a0a0a", border: `2px solid ${event.color}22`, borderRadius: 20, padding: "16px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: event.color, letterSpacing: "0.1em", marginBottom: 8 }}>
            {event.emoji} HOW IT WORKS
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.65 }}>{event.description}</div>
        </div>

        {/* ── NEXT EVENT ──────────────────────────────────────────────────── */}
        <div style={{ background: "#0a0a0a", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 12 }}>NEXT EVENT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: nextEvent.color + "22", border: `2px solid ${nextEvent.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>
              {nextEvent.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: nextEvent.color }}>{nextEvent.name}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{nextEvent.tagline}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: "#444" }}>starts in</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{formatTime(secondsLeft)}</div>
            </div>
          </div>
        </div>

        {/* ── EVENT ROTATION ──────────────────────────────────────────────── */}
        <div style={{ background: "#0a0a0a", border: "2px solid #1a1a1a", borderRadius: 20, padding: "16px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 12 }}>FULL ROTATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EVENTS.map((e, i) => {
              const isCurrent = e.id === event.id;
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isCurrent ? 1 : 0.5 }}>
                  <span style={{ fontSize: "1.2rem" }}>{e.emoji}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: isCurrent ? 800 : 500, color: isCurrent ? e.color : "#666" }}>{e.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? e.color : "#333" }}>{e.multiplier > 1 ? `${e.multiplier}×` : "🎲"}</span>
                  {isCurrent && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      style={{ fontSize: 10, fontWeight: 900, color: e.color }}
                    >NOW</motion.span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PAST EVENTS ─────────────────────────────────────────────────── */}
        {pastEvents.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>YOUR PAST EVENTS</div>
            {pastEvents.map((pe, i) => (
              <div key={i} style={{ background: "#0a0a0a", border: "1.5px solid #1a1a1a", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "1.2rem" }}>{pe.emoji}</span>
                <span style={{ flex: 1, fontSize: 13, color: "#888" }}>{pe.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#c8ff00" }}>+{pe.earned} ⚡</span>
              </div>
            ))}
          </div>
        )}

        {/* ── GAMES CTA ───────────────────────────────────────────────────── */}
        <Link href="/games" style={{ textDecoration: "none" }}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            style={{
              background: "linear-gradient(135deg, #080808, #111)",
              border: `2px solid ${event.color}55`,
              borderRadius: 20, padding: "16px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: `0 0 20px ${event.color}11`,
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: event.color + "22", border: `2px solid ${event.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>
              🕹️
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: event.color }}>PLAY GAMES NOW</div>
              <div style={{ fontSize: 11, color: "#555" }}>All scores count toward event leaderboard</div>
            </div>
            <div style={{ marginLeft: "auto", color: event.color, fontSize: "1.2rem" }}>→</div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
