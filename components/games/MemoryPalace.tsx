"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PAIRS = ["🦁","🦋","💎","⚡","🌟","🎯","🔥","🏆","🎪","🦊","🐲","🌋","🧠","💫","🎮","🌙"];
const GRID_SIZE = 16;
const TIME_LIMIT = 90;

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function makeCards(): Card[] {
  const emojis = [...PAIRS.slice(0, GRID_SIZE / 2), ...PAIRS.slice(0, GRID_SIZE / 2)];
  for (let i = emojis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojis[i], emojis[j]] = [emojis[j], emojis[i]];
  }
  return emojis.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

type Props = { onEnd: (matched: number, time: number) => void };

export default function MemoryPalace({ onEnd }: Props) {
  const [cards, setCards] = useState<Card[]>(makeCards);
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [matched, setMatched] = useState(0);

  const start = useCallback(() => { setPhase("on"); setCards(makeCards()); setMatched(0); setTimeLeft(TIME_LIMIT); setSelected([]); }, []);
  const restart = useCallback(() => start(), [start]);

  // Timer
  useEffect(() => {
    if (phase !== "on") return;
    if (timeLeft <= 0) { setPhase("over"); onEnd(matched, 0); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, matched, onEnd]);

  function flip(id: number) {
    if (phase !== "on" || locked) return;
    const card = cards[id];
    if (card.flipped || card.matched || selected.includes(id)) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newSel = [...selected, id];
    setCards(newCards);
    setSelected(newSel);

    if (newSel.length === 2) {
      setLocked(true);
      const [a, b] = newSel;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, matched: true } : c));
          setMatched(m => {
            const newM = m + 1;
            if (newM === GRID_SIZE / 2) {
              setPhase("over");
              onEnd(newM, timeLeft);
            }
            return newM;
          });
          setSelected([]); setLocked(false);
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, flipped: false } : c));
          setSelected([]); setLocked(false);
        }, 850);
      }
    }
  }

  const progress = (matched / (GRID_SIZE / 2)) * 100;
  const timerColor = timeLeft <= 10 ? "#ff2d8d" : timeLeft <= 25 ? "#ff6b35" : "#8b5cf6";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#8b5cf6", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>MEMORY PALACE</div>
          <div style={{ color: "#555", fontSize: 12 }}>{matched}/{GRID_SIZE / 2} pairs found</div>
        </div>
        {phase === "on" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: timerColor, fontSize: 28, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }}>{timeLeft}s</div>
            <div style={{ color: "#555", fontSize: 11 }}>remaining</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, background: "#1a1a2a", border: "2px solid #8b5cf6", borderRadius: 999 }}>
        <motion.div animate={{ width: `${progress}%` }} style={{ height: "100%", background: "#8b5cf6", borderRadius: 999 }} transition={{ type: "spring", stiffness: 120 }} />
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {cards.map(card => (
          <motion.div
            key={card.id}
            onClick={() => flip(card.id)}
            whileTap={{ scale: 0.94 }}
            style={{
              aspectRatio: "1",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: phase === "on" && !card.matched ? "pointer" : "default",
              border: card.matched ? "2px solid #8b5cf6" : "2px solid #333",
              background: card.matched ? "#1a0d2e" : card.flipped ? "#1a1040" : "#0d0a1a",
              boxShadow: card.matched ? "0 0 8px #8b5cf644" : "none",
              transition: "background 0.2s, border-color 0.2s",
              fontSize: "1.5rem",
            }}
          >
            <AnimatePresence mode="wait">
              {card.flipped || card.matched ? (
                <motion.span key="face" initial={{ scale: 0, rotateY: 90 }} animate={{ scale: 1, rotateY: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                  {card.emoji}
                </motion.span>
              ) : (
                <motion.span key="back" initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: "1.1rem", color: "#333" }}>❓</motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Start / Over overlay */}
      {phase === "idle" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>Match all {GRID_SIZE / 2} pairs as fast as possible. You have {TIME_LIMIT} seconds.</div>
          <button onClick={start} style={{ padding: "12px 40px", background: "#8b5cf6", border: "3px solid #0a0a0a", borderRadius: 14, fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a" }}>START GAME</button>
        </div>
      )}

      {phase === "over" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", padding: 20, background: "#0d0a1a", border: "3px solid #8b5cf6", borderRadius: 16 }}>
          <div style={{ fontSize: "2rem", marginBottom: 6 }}>{matched === GRID_SIZE / 2 ? "🎉" : "⏰"}</div>
          <div style={{ color: "#8b5cf6", fontSize: 18, fontWeight: 700 }}>{matched === GRID_SIZE / 2 ? "CLEARED!" : "TIME UP!"}</div>
          <div style={{ color: "#c8ff00", fontSize: 22, fontWeight: 700, margin: "6px 0" }}>{matched}/{GRID_SIZE / 2} pairs</div>
          <div style={{ color: "#aaa", fontSize: 13, marginBottom: 14 }}>
            {matched === GRID_SIZE / 2 ? `+${timeLeft * 2 + 50} karma earned!` : `+${matched * 12} karma partial reward`}
          </div>
          <button onClick={restart} style={{ padding: "10px 32px", background: "#8b5cf6", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "3px 3px 0 #0a0a0a" }}>PLAY AGAIN</button>
        </motion.div>
      )}
    </div>
  );
}
