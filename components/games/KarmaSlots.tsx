"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SYMBOLS = ["🎯", "⚡", "🔥", "💎", "🌟", "🦁", "🏆", "🎪"];
const PAYOUTS: Record<string, number> = {
  "🌟🌟🌟": 500, "💎💎💎": 250, "⚡⚡⚡": 150,
  "🎯🎯🎯": 120, "🔥🔥🔥": 100, "🏆🏆🏆": 80,
  "🦁🦁🦁": 60,  "🎪🎪🎪": 40,
};
const SPIN_COST = 25;

type Props = { karma: number; onSpin: (cost: number) => boolean; onWin: (amount: number) => void };

export default function KarmaSlots({ karma, onSpin, onWin }: Props) {
  const [reels, setReels] = useState(["🎯", "💎", "🌟"]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ win: number; msg: string } | null>(null);
  const [spins, setSpins] = useState(0);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  function spin() {
    if (spinning || karma < SPIN_COST) return;
    if (!onSpin(SPIN_COST)) return;

    setResult(null);
    setSpinning(true);
    setSpins(s => s + 1);

    const finalSymbols: string[] = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    // Guaranteed jackpot every ~20 spins for fun
    if (spins > 0 && spins % 19 === 0) {
      finalSymbols[0] = finalSymbols[1] = finalSymbols[2] = "🌟";
    }

    const stopTimes = [900, 1300, 1700];
    const newReels = [...reels];
    let cnt = 0;

    intervals.current.forEach(clearInterval);
    intervals.current = [];

    for (let r = 0; r < 3; r++) {
      let t = 0;
      const iv = setInterval(() => {
        t++;
        setReels(prev => { const n = [...prev]; n[r] = SYMBOLS[t % SYMBOLS.length]; return n; });
      }, 75);
      intervals.current.push(iv);

      setTimeout(() => {
        clearInterval(iv);
        newReels[r] = finalSymbols[r];
        setReels([...newReels]);

        if (r === 2) {
          setSpinning(false);
          const combo = finalSymbols.join("");
          const win = PAYOUTS[combo] ?? (
            finalSymbols[0] === finalSymbols[1] || finalSymbols[1] === finalSymbols[2] || finalSymbols[0] === finalSymbols[2] ? 25 : 0
          );
          if (win > 0) {
            onWin(win);
            const isJackpot = win >= 500;
            setResult({ win, msg: isJackpot ? "🎉 JACKPOT!!" : win >= 150 ? "🔥 BIG WIN!" : "✨ WIN!" });
          } else {
            setResult({ win: 0, msg: "Try again..." });
          }
        }
      }, stopTimes[r]);
    }
  }

  const canSpin = !spinning && karma >= SPIN_COST;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {/* Machine body */}
      <div style={{ background: "#1a1000", border: "3px solid #ffde00", borderRadius: 20, padding: 24, boxShadow: "0 0 30px #ffde0044, 6px 6px 0px #0a0a0a", width: "100%", maxWidth: 340 }}>
        {/* Title */}
        <div style={{ textAlign: "center", color: "#ffde00", fontSize: 13, fontWeight: 700, letterSpacing: 4, marginBottom: 16, textShadow: "0 0 10px #ffde0088" }}>
          ★ KARMA SLOTS ★
        </div>

        {/* Reels */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {reels.map((sym, i) => (
            <motion.div
              key={i}
              animate={spinning && i === 0 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.15 }}
              style={{
                width: 86, height: 86,
                background: "#0a0a0a",
                border: "2px solid #ffde00",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "3rem",
                boxShadow: spinning ? "0 0 12px #ffde0066" : "none",
              }}
            >
              {sym}
            </motion.div>
          ))}
        </div>

        {/* Payline indicator */}
        <div style={{ height: 2, background: "#ffde00", marginBottom: 16, borderRadius: 1, boxShadow: "0 0 8px #ffde00" }} />

        {/* Result */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.msg}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                textAlign: "center", marginBottom: 16,
                color: result.win > 0 ? "#c8ff00" : "#666",
                fontSize: result.win >= 200 ? 22 : 16,
                fontWeight: 700,
              }}
            >
              {result.msg}
              {result.win > 0 && <span style={{ color: "#ffde00", marginLeft: 8 }}>+{result.win} ⚡</span>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={!canSpin}
          style={{
            width: "100%", padding: "14px",
            background: canSpin ? "#ffde00" : "#333",
            border: "3px solid " + (canSpin ? "#0a0a0a" : "#555"),
            borderRadius: 14,
            fontSize: 16, fontWeight: 700,
            color: canSpin ? "#0a0a0a" : "#666",
            cursor: canSpin ? "pointer" : "not-allowed",
            boxShadow: canSpin ? "4px 4px 0px #0a0a0a" : "none",
            transition: "all 0.1s",
            letterSpacing: 2,
          }}
        >
          {spinning ? "SPINNING..." : `SPIN · -${SPIN_COST} ⚡`}
        </button>

        {karma < SPIN_COST && <p style={{ color: "#ff2d8d", fontSize: 12, textAlign: "center", marginTop: 8, fontWeight: 600 }}>Need {SPIN_COST} karma to spin</p>}
      </div>

      {/* Payout table */}
      <div style={{ width: "100%", maxWidth: 340, background: "#111", border: "2px solid #333", borderRadius: 14, padding: "12px 16px" }}>
        <div style={{ color: "#ffde00", fontSize: 11, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>PAYOUT TABLE</div>
        {Object.entries(PAYOUTS).slice(0, 5).map(([combo, payout]) => (
          <div key={combo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid #222" }}>
            <span style={{ fontSize: "1rem" }}>{combo}</span>
            <span style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700 }}>+{payout} ⚡</span>
          </div>
        ))}
        <div style={{ color: "#666", fontSize: 11, marginTop: 6 }}>Any 2 matching = +25 ⚡</div>
      </div>
    </div>
  );
}
