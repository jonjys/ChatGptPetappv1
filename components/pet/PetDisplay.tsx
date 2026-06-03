"use client";

import { motion } from "framer-motion";
import type { Pet } from "@/types/pet";
import {
  getPetEmoji,
  getMoodEmoji,
  getPetClassColor,
  getEvolutionLabel,
} from "@/lib/pet-evolution";

type Props = {
  pet: Pet;
  onFeed?: () => void;
};

const CLASS_BG: Record<string, string> = {
  "Grinder Beast": "#fff3ee",
  "Influencer Spirit": "#fff0f8",
  "Merchant King": "#f7ffe0",
};

export default function PetDisplay({ pet, onFeed }: Props) {
  const emoji = getPetEmoji(pet.evolution, pet.class);
  const moodEmoji = getMoodEmoji(pet.mood);
  const classColor = getPetClassColor(pet.class);
  const evolLabel = getEvolutionLabel(pet.evolution);

  return (
    <div className="neo-card-lg p-5" style={{ background: CLASS_BG[pet.class] ?? "#fff" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="heading-lg">{pet.name}</h2>
          <div className="flex gap-2 mt-1">
            <span
              className="badge"
              style={{ background: classColor, color: pet.class === "Grinder Beast" ? "#fff" : "#0a0a0a" }}
            >
              {pet.class}
            </span>
            <span className="badge" style={{ background: "#e8e3d8" }}>
              {evolLabel}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>MOOD</div>
          <div style={{ fontSize: 28 }}>{moodEmoji}</div>
        </div>
      </div>

      {/* Pet Avatar */}
      <div className="flex justify-center my-6">
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, -3, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center"
          style={{
            width: 140,
            height: 140,
            background: "#fff",
            border: "4px solid #0a0a0a",
            borderRadius: "50%",
            boxShadow: `6px 6px 0px ${classColor}`,
            fontSize: "5rem",
          }}
        >
          {emoji}
        </motion.div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-5">
        {(["action", "social", "commerce"] as const).map((stat) => {
          const colors: Record<string, string> = {
            action: "#ff6b35",
            social: "#ff2d8d",
            commerce: "#c8ff00",
          };
          const labels: Record<string, string> = {
            action: "⚡ ACTION",
            social: "💬 SOCIAL",
            commerce: "💰 COMMERCE",
          };
          return (
            <div key={stat}>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>{labels[stat]}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{pet.stats[stat]}</span>
              </div>
              <div className="stat-track">
                <motion.div
                  className="stat-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${pet.stats[stat]}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  style={{ background: colors[stat] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Abilities */}
      <div className="mb-5">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8 }}>
          ABILITIES
        </div>
        <div className="flex flex-wrap gap-2">
          {pet.unlockedAbilities.map((ability) => (
            <span
              key={ability}
              style={{
                padding: "4px 10px",
                background: "#0a0a0a",
                color: "#c8ff00",
                border: "2px solid #0a0a0a",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {ability}
            </span>
          ))}
        </div>
      </div>

      {/* Feed button */}
      {onFeed && (
        <button
          className="btn-primary w-full py-3 text-base"
          onClick={onFeed}
          style={{ letterSpacing: "0.05em" }}
        >
          🍖 FEED PET · -75 KARMA
        </button>
      )}
    </div>
  );
}
