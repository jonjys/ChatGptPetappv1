"use client";

import { motion } from "framer-motion";
import type { PetNeeds } from "@/types/pet";

const NEEDS_CONFIG = [
  { key: "hunger" as const, label: "HUNGER", icon: "🍖", color: "#ff6b35", warnColor: "#ff2d2d", warnAt: 30 },
  { key: "happiness" as const, label: "HAPPY", icon: "😊", color: "#ff2d8d", warnColor: "#ff2d8d", warnAt: 25 },
  { key: "energy" as const, label: "ENERGY", icon: "⚡", color: "#c8ff00", warnColor: "#ffde00", warnAt: 20 },
];

export default function PetNeedsBar({ needs }: { needs: PetNeeds }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {NEEDS_CONFIG.map(({ key, label, icon, color, warnColor, warnAt }) => {
        const val = needs[key];
        const isCritical = val < warnAt;
        const barColor = isCritical ? warnColor : color;

        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: "0.9rem" }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: isCritical ? warnColor : "#777" }}>
                  {label} {isCritical && "⚠️"}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: isCritical ? warnColor : "#999" }}>{val}%</span>
            </div>
            <div style={{ height: 10, background: "#e8e3d8", border: "2px solid #0a0a0a", borderRadius: 999, overflow: "hidden", boxShadow: isCritical ? `0 0 0 2px ${warnColor}44` : "none" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${val}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  height: "100%",
                  background: isCritical
                    ? `repeating-linear-gradient(45deg, ${barColor}, ${barColor} 4px, ${barColor}88 4px, ${barColor}88 8px)`
                    : barColor,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
