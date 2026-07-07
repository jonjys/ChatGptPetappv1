"use client";

import { useState, useEffect } from "react";
import { Bell, Zap, Flame, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import FeedCard from "@/components/feed/FeedCard";
import { FEED_POSTS, FRIENDS } from "@/lib/mock-data";
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
  const [visitFriend, setVisitFriend] = useState<(typeof FRIENDS)[number] | null>(null);
  const [visitToast, setVisitToast] = useState<string | null>(null);
  function petStreak(id: string) { return (id.charCodeAt(id.length - 1) % 12) + 2; } // stable per friend
  function doVisit(msg: string) { setVisitToast(msg); setVisitFriend(null); setTimeout(() => setVisitToast(null), 1800); }
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

      {/* Header — compact, content-first */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-2" style={{ background: "rgba(10,10,10,0.96)", backdropFilter: "blur(12px)", borderBottom: "2px solid #111" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 style={{
              fontSize: "1.55rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1,
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
                  background: "#ff6b35", borderRadius: 7, padding: "2px 7px",
                  display: "flex", alignItems: "center", gap: 3,
                  boxShadow: "0 0 12px #ff6b3566",
                }}
              >
                <Flame size={10} color="#fff" fill="#fff" />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{streak}d</span>
              </motion.div>
            )}
            {/* Live status inline */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 2 }}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ width: 5, height: 5, background: "#c8ff00", borderRadius: "50%", boxShadow: "0 0 6px #c8ff00" }}
              />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#556", letterSpacing: "0.06em" }}>2,341 ONLINE · LV{level}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1"
              style={{
                background: "#c8ff00", borderRadius: 10,
                boxShadow: "0 0 14px #c8ff0055",
              }}>
              <Zap size={12} color="#0a0a0a" fill="#0a0a0a" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0a0a0a" }}>{formatXP(displayXP)}</span>
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{
                  width: 34, height: 34,
                  background: showNotifs ? "#1a1a1a" : "#111",
                  border: "2px solid #292929",
                  borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: showNotifs ? "0 0 12px #c8ff0044" : "none",
                  cursor: "pointer",
                }}>
                <Bell size={15} color={showNotifs ? "#c8ff00" : "#888"} />
              </button>
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: "absolute", top: -4, right: -4,
                  width: 15, height: 15,
                  background: "#ff2d8d", border: "2px solid #0a0a0a",
                  borderRadius: "50%", fontSize: 8, fontWeight: 700, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {NOTIFS.length}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="flex-shrink-0 px-3 py-1"
              style={{
                background: filter === f ? "#0a0a0a" : "#111",
                border: filter === f ? "2px solid #c8ff0088" : "2px solid #1e1e1e",
                borderRadius: 9,
                fontSize: 11, fontWeight: 700,
                color: filter === f ? "#c8ff00" : "#777",
                letterSpacing: "0.04em",
                boxShadow: filter === f ? "0 0 10px #c8ff0033" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}>
              {f === "HOT" ? "🔥 HOT" : f}
            </button>
          ))}
        </div>
      </div>

      {/* VÄNNERS PETS — follow pets, not people (Snapchat closeness) */}
      <div style={{ paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 6px" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#556", letterSpacing: "0.1em" }}>🐾 VÄNNERS PETS</span>
          <Link href="/social" style={{ textDecoration: "none", fontSize: 10, fontWeight: 700, color: "#c8ff00" }}>ALLA VÄNNER →</Link>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none" as const, padding: "0 16px 4px" }}>
          {/* Your pet first */}
          <Link href="/pet" style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 62 }}>
              <div style={{
                width: 58, height: 58, borderRadius: "50%",
                background: `${classColor}18`, border: `2.5px solid ${classColor}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem",
                boxShadow: `0 0 14px ${classColor}55`,
              }}>{petEmoji}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#c8ff00", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Din pet</span>
            </div>
          </Link>
          {/* Friends' pets */}
          {FRIENDS.map(f => {
            const streak = petStreak(f.id);
            return (
              <motion.div key={f.id} whileTap={{ scale: 0.9 }} onClick={() => setVisitFriend(f)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 62, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 58, height: 58, borderRadius: "50%",
                    background: "#0f0f16", border: `2.5px solid ${f.online ? "#00ff88" : "#2a2a36"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem",
                  }}>{f.petEmoji}</div>
                  {/* streak flame */}
                  <div style={{
                    position: "absolute", bottom: -3, right: -3,
                    background: "#ff6b35", border: "2px solid #0a0a0a", borderRadius: 8,
                    padding: "0 5px", fontSize: 9, fontWeight: 800, color: "#fff",
                    display: "flex", alignItems: "center", gap: 1,
                  }}>🔥{streak}</div>
                  {f.online && (
                    <div style={{ position: "absolute", top: 0, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#00ff88", border: "2px solid #0a0a0a" }} />
                  )}
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: "#889", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.petName}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pet + quests — one tight hub row */}
      <div style={{ margin: "8px 16px 0", display: "flex", gap: 8 }}>
        <Link href="/pet" style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
          <motion.div
            whileTap={{ scale: 0.97 }}
            style={{
              background: "#0d0d0d",
              border: `1px solid ${classColor}33`,
              borderRadius: 12,
              padding: "7px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 50,
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `${classColor}18`, border: `1.5px solid ${classColor}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem",
            }}>
              {petEmoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pet.name}
                </span>
                <span style={{ fontSize: 11 }}>{getMoodEmoji(petMoodComputed)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: classColor, marginLeft: "auto", flexShrink: 0 }}>♥{bondLevel} · ⚡{stamina}</span>
              </div>
              {/* segmented vitality bar: hunger / happy / energy */}
              <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
                {[
                  { value: pet.needs.hunger, color: "#ff6b35" },
                  { value: pet.needs.happiness, color: "#ff2d8d" },
                  { value: pet.needs.energy, color: "#4488ff" },
                ].map((bar, i) => (
                  <div key={i} style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${bar.value}%`, height: "100%", background: bar.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Quests chip */}
        <Link href="/quests" style={{ textDecoration: "none", flexShrink: 0 }}>
          <motion.div
            whileTap={{ scale: 0.95 }}
            style={{
              height: 50, borderRadius: 12, padding: "0 12px",
              background: claimedCount >= 5 ? "#c8ff0018" : "#0d0d0d",
              border: `1px solid ${claimedCount >= 5 ? "#c8ff0066" : "#1e1e1e"}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 14 }}>{claimedCount >= 5 ? "🏆" : dailyQuests.find(q => !questClaimed.includes(q.id))?.emoji ?? "🎯"}</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: claimedCount >= 5 ? "#c8ff00" : "#667", letterSpacing: "0.04em" }}>{claimedCount}/5</span>
          </motion.div>
        </Link>
      </div>

      {/* Quick action cards */}
      {filter === "ALL" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, padding: "8px 16px 0" }}>
          {[
            { href: "/karma-pot", emoji: "💰", label: "POTTEN",   sub: "249 kr",    color: "#c8ff00" },
            { href: "/squads",    emoji: "⚡",  label: "SQUADS",   sub: "Wars live",  color: "#c8ff00" },
            { href: "/ville",     emoji: "🏙️", label: "STAD",     sub: "Bygg & tjäna", color: "#ff6b35" },
            { href: "/chat",      emoji: "💬", label: "CHATT",    sub: "137 online",  color: "#00e5ff" },
            { href: "/premium",   emoji: "👑", label: "PRO",      sub: "Från 19kr",  color: "#ff8c00" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <motion.div
                whileTap={{ scale: 0.93 }}
                style={{
                  background: "linear-gradient(135deg, #111, #0d0d0d)",
                  border: `1.5px solid ${item.color}44`,
                  borderRadius: 12, padding: "8px 4px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: 2 }}>{item.emoji}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: item.color, letterSpacing: "0.02em" }}>{item.label}</div>
                <div style={{ fontSize: 8, color: "#444", marginTop: 1 }}>{item.sub}</div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {/* ── LIVE NU — one horizontal carousel: event, pot, bounties, challenges ── */}
      {filter === "ALL" && (
        <div style={{ padding: "10px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 16px 6px" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#556", letterSpacing: "0.12em" }}>⚡ LIVE NU</span>
            <Link href="/quests" style={{ textDecoration: "none", fontSize: 10, fontWeight: 700, color: "#c8ff00" }}>ALLA →</Link>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" as const, padding: "0 16px 2px" }}>

            {/* Live event card */}
            <Link href="/event" style={{ textDecoration: "none", flexShrink: 0 }}>
              <motion.div
                whileTap={{ scale: 0.96 }}
                animate={{ boxShadow: [`0 0 10px ${liveEvent.color}22`, `0 0 20px ${liveEvent.color}44`, `0 0 10px ${liveEvent.color}22`] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{
                  width: 150, height: 118, borderRadius: 14, padding: "10px 12px",
                  background: "linear-gradient(135deg, #0a0a0a, #111)",
                  border: `1.5px solid ${liveEvent.color}66`,
                  display: "flex", flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                    style={{ width: 5, height: 5, background: liveEvent.color, borderRadius: "50%", boxShadow: `0 0 5px ${liveEvent.color}` }} />
                  <span style={{ fontSize: 8, fontWeight: 900, color: liveEvent.color, letterSpacing: "0.08em" }}>LIVE EVENT</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmt(secsLeft)}</span>
                </div>
                <div style={{ fontSize: "1.5rem", margin: "6px 0 2px" }}>{liveEvent.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#fff", lineHeight: 1.15 }}>{liveEvent.name}</div>
                <div style={{ fontSize: 9, color: "#667", marginTop: 2 }}>{liveEvent.tagline}</div>
              </motion.div>
            </Link>

            {/* Pot card */}
            <Link href="/karma-pot" style={{ textDecoration: "none", flexShrink: 0 }}>
              <motion.div whileTap={{ scale: 0.96 }}
                style={{
                  width: 128, height: 118, borderRadius: 14, padding: "10px 12px",
                  background: "linear-gradient(135deg, #0d1400, #0a0a0a)",
                  border: "1.5px solid #c8ff0055",
                  display: "flex", flexDirection: "column",
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 900, color: "#c8ff00", letterSpacing: "0.08em" }}>DAGLIG POTT</span>
                <motion.div
                  animate={{ rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  style={{ fontSize: "1.5rem", margin: "6px 0 2px" }}
                >💰</motion.div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#c8ff00" }}>249 kr</div>
                <div style={{ fontSize: 9, color: "#556", marginTop: 2 }}>Var aktiv → vinn riktiga pengar</div>
              </motion.div>
            </Link>

            {/* Bounties */}
            {[
              { emoji: "🌳", title: "Plant a Tree", karma: 200, difficulty: "EASY", color: "#00ff88" },
              { emoji: "🏃", title: "Run 5km", karma: 500, difficulty: "HARD", color: "#ff6b35" },
              { emoji: "📚", title: "Read 30min", karma: 150, difficulty: "EASY", color: "#a855f7" },
            ].map(b => (
              <Link key={b.title} href="/quests" style={{ textDecoration: "none", flexShrink: 0 }}>
                <motion.div whileTap={{ scale: 0.96 }}
                  style={{
                    width: 110, height: 118, borderRadius: 14, padding: "10px 12px",
                    background: "#101010",
                    border: `1.5px solid ${b.color}44`,
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: 8, fontWeight: 900, color: b.color, letterSpacing: "0.08em" }}>{b.difficulty} BOUNTY</span>
                  <div style={{ fontSize: "1.5rem", margin: "6px 0 2px" }}>{b.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>{b.title}</div>
                  <div style={{ fontSize: 9, color: "#556", marginTop: "auto" }}>+{b.karma} ⚡</div>
                </motion.div>
              </Link>
            ))}

            {/* Challenges */}
            {[
              { emoji: "👟", name: "10K STEPS", xp: 120, joined: "2.3k", color: "#00ff88", progress: 65 },
              { emoji: "💧", name: "DRICK 2L", xp: 80, joined: "1.8k", color: "#00e5ff", progress: 40 },
              { emoji: "🧘", name: "5MIN ZEN", xp: 60, joined: "941", color: "#a855f7", progress: 82 },
            ].map(ch => (
              <Link key={ch.name} href="/quests" style={{ textDecoration: "none", flexShrink: 0 }}>
                <motion.div whileTap={{ scale: 0.96 }}
                  style={{
                    width: 110, height: 118, borderRadius: 14, padding: "10px 12px",
                    background: "#101010",
                    border: `1.5px solid ${ch.color}44`,
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: 8, fontWeight: 900, color: ch.color, letterSpacing: "0.08em" }}>CHALLENGE</span>
                  <div style={{ fontSize: "1.5rem", margin: "6px 0 2px" }}>{ch.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{ch.name}</div>
                  <div style={{ marginTop: "auto" }}>
                    <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden", marginBottom: 3 }}>
                      <div style={{ width: `${ch.progress}%`, height: "100%", background: ch.color, borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 8, color: "#556" }}>+{ch.xp} XP · {ch.joined} med</div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
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

      {/* Feed */}
      <div className="px-4 pt-4" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 120 }}>
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

      {/* ── Visit-a-pet modal (Snapchat closeness) ── */}
      <AnimatePresence>
        {visitFriend && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setVisitFriend(null)}
              style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)" }} />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              style={{
                position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
                width: "calc(100% - 32px)", maxWidth: 340, zIndex: 301,
                background: "#0f0f16", border: "1.5px solid #1e1e2a", borderRadius: 22,
                padding: "20px 18px", boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
                  background: "#14141f", border: `2.5px solid ${visitFriend.online ? "#00ff88" : "#2a2a36"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem",
                }}>{visitFriend.petEmoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>{visitFriend.petName}</div>
                  <div style={{ fontSize: 11, color: "#667" }}>@{visitFriend.username} · LV{visitFriend.level}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ff6b35", marginTop: 2 }}>🔥 {petStreak(visitFriend.id)}-dagars pet-streak</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { emoji: "👋", label: "Vinka", color: "#c8ff00", msg: `Du vinkade till ${visitFriend.petName}! 👋` },
                  { emoji: "🎁", label: "Gåva", color: "#ff2d8d", msg: `Du gav ${visitFriend.petName} en gåva! 🎁` },
                  { emoji: "🤝", label: "Hjälp uppdrag", color: "#00e5ff", msg: `Ni hjälps åt med ett uppdrag! 🤝` },
                  { emoji: "🔥", label: "Håll streak", color: "#ff6b35", msg: `Pet-streak med ${visitFriend.petName} förlängd! 🔥` },
                ].map(a => (
                  <motion.button key={a.label} whileTap={{ scale: 0.94 }} onClick={() => doVisit(a.msg)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "12px 4px", background: `${a.color}12`, border: `1.5px solid ${a.color}44`,
                      borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    <span style={{ fontSize: "1.4rem" }}>{a.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: a.color }}>{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Visit toast */}
      <AnimatePresence>
        {visitToast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{
              position: "fixed", top: 80, left: 16, right: 16, zIndex: 320,
              background: "linear-gradient(135deg, #0a1400, #111)", border: "2px solid #c8ff00",
              borderRadius: 14, padding: "12px 16px", textAlign: "center",
              fontWeight: 700, fontSize: 14, color: "#c8ff00", boxShadow: "0 0 24px #c8ff0033",
            }}>
            {visitToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
