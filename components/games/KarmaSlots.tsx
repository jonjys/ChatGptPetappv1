"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ───────────────────────────────────────────────────────────────

const SYMBOLS = ["🐾", "⚡", "🔥", "💎", "🐱", "🌟", "🏆", "🍖", "👑"] as const;
type Symbol = (typeof SYMBOLS)[number];

const REEL_COUNT = 5;
const SPIN_COST_NORMAL = 25;
const BONUS_ROUND_INTERVAL = 15;
const LUCKY_SPIN_INTERVAL = 10;
const STAR_SYMBOL: Symbol = "🌟";
const CROWN_SYMBOL: Symbol = "👑";

// 5-of-a-kind payouts
const PAYOUTS_5: Record<string, number> = {
  "👑👑👑👑👑": 2000,
  "🌟🌟🌟🌟🌟": 1000,
  "💎💎💎💎💎": 500,
  "⚡⚡⚡⚡⚡": 300,
  "🏆🏆🏆🏆🏆": 200,
  "🔥🔥🔥🔥🔥": 150,
  "🐱🐱🐱🐱🐱": 100,
  "🐾🐾🐾🐾🐾": 80,
  "🍖🍖🍖🍖🍖": 60,
};

const SYMBOL_WEIGHTS: Record<Symbol, number> = {
  "👑": 1,
  "🌟": 3,
  "💎": 6,
  "⚡": 8,
  "🏆": 10,
  "🔥": 12,
  "🐱": 14,
  "🐾": 16,
  "🍖": 18,
};

const NEON_COLORS = ["#c8ff00", "#00e5ff", "#ff2d8d", "#ffde00", "#ff6b00"];

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  karma: number;
  onSpin: (cost: number) => boolean;
  onWin: (amount: number) => void;
};

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  size: number;
  shape: "square" | "circle" | "diamond";
}

interface SpinResult {
  symbols: Symbol[];
  win: number;
  msg: string;
  isUltraJackpot: boolean;
  isJackpot: boolean;
  isMegaWin: boolean;
  hasStar: boolean;
  matchCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weightedRandom(): Symbol {
  const total = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [sym, w] of Object.entries(SYMBOL_WEIGHTS)) {
    r -= w;
    if (r <= 0) return sym as Symbol;
  }
  return SYMBOLS[0];
}

function calcWin(symbols: Symbol[], multiplier: number): { win: number; matchCount: number; hasStar: boolean } {
  const combo5 = symbols.join("");
  const hasStar = symbols.includes(STAR_SYMBOL);
  let win = 0;
  let matchCount = 0;

  // 5-of-a-kind
  if (symbols.every(s => s === symbols[0])) {
    win = PAYOUTS_5[combo5] ?? 60;
    matchCount = 5;
  } else {
    // Count most frequent symbol in first 3 reels
    const counts: Record<string, number> = {};
    for (const s of symbols) counts[s] = (counts[s] ?? 0) + 1;
    const maxCount = Math.max(...Object.values(counts));
    const topSym = Object.entries(counts).find(([, c]) => c === maxCount)?.[0] ?? "";

    if (maxCount >= 4) {
      // 4-of-a-kind = 50% of 5-of-kind
      const base5 = PAYOUTS_5[topSym.repeat(5)] ?? 40;
      win = Math.floor(base5 * 0.5);
      matchCount = 4;
    } else if (maxCount >= 3) {
      // Check if the 3 are in the first 3 reels for the "3-of-any in first 3" rule
      const first3 = symbols.slice(0, 3);
      const first3Counts: Record<string, number> = {};
      for (const s of first3) first3Counts[s] = (first3Counts[s] ?? 0) + 1;
      const first3Max = Math.max(...Object.values(first3Counts));
      if (first3Max === 3) {
        win = 30;
        matchCount = 3;
      }
    }
  }

  // Any star = consolation +10
  if (hasStar && win === 0) win = 10;

  // Apply multiplier
  win = win * multiplier;

  return { win, matchCount, hasStar };
}

function generateParticles(count: number, colors: string[]): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 6,
    y: 50 + (Math.random() - 0.5) * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: (i / count) * 360 + Math.random() * 20,
    size: 6 + Math.random() * 10,
    shape: (["square", "circle", "diamond"] as const)[Math.floor(Math.random() * 3)],
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NeonTube({ side }: { side: "top" | "left" | "right" }) {
  return (
    <motion.div
      animate={{
        boxShadow: NEON_COLORS.map(c => `0 0 12px ${c}, 0 0 24px ${c}88`),
        background: NEON_COLORS,
      }}
      transition={{ duration: 2.5, repeat: Infinity, repeatType: "mirror" }}
      style={{
        position: "absolute",
        ...(side === "top"
          ? { top: 8, left: 20, right: 20, height: 4, borderRadius: 2 }
          : side === "left"
          ? { left: 8, top: 20, bottom: 20, width: 4, borderRadius: 2 }
          : { right: 8, top: 20, bottom: 20, width: 4, borderRadius: 2 }),
      }}
    />
  );
}

interface ReelWindowProps {
  symbol: Symbol;
  spinning: boolean;
  stopped: boolean;
  spinIndex: number;
  isWinner: boolean;
  isUltraJackpot: boolean;
  showJackpot: boolean;
}

function ReelWindow({ symbol, spinning, stopped, spinIndex, isWinner, isUltraJackpot, showJackpot }: ReelWindowProps) {
  const glowColor = isUltraJackpot
    ? "#bf00ff"
    : showJackpot
    ? "#ffde00"
    : isWinner
    ? "#c8ff00"
    : "#ffde00";

  return (
    <div
      style={{
        width: 68,
        height: 68,
        background: "#0a0800",
        border: `3px solid ${isWinner || showJackpot ? glowColor : "#ffde00"}`,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        boxShadow: isWinner
          ? `0 0 20px ${glowColor}, inset 0 0 10px ${glowColor}44`
          : spinning
          ? "0 0 8px #ffde0066"
          : "none",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      {!stopped ? (
        /* Spinning strip */
        <motion.div
          animate={{ y: [0, -68 * SYMBOLS.length] }}
          transition={{
            duration: 0.35 + spinIndex * 0.05,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            filter: "blur(1.5px)",
          }}
        >
          {[...SYMBOLS, ...SYMBOLS, ...SYMBOLS].map((s, si) => (
            <div
              key={si}
              style={{
                width: 68,
                height: 68,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.9rem",
                flexShrink: 0,
              }}
            >
              {s}
            </div>
          ))}
        </motion.div>
      ) : (
        /* Stopped symbol with bounce */
        <motion.div
          key={`sym-${symbol}-${spinIndex}`}
          initial={{ scale: 1.5, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0 }}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            position: "relative",
          }}
        >
          {/* Winner glow pulse */}
          {isWinner && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle, ${glowColor}44 0%, transparent 70%)`,
                borderRadius: 10,
              }}
            />
          )}
          <span style={{ position: "relative", zIndex: 1 }}>{symbol}</span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KarmaSlots({ karma, onSpin, onWin }: Props) {
  const [reels, setReels] = useState<Symbol[]>(["🐾", "💎", "🌟", "⚡", "🏆"]);
  const [reelStopped, setReelStopped] = useState<boolean[]>([true, true, true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spins, setSpins] = useState(0);
  const [sessionKarma, setSessionKarma] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [recentResults, setRecentResults] = useState<boolean[]>([]); // true=win last 5
  const [bonusRound, setBonusRound] = useState(false);
  const [bonusSpinsLeft, setBonusSpinsLeft] = useState(0);
  const [showBonusBanner, setShowBonusBanner] = useState(false);
  const [showUltraJackpot, setShowUltraJackpot] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [ultraFlash, setUltraFlash] = useState<"gold" | "white" | null>(null);
  const [petReaction, setPetReaction] = useState<"happy" | "sad" | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [betMultiplier, setBetMultiplier] = useState<1 | 3>(1);
  const [showPayline, setShowPayline] = useState(false);
  const [winnerReels, setWinnerReels] = useState<boolean[]>([false, false, false, false, false]);
  const [isLuckySpin, setIsLuckySpin] = useState(false);
  const [showLuckyBanner, setShowLuckyBanner] = useState(false);

  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
    };
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  function triggerUltraJackpotCeremony(win: number) {
    setShowUltraJackpot(true);

    // Flash sequence: gold/white x4
    const flashSequence: Array<"gold" | "white" | null> = ["gold", "white", "gold", "white", "gold", "white", "gold", "white", null];
    flashSequence.forEach((flash, i) => {
      addTimeout(() => setUltraFlash(flash), i * 200);
    });

    // 40 confetti particles — gold/purple/cyan
    const colors = ["#ffde00", "#bf00ff", "#00e5ff", "#c8ff00", "#ff6b00", "#fff", "#ff2d8d"];
    setParticles(generateParticles(40, colors));
    addTimeout(() => setParticles([]), 3200);

    // Auto dismiss after 3s
    addTimeout(() => {
      setShowUltraJackpot(false);
      setUltraFlash(null);
    }, 3000);

    void win; // already handled by caller
  }

  function triggerJackpotCeremony() {
    setShowJackpot(true);
    const colors = ["#ffde00", "#c8ff00", "#fff", "#ff6b00", "#00e5ff"];
    setParticles(generateParticles(24, colors));
    addTimeout(() => setParticles([]), 1800);
    addTimeout(() => setShowJackpot(false), 3000);
  }

  function spin() {
    if (spinning) return;

    const spinCost = SPIN_COST_NORMAL * betMultiplier;
    const inBonusActive = bonusRound && bonusSpinsLeft > 0;
    const nextSpinNumber = spins + 1;
    const isLucky = nextSpinNumber % LUCKY_SPIN_INTERVAL === 0;

    // Check if free spin
    if (inBonusActive) {
      setBonusSpinsLeft(b => {
        const next = b - 1;
        if (next <= 0) setBonusRound(false);
        return next;
      });
    } else {
      if (karma < spinCost) return;
      if (!onSpin(spinCost)) return;
    }

    setResult(null);
    setPetReaction(null);
    setShowJackpot(false);
    setShowPayline(false);
    setWinnerReels([false, false, false, false, false]);
    setIsLuckySpin(isLucky);
    setSpinning(true);

    const newSpinCount = spins + 1;
    setSpins(newSpinCount);

    // Trigger bonus round
    if (newSpinCount % BONUS_ROUND_INTERVAL === 0) {
      setShowBonusBanner(true);
      setBonusRound(true);
      setBonusSpinsLeft(3);
      addTimeout(() => setShowBonusBanner(false), 2800);
    }

    // Lucky spin banner
    if (isLucky) {
      setShowLuckyBanner(true);
      addTimeout(() => setShowLuckyBanner(false), 2000);
    }

    // Generate final symbols
    let finalSymbols: Symbol[] = Array.from({ length: REEL_COUNT }, () => weightedRandom());

    // Lucky spin guarantee: at least 2 matching (minimum win)
    if (isLucky) {
      const luckySymbol = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1] as Symbol; // avoid crown for fairness
      finalSymbols[0] = luckySymbol;
      finalSymbols[1] = luckySymbol;
      // Make sure 3 match in first 3 for small guaranteed win
      finalSymbols[2] = luckySymbol;
    }

    // Start spinning all reels
    setReelStopped([false, false, false, false, false]);

    // Stop reels sequentially
    const stopDelays = [900, 1200, 1500, 1800, 2100];

    stopDelays.forEach((delay, reelIdx) => {
      addTimeout(() => {
        setReels(prev => {
          const next = [...prev] as Symbol[];
          next[reelIdx] = finalSymbols[reelIdx];
          return next;
        });
        setReelStopped(prev => {
          const next = [...prev];
          next[reelIdx] = true;
          return next;
        });

        // After last reel stops
        if (reelIdx === REEL_COUNT - 1) {
          addTimeout(() => {
            setSpinning(false);

            const payMult = (inBonusActive ? 2 : 1) * betMultiplier * (isLucky ? 2 : 1);
            const { win, matchCount, hasStar } = calcWin(finalSymbols, payMult);

            // Win streak hot zone
            const currentWin = win > 0;
            const newRecent = [...recentResults, currentWin].slice(-5);
            setRecentResults(newRecent);

            // Hot streak bonus: if 3+ wins in recent 5, extra +50%
            const hotZone = newRecent.filter(Boolean).length >= 3;
            let finalWin = win;
            if (hotZone && win > 0) finalWin = Math.floor(win * 1.5);

            const isUltraJackpot = finalSymbols.every(s => s === CROWN_SYMBOL);
            const isJackpot = finalSymbols.every(s => s === STAR_SYMBOL);
            const isMegaWin = finalWin >= 200 && !isJackpot && !isUltraJackpot;

            let msg = "";
            if (isUltraJackpot) msg = "👑 ULTRA JACKPOT! 👑";
            else if (isJackpot) msg = "🌟 JACKPOT!!";
            else if (isMegaWin) msg = "🔥 MEGA WIN!";
            else if (finalWin >= 50) msg = "✨ BIG WIN!";
            else if (finalWin > 0) msg = "✨ WIN!";
            else msg = "Try again...";

            const spinResult: SpinResult = {
              symbols: finalSymbols,
              win: finalWin,
              msg,
              isUltraJackpot,
              isJackpot,
              isMegaWin,
              hasStar,
              matchCount,
            };
            setResult(spinResult);

            if (finalWin > 0) {
              onWin(finalWin);
              setSessionKarma(sk => sk + finalWin);
              setWinStreak(ws => ws + 1);
              setLossStreak(0);

              // Winner reel highlighting
              const winners = Array.from({ length: REEL_COUNT }, (_, i) => {
                if (matchCount === 5) return true;
                if (matchCount === 4) {
                  // first 4 matching
                  const counts: Record<string, number> = {};
                  for (const s of finalSymbols) counts[s] = (counts[s] ?? 0) + 1;
                  const topSym = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
                  return finalSymbols[i] === topSym;
                }
                if (matchCount === 3) {
                  return i < 3 && finalSymbols.slice(0, 3).every(s => s === finalSymbols[0]);
                }
                if (hasStar && matchCount === 0) return finalSymbols[i] === STAR_SYMBOL;
                return false;
              });
              setWinnerReels(winners);
              setShowPayline(true);

              if (isUltraJackpot) {
                triggerUltraJackpotCeremony(finalWin);
              } else if (isJackpot) {
                triggerJackpotCeremony();
              }

              setPetReaction("happy");
              addTimeout(() => setPetReaction(null), 2800);
            } else {
              const newLoss = lossStreak + 1;
              setLossStreak(newLoss);
              setWinStreak(0);
              if (newLoss >= 3) {
                setPetReaction("sad");
                addTimeout(() => setPetReaction(null), 2800);
              }
            }
          }, 120);
        }
      }, delay);
    });
  }

  const spinCost = SPIN_COST_NORMAL * betMultiplier;
  const inBonusActive = bonusRound && bonusSpinsLeft > 0;
  const canSpin = !spinning && (karma >= spinCost || inBonusActive);
  const hotZone = recentResults.slice(-5).filter(Boolean).length >= 3;
  const isNextLucky = (spins + 1) % LUCKY_SPIN_INTERVAL === 0;

  // Derive hot zone from last 5
  const recentWins = recentResults.slice(-5).filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative", userSelect: "none" }}>

      {/* ── Ultra Jackpot flash overlay ── */}
      <AnimatePresence>
        {ultraFlash && (
          <motion.div
            key={ultraFlash + Math.random()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "fixed",
              inset: 0,
              background: ultraFlash === "gold" ? "#ffde00" : "#ffffff",
              zIndex: 9998,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Ultra Jackpot Ceremony ── */}
      <AnimatePresence>
        {showUltraJackpot && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "radial-gradient(ellipse at center, #2d0040 0%, #0a0015 60%, #000 100%)",
              gap: 20,
            }}
          >
            {/* Golden rays */}
            {Array.from({ length: 12 }, (_, i) => (
              <motion.div
                key={i}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  width: 2,
                  height: "50vmax",
                  background: `linear-gradient(to bottom, transparent, #ffde0088, transparent)`,
                  top: "50%",
                  left: "50%",
                  transformOrigin: "top center",
                  transform: `rotate(${i * 30}deg) translateX(-50%)`,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
            ))}

            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{ fontSize: "5rem", position: "relative", zIndex: 1 }}
            >
              👑
            </motion.div>
            <div
              style={{
                color: "#ffde00",
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: 3,
                textShadow: "0 0 30px #ffde00, 0 0 60px #ffde0088",
                textAlign: "center",
                position: "relative",
                zIndex: 1,
                lineHeight: 1.2,
              }}
            >
              ULTRA JACKPOT!
            </div>
            <div style={{ color: "#bf00ff", fontSize: 22, fontWeight: 700, position: "relative", zIndex: 1, textShadow: "0 0 20px #bf00ff" }}>
              +2000 ⚡ KARMA
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bonus Round Banner ── */}
      <AnimatePresence>
        {showBonusBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            style={{
              position: "fixed",
              top: 72,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 8000,
              background: "linear-gradient(135deg, #ff6b00, #ffde00)",
              border: "4px solid #0a0a0a",
              borderRadius: 20,
              padding: "14px 32px",
              fontSize: 20,
              fontWeight: 900,
              color: "#0a0a0a",
              letterSpacing: 3,
              textAlign: "center",
              boxShadow: "0 0 40px #ffde00aa, 6px 6px 0 #0a0a0a",
            }}
          >
            🎰 KARMA RUSH! 🎰
            <br />
            <span style={{ fontSize: 13, fontWeight: 700 }}>3 FREE SPINS · ALL WINS DOUBLED!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lucky Spin Banner ── */}
      <AnimatePresence>
        {showLuckyBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            style={{
              position: "fixed",
              top: 72,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 8000,
              background: "linear-gradient(135deg, #00e5ff, #c8ff00)",
              border: "4px solid #0a0a0a",
              borderRadius: 20,
              padding: "14px 32px",
              fontSize: 18,
              fontWeight: 900,
              color: "#0a0a0a",
              letterSpacing: 2,
              textAlign: "center",
              boxShadow: "0 0 40px #00e5ffaa, 6px 6px 0 #0a0a0a",
            }}
          >
            ⭐ LUCKY SPIN! ⭐
            <br />
            <span style={{ fontSize: 12, fontWeight: 700 }}>FREE SPIN · 2× WIN · GUARANTEED MATCH!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confetti Particles ── */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, left: `${p.x}%`, top: `${p.y}%`, scale: 1 }}
            animate={{
              opacity: 0,
              left: `calc(${p.x}% + ${Math.cos((p.angle * Math.PI) / 180) * 220}px)`,
              top: `calc(${p.y}% + ${Math.sin((p.angle * Math.PI) / 180) * 220}px)`,
              scale: 0.2,
              rotate: Math.random() * 720,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6 + Math.random() * 0.8, ease: "easeOut" }}
            style={{
              position: "fixed",
              width: p.size,
              height: p.size,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "diamond" ? 0 : 2,
              transform: p.shape === "diamond" ? "rotate(45deg)" : undefined,
              background: p.color,
              pointerEvents: "none",
              zIndex: 9990,
            }}
          />
        ))}
      </AnimatePresence>

      {/* ── Pet Reaction ── */}
      <AnimatePresence>
        {petReaction && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            style={{
              position: "absolute",
              top: -14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              background: petReaction === "happy" ? "#001a00" : "#1a0010",
              border: `3px solid ${petReaction === "happy" ? "#c8ff00" : "#ff2d8d"}`,
              borderRadius: 18,
              padding: "10px 22px",
              textAlign: "center",
              boxShadow: `0 0 20px ${petReaction === "happy" ? "#c8ff0066" : "#ff2d8d66"}`,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
              style={{ fontSize: "2rem" }}
            >
              {petReaction === "happy" ? "🐱" : "😿"}
            </motion.div>
            <div style={{ color: petReaction === "happy" ? "#c8ff00" : "#ff2d8d", fontSize: 11, fontWeight: 700, marginTop: 4 }}>
              {petReaction === "happy" ? "YOUR PET IS HAPPY! 🎉" : "😿 Your pet is sulking..."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          MACHINE BODY
      ════════════════════════════════════════ */}
      <motion.div
        animate={
          showUltraJackpot
            ? { boxShadow: "0 0 80px #bf00ff, 0 0 160px #bf00ff88" }
            : spinning
            ? {
                boxShadow: [
                  "0 0 30px #ffde0044, 8px 8px 0 #0a0a0a",
                  "0 0 80px #ffde00cc, 8px 8px 0 #0a0a0a",
                  "0 0 30px #ffde0044, 8px 8px 0 #0a0a0a",
                ],
              }
            : inBonusActive
            ? {
                boxShadow: [
                  "0 0 30px #ff6b0066, 8px 8px 0 #0a0a0a",
                  "0 0 80px #ff6b00cc, 8px 8px 0 #0a0a0a",
                  "0 0 30px #ff6b0066, 8px 8px 0 #0a0a0a",
                ],
              }
            : { boxShadow: "0 0 30px #ffde0033, 8px 8px 0 #0a0a0a" }
        }
        transition={{ repeat: spinning || inBonusActive ? Infinity : 0, duration: 0.7 }}
        style={{
          background: "#1a0a00",
          border: `3px solid ${inBonusActive ? "#ff6b00" : "#c8ff00"}`,
          borderRadius: 24,
          padding: "22px 20px",
          width: "100%",
          maxWidth: 420,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Neon tubes */}
        <NeonTube side="top" />
        <NeonTube side="left" />
        <NeonTube side="right" />

        {/* ── Machine Title ── */}
        <div style={{ textAlign: "center", marginBottom: 12, marginTop: 8, position: "relative", zIndex: 1 }}>
          <motion.div
            animate={{ textShadow: NEON_COLORS.map(c => `0 0 16px ${c}`), color: NEON_COLORS }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "mirror" }}
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 5,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            >
              ★
            </motion.span>
            {" KARMA MACHINE "}
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: 0.45 }}
            >
              ★
            </motion.span>
          </motion.div>

          {/* Session karma counter */}
          <div style={{ color: "#ffde0099", fontSize: 11, fontWeight: 600, letterSpacing: 2, marginTop: 4 }}>
            SESSION EARNED: <span style={{ color: "#ffde00", fontWeight: 800 }}>{sessionKarma} ⚡</span>
          </div>
        </div>

        {/* ── Status Badges Row ── */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
          {/* Bonus active */}
          {inBonusActive && (
            <motion.div
              animate={{ opacity: [1, 0.6, 1], scale: [1, 1.04, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{
                background: "#1a0800",
                border: "2px solid #ff6b00",
                borderRadius: 10,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#ff6b00",
                letterSpacing: 1,
              }}
            >
              🎰 KARMA RUSH · {bonusSpinsLeft} LEFT
            </motion.div>
          )}

          {/* Hot Zone */}
          {hotZone && (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{
                background: "#1a0800",
                border: "2px solid #ff6b35",
                borderRadius: 10,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#ff6b35",
                letterSpacing: 1,
              }}
            >
              🔥 HOT ZONE ({recentWins}/5)
            </motion.div>
          )}

          {/* Win streak */}
          {winStreak >= 2 && !hotZone && (
            <div style={{
              background: "#0a1a00",
              border: "2px solid #c8ff00",
              borderRadius: 10,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "#c8ff00",
              letterSpacing: 1,
            }}>
              ✨ STREAK ×{winStreak}
            </div>
          )}

          {/* Lucky spin upcoming */}
          {isNextLucky && !spinning && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{
                background: "#001a1a",
                border: "2px solid #00e5ff",
                borderRadius: 10,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#00e5ff",
                letterSpacing: 1,
              }}
            >
              ⭐ LUCKY SPIN READY!
            </motion.div>
          )}
        </div>

        {/* ── 5 Reel Windows ── */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10, position: "relative" }}>
          {reels.map((sym, i) => (
            <ReelWindow
              key={i}
              symbol={sym}
              spinning={spinning}
              stopped={reelStopped[i]}
              spinIndex={i}
              isWinner={winnerReels[i]}
              isUltraJackpot={showUltraJackpot}
              showJackpot={showJackpot}
            />
          ))}

          {/* Payline drawn across reels after win */}
          <AnimatePresence>
            {showPayline && result && result.win > 0 && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  height: 3,
                  background: result.isUltraJackpot
                    ? "linear-gradient(90deg, transparent, #bf00ff, #ffde00, #bf00ff, transparent)"
                    : result.isJackpot
                    ? "linear-gradient(90deg, transparent, #ffde00, #fff, #ffde00, transparent)"
                    : "linear-gradient(90deg, transparent, #c8ff00, #fff, #c8ff00, transparent)",
                  boxShadow: result.isUltraJackpot
                    ? "0 0 12px #bf00ff, 0 0 24px #ffde0088"
                    : "0 0 8px #c8ff00",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  zIndex: 10,
                  borderRadius: 2,
                  transformOrigin: "left center",
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Machine reel frame line */}
        <div style={{
          height: 2,
          background: "linear-gradient(90deg, transparent, #ffde0066, #ffde00, #ffde0066, transparent)",
          marginBottom: 14,
          borderRadius: 1,
          boxShadow: "0 0 6px #ffde0066",
        }} />

        {/* ── Result Display ── */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.msg + result.win}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                textAlign: "center",
                marginBottom: 14,
                minHeight: 40,
              }}
            >
              <div style={{
                color: result.win > 0 ? (result.isUltraJackpot ? "#bf00ff" : result.isJackpot ? "#ffde00" : "#c8ff00") : "#555",
                fontSize: result.isUltraJackpot ? 26 : result.isJackpot ? 22 : result.win >= 50 ? 18 : 15,
                fontWeight: 800,
                letterSpacing: result.win > 0 ? 2 : 0,
                textShadow: result.isUltraJackpot
                  ? "0 0 20px #bf00ff, 0 0 40px #bf00ff88"
                  : result.isJackpot
                  ? "0 0 20px #ffde00"
                  : result.win > 0
                  ? "0 0 10px #c8ff0066"
                  : "none",
              }}>
                {result.msg}
              </div>
              {result.win > 0 && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
                  <span style={{ color: "#ffde00", fontSize: 16, fontWeight: 800 }}>+{result.win} ⚡</span>
                  {inBonusActive && <span style={{ color: "#ff6b00", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×2 RUSH</span>}
                  {hotZone && <span style={{ color: "#ff6b35", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×1.5 HOT</span>}
                  {isLuckySpin && <span style={{ color: "#00e5ff", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×2 LUCKY</span>}
                  {betMultiplier === 3 && <span style={{ color: "#bf00ff", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×3 BET</span>}
                  {result.hasStar && result.matchCount === 0 && (
                    <span style={{ color: "#888", fontSize: 11, alignSelf: "center" }}>🌟 consolation</span>
                  )}
                </div>
              )}
            </motion.div>
          )}
          {!result && !spinning && (
            <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ color: "#333", fontSize: 12, letterSpacing: 2 }}>PRESS SPIN TO PLAY</div>
            </div>
          )}
          {spinning && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div style={{ color: "#ffde0099", fontSize: 13, letterSpacing: 4, fontWeight: 700 }}>SPINNING...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jackpot overlay inside machine */}
        <AnimatePresence>
          {showJackpot && !showUltraJackpot && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.88)",
                borderRadius: 22,
                zIndex: 30,
                gap: 8,
              }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 10, 0], scale: [1, 1.3, 1.1, 1.25, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ fontSize: "3.5rem" }}
              >
                🌟
              </motion.div>
              <div style={{ color: "#ffde00", fontSize: 28, fontWeight: 900, letterSpacing: 4, textShadow: "0 0 24px #ffde00" }}>
                JACKPOT!!
              </div>
              <div style={{ color: "#c8ff00", fontSize: 18, fontWeight: 700 }}>+1000 ⚡</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Spin Button ── */}
        <motion.button
          whileTap={{ scale: canSpin ? 0.95 : 1 }}
          onClick={spin}
          disabled={!canSpin}
          style={{
            width: "100%",
            padding: "15px",
            background: !canSpin
              ? "#222"
              : inBonusActive
              ? "linear-gradient(135deg, #ff6b00, #ffde00)"
              : isNextLucky
              ? "linear-gradient(135deg, #00e5ff, #c8ff00)"
              : hotZone
              ? "linear-gradient(135deg, #ff4000, #ffde00)"
              : "linear-gradient(135deg, #ffde00, #c8ff00)",
            border: `3px solid ${canSpin ? "#0a0a0a" : "#333"}`,
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 900,
            color: canSpin ? "#0a0a0a" : "#555",
            cursor: canSpin ? "pointer" : "not-allowed",
            boxShadow: canSpin ? "0 6px 0 #0a0a0a, 0 0 20px rgba(200,255,0,0.3)" : "none",
            letterSpacing: 2,
            transition: "all 0.1s",
            position: "relative",
            zIndex: 1,
          }}
        >
          {spinning
            ? "⚡ SPINNING... ⚡"
            : inBonusActive
            ? `🎰 FREE SPIN (${bonusSpinsLeft} LEFT)`
            : isNextLucky
            ? "⭐ LUCKY SPIN (FREE · 2×)"
            : hotZone
            ? `🔥 SPIN · -${spinCost} ⚡  (+50%!)`
            : `SPIN · -${spinCost} ⚡`}
        </motion.button>

        {karma < spinCost && !inBonusActive && (
          <p style={{ color: "#ff2d8d", fontSize: 12, textAlign: "center", marginTop: 8, fontWeight: 600 }}>
            Need {spinCost} ⚡ to spin
          </p>
        )}
      </motion.div>

      {/* ── Bet Multiplier Toggle ── */}
      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        background: "#111",
        border: "2px solid #333",
        borderRadius: 14,
        padding: "10px 16px",
        width: "100%",
        maxWidth: 420,
      }}>
        <span style={{ color: "#666", fontSize: 12, fontWeight: 700, letterSpacing: 2, flex: 1 }}>BET SIZE:</span>
        <button
          onClick={() => setBetMultiplier(1)}
          style={{
            padding: "6px 16px",
            borderRadius: 10,
            border: `2px solid ${betMultiplier === 1 ? "#ffde00" : "#333"}`,
            background: betMultiplier === 1 ? "#2a2000" : "#0a0a0a",
            color: betMultiplier === 1 ? "#ffde00" : "#555",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: 1,
            transition: "all 0.1s",
          }}
        >
          25 ⚡
        </button>
        <button
          onClick={() => setBetMultiplier(3)}
          style={{
            padding: "6px 16px",
            borderRadius: 10,
            border: `2px solid ${betMultiplier === 3 ? "#bf00ff" : "#333"}`,
            background: betMultiplier === 3 ? "#1a0030" : "#0a0a0a",
            color: betMultiplier === 3 ? "#bf00ff" : "#555",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: 1,
            transition: "all 0.1s",
          }}
        >
          75 ⚡ ×3
        </button>
      </div>

      {/* ── Payout Table ── */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "#0d0900",
        border: "2px solid #2a2000",
        borderRadius: 16,
        padding: "14px 16px",
      }}>
        <div style={{ color: "#ffde00", fontSize: 11, fontWeight: 700, letterSpacing: 3, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>PAYOUT TABLE (5-OF-A-KIND)</span>
          {hotZone && <span style={{ color: "#ff6b35" }}>×1.5 HOT 🔥</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Object.entries(PAYOUTS_5).map(([combo, payout]) => {
            const sym = combo[0];
            const isUltra = sym === "👑";
            const isJack = sym === "🌟";
            return (
              <div
                key={combo}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 8px",
                  borderRadius: 8,
                  background: isUltra ? "#150020" : isJack ? "#2a1f00" : "#0a0800",
                  border: `1px solid ${isUltra ? "#bf00ff33" : isJack ? "#ffde0033" : "#1a1400"}`,
                }}
              >
                <span style={{ fontSize: "0.85rem", letterSpacing: 1 }}>{combo}</span>
                <span style={{
                  color: isUltra ? "#bf00ff" : isJack ? "#ffde00" : "#c8ff00",
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  +{payout} ⚡
                  {isUltra && <span style={{ fontSize: 10, marginLeft: 4, color: "#bf00ff88" }}>ULTRA!</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ color: "#555", fontSize: 10, display: "flex", justifyContent: "space-between" }}>
            <span>4-of-a-kind</span>
            <span style={{ color: "#666" }}>50% of 5-of-kind</span>
          </div>
          <div style={{ color: "#555", fontSize: 10, display: "flex", justifyContent: "space-between" }}>
            <span>3-of-any (first 3 reels)</span>
            <span style={{ color: "#666" }}>+30 ⚡</span>
          </div>
          <div style={{ color: "#555", fontSize: 10, display: "flex", justifyContent: "space-between" }}>
            <span>Any 🌟 anywhere</span>
            <span style={{ color: "#666" }}>+10 ⚡</span>
          </div>
          <div style={{ color: "#333", fontSize: 10, marginTop: 4, borderTop: "1px solid #1a1400", paddingTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            <span>Every {LUCKY_SPIN_INTERVAL} spins → ⭐ LUCKY SPIN (free · 2× guaranteed win)</span>
            <span>Every {BONUS_ROUND_INTERVAL} spins → 🎰 KARMA RUSH (3 free spins · 2× wins)</span>
            <span>3+ wins in last 5 → 🔥 HOT ZONE (+50% payouts)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
