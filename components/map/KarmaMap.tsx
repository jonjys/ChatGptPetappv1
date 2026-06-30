"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MAP_PINS } from "@/lib/mock-data";

const PIN_COLORS: Record<string, string> = {
  bounty: "#c8ff00",
  event: "#ff6b35",
  player: "#00e5ff",
  hotspot: "#ff2d8d",
  ville: "#5ec95a",
};

export default function KarmaMap() {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const selected = MAP_PINS.find((p) => p.id === selectedPin);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { type: "bounty", label: "Bounties" },
          { type: "event", label: "Events" },
          { type: "player", label: "Players" },
          { type: "hotspot", label: "Hotspot" },
          { type: "ville", label: "Karma World" },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              style={{
                width: 10,
                height: 10,
                background: PIN_COLORS[type],
                border: "2px solid #0a0a0a",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div
        className="map-container"
        style={{ height: 260, marginBottom: selectedPin ? 0 : 12 }}
      >
        {/* Road lines */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
          <line x1="40%" y1="0%" x2="40%" y2="100%" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
          <line x1="70%" y1="0%" x2="70%" y2="100%" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <line x1="0%" y1="75%" x2="100%" y2="75%" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        </svg>

        {/* You are here */}
        <motion.div
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            background: "#0a0a0a",
            border: "3px solid #c8ff00",
            borderRadius: "50%",
            zIndex: 10,
            boxShadow: "0 0 0 6px rgba(200,255,0,0.25)",
          }}
        />

        {/* Pins */}
        {MAP_PINS.map((pin) => (
          <div
            key={pin.id}
            className="map-pin"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, zIndex: 5 }}
            onClick={() => setSelectedPin(pin.id === selectedPin ? null : pin.id)}
          >
            <motion.div
              className="map-pin-bubble"
              animate={
                selectedPin === pin.id
                  ? { scale: 1.2 }
                  : pin.type === "ville"
                  ? { scale: [1, 1.15, 1], boxShadow: ["0 0 0 0 #5ec95a55", "0 0 0 8px #5ec95a00", "0 0 0 0 #5ec95a55"] }
                  : { scale: 1 }
              }
              transition={pin.type === "ville" && selectedPin !== pin.id ? { duration: 1.8, repeat: Infinity } : undefined}
              style={{
                background: PIN_COLORS[pin.type],
                borderColor: "#0a0a0a",
                fontSize: "1rem",
              }}
            >
              {pin.emoji}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Selected pin detail */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-card-flat p-3 mb-3"
          style={{ background: PIN_COLORS[selected.type] }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#444", textTransform: "uppercase" }}>
                {selected.type}
              </div>
            </div>
            {selected.type === "ville" ? (
              <Link
                href={(selected as { href?: string }).href ?? "/ville"}
                style={{
                  background: "#0a0a0a",
                  color: "#5ec95a",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                🏙️ Besök →
              </Link>
            ) : selected.xp > 0 ? (
              <span
                style={{
                  background: "#0a0a0a",
                  color: "#c8ff00",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                +{selected.xp} XP
              </span>
            ) : null}
          </div>
        </motion.div>
      )}
    </div>
  );
}
