"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SYMBOLS = ["🐾", "⚡", "🔥", "💎", "🐱", "🌟", "🏆", "🍖"];
const JACKPOT_SYMBOL = "🌟";

const PAYOUTS: Record<string, number> = {
  "🌟🌟🌟": 500,
  "💎💎💎": 250,
  "⚡⚡⚡": 150,
  "🏆🏆🏆": 120,
  "🔥🔥🔥": 100,
  "🐱🐱🐱": 80,
  "🐾🐾🐾": 60,
  "🍖🍖🍖": 40,
};

const PAYOUT_BG: Record<string, string> = {
  "🌟🌟🌟": "#2a1f00",
  "💎💎💎": "#001a2a",
  "⚡⚡⚡": "#1a1a00",
  "🏆🏆🏆": "#1a0a00",
  "🔥🔥🔥": "#1a0800",
  "🐱🐱🐱": "#0a001a",
  "🐾🐾🐾": "#001a0a",
  "🍖🍖🍖": "#1a0a0a",
};

const SPIN_COST = 25;
const BONUS_ROUND_INTERVAL = 15;

type Props = { karma: number; onSpin: (cost: number) => boolean; onWin: (amount: number) => void };

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
}

export default function KarmaSlots({ karma, onSpin, onWin }: Props) {
  const [reels, setReels] = useState(["🐾", "💎", "🌟"]);
  // Each reel tracks its own "scroll offset" for the vertical animation
  const [reelOffsets, setReelOffsets] = useState([0, 0, 0]);
  const [reelStopped, setReelStopped] = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ win: number; msg: string } | null>(null);
  const [spins, setSpins] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [bonusRound, setBonusRound] = useState(false);
  const [bonusSpinsLeft, setBonusSpinsLeft] = useState(0);
  const [showBonusBanner, setShowBonusBanner] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [petReaction, setPetReaction] = useState<"happy" | "sad" | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);
  const animFrames = useRef<ReturnType<typeof setInterval>[]>([]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      intervals.current.forEach(clearInterval);
      animFrames.current.forEach(clearInterval);
    };
  }, []);

  function triggerParticles() {
    const colors = ["#ffde00", "#c8ff00", "#00e5ff", "#ff2d8d", "#ff6b35", "#fff"];
    const newParticles: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: (i / 24) * 360 + Math.random() * 15,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1600);
  }

  function spin() {
    if (spinning || karma < SPIN_COST) return;

    // Bonus round: free spins
    let isFreeSpIn = false;
    if (bonusRound && bonusSpinsLeft > 0) {
      isFreeSpIn = true;
      setBonusSpinsLeft(b => b - 1);
      if (bonusSpinsLeft - 1 <= 0) setBonusRound(false);
    }

    if (!isFreeSpIn && !onSpin(SPIN_COST)) return;

    setResult(null);
    setPetReaction(null);
    setShowJackpot(false);
    setSpinning(true);

    const nextSpins = spins + 1;
    setSpins(nextSpins);

    // Trigger bonus round every BONUS_ROUND_INTERVAL spins
    if (nextSpins % BONUS_ROUND_INTERVAL === 0) {
      setShowBonusBanner(true);
      setBonusRound(true);
      setBonusSpinsLeft(3);
      setTimeout(() => setShowBonusBanner(false), 2500);
    }

    const finalSymbols: string[] = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    // Guaranteed jackpot every ~20 spins
    if (spins > 0 && spins % 19 === 0) {
      finalSymbols[0] = finalSymbols[1] = finalSymbols[2] = JACKPOT_SYMBOL;
    }

    // Animate reel offsets — rapid increment to simulate scroll
    const stopTimes = [900, 1300, 1700];
    setReelStopped([false, false, false]);

    // Start scroll animation per reel
    for (let r = 0; r < 3; r++) {
      let frame = 0;
      const iv = setInterval(() => {
        frame++;
        setReelOffsets(prev => {
          const next = [...prev];
          next[r] = frame * 86; // scroll by one symbol height per tick
          return next;
        });
      }, 60);
      intervals.current.push(iv);

      const rCopy = r;
      setTimeout(() => {
        clearInterval(iv);
        setReels(prev => {
          const n = [...prev];
          n[rCopy] = finalSymbols[rCopy];
          return n;
        });
        setReelOffsets(prev => {
          const next = [...prev];
          next[rCopy] = 0;
          return next;
        });
        setReelStopped(prev => {
          const next = [...prev];
          next[rCopy] = true;
          return next;
        });

        if (rCopy === 2) {
          setSpinning(false);
          const combo = finalSymbols.join("");
          let win = PAYOUTS[combo] ?? (
            finalSymbols[0] === finalSymbols[1] || finalSymbols[1] === finalSymbols[2] || finalSymbols[0] === finalSymbols[2] ? 25 : 0
          );

          // Bonus round doubles all wins
          if (bonusRound && win > 0) win = win * 2;

          // Hot streak multiplier (3+ wins): +50%
          const currentStreak = win > 0 ? winStreak + 1 : 0;
          if (win > 0 && currentStreak >= 3) {
            win = Math.floor(win * 1.5);
          }

          if (win > 0) {
            onWin(win);
            const newStreak = winStreak + 1;
            setWinStreak(newStreak);
            setLossStreak(0);
            const isJackpot = combo === `${JACKPOT_SYMBOL}${JACKPOT_SYMBOL}${JACKPOT_SYMBOL}`;
            let msg = "✨ WIN!";
            if (isJackpot) msg = "🌟 JACKPOT!!";
            else if (win >= 300) msg = "🔥 MEGA WIN!";
            else if (win >= 150) msg = "🔥 BIG WIN!";
            setResult({ win, msg });

            if (isJackpot) {
              setShowJackpot(true);
              triggerParticles();
              setTimeout(() => setShowJackpot(false), 3000);
            }

            // Pet reaction: happy after any win
            setPetReaction("happy");
            setTimeout(() => setPetReaction(null), 2500);
          } else {
            const newLoss = lossStreak + 1;
            setLossStreak(newLoss);
            setWinStreak(0);
            setResult({ win: 0, msg: "Try again..." });
            // Sad pet after 3 losses in a row
            if (newLoss >= 3) {
              setPetReaction("sad");
              setTimeout(() => setPetReaction(null), 2500);
            }
          }
        }
      }, stopTimes[r]);
    }
  }

  const canSpin = !spinning && karma >= SPIN_COST;
  const hotStreak = winStreak >= 3;
  const inBonusActive = bonusRound && bonusSpinsLeft > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative" }}>

      {/* BONUS ROUND banner */}
      <AnimatePresence>
        {showBonusBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.8 }}
            style={{
              position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
              zIndex: 9999,
              background: "linear-gradient(135deg, #ff6b00, #ffde00)",
              border: "4px solid #0a0a0a",
              borderRadius: 20, padding: "14px 32px",
              fontSize: 22, fontWeight: 900, color: "#0a0a0a",
              letterSpacing: 3, textAlign: "center",
              boxShadow: "0 0 40px #ffde00aa, 6px 6px 0 #0a0a0a",
            }}
          >
            🎰 KARMA RUSH! 🎰<br />
            <span style={{ fontSize: 13, fontWeight: 700 }}>3 FREE SPINS — ALL WINS DOUBLED!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti particles for jackpot */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: "50%", y: "50%", scale: 1 }}
            animate={{
              opacity: 0,
              x: `calc(50% + ${Math.cos((p.angle * Math.PI) / 180) * 160}px)`,
              y: `calc(50% + ${Math.sin((p.angle * Math.PI) / 180) * 160}px)`,
              scale: 0.3,
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: 10, height: 10,
              borderRadius: 2,
              background: p.color,
              pointerEvents: "none",
              zIndex: 100,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Pet reaction */}
      <AnimatePresence>
        {petReaction && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            style={{
              position: "absolute", top: -10, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: petReaction === "happy" ? "#001a00" : "#1a0010",
              border: `3px solid ${petReaction === "happy" ? "#c8ff00" : "#ff2d8d"}`,
              borderRadius: 18, padding: "10px 22px",
              textAlign: "center",
              boxShadow: `0 0 20px ${petReaction === "happy" ? "#c8ff0066" : "#ff2d8d66"}`,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
              style={{ fontSize: "2.2rem" }}
            >
              {petReaction === "happy" ? "🐱" : "😿"}
            </motion.div>
            <div style={{ color: petReaction === "happy" ? "#c8ff00" : "#ff2d8d", fontSize: 12, fontWeight: 700, marginTop: 4 }}>
              {petReaction === "happy" ? "YOUR PET IS HAPPY! 🎉" : "😿 Your pet is bored..."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Machine body */}
      <motion.div
        animate={
          spinning
            ? { boxShadow: ["0 0 30px #ffde0044, 6px 6px 0px #0a0a0a", "0 0 60px #ffde00aa, 6px 6px 0px #0a0a0a", "0 0 30px #ffde0044, 6px 6px 0px #0a0a0a"] }
            : inBonusActive
            ? { boxShadow: ["0 0 30px #ff6b0088, 6px 6px 0px #0a0a0a", "0 0 80px #ff6b00cc, 6px 6px 0px #0a0a0a", "0 0 30px #ff6b0088, 6px 6px 0px #0a0a0a"] }
            : { boxShadow: "0 0 30px #ffde0044, 6px 6px 0px #0a0a0a" }
        }
        transition={{ repeat: spinning || inBonusActive ? Infinity : 0, duration: 0.6 }}
        style={{
          background: "#1a1000",
          border: `3px solid ${inBonusActive ? "#ff6b00" : "#ffde00"}`,
          borderRadius: 20, padding: 24,
          width: "100%", maxWidth: 340,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center", color: inBonusActive ? "#ff6b00" : "#ffde00", fontSize: 13, fontWeight: 700, letterSpacing: 4, marginBottom: 4, textShadow: "0 0 10px #ffde0088" }}>
          ★ KARMA SLOTS ★
        </div>

        {/* Bonus / streak sub-header */}
        <div style={{ textAlign: "center", marginBottom: 14, minHeight: 20 }}>
          {inBonusActive && (
            <motion.div
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{ color: "#ff6b00", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}
            >
              🎰 KARMA RUSH · {bonusSpinsLeft} FREE SPIN{bonusSpinsLeft !== 1 ? "S" : ""} LEFT
            </motion.div>
          )}
          {!inBonusActive && hotStreak && (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              style={{ color: "#ff6b35", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}
            >
              HOT STREAK 🔥 ×{winStreak} — +50% PAYOUT!
            </motion.div>
          )}
        </div>

        {/* Reels */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
          {reels.map((sym, i) => (
            <div
              key={i}
              style={{
                width: 86, height: 86,
                background: "#0a0a0a",
                border: `2px solid ${showJackpot ? "#ffde00" : "#ffde00"}`,
                borderRadius: 14,
                overflow: "hidden",
                position: "relative",
                boxShadow: showJackpot ? "0 0 20px #ffde00" : spinning ? "0 0 12px #ffde0066" : "none",
              }}
            >
              {/* Scrolling reel strip during spin */}
              {!reelStopped[i] ? (
                <motion.div
                  animate={{ y: [0, -86 * SYMBOLS.length] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  style={{ display: "flex", flexDirection: "column", position: "absolute", top: 0, left: 0, width: "100%" }}
                >
                  {[...SYMBOLS, ...SYMBOLS].map((s, si) => (
                    <div key={si} style={{ width: 86, height: 86, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", flexShrink: 0 }}>
                      {s}
                    </div>
                  ))}
                </motion.div>
              ) : (
                // Stopped reel: bounce in
                <motion.div
                  key={`${sym}-${spins}`}
                  initial={reelStopped[i] && spins > 0 ? { scale: 1.4 } : { scale: 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.6rem" }}
                >
                  {sym}
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Payline indicator */}
        <div style={{ height: 2, background: "#ffde00", marginBottom: 16, borderRadius: 1, boxShadow: "0 0 8px #ffde00" }} />

        {/* Result */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.msg + result.win}
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
              {result.win > 0 && bonusRound && <span style={{ color: "#ff6b00", marginLeft: 6, fontSize: 12 }}>×2 BONUS</span>}
              {result.win > 0 && hotStreak && <span style={{ color: "#ff6b35", marginLeft: 6, fontSize: 12 }}>×1.5 STREAK</span>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jackpot celebration overlay */}
        <AnimatePresence>
          {showJackpot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.82)",
                borderRadius: 18, zIndex: 20,
                gap: 6,
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1.1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ fontSize: "3.5rem" }}
              >
                🌟
              </motion.div>
              <div style={{ color: "#ffde00", fontSize: 28, fontWeight: 900, letterSpacing: 4, textShadow: "0 0 20px #ffde00" }}>JACKPOT!!</div>
              <div style={{ color: "#c8ff00", fontSize: 18, fontWeight: 700 }}>+500 ⚡</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={!canSpin && !(bonusRound && bonusSpinsLeft > 0)}
          style={{
            width: "100%", padding: "14px",
            background: inBonusActive ? "#ff6b00" : canSpin ? "#ffde00" : "#333",
            border: "3px solid " + (inBonusActive ? "#0a0a0a" : canSpin ? "#0a0a0a" : "#555"),
            borderRadius: 14,
            fontSize: 16, fontWeight: 700,
            color: inBonusActive || canSpin ? "#0a0a0a" : "#666",
            cursor: canSpin || inBonusActive ? "pointer" : "not-allowed",
            boxShadow: canSpin || inBonusActive ? "4px 4px 0px #0a0a0a" : "none",
            transition: "all 0.1s",
            letterSpacing: 2,
          }}
        >
          {spinning
            ? "SPINNING..."
            : inBonusActive
            ? `FREE SPIN 🎰 (${bonusSpinsLeft} left)`
            : hotStreak
            ? `SPIN · -${SPIN_COST} ⚡ (+50%!)`
            : `SPIN · -${SPIN_COST} ⚡`}
        </button>

        {karma < SPIN_COST && !inBonusActive && (
          <p style={{ color: "#ff2d8d", fontSize: 12, textAlign: "center", marginTop: 8, fontWeight: 600 }}>
            Need {SPIN_COST} karma to spin
          </p>
        )}
      </motion.div>

      {/* Payout table */}
      <div style={{ width: "100%", maxWidth: 340, background: "#111", border: "2px solid #333", borderRadius: 14, padding: "12px 16px" }}>
        <div style={{ color: "#ffde00", fontSize: 11, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>
          PAYOUT TABLE {hotStreak ? <span style={{ color: "#ff6b35" }}>· ×1.5 HOT 🔥</span> : ""}
          {inBonusActive ? <span style={{ color: "#ff6b00" }}>· ×2 RUSH 🎰</span> : ""}
        </div>
        {Object.entries(PAYOUTS).slice(0, 6).map(([combo, payout]) => (
          <div
            key={combo}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "5px 8px", marginBottom: 4,
              borderRadius: 8,
              background: PAYOUT_BG[combo] ?? "#0a0a0a",
              border: "1px solid #222",
            }}
          >
            <span style={{ fontSize: "1rem", letterSpacing: 2 }}>{combo}</span>
            <span style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700 }}>+{payout} ⚡</span>
          </div>
        ))}
        <div style={{ color: "#666", fontSize: 11, marginTop: 6, padding: "0 4px" }}>Any 2 matching = +25 ⚡</div>
        <div style={{ color: "#555", fontSize: 11, marginTop: 2, padding: "0 4px" }}>Every {BONUS_ROUND_INTERVAL} spins = KARMA RUSH (3 free, 2× wins)</div>
      </div>
    </div>
  );
}
