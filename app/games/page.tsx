"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { getDailyQuests } from "@/lib/quests";
import SpinWheel from "@/components/ui/SpinWheel";

type Game = { id: string; href: string; emoji: string; name: string; tagline: string; reward: string; accent: string; bg: string; tag?: string; players?: number; hot?: boolean };

const GAMES: Game[] = [
  { id: "ville",   href: "/ville",         emoji: "🏙️", name: "KARMA VILLE", tagline: "Bygg din stad · passiv karma · vänner besöker", reward: "Passiv: 2–60 ⚡/timme", accent: "#c8ff00", bg: "#060f06", tag: "NY 🆕", hot: true, players: 421 },
  { id: "fishing", href: "/games/fishing", emoji: "🎣", name: "DEEP CATCH", tagline: "Tap timing · 30 fish · special events", reward: "15–600 ⚡ per catch", accent: "#4488ff", bg: "#010d1a", tag: "HOT 🔥", hot: true, players: 342 },
  { id: "runner",  href: "/games/runner",  emoji: "🏃", name: "KARMA RUNNER", tagline: "UFO lasers · Aurora · Warp portals", reward: "Up to 500 ⚡", accent: "#c8ff00", bg: "#060f06", hot: true, players: 218 },
  { id: "slots",   href: "/games/slots",   emoji: "🎰", name: "KARMA SLOTS", tagline: "5 reels · Jackpot 2000⚡ · Wild WARP", reward: "Jackpot: 2000 ⚡ · Max 150/spin", accent: "#ffaa00", bg: "#1a0d00", players: 189 },
  { id: "cases",   href: "/games/cases",   emoji: "🏴‍☠️", name: "SHADOW VAULT", tagline: "Unbox rare artifacts · Roll the vault", reward: "10–800 ⚡ per vault", accent: "#cc44ff", bg: "#080010", tag: "NEW", players: 156 },
  { id: "breaker", href: "/games/breaker", emoji: "🧬", name: "DNA BREAKER", tagline: "Infinite levels · Plasma Shield · Laser", reward: "Score → karma", accent: "#cc55ff", bg: "#050510", tag: "NEW", players: 134 },
  { id: "battle",  href: "/games/battle",  emoji: "⚔️", name: "PET BATTLE", tagline: "Status effects · Boss fight · Equipment", reward: "Win: 100–300 ⚡", accent: "#ff6b35", bg: "#150a00", players: 98 },
  { id: "memory",  href: "/games/memory",  emoji: "🧠", name: "MEMORY PALACE", tagline: "Circular ring · Combo chain · 60 stars", reward: "Up to 150 ⚡", accent: "#ff44cc", bg: "#1a0015", players: 87 },
  { id: "blitz",   href: "/games/blitz",   emoji: "💥", name: "BOUNTY BLITZ", tagline: "Step counter · Savings verify · Streaks", reward: "Up to 500 ⚡", accent: "#00e5ff", bg: "#001a1a", tag: "NEW", players: 203 },
];

export default function GamesPage() {
  const { user, gameScores, questProgress, questClaimed } = useApp();
  const dailyQuests = getDailyQuests();
  const questsDone = dailyQuests.filter(q => questClaimed.includes(q.id)).length;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "#0a0a0a", borderBottom: "2.5px solid #c8ff00" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1 }}>🕹️ ARCADE</h1>
            <p style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: "0.08em", marginTop: 2 }}>{GAMES.length} GAMES · EARN REAL KARMA</p>
          </div>
          <div style={{ background: "#1a1a1a", border: "2px solid #c8ff00", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.9rem" }}>⚡</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#c8ff00" }}>{user.karma.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3">
        {/* Spin Wheel */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <SpinWheel />
        </motion.div>

        {/* KARMA POT teaser */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/karma-pot" style={{ textDecoration: "none" }}>
            <motion.div whileTap={{ scale: 0.97 }} style={{
              background: "linear-gradient(135deg, #0f1a00, #0a0a0a)",
              border: "2px solid #c8ff0055", borderRadius: 20, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 0 30px #c8ff0011",
            }}>
              <motion.div
                animate={{ scale: [1, 1.12, 1], rotate: [0, -8, 8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                style={{ fontSize: "2.2rem", flexShrink: 0 }}
              >💰</motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#c8ff00" }}>KARMA POTTEN</span>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#c8ff00", color: "#0a0a0a", padding: "2px 6px", borderRadius: 4 }}>LIVE 🔴</span>
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Spela → tjäna biljetter → vinn riktiga pengar</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#ff6b35", marginTop: 4 }}>Daglig pott: 249 kr · Vecka: 1 249 kr</div>
              </div>
              <div style={{ color: "#c8ff00", fontSize: 18 }}>→</div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Daily Quests link card */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/quests" style={{ textDecoration: "none" }}>
            <div style={{
              background: "linear-gradient(135deg, #0d1a00, #1a2a00)",
              border: "2px solid #c8ff0066", borderRadius: 20, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 0 20px #c8ff0011",
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#c8ff0018", border: "2px solid #c8ff0055", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>DAILY QUESTS</span>
                  {questsDone < dailyQuests.length && <span style={{ fontSize: 9, fontWeight: 700, background: "#ff2d8d", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>NEW</span>}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Complete quests for huge karma bonuses</div>
                <div style={{ fontSize: 11, color: "#c8ff00", fontWeight: 700, marginTop: 4 }}>
                  {questsDone}/{dailyQuests.length} done today · Bonus: +1000 ⚡
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#c8ff0022", border: "1.5px solid #c8ff0044", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>→</div>
              </div>
            </div>
          </Link>
        </motion.div>

        {GAMES.map((g, i) => {
          const score = gameScores[g.id as keyof typeof gameScores] ?? 0;
          return (
            <motion.div key={g.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <Link href={g.href} style={{ textDecoration: "none" }}>
                <div style={{
                  background: g.bg, border: `2px solid ${g.accent}44`,
                  borderRadius: 20, padding: "16px",
                  display: "flex", alignItems: "center", gap: 14,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: "100%", background: `linear-gradient(90deg, transparent, ${g.accent}08)`, pointerEvents: "none" }} />
                  <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: `${g.accent}18`, border: `2px solid ${g.accent}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", boxShadow: `0 0 12px ${g.accent}22` }}>
                    {g.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{g.name}</span>
                      {g.tag && <span style={{ fontSize: 9, fontWeight: 700, background: g.accent, color: "#000", padding: "2px 6px", borderRadius: 4 }}>{g.tag}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.tagline}</div>
                    <div style={{ fontSize: 11, color: g.accent, fontWeight: 700, marginTop: 5, opacity: 0.9 }}>{g.reward}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    {score > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: g.accent, opacity: 0.8 }}>🏆 {score}</span>}
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${g.accent}22`, border: `1.5px solid ${g.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>→</div>
                    {g.players && (
                      <div style={{ fontSize: 9, color: "#444", fontWeight: 600 }}>👥 {g.players}</div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Daily challenge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div style={{ background: "linear-gradient(135deg, #0a2000, #1a3a00)", border: "2px solid #c8ff0066", borderRadius: 20, padding: "16px", boxShadow: "0 0 20px #c8ff0011" }}>
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c8ff00", letterSpacing: "0.06em" }}>⚡ DAILY CHALLENGE</div>
              <div style={{ fontSize: 11, color: "#555" }}>Play 3 games → +500 ⚡</div>
            </div>
            <div className="flex gap-2 mt-2">
              {["fishing","cases","breaker"].map(id => {
                const g = GAMES.find(x => x.id === id)!;
                const done = (gameScores[id as keyof typeof gameScores] ?? 0) > 0;
                return (
                  <div key={id} style={{ flex: 1, padding: "8px", borderRadius: 12, textAlign: "center", background: done ? `${g.accent}22` : "#111", border: `1.5px solid ${done ? g.accent : "#222"}` }}>
                    <div style={{ fontSize: "1.2rem" }}>{done ? "✅" : g.emoji}</div>
                    <div style={{ fontSize: 9, color: done ? g.accent : "#444", fontWeight: 700, marginTop: 2 }}>{g.name.split(" ")[0]}</div>
                  </div>
                );
              })}
              <div style={{ flex: 1, padding: "8px", borderRadius: 12, textAlign: "center", background: "#c8ff0011", border: "1.5px solid #c8ff0044" }}>
                <div style={{ fontSize: "1.2rem" }}>🎁</div>
                <div style={{ fontSize: 9, color: "#c8ff00", fontWeight: 700, marginTop: 2 }}>+500 ⚡</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
