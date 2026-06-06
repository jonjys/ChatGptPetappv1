"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { GAME_META } from "@/lib/mock-data";

const DAILY_GAMES = ["runner", "memory", "blitz"];

export default function GamesPage() {
  const { user, gameScores } = useApp();
  const highScores: Record<string, number> = {
    runner: gameScores.runner,
    slots: gameScores.slots,
    memory: gameScores.memory,
    battle: gameScores.battle,
    blitz: gameScores.blitz,
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "#0a0a0a", borderBottom: "3px solid #c8ff00" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: "#c8ff00" }}>
              🕹️ ARCADE
            </h1>
            <p style={{ fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: "0.08em" }}>5 GAMES · EARN REAL KARMA</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "#c8ff00", border: "2.5px solid #c8ff00", borderRadius: 12, boxShadow: "3px 3px 0px #c8ff0044" }}>
            <Zap size={14} color="#0a0a0a" fill="#0a0a0a" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0a0a0a" }}>{user.karma.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Daily reward */}
        <div style={{ background: "#0d1800", border: "2.5px solid #c8ff00", borderRadius: 16, padding: "14px 16px", boxShadow: "0 0 20px #c8ff0022" }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ color: "#c8ff00", fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>⭐ DAILY REWARD</div>
              <div style={{ color: "#aaa", fontSize: 13, marginTop: 2 }}>Play any 3 games today for a bonus</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {DAILY_GAMES.map(id => (
                <div key={id} style={{ width: 28, height: 28, borderRadius: 8, background: highScores[id] > 0 ? "#c8ff00" : "#1a2200", border: "2px solid #c8ff00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                  {highScores[id] > 0 ? "✓" : "·"}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Games grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {GAME_META.map((game, i) => (
            <motion.div key={game.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
              <Link href={`/games/${game.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: game.bgColor,
                  border: `3px solid ${game.accentColor}`,
                  borderRadius: 18,
                  padding: "16px",
                  boxShadow: `4px 4px 0px ${game.accentColor}44`,
                  transition: "transform 0.12s, box-shadow 0.12s",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 64, height: 64, flexShrink: 0,
                    background: game.accentColor + "18",
                    border: `2.5px solid ${game.accentColor}`,
                    borderRadius: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2.2rem",
                  }}>
                    {game.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: game.accentColor, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>{game.name}</div>
                    <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{game.tagline}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span style={{ color: "#555", fontSize: 11, fontWeight: 600 }}>{game.rewardDesc}</span>
                      {game.cost && <span style={{ color: game.accentColor, fontSize: 11, fontWeight: 700 }}>-{game.cost} ⚡ per spin</span>}
                    </div>
                    {highScores[game.id] > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy size={10} color={game.accentColor} />
                        <span style={{ color: game.accentColor, fontSize: 11, fontWeight: 700 }}>BEST: {highScores[game.id]}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ color: game.accentColor, fontSize: "1.3rem", flexShrink: 0 }}>→</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Leaderboard teaser */}
        <div style={{ background: "#0d0d0d", border: "2px solid #333", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ color: "#ffde00", fontSize: 12, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>🏆 ARCADE LEADERBOARD</div>
          {[
            { rank: 1, name: "ironforge", score: 9842, emoji: "⚒️" },
            { rank: 2, name: "zenmaster", score: 7651, emoji: "🧘" },
            { rank: 3, name: "tradeknight", score: 6200, emoji: "⚔️" },
            { rank: 42, name: "karmasonic", score: gameScores.runner + gameScores.blitz + gameScores.memory, emoji: "🦊" },
          ].map(entry => (
            <div key={entry.name} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: entry.rank <= 3 ? "#ffde00" : "#555", width: 28, textAlign: "center" }}>
                {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
              </span>
              <span style={{ fontSize: "1.1rem" }}>{entry.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{entry.name === "karmasonic" ? <span style={{ color: "#c8ff00" }}>{entry.name} <span style={{ fontSize: 10 }}>(you)</span></span> : entry.name}</span>
              <span style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700 }}>{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
