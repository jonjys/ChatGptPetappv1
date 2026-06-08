"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";

type Game = { id: string; href: string; emoji: string; name: string; tagline: string; reward: string; accent: string; bg: string; tag?: string };

const GAMES: Game[] = [
  { id: "fishing", href: "/games/fishing", emoji: "🎣", name: "DEEP CATCH", tagline: "Tap timing · catch rare fish", reward: "15–300 ⚡ per catch", accent: "#4488ff", bg: "#010d1a", tag: "NEW" },
  { id: "cases",   href: "/games/cases",   emoji: "📦", name: "CASE OPENING", tagline: "CSGO-style unboxing · roulette reel", reward: "10–800 ⚡ per case", accent: "#ffcc00", bg: "#0a0a00", tag: "NEW" },
  { id: "breaker", href: "/games/breaker", emoji: "🧬", name: "DNA BREAKER", tagline: "Breakout · Collect DNA · Fusion Strike", reward: "Score → karma", accent: "#cc55ff", bg: "#050510", tag: "NEW" },
  { id: "runner",  href: "/games/runner",  emoji: "🏃", name: "KARMA RUNNER", tagline: "Endless runner · dodge & collect gems", reward: "Up to 200 ⚡", accent: "#c8ff00", bg: "#0a0a0a" },
  { id: "slots",   href: "/games/slots",   emoji: "🎰", name: "KARMA SLOTS", tagline: "Spin to win big karma", reward: "Jackpot: 500 ⚡ · 25/spin", accent: "#ffaa00", bg: "#1a0d00" },
  { id: "memory",  href: "/games/memory",  emoji: "🧠", name: "MEMORY PALACE", tagline: "Match all pairs before time runs out", reward: "Up to 150 ⚡", accent: "#ff44cc", bg: "#1a0015" },
  { id: "battle",  href: "/games/battle",  emoji: "⚔️", name: "PET BATTLE", tagline: "Turn-based combat vs real pets", reward: "Win: 100+ ⚡", accent: "#ff6b35", bg: "#150a00" },
  { id: "blitz",   href: "/games/blitz",   emoji: "💥", name: "BOUNTY BLITZ", tagline: "Race-swipe bounties in 30 seconds", reward: "Up to 250 ⚡", accent: "#00e5ff", bg: "#001a1a" },
];

export default function GamesPage() {
  const { user, gameScores } = useApp();

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
