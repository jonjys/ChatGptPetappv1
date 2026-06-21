"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { calculateLevel } from "@/lib/xp-system";

// ─── Types ────────────────────────────────────────────────────────────────────
type SquadMember = {
  username: string; emoji: string; karma: number; level: number;
  role: "leader" | "officer" | "member"; weeklyKarma: number; online: boolean;
};

type Squad = {
  id: string; name: string; emoji: string; tagline: string;
  accent: string; glow: string; bg: string;
  power: number; members: SquadMember[]; rank: number;
  wars: { won: number; lost: number }; weeklyKarma: number;
  isOpen: boolean;
};

type War = {
  id: string; enemy: string; enemyEmoji: string; enemyPower: number;
  ourKarma: number; theirKarma: number; endsIn: string; accent: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MY_SQUAD: Squad = {
  id: "sq1", name: "KARMA LORDS", emoji: "⚡", tagline: "Maximum karma, minimum sleep",
  accent: "#c8ff00", glow: "#c8ff0044", bg: "linear-gradient(135deg, #0d1400, #1a2800)",
  power: 12840, rank: 3, weeklyKarma: 4200, isOpen: false,
  wars: { won: 18, lost: 4 },
  members: [
    { username: "tradeknight", emoji: "⚔️", karma: 3800, level: 15, role: "leader",  weeklyKarma: 1200, online: true },
    { username: "lunavibes",   emoji: "🌙", karma: 2900, level: 12, role: "officer", weeklyKarma: 980,  online: true },
    { username: "karmasonic",  emoji: "🦊", karma: 1250, level: 12, role: "member",  weeklyKarma: 720,  online: true },
    { username: "pixelrush",   emoji: "🎮", karma: 2100, level: 10, role: "member",  weeklyKarma: 640,  online: false },
    { username: "neonmiku",    emoji: "✨", karma: 1600, level: 8,  role: "member",  weeklyKarma: 410,  online: false },
    { username: "voltfox",     emoji: "🦊", karma: 980,  level: 7,  role: "member",  weeklyKarma: 250,  online: false },
  ],
};

const TOP_SQUADS: Squad[] = [
  { id: "sq_v", name: "VOID RUNNERS",  emoji: "🌑", tagline: "We run until dawn",            accent: "#4488ff", glow: "#4488ff44", bg: "linear-gradient(135deg, #000814, #001f3f)", power: 18400, rank: 1, weeklyKarma: 7800, isOpen: true,  members: [], wars: { won: 24, lost: 2 } },
  { id: "sq_s", name: "SHADOW GUILD", emoji: "🏴‍☠️", tagline: "We work in the shadows",       accent: "#a855f7", glow: "#a855f744", bg: "linear-gradient(135deg, #0d0020, #1a0040)", power: 15200, rank: 2, weeklyKarma: 6100, isOpen: false, members: [], wars: { won: 20, lost: 6 } },
  { id: "sq_k", name: "KARMA LORDS",  emoji: "⚡", tagline: "Maximum karma, minimum sleep",   accent: "#c8ff00", glow: "#c8ff0044", bg: "linear-gradient(135deg, #0d1400, #1a2800)", power: 12840, rank: 3, weeklyKarma: 4200, isOpen: false, members: [], wars: { won: 18, lost: 4 } },
  { id: "sq_b", name: "BEAST MODE",   emoji: "🦁", tagline: "No days off",                    accent: "#ff6b35", glow: "#ff6b3544", bg: "linear-gradient(135deg, #1a0800, #2d1200)", power: 10500, rank: 4, weeklyKarma: 3900, isOpen: true,  members: [], wars: { won: 15, lost: 8 } },
  { id: "sq_m", name: "MERCHANT KINGs", emoji: "💰", tagline: "Wealth is a mindset",         accent: "#ffd700", glow: "#ffd70044", bg: "linear-gradient(135deg, #1a1200, #2d2000)", power: 8900,  rank: 5, weeklyKarma: 3200, isOpen: true,  members: [], wars: { won: 12, lost: 9 } },
  { id: "sq_n", name: "NEON DYNASTY", emoji: "🌸", tagline: "Beauty in the grind",           accent: "#ff2d8d", glow: "#ff2d8d44", bg: "linear-gradient(135deg, #1a0010, #2d0020)", power: 7200,  rank: 6, weeklyKarma: 2800, isOpen: true,  members: [], wars: { won: 10, lost: 7 } },
];

const ACTIVE_WARS: War[] = [
  { id: "w1", enemy: "VOID RUNNERS",  enemyEmoji: "🌑", enemyPower: 18400, ourKarma: 3200, theirKarma: 4100, endsIn: "6h 22m", accent: "#4488ff" },
  { id: "w2", enemy: "NEON DYNASTY",  enemyEmoji: "🌸", enemyPower: 7200,  ourKarma: 2800, theirKarma: 1900, endsIn: "1d 4h",  accent: "#ff2d8d" },
];

const SQUAD_KEY = "karma_squad_joined_v1";

// ─── Create Squad Modal ───────────────────────────────────────────────────────
const SQUAD_EMOJIS = ["⚡","🌑","🏴‍☠️","🦁","💰","🌸","🔥","🐉","⚔️","🌟","💎","🦊","🎮","🌊","🦋","🎯"];

function CreateSquadModal({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string, emoji: string) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⚡");
  const [tagline, setTagline] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", background: "#0d0d0d", borderTop: "2.5px solid #c8ff00", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: "24px 20px 48px" }}
      >
        <div style={{ fontSize: "1.3rem", fontWeight: 900, marginBottom: 20, letterSpacing: "-0.03em" }}>
          ⚡ CREATE YOUR SQUAD
        </div>

        {/* Emoji picker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", marginBottom: 8 }}>SQUAD SYMBOL</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SQUAD_EMOJIS.map(e => (
              <motion.button key={e} whileTap={{ scale: 0.85 }} onClick={() => setEmoji(e)}
                style={{
                  width: 44, height: 44, borderRadius: 12, fontSize: "1.4rem",
                  background: emoji === e ? "#c8ff0022" : "#111",
                  border: `2px solid ${emoji === e ? "#c8ff00" : "#1a1a1a"}`,
                  cursor: "pointer",
                }}>{e}</motion.button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", marginBottom: 6 }}>SQUAD NAME</div>
          <input
            value={name} onChange={e => setName(e.target.value.toUpperCase())} maxLength={20}
            placeholder="E.G. SHADOW KINGS"
            style={{ width: "100%", background: "#111", border: "2px solid #222", borderRadius: 14, padding: "12px 16px", fontSize: 15, fontWeight: 700, color: "#c8ff00", outline: "none", fontFamily: "inherit", letterSpacing: "0.06em", boxSizing: "border-box" }}
          />
        </div>

        {/* Tagline */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "0.1em", marginBottom: 6 }}>BATTLE CRY</div>
          <input
            value={tagline} onChange={e => setTagline(e.target.value)} maxLength={40}
            placeholder="We never stop grinding"
            style={{ width: "100%", background: "#111", border: "2px solid #222", borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#ccc", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => name.trim() && onCreated(name.trim(), emoji)}
          style={{
            width: "100%", padding: "16px",
            background: name.trim() ? "linear-gradient(135deg, #c8ff00, #88ff00)" : "#1a1a1a",
            border: `2px solid ${name.trim() ? "#0a0a0a" : "#333"}`,
            borderRadius: 16, fontSize: 15, fontWeight: 800,
            color: name.trim() ? "#0a0a0a" : "#444",
            cursor: name.trim() ? "pointer" : "default",
            fontFamily: "inherit", boxShadow: name.trim() ? "4px 4px 0px #0a0a0a" : "none",
          }}>
          {emoji} CREATE {name || "SQUAD"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Squad Card ───────────────────────────────────────────────────────────────
function SquadCard({ squad, onJoin, joined }: { squad: Squad; onJoin: (id: string) => void; joined: boolean }) {
  const maxPower = TOP_SQUADS[0].power;
  const pct = Math.round((squad.power / maxPower) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: squad.bg,
        border: `2px solid ${squad.accent}44`,
        borderRadius: 20, padding: "16px",
        boxShadow: `0 0 24px ${squad.glow}`,
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${squad.accent}11 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: "2rem", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", background: squad.accent + "22", border: `2px solid ${squad.accent}55`, borderRadius: 14, flexShrink: 0 }}>
          {squad.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{squad.name}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: squad.accent, background: squad.accent + "22", borderRadius: 6, padding: "2px 7px", letterSpacing: "0.06em" }}>#{squad.rank}</span>
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{squad.tagline}</div>
        </div>
        {squad.id !== "sq_k" && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => !joined && onJoin(squad.id)}
            style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 11, fontWeight: 800,
              background: joined ? "#1a1a1a" : squad.accent,
              border: `2px solid ${joined ? "#333" : "#0a0a0a"}`,
              color: joined ? "#555" : "#000",
              cursor: joined ? "default" : "pointer", flexShrink: 0,
              boxShadow: joined ? "none" : "2px 2px 0px #0a0a0a",
            }}>
            {joined ? "✓ JOINED" : squad.isOpen ? "JOIN" : "🔒 APPLY"}
          </motion.button>
        )}
      </div>

      {/* Power bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#555", letterSpacing: "0.08em" }}>SQUAD POWER</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: squad.accent }}>{squad.power.toLocaleString()}</span>
        </div>
        <div style={{ height: 5, background: "#111", borderRadius: 3, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            style={{ height: "100%", background: squad.accent, borderRadius: 3, boxShadow: `0 0 8px ${squad.accent}88` }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <span style={{ fontSize: 11, color: "#666" }}>⚡ {squad.weeklyKarma.toLocaleString()} this week</span>
        <span style={{ fontSize: 11, color: "#4caf50" }}>⚔️ {squad.wars.won}W {squad.wars.lost}L</span>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type TabType = "MY SQUAD" | "DISCOVER" | "WARS";

export default function SquadsPage() {
  const { user, addKarma, addXP, showToast } = useApp();
  const level = calculateLevel(user.xp);
  const [tab, setTab] = useState<TabType>("MY SQUAD");
  const [showCreate, setShowCreate] = useState(false);
  const [mySquad, setMySquad] = useState<Squad | null>(null);
  const [joinedSquads, setJoinedSquads] = useState<Set<string>>(new Set());
  const [warContrib, setWarContrib] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SQUAD_KEY);
      if (saved) { setMySquad(JSON.parse(saved)); return; }
    } catch {}
    // Default: user is already in KARMA LORDS (mock)
    setMySquad(MY_SQUAD);
    localStorage.setItem(SQUAD_KEY, JSON.stringify(MY_SQUAD));
  }, []);

  const handleCreate = useCallback((name: string, emoji: string) => {
    const newSquad: Squad = {
      id: `sq_custom_${Date.now()}`,
      name, emoji,
      tagline: "Just getting started",
      accent: "#c8ff00", glow: "#c8ff0044",
      bg: "linear-gradient(135deg, #0d1400, #1a2800)",
      power: user.karma + level * 60,
      rank: 99,
      weeklyKarma: 0,
      isOpen: true,
      wars: { won: 0, lost: 0 },
      members: [
        { username: user.username, emoji: user.avatarEmoji, karma: user.karma, level, role: "leader", weeklyKarma: 0, online: true },
      ],
    };
    setMySquad(newSquad);
    localStorage.setItem(SQUAD_KEY, JSON.stringify(newSquad));
    setShowCreate(false);
    showToast(`${emoji} ${name} created! You're the leader ⚡`, undefined, "#c8ff00", "🎉");
    addKarma(50, "Squad creation");
    addXP(100);
  }, [user, level, addKarma, addXP, showToast]);

  const handleJoin = useCallback((squadId: string) => {
    setJoinedSquads(prev => new Set([...prev, squadId]));
    const sq = TOP_SQUADS.find(s => s.id === squadId);
    if (sq) showToast(`Applied to ${sq.emoji} ${sq.name}!`, undefined, sq.accent, sq.emoji);
  }, [showToast]);

  const handleContrib = useCallback(() => {
    addKarma(50, "Squad War contribution");
    addXP(25);
    setWarContrib(v => v + 50);
    showToast("+50 karma contributed to Squad War! ⚔️", 50, "#ff6b35", "⚔️");
  }, [addKarma, addXP, showToast]);

  const squad = mySquad ?? MY_SQUAD;
  const me = squad.members.find(m => m.username === user.username) ?? squad.members[0];

  const TABS: TabType[] = ["MY SQUAD", "DISCOVER", "WARS"];

  return (
    <div style={{ background: "#050505", minHeight: "100dvh", color: "#fff" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-0"
        style={{ background: "rgba(5,5,5,0.96)", backdropFilter: "blur(12px)", borderBottom: `2px solid ${squad.accent}44` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {squad.emoji} <span style={{ color: squad.accent }}>{squad.name}</span>
            </h1>
            <div style={{ fontSize: 11, color: "#555", fontWeight: 700, marginTop: 2 }}>
              RANK #{squad.rank} · {squad.members.length} MEMBERS · ⚔️ {squad.wars.won}W {squad.wars.lost}L
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => showToast("Squad chat coming soon! 💬", undefined, "#4488ff", "💬")}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: "#111", border: "2px solid #222",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: "1.1rem",
              }}
            >💬</motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: -2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px 4px", background: "none", border: "none",
                borderBottom: `3px solid ${tab === t ? squad.accent : "transparent"}`,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                color: tab === t ? squad.accent : "#555",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {t === "WARS" && ACTIVE_WARS.length > 0 && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ width: 6, height: 6, background: "#ff6b35", borderRadius: "50%", display: "inline-block" }}
                />
              )}
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">

        {/* ── MY SQUAD ── */}
        {tab === "MY SQUAD" && (
          <>
            {/* Squad hero banner */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: squad.bg,
                border: `2.5px solid ${squad.accent}66`,
                borderRadius: 24, padding: "20px",
                boxShadow: `0 0 40px ${squad.glow}`,
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle, ${squad.accent}15 0%, transparent 70%)`, pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <motion.div
                  animate={{ boxShadow: [`0 0 16px ${squad.accent}55`, `0 0 32px ${squad.accent}88`, `0 0 16px ${squad.accent}55`] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{ fontSize: "2.5rem", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: squad.accent + "22", border: `2px solid ${squad.accent}`, borderRadius: 18 }}
                >
                  {squad.emoji}
                </motion.div>
                <div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>{squad.name}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{squad.tagline}</div>
                  {me && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: squad.accent + "22", border: `1px solid ${squad.accent}55`, color: squad.accent, borderRadius: 6, padding: "2px 8px", display: "inline-block", marginTop: 4, textTransform: "uppercase" }}>
                      {me.role === "leader" ? "👑 Leader" : me.role === "officer" ? "⭐ Officer" : "🐾 Member"}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "POWER", value: squad.power.toLocaleString(), color: squad.accent },
                  { label: "WEEKLY ⚡", value: (squad.weeklyKarma + warContrib).toLocaleString(), color: "#fff" },
                  { label: "RANK", value: `#${squad.rank}`, color: "#ffd700" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#00000044", borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${s.color}22` }}>
                    <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.08em" }}>{s.label}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: s.color, marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Weekly progress bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#555" }}>WEEKLY GOAL</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: squad.accent }}>{((squad.weeklyKarma + warContrib) / 50).toFixed(0)}% · {squad.weeklyKarma + warContrib} / 5000 ⚡</span>
                </div>
                <div style={{ height: 8, background: "#111", borderRadius: 4, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((squad.weeklyKarma + warContrib) / 5000) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${squad.accent}, ${squad.accent}aa)`, borderRadius: 4, boxShadow: `0 0 8px ${squad.accent}88` }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Member roster */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginBottom: 10 }}>
                MEMBERS ({squad.members.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {squad.members.map((m, i) => (
                  <motion.div
                    key={m.username}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      background: "#0d0d0d", border: `1.5px solid ${m.username === user.username ? squad.accent + "66" : "#1a1a1a"}`,
                      borderRadius: 16, padding: "12px 14px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1a1a1a", border: `2px solid ${m.role === "leader" ? "#ffd700" : "#222"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
                        {m.emoji}
                      </div>
                      <div style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, background: m.online ? "#4caf50" : "#555", border: "2px solid #0d0d0d", borderRadius: "50%" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.username === user.username ? squad.accent : "#fff" }}>@{m.username}</span>
                        {m.role === "leader" && <span style={{ fontSize: 11 }}>👑</span>}
                        {m.role === "officer" && <span style={{ fontSize: 11 }}>⭐</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>LV{m.level} · {m.karma.toLocaleString()} total karma</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: squad.accent }}>+{m.weeklyKarma}</div>
                      <div style={{ fontSize: 9, color: "#555" }}>this week</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleContrib}
                style={{
                  background: "linear-gradient(135deg, #1a0800, #2d1200)",
                  border: "2px solid #ff6b3555",
                  borderRadius: 16, padding: "16px 12px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  cursor: "pointer", boxShadow: "3px 3px 0px #000",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>⚔️</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#ff6b35" }}>CONTRIBUTE</span>
                <span style={{ fontSize: 10, color: "#555" }}>+50 karma to war</span>
              </motion.button>
              <Link href="/social" style={{ textDecoration: "none" }}>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: "linear-gradient(135deg, #001a1a, #002d2d)",
                    border: "2px solid #00e5ff55",
                    borderRadius: 16, padding: "16px 12px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    boxShadow: "3px 3px 0px #000",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>🏆</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#00e5ff" }}>LEADERBOARD</span>
                  <span style={{ fontSize: 10, color: "#555" }}>See all rankings</span>
                </motion.div>
              </Link>
            </div>
          </>
        )}

        {/* ── DISCOVER ── */}
        {tab === "DISCOVER" && (
          <>
            {/* Create squad CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(true)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #0d1400, #1a2800)",
                border: "2.5px dashed #c8ff0066",
                borderRadius: 20, padding: "20px 16px",
                display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#c8ff0022", border: "2px solid #c8ff00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>⚡</div>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#c8ff00", marginBottom: 2 }}>CREATE YOUR OWN SQUAD</div>
                <div style={{ fontSize: "0.78rem", color: "#555" }}>Lead your crew · Earn together · Dominate the leaderboard</div>
              </div>
              <div style={{ marginLeft: "auto", color: "#c8ff00", fontSize: "1.2rem" }}>+</div>
            </motion.button>

            <div style={{ fontSize: 11, fontWeight: 800, color: "#444", letterSpacing: "0.1em" }}>TOP SQUADS THIS WEEK</div>

            {TOP_SQUADS.map((sq, i) => (
              <SquadCard
                key={sq.id}
                squad={sq}
                onJoin={handleJoin}
                joined={joinedSquads.has(sq.id)}
              />
            ))}
          </>
        )}

        {/* ── WARS ── */}
        {tab === "WARS" && (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#ff6b35", letterSpacing: "0.1em" }}>⚔️ ACTIVE WARS</div>

            {ACTIVE_WARS.map((war, i) => {
              const total = war.ourKarma + war.theirKarma;
              const ourPct = Math.round((war.ourKarma / total) * 100);
              const winning = war.ourKarma > war.theirKarma;

              return (
                <motion.div
                  key={war.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    background: "linear-gradient(135deg, #0d0d0d, #111)",
                    border: `2px solid ${winning ? "#4caf5044" : "#ff333344"}`,
                    borderRadius: 22, padding: "18px 16px",
                    boxShadow: `0 0 20px ${winning ? "#4caf5022" : "#ff333322"}`,
                  }}
                >
                  {/* War header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: "1.6rem" }}>{squad.emoji}</div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.1em" }}>VS</div>
                      <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ fontSize: 9, fontWeight: 700, color: "#ff6b35" }}
                      >
                        ⚔️ ENDS IN {war.endsIn}
                      </motion.div>
                    </div>
                    <div style={{ fontSize: "1.6rem" }}>{war.enemyEmoji}</div>
                  </div>

                  {/* Squad names */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: squad.accent }}>{squad.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: war.accent }}>{war.enemy}</span>
                  </div>

                  {/* Battle bar */}
                  <div style={{ height: 12, background: war.accent + "44", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ourPct}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ height: "100%", background: `linear-gradient(90deg, ${squad.accent}, ${squad.accent}cc)`, borderRadius: 6, boxShadow: `0 0 10px ${squad.accent}88` }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: squad.accent }}>{(war.ourKarma + warContrib).toLocaleString()} ⚡</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: winning ? "#4caf50" : "#ff3333" }}>
                      {winning ? "🏆 WINNING" : "⚠️ BEHIND"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: war.accent }}>{war.theirKarma.toLocaleString()} ⚡</span>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleContrib}
                    style={{
                      width: "100%", padding: "13px",
                      background: "linear-gradient(135deg, #1a0800, #2d1200)",
                      border: "2px solid #ff6b35",
                      borderRadius: 14, fontSize: 13, fontWeight: 800,
                      color: "#ff6b35", cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: "3px 3px 0px #000",
                    }}
                  >
                    ⚔️ FIGHT! Contribute +50 Karma
                  </motion.button>
                </motion.div>
              );
            })}

            {/* Past wars */}
            <div style={{ fontSize: 11, fontWeight: 800, color: "#444", letterSpacing: "0.1em", marginTop: 8 }}>RECENT WARS</div>
            {[
              { enemy: "BEAST MODE", enemyEmoji: "🦁", result: "WIN", karma: "+880 ⚡", accent: "#4caf50" },
              { enemy: "MERCHANT KINGs", enemyEmoji: "💰", result: "WIN", karma: "+640 ⚡", accent: "#4caf50" },
              { enemy: "SHADOW GUILD", enemyEmoji: "🏴‍☠️", result: "LOSS", karma: "-200 ⚡", accent: "#ff3333" },
            ].map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{ background: "#0d0d0d", border: "1.5px solid #1a1a1a", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
              >
                <span style={{ fontSize: "1.3rem" }}>{w.enemyEmoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>vs {w.enemy}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: w.accent }}>{w.result}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{w.karma}</div>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Create squad modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateSquadModal onClose={() => setShowCreate(false)} onCreated={handleCreate} />
        )}
      </AnimatePresence>
    </div>
  );
}
