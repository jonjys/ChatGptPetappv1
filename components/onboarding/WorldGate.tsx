"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WORLDS, WORLD_STORAGE_KEY } from "@/lib/worlds";
import type { WorldId } from "@/types/world";

export default function WorldGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<WorldId | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(WORLD_STORAGE_KEY);
    if (saved) {
      setReady(true);
    } else {
      // Auto-select city as default — never block the whole app
      localStorage.setItem(WORLD_STORAGE_KEY, "city");
      setReady(true);
      // Don't show the gate (it's shown from Settings instead)
    }
  }, []);

  function confirm() {
    if (!selected || confirming) return;
    localStorage.setItem(WORLD_STORAGE_KEY, selected);
    setConfirming(true);
    setTimeout(() => setShow(false), 700);
  }

  const selectedWorld = WORLDS.find(w => w.id === selected);

  return (
    <>
      {ready && children}

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: confirming && selectedWorld ? selectedWorld.bg : "#050510",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 20px",
              overflow: "hidden",
            }}
          >
            {/* Background stars */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: i % 4 === 0 ? 3 : 2,
                    height: i % 4 === 0 ? 3 : 2,
                    background: "#ffffff",
                    borderRadius: "50%",
                    top: `${Math.sin(i * 137.5) * 50 + 50}%`,
                    left: `${Math.cos(i * 137.5) * 50 + 50}%`,
                    opacity: 0.2 + (i % 5) * 0.12,
                  }}
                />
              ))}
            </div>

            {/* Logo */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{ textAlign: "center", marginBottom: 8 }}
            >
              <div style={{
                fontSize: "2.4rem",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "#fff",
              }}>
                <span style={{ color: "#c8ff00" }}>K</span>ARMA
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#888", fontWeight: 600, marginTop: 2 }}>
                REAL LIFE · GAME ENGINE ⚡
              </div>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ textAlign: "center", marginBottom: 28, marginTop: 20 }}
            >
              <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                VÄLJ DIN VÄRLD.
              </h1>
              <p style={{ fontSize: 14, color: "#777", fontWeight: 500, marginTop: 6 }}>
                Välj miljön din pet ska leva i.
              </p>
            </motion.div>

            {/* World grid */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                width: "100%",
                maxWidth: 340,
                marginBottom: 24,
              }}
            >
              {WORLDS.map((world, i) => {
                const isSelected = selected === world.id;
                return (
                  <motion.button
                    key={world.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.07 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(world.id)}
                    style={{
                      background: isSelected ? `${world.accent}18` : "#111",
                      border: `2.5px solid ${isSelected ? world.accent : "#333"}`,
                      borderRadius: 16,
                      padding: "16px 12px",
                      cursor: "pointer",
                      textAlign: "center",
                      boxShadow: isSelected ? `0 0 0 1px ${world.accent}, 0 0 20px ${world.glowColor}` : "none",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="worldCheck"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 20,
                          height: 20,
                          background: world.accent,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#000",
                        }}
                      >
                        ✓
                      </motion.div>
                    )}
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>{world.emoji}</div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isSelected ? world.accent : "#fff",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}>
                      {world.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>
                      {world.tagline}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Confirm button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{ width: "100%", maxWidth: 340 }}
            >
              <button
                onClick={confirm}
                disabled={!selected || confirming}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: selected ? (selectedWorld?.accent ?? "#c8ff00") : "#222",
                  border: `3px solid ${selected ? (selectedWorld?.accent ?? "#c8ff00") : "#333"}`,
                  borderRadius: 16,
                  fontSize: 16,
                  fontWeight: 700,
                  color: selected ? "#000" : "#444",
                  cursor: selected ? "pointer" : "default",
                  letterSpacing: "0.04em",
                  transition: "all 0.25s ease",
                  boxShadow: selected
                    ? `4px 4px 0px #000, 0 0 24px ${selectedWorld?.glowColor}`
                    : "none",
                }}
              >
                {confirming
                  ? `🌟 ${selectedWorld?.emoji} Välkommen till ${selectedWorld?.name}!`
                  : selected
                  ? `VÄLJ ${selectedWorld?.name} →`
                  : "VÄLJ VÄRLD →"}
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{ fontSize: 11, color: "#444", marginTop: 16, textAlign: "center" }}
            >
              Du kan alltid byta värld senare i inställningar.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
