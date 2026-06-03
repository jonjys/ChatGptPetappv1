"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Filter } from "lucide-react";
import KarmaMap from "@/components/map/KarmaMap";
import { BOUNTIES, MAP_PINS } from "@/lib/mock-data";
import { useBounties } from "@/hooks/useBounties";
import { useApp } from "@/context/AppContext";

const FILTERS = ["ALL", "BOUNTIES", "EVENTS", "PLAYERS"] as const;
type Filter = (typeof FILTERS)[number];

const DIFF_STYLE: Record<string, { bg: string; color: string }> = {
  easy: { bg: "#d4f5c0", color: "#1b5e20" },
  medium: { bg: "#fff3c4", color: "#e65100" },
  hard: { bg: "#ffd0d0", color: "#b71c1c" },
  legendary: { bg: "#e8d5ff", color: "#4c1d95" },
};

export default function MapPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const { bounties, claimed, claimBounty } = useBounties();
  const { addXP, addKarma } = useApp();

  const nearbyBounties = bounties.filter((b) => b.distance && b.isActive).slice(0, 5);

  function handleClaim(id: string, xp: number, karma: number) {
    claimBounty(id);
    addXP(xp);
    addKarma(karma);
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}
            >
              LIVE MAP
            </h1>
            <p style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>
              {MAP_PINS.length} ACTIVITIES NEARBY
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{
              background: "#00e5ff",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
              boxShadow: "3px 3px 0px #0a0a0a",
            }}
          >
            <Navigation size={14} color="#0a0a0a" />
            <span style={{ fontSize: 12, fontWeight: 700 }}>LIVE</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-4 py-1.5"
              style={{
                background: filter === f ? "#0a0a0a" : "#fff",
                border: "2.5px solid #0a0a0a",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: filter === f ? "#c8ff00" : "#0a0a0a",
                boxShadow: filter === f ? "none" : "2px 2px 0px #0a0a0a",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Map */}
        <KarmaMap />

        {/* Nearby activities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>NEARBY BOUNTIES</h2>
            <button
              className="flex items-center gap-1 px-3 py-1.5 btn-ghost"
              style={{ fontSize: 12 }}
            >
              <Filter size={14} />
              Filter
            </button>
          </div>

          <div className="space-y-3">
            {nearbyBounties.map((bounty, i) => {
              const diff = DIFF_STYLE[bounty.difficulty];
              const isClaimed = claimed.has(bounty.id);

              return (
                <motion.div
                  key={bounty.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="neo-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          background: "#faf7f2",
                          border: "2px solid #0a0a0a",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                          flexShrink: 0,
                        }}
                      >
                        {bounty.categoryEmoji}
                      </div>
                      <div className="flex-1">
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                          {bounty.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="badge"
                            style={{ background: diff.bg, color: diff.color, fontSize: 10 }}
                          >
                            {bounty.difficulty}
                          </span>
                          {bounty.distance && (
                            <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>
                              📍 {bounty.distance}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>
                            {bounty.completions}/{bounty.maxCompletions} done
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        style={{
                          background: "#c8ff00",
                          border: "2px solid #0a0a0a",
                          borderRadius: 8,
                          padding: "3px 8px",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        +{bounty.xpReward} XP
                      </span>
                      <button
                        onClick={() => !isClaimed && handleClaim(bounty.id, bounty.xpReward, bounty.karmaReward)}
                        style={{
                          padding: "6px 14px",
                          background: isClaimed ? "#e8e3d8" : "#0a0a0a",
                          border: "2.5px solid #0a0a0a",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          color: isClaimed ? "#888" : "#c8ff00",
                          cursor: isClaimed ? "default" : "pointer",
                        }}
                      >
                        {isClaimed ? "CLAIMED ✓" : "CLAIM"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Players nearby */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>PLAYERS NEARBY</h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {[
              { name: "tradeknight", emoji: "⚔️", level: 15, online: true },
              { name: "lunavibes", emoji: "🌙", level: 8, online: true },
              { name: "neonmiku", emoji: "✨", level: 10, online: false },
              { name: "pixelrush", emoji: "🎮", level: 5, online: true },
            ].map((player) => (
              <div
                key={player.name}
                className="flex-shrink-0 neo-card-flat p-3 text-center"
                style={{ minWidth: 80 }}
              >
                <div
                  className="relative mx-auto mb-1.5"
                  style={{
                    width: 44,
                    height: 44,
                    background: "#faf7f2",
                    border: "2px solid #0a0a0a",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}
                >
                  {player.emoji}
                  <span
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 1,
                      width: 10,
                      height: 10,
                      background: player.online ? "#4caf50" : "#aaa",
                      border: "2px solid #fff",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>@{player.name}</div>
                <div
                  style={{
                    fontSize: 10,
                    background: "#c8ff00",
                    border: "1.5px solid #0a0a0a",
                    borderRadius: 6,
                    padding: "1px 4px",
                    marginTop: 3,
                    fontWeight: 700,
                    display: "inline-block",
                  }}
                >
                  LV {player.level}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
