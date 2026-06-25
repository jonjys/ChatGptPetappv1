"use client";

import { useState, useEffect } from "react";
import { Bell, Zap, Flame, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FeedCard from "@/components/feed/FeedCard";
import StoriesBar from "@/components/feed/StoriesBar";
import { FEED_POSTS } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { formatXP, calculateLevel } from "@/lib/xp-system";
import { getDailyQuests } from "@/lib/quests";
import { getPetEmoji, getMoodEmoji, getPetClassColor } from "@/lib/pet-evolution";

const EVENTS = [
  { id: "surge",  name: "KARMA SURGE",   emoji: "⚡", color: "#c8ff00", tagline: "2× karma on everything" },
  { id: "bounty", name: "BOUNTY STORM",  emoji: "🎯", color: "#00ff88", tagline: "3× bounty rewards" },
  { id: "pet",    name: "PET PARADISE",  emoji: "🐾", color: "#ff2d8d", tagline: "5× pet XP" },
  { id: "battle", name: "BATTLE ROYALE", emoji: "⚔️", color: "#ff6b35", tagline: "+500 bonus on game wins" },
  { id: "mystery",name: "MYSTERY DROP",  emoji: "🎁", color: "#a855f7", tagline: "Random drops every 2min" },
];
const EVENT_INTERVAL = 30 * 60;
function getCurrentEvent() {
  const slot = Math.floor(Date.now() / 1000 / EVENT_INTERVAL);
  return EVENTS[slot % EVENTS.length];
}
function getSecondsLeft() {
  return EVENT_INTERVAL - (Math.floor(Date.now() / 1000) % EVENT_INTERVAL);
}
function fmt(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; }

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
  const { user, pet, petMoodComputed, activities, streak, questClaimed, bondLevel, stamina } = useApp();
  const dailyQuests = getDailyQuests();
  const claimedCount = dailyQuests.filter(q => questClaimed.includes(q.id)).length;
  const petEmoji = pet.skinId?.startsWith("emoji:") ? pet.skinId.slice(6) : getPetEmoji(pet.evolution, pet.class);
  const classColor = getPetClassColor(pet.class);
  const [filter, setFilter]       = useState<Filter>("ALL");
  const [showNotifs, setShowNotifs] = useState(false);
  const level = calculateLevel(user.xp);
  const [liveEvent, setLiveEvent] = useState(getCurrentEvent);
  const [secsLeft, setSecsLeft]   = useState(getSecondsLeft);
  const [displayXP, setDisplayXP] = useState(0);

  useEffect(() => {
    const tick = () => { setLiveEvent(getCurrentEvent()); setSecsLeft(getSecondsLeft()); };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let start = 0;
    const end = user.xp;
    if (end === 0) return;
    const step = Math.ceil(end / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplayXP(end); clearInterval(timer); }
      else setDisplayXP(start);
    }, 20);
    return () => clearInterval(timer);
  }, [user.xp]);

  const posts = filter === "BOUNTIES"
    ? FEED_POSTS.filter((p) => p.type === "bounty_complete" || p.bounty)
    : filter === "NEARBY"
    ? FEED_POSTS.filter((p) => !!p.location)
    : filter === "HOT"
    ? [...FEED_POSTS].sort((a, b) => b.likes - a.likes).slice(0, 5)
    : FEED_POSTS;

  const myActivities = filter === "BOUNTIES" ? [] : activities.slice(0, 8);
  const liveActivities = activities.filter(a => Date.now() - a.timestamp < 3600000).slice(0, 3);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", position: "relative" }}>
      {/* Notification drawer */}
      <AnimatePresence>
        {showNotifs && (
          <>
            {/* Dark overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifs(false)}
              style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,0.6)" }}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
                background: "#0f0f0f",
                border: "2px solid #c8ff0044",
                borderTop: "none", borderRadius: "0 0 20px 20px",
                padding: "16px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 30px #c8ff0011",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", color: "#fff" }}>NOTIFICATIONS</span>
                <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={18} color="#888" />
                </button>
              </div>
              {NOTIFS.map((n, i) => (
                <div key={i} className="flex items-center gap-3 py-2"
                  style={{ borderBottom: i < NOTIFS.length - 1 ? "1px solid #1e1e1e" : "none" }}>
                  <div style={{
                    width: 36, height: 36, background: `${n.color}18`,
                    border: `2px solid ${n.color}`, borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", flexShrink: 0,
                  }}>{n.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{n.text}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "#0a0a0a", borderBottom: "3px solid #111" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {/* Epic gradient KARMA title */}
              <h1 style={{
                fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1,
                background: "linear-gradient(90deg, #c8ff00, #00e5ff, #ff2d8d)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>KARMA</h1>
              {streak >= 2 && (
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{
                    background: "#ff6b35", border: "2px solid #0a0a0a",
                    borderRadius: 8, padding: "2px 8px",
                    display: "flex", alignItems: "center", gap: 4,
                    boxShadow: "0 0 12px #ff6b3566",
                  }}
                >
                  <Flame size={12} color="#fff" fill="#fff" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{streak}d</span>
                </motion.div>
              )}
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#555", letterSpacing: "0.08em" }}>
              REAL-LIFE GAME ENGINE · LV{level}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* XP pill with neon glow */}
            <div className="flex items-center gap-1.5 px-3 py-1.5"
              style={{
                background: "#c8ff00", border: "2.5px solid #0a0a0a",
                borderRadius: 12, boxShadow: "3px 3px 0px #0a0a0a, 0 0 16px #c8ff0066",
              }}>
              <Zap size={14} color="#0a0a0a" fill="#0a0a0a" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0a0a0a" }}>{formatXP(displayXP)} XP</span>
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{
                  width: 40, height: 40,
                  background: showNotifs ? "#1a1a1a" : "#111",
                  border: "2.5px solid #333",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: showNotifs ? "0 0 12px #c8ff0044" : "none",
                  cursor: "pointer",
                }}>
                <Bell size={18} color={showNotifs ? "#c8ff00" : "#888"} />
              </button>
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: "absolute", top: -4, right: -4,
                  width: 18, height: 18,
                  background: "#ff2d8d", border: "2px solid #0a0a0a",
                  borderRadius: "50%", fontSize: 10, fontWeight: 700, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 8px #ff2d8d88",
                }}>
                {NOTIFS.length}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Glowing neon status strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginTop: 6,
          padding: "5px 10px",
          background: "#0d0d0d", border: "1px solid #c8ff0022",
          borderRadius: 8,
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: 6, height: 6, background: "#c8ff00", borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 6px #c8ff00" }}
          />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#c8ff00", letterSpacing: "0.08em" }}>
            2,341 PLAYERS ONLINE
          </span>
          <span style={{ fontSize: 10, color: "#333" }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#00e5ff", letterSpacing: "0.06em" }}>
            POT: 249 KR
          </span>
          <span style={{ fontSize: 10, color: "#333" }}>·</span>
          <motion.span
            animate={{ color: ["#ff2d8d", "#c8ff00", "#ff2d8d"] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}
          >
            LIVE
          </motion.span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="flex-shrink-0 px-4 py-1.5"
              style={{
                background: filter === f ? "#0a0a0a" : "#111",
                border: filter === f ? "2.5px solid #c8ff0088" : "2.5px solid #222",
                borderRadius: 10,
                fontSize: 12, fontWeight: 700,
                color: filter === f ? "#c8ff00" : "#888",
                letterSpacing: "0.04em",
                boxShadow: filter === f ? "0 0 12px #c8ff0044" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}>
              {f === "HOT" ? "🔥 HOT" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Pet Status Mini-Card */}
      <Link href="/pet" style={{ textDecoration: "none", display: "block", margin: "10px 16px 0" }}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          style={{
            background: "#0d0d0d",
            border: "1px solid #1a1a1a",
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Pet emoji */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `${classColor}18`, border: `1.5px solid ${classColor}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem",
          }}>
            {petEmoji}
          </div>

          {/* Name + mood + bars */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pet.name}
              </span>
              <span style={{ fontSize: 13 }}>{getMoodEmoji(petMoodComputed)}</span>
            </div>
            {/* Mini progress bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { label: "Hunger", value: pet.needs.hunger, color: "#ff6b35" },
                { label: "Happy",  value: pet.needs.happiness, color: "#ff2d8d" },
                { label: "Energy", value: pet.needs.energy, color: "#4488ff" },
              ].map(bar => (
                <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#444", width: 38, flexShrink: 0 }}>{bar.label}</span>
                  <div style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${bar.value}%`, height: "100%", background: bar.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bond + Stamina */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.06em" }}>BOND</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: classColor }}>{bondLevel}</div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.06em", marginTop: 4 }}>STA</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#4488ff" }}>{stamina}</div>
          </div>
        </motion.div>
      </Link>

      {/* Daily Quests Quick Strip */}
      <div style={{ margin: "8px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/quests" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.06em", flexShrink: 0 }}>
            {claimedCount}/5 QUESTS
          </span>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" as const }}>
            {dailyQuests.map(q => {
              const isClaimed = questClaimed.includes(q.id);
              return (
                <motion.div
                  key={q.id}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: isClaimed ? "#c8ff0022" : "#111",
                    border: isClaimed ? "2px solid #c8ff00" : "2px solid #222",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", position: "relative",
                    boxShadow: isClaimed ? "0 0 10px #c8ff0044" : "none",
                  }}
                >
                  {isClaimed ? (
                    <span style={{ fontSize: "1.1rem" }}>✅</span>
                  ) : (
                    <span>{q.emoji}</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Link>
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
            boxShadow: "4px 4px 0px #0a0a0a, 0 0 30px #ff2d8d33",
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

      {/* BOUNTY BURST */}
      {filter === "ALL" && (
        <div style={{ margin: "12px 0 0", overflowX: "auto", scrollbarWidth: "none" as const }}>
          <div style={{ display: "flex", gap: 10, paddingLeft: 16, paddingRight: 16 }}>
            {[
              { emoji: "🌳", title: "Plant a Tree", karma: 200, xp: 80, difficulty: "EASY", color: "#00ff88" },
              { emoji: "🏃", title: "Run 5km", karma: 500, xp: 200, difficulty: "HARD", color: "#ff6b35" },
              { emoji: "📚", title: "Read 30min", karma: 150, xp: 60, difficulty: "EASY", color: "#a855f7" },
            ].map((b, i) => (
              <Link key={b.title} href="/quests" style={{ textDecoration: "none", flexShrink: 0 }}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  animate={i === 0 ? { boxShadow: [`0 0 12px ${b.color}22`, `0 0 28px ${b.color}55`, `0 0 12px ${b.color}22`] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: 160, background: "#111",
                    border: `2px solid ${b.color}44`,
                    borderRadius: 16, padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "1.5rem" }}>{b.emoji}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                      color: b.difficulty === "EASY" ? "#00ff88" : "#ff6b35",
                      background: b.difficulty === "EASY" ? "#00ff8822" : "#ff6b3522",
                      border: `1px solid ${b.difficulty === "EASY" ? "#00ff8844" : "#ff6b3544"}`,
                      borderRadius: 6, padding: "2px 6px",
                    }}>{b.difficulty}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{b.title}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#c8ff00" }}>+{b.karma}⚡</span>
                    <span style={{ fontSize: 10, color: "#444" }}>·</span>
                    <span style={{ fontSize: 10, color: "#555" }}>+{b.xp} XP</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick action cards */}
      {filter === "ALL" && (
        <div style={{ display: "flex", gap: 8, padding: "12px 16px 0", overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { href: "/karma-pot", emoji: "💰", label: "POTTEN",   sub: "249 kr idag",   color: "#c8ff00" },
            { href: "/squads",    emoji: "⚡",  label: "SQUADS",   sub: "Wars live!",     color: "#c8ff00" },
            { href: "/ville",     emoji: "🏙️", label: "MIN STAD", sub: "Bygg & tjäna",  color: "#ff6b35" },
            { href: "/chat",      emoji: "💬", label: "CHATT",    sub: "137 online",     color: "#00e5ff" },
            { href: "/premium",   emoji: "👑", label: "PREMIUM",  sub: "Från 19 kr",    color: "#ff8c00" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none", flexShrink: 0 }}>
              <motion.div
                whileTap={{ scale: 0.93 }}
                whileHover={{ boxShadow: `0 0 16px ${item.color}33` }}
                style={{
                  background: "linear-gradient(135deg, #111, #0d0d0d)",
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

      {/* TRENDING CHALLENGES */}
      {filter === "ALL" && (
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#555", letterSpacing: "0.12em" }}>⚡ TRENDING CHALLENGES</span>
            <Link href="/quests" style={{ textDecoration: "none", fontSize: 10, fontWeight: 700, color: "#c8ff00" }}>SEE ALL →</Link>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" as const, paddingBottom: 4 }}>
            {[
              { emoji: "👟", name: "10K STEPS",      xp: 120, participants: "2.3k", timeLeft: "18h", color: "#00ff88", progress: 65 },
              { emoji: "💧", name: "DRINK 2 LITERS", xp: 80,  participants: "1.8k", timeLeft: "18h", color: "#00e5ff", progress: 40 },
              { emoji: "🧘", name: "5MIN MEDITATE",  xp: 60,  participants: "941",  timeLeft: "18h", color: "#a855f7", progress: 82 },
              { emoji: "🥦", name: "EAT CLEAN",      xp: 100, participants: "1.2k", timeLeft: "18h", color: "#ff6b35", progress: 30 },
            ].map((ch, i) => (
              <motion.div
                key={ch.name}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  flexShrink: 0, width: 130,
                  background: "#111",
                  border: `2px solid ${ch.color}44`,
                  borderRadius: 16, padding: "12px",
                  boxShadow: `0 0 20px ${ch.color}11`,
                }}
              >
                <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{ch.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{ch.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: ch.color }}>+{ch.xp} XP</span>
                  <span style={{ fontSize: 9, color: "#333" }}>·</span>
                  <span style={{ fontSize: 9, color: "#444" }}>{ch.participants} joined</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ch.progress}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                    style={{ height: "100%", background: ch.color, borderRadius: 2 }}
                  />
                </div>
                <div style={{ fontSize: 9, color: "#555" }}>ends in {ch.timeLeft}</div>
              </motion.div>
            ))}
          </div>
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
              border: "2px solid #c8ff0066",
              borderRadius: 16, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 0 30px #c8ff0022",
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
              <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>
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
      <AnimatePresence>
        {liveActivities.length > 0 && filter === "ALL" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3"
            style={{
              background: "#0d0d0d",
              border: "1px solid #c8ff0033",
              borderRadius: 14,
              padding: "9px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 7, height: 7, background: "#c8ff00", borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 6px #c8ff00" }}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <motion.div
                key={liveActivities[0].id}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                style={{ fontSize: 12, color: "#c8ff00", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {liveActivities[0].emoji} {liveActivities[0].karma ? `You just earned +${liveActivities[0].karma} karma` : liveActivities[0].title}
              </motion.div>
            </div>
            <span style={{ fontSize: 10, color: "#444", flexShrink: 0 }}>{timeAgo(liveActivities[0].timestamp)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIVE EVENT BANNER ── */}
      <Link href="/event" style={{ textDecoration: "none", display: "block", padding: "10px 16px 0" }}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          animate={{ boxShadow: [`0 0 16px ${liveEvent.color}22`, `0 0 32px ${liveEvent.color}55`, `0 0 16px ${liveEvent.color}22`] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            background: `linear-gradient(135deg, #0a0a0a, #111)`,
            border: `2px solid ${liveEvent.color}77`,
            borderRadius: 16, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ fontSize: "1.6rem", flexShrink: 0 }}
          >{liveEvent.emoji}</motion.span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                style={{ width: 6, height: 6, background: liveEvent.color, borderRadius: "50%", boxShadow: `0 0 6px ${liveEvent.color}`, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: liveEvent.color, letterSpacing: "0.08em" }}>LIVE · {liveEvent.name}</span>
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>{liveEvent.tagline}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "#444" }}>ends in</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmt(secsLeft)}</div>
          </div>
        </motion.div>
      </Link>

      {/* Stories */}
      <div className="px-4 pt-3" style={{ borderBottom: "2px solid #c8ff0022" }}>
        <StoriesBar />
      </div>

      {/* Feed */}
      <div className="px-4 pt-4 pb-24" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* My Activity Cards */}
        {myActivities.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.12em" }}>
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
                    background: "#111",
                    border: `2.5px solid ${act.rarity && act.rarity !== "common" ? rarityColor : "#222"}`,
                    borderRadius: 16, padding: "12px 14px",
                    boxShadow: act.rarity && act.rarity !== "common"
                      ? `3px 3px 0px #000, 0 0 20px ${rarityColor}33, 0 0 12px ${rarityColor}44`
                      : "3px 3px 0px #000",
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
                          style={{ width: 6, height: 6, background: "#4caf50", borderRadius: "50%", flexShrink: 0, boxShadow: "0 0 4px #4caf50" }} />
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.title}</div>
                    </div>
                    {act.detail && <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{act.detail}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {act.karma ? <div style={{ fontSize: 12, fontWeight: 700, color: "#c8ff00", background: "#0a0a0a", borderRadius: 8, padding: "2px 7px", boxShadow: "0 0 8px #c8ff0033" }}>+{act.karma}⚡</div> : null}
                    <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>{timeAgo(act.timestamp)}</div>
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
                style={{ position: "absolute", top: -2, right: -2, background: "#ff6b35", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "0 14px 0 8px", padding: "3px 8px", zIndex: 1, boxShadow: "0 0 10px #ff6b3566" }}>
                🔥 HOT
              </motion.div>
            )}
            <FeedCard post={post} />
          </motion.div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-16">
            <div style={{ fontSize: "3rem" }}>🔍</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#555", marginTop: 8 }}>No posts matching this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
