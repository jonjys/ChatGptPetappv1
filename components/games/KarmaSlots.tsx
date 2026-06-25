"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ───────────────────────────────────────────────────────────────

// WILD symbol added as 10th symbol
const SYMBOLS = ["🐾", "⚡", "🔥", "💎", "🐱", "🌟", "🏆", "🍖", "👑", "🌀"] as const;
type Symbol = (typeof SYMBOLS)[number];

const WILD_SYMBOL: Symbol = "🌀";
const REEL_COUNT = 5;
const SPIN_COST_NORMAL = 25;
const BONUS_ROUND_INTERVAL = 15;
const LUCKY_SPIN_INTERVAL = 10;
const STAR_SYMBOL: Symbol = "🌟";
const CROWN_SYMBOL: Symbol = "👑";

const SYMBOL_NAMES: Record<Symbol, string> = {
  "👑": "CROWN",
  "🌟": "STAR",
  "💎": "GEM",
  "⚡": "BOLT",
  "🏆": "TROPHY",
  "🔥": "FIRE",
  "🐱": "CAT",
  "🐾": "PAW",
  "🍖": "BONE",
  "🌀": "WILD",
};

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

// 3-of-a-kind payouts (first 3 reels)
const PAYOUTS_3: Record<string, number> = {
  "👑👑👑": 2000,
  "💎💎💎": 500,
  "🏆🏆🏆": 300,
  "🌟🌟🌟": 200,
  "⚡⚡⚡": 150,
  "🔥🔥🔥": 100,
  "🐱🐱🐱": 80,
  "🐾🐾🐾": 60,
  "🍖🍖🍖": 40,
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
  "🌀": 0.5, // WILD — rare
};

const NEON_COLORS = ["#c8ff00", "#00e5ff", "#ff2d8d", "#ffde00", "#ff6b00"];

const SYMBOL_COLORS: Record<Symbol, string> = {
  "👑": "#ffd700",
  "🌟": "#ffec3d",
  "💎": "#00e5ff",
  "⚡": "#c8ff00",
  "🏆": "#ff8c00",
  "🔥": "#ff4500",
  "🐱": "#ff69b4",
  "🐾": "#a0a0a0",
  "🍖": "#cd853f",
  "🌀": "#00ffcc",
};

// Bet levels
const BET_LEVELS: Array<{ cost: number; mult: number; label: string }> = [
  { cost: 25, mult: 1, label: "25 ⚡" },
  { cost: 75, mult: 3, label: "75 ⚡" },
  { cost: 150, mult: 6, label: "MAX 150 ⚡" },
];

const STATS_KEY = "karma_slots_stats_v1";

interface SlotStats {
  totalSpins: number;
  totalWon: number;
  bestWin: number;
}

function loadStats(): SlotStats {
  if (typeof window === "undefined") return { totalSpins: 0, totalWon: 0, bestWin: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as SlotStats;
  } catch {}
  return { totalSpins: 0, totalWon: 0, bestWin: 0 };
}

function saveStats(s: SlotStats) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {}
}

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

interface CoinDrop {
  id: number;
  x: number;
  emoji: string;
  delay: number;
  duration: number;
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
  hadWild: boolean;
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

function resolveWilds(symbols: Symbol[]): Symbol[] {
  const nonWild = symbols.filter(s => s !== WILD_SYMBOL);
  if (nonWild.length === 0) return symbols;
  const counts: Record<string, number> = {};
  for (const s of nonWild) counts[s] = (counts[s] ?? 0) + 1;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Symbol;
  return symbols.map(s => (s === WILD_SYMBOL ? best : s));
}

function calcWin(rawSymbols: Symbol[], multiplier: number): { win: number; matchCount: number; hasStar: boolean; hadWild: boolean } {
  const hadWild = rawSymbols.includes(WILD_SYMBOL);
  const symbols = resolveWilds(rawSymbols);
  const hasStar = symbols.includes(STAR_SYMBOL);
  let win = 0;
  let matchCount = 0;

  if (symbols.every(s => s === symbols[0])) {
    const combo5 = symbols.join("");
    win = PAYOUTS_5[combo5] ?? 60;
    matchCount = 5;
  } else {
    const counts: Record<string, number> = {};
    for (const s of symbols) counts[s] = (counts[s] ?? 0) + 1;
    const maxCount = Math.max(...Object.values(counts));
    const topSym = Object.entries(counts).find(([, c]) => c === maxCount)?.[0] ?? "";

    if (maxCount >= 4) {
      const base5 = PAYOUTS_5[topSym.repeat(5)] ?? 40;
      win = Math.floor(base5 * 0.5);
      matchCount = 4;
    } else if (maxCount >= 3) {
      const first3 = symbols.slice(0, 3);
      if (first3.every(s => s === first3[0])) {
        const combo3 = first3.join("");
        win = PAYOUTS_3[combo3] ?? 30;
        matchCount = 3;
      }
    }
  }

  if (hasStar && win === 0) win = 10;
  win = win * multiplier;

  return { win, matchCount, hasStar, hadWild };
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

function generateCoinDrops(count: number): CoinDrop[] {
  const emojis = ["⚡", "💰", "💎", "🌟", "👑"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    delay: Math.random() * 1.2,
    duration: 1.5 + Math.random() * 1,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NeonTubeStrip() {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        borderRadius: "4px 4px 0 0",
        background: "linear-gradient(90deg, #ff0080, #ff8c00, #c8ff00, #00ffcc, #0080ff, #ff0080)",
        backgroundSize: "400% 100%",
        zIndex: 20,
      }}
      animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    />
  );
}

function SidePanel({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        bottom: 60,
        [side]: -28,
        width: 24,
        background: "linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)",
        borderRadius: side === "left" ? "8px 0 0 8px" : "0 8px 8px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          style={{
            fontSize: 9,
            color: NEON_COLORS[i % NEON_COLORS.length],
            transform: "rotate(-90deg)",
            whiteSpace: "nowrap",
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          K
        </motion.div>
      ))}
    </div>
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
  isWild: boolean;
}

function ReelWindow({ symbol, spinning, stopped, spinIndex, isWinner, isUltraJackpot, showJackpot, isWild }: ReelWindowProps) {
  const symColor = SYMBOL_COLORS[symbol] ?? "#c8ff00";
  const glowColor = isUltraJackpot
    ? "#bf00ff"
    : showJackpot
    ? "#ffde00"
    : isWild
    ? "#00ffcc"
    : isWinner
    ? "#ffd700"
    : "rgba(200,255,0,0.3)";

  const borderColor = isWinner || showJackpot || isWild ? glowColor : "rgba(200,255,0,0.3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div
        style={{
          width: 58,
          height: 68,
          background: "#0a0a0a",
          border: `2px solid ${borderColor}`,
          borderRadius: 10,
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          boxShadow: isWinner || isWild
            ? `0 0 24px ${glowColor}, 0 0 48px ${glowColor}55, inset 0 0 10px ${glowColor}44`
            : stopped
            ? `0 0 8px ${symColor}44`
            : spinning
            ? "0 0 8px rgba(200,255,0,0.2)"
            : "none",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
      >
        {!stopped ? (
          <motion.div
            animate={{ y: [0, -68 * SYMBOLS.length] }}
            transition={{ duration: 0.35 + spinIndex * 0.05, repeat: Infinity, ease: "linear" }}
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
                  width: 58,
                  height: 68,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  flexShrink: 0,
                }}
              >
                {s}
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`sym-${symbol}-${spinIndex}`}
            initial={{ scale: 1.5, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 14 }}
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
            {/* Glow pulse for winner — golden shimmer */}
            {isWinner && (
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, #ffd70033, #ffec3d66, #ffd70033)",
                  backgroundSize: "200% 200%",
                  borderRadius: 10,
                }}
              />
            )}
            {/* Wild glow */}
            {isWild && !isWinner && (
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
            {/* Symbol with per-color glow */}
            <span style={{
              position: "relative",
              zIndex: 1,
              filter: stopped ? `drop-shadow(0 0 6px ${symColor}cc)` : "none",
            }}>{symbol}</span>
          </motion.div>
        )}

        {/* 3D depth top fade */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 16,
          background: "linear-gradient(to bottom, #0a0a0acc, transparent)",
          pointerEvents: "none",
          zIndex: 5,
          borderRadius: "10px 10px 0 0",
        }} />
        {/* 3D depth bottom fade */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 16,
          background: "linear-gradient(to top, #0a0a0acc, transparent)",
          pointerEvents: "none",
          zIndex: 5,
          borderRadius: "0 0 10px 10px",
        }} />
      </div>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: isWild ? "#00ffcc" : isWinner ? "#ffd700" : "#444",
        letterSpacing: 1,
        textAlign: "center",
        transition: "color 0.2s",
      }}>
        {stopped ? SYMBOL_NAMES[symbol] ?? "" : "----"}
      </div>
    </div>
  );
}

interface WinParticle {
  id: number;
  x: number;
  emoji: string;
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
  const [recentResults, setRecentResults] = useState<boolean[]>([]);
  const [bonusRound, setBonusRound] = useState(false);
  const [bonusSpinsLeft, setBonusSpinsLeft] = useState(0);
  const [showBonusBanner, setShowBonusBanner] = useState(false);
  const [showUltraJackpot, setShowUltraJackpot] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [ultraFlash, setUltraFlash] = useState<"gold" | "white" | null>(null);
  const [petReaction, setPetReaction] = useState<"happy" | "sad" | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [coinDrops, setCoinDrops] = useState<CoinDrop[]>([]);
  const [betLevelIdx, setBetLevelIdx] = useState<0 | 1 | 2>(0);
  const [showPayline, setShowPayline] = useState(false);
  const [winnerReels, setWinnerReels] = useState<boolean[]>([false, false, false, false, false]);
  const [isLuckySpin, setIsLuckySpin] = useState(false);
  const [showLuckyBanner, setShowLuckyBanner] = useState(false);
  const [showPayTable, setShowPayTable] = useState(false);
  const [showWinnerText, setShowWinnerText] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [stats, setStats] = useState<SlotStats>({ totalSpins: 0, totalWon: 0, bestWin: 0 });
  const [winParticles, setWinParticles] = useState<WinParticle[]>([]);
  const [shakeLose, setShakeLose] = useState(false);
  const statsInitialized = useRef(false);

  useEffect(() => {
    if (!statsInitialized.current) {
      setStats(loadStats());
      statsInitialized.current = true;
    }
  }, []);

  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => { timeouts.current.forEach(clearTimeout); };
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  }, []);

  const betLevel = BET_LEVELS[betLevelIdx];
  const spinCost = betLevel.cost;
  const betMultiplier = betLevel.mult;

  function triggerWinParticles() {
    const emojis = ["⭐", "💎", "⚡", "🎉", "🔥"];
    const newParticles: WinParticle[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      emoji: emojis[i % 5],
    }));
    setWinParticles(newParticles);
    addTimeout(() => setWinParticles([]), 2500);
  }

  function triggerUltraJackpotCeremony(win: number) {
    setShowUltraJackpot(true);
    setScreenShake(true);
    addTimeout(() => setScreenShake(false), 800);
    const flashSequence: Array<"gold" | "white" | null> = ["gold", "white", "gold", "white", "gold", "white", "gold", "white", null];
    flashSequence.forEach((flash, i) => addTimeout(() => setUltraFlash(flash), i * 200));
    const colors = ["#ffde00", "#bf00ff", "#00e5ff", "#c8ff00", "#ff6b00", "#fff", "#ff2d8d"];
    setParticles(generateParticles(60, colors));
    setCoinDrops(generateCoinDrops(20));
    addTimeout(() => setParticles([]), 3200);
    addTimeout(() => setCoinDrops([]), 3500);
    setShowWinnerText(true);
    addTimeout(() => setShowWinnerText(false), 3000);
    addTimeout(() => { setShowUltraJackpot(false); setUltraFlash(null); }, 3000);
    void win;
  }

  function triggerJackpotCeremony() {
    setShowJackpot(true);
    setScreenShake(true);
    addTimeout(() => setScreenShake(false), 600);
    const colors = ["#ffde00", "#c8ff00", "#fff", "#ff6b00", "#00e5ff"];
    setParticles(generateParticles(40, colors));
    setCoinDrops(generateCoinDrops(12));
    addTimeout(() => setParticles([]), 2000);
    addTimeout(() => setCoinDrops([]), 2500);
    setShowWinnerText(true);
    addTimeout(() => setShowWinnerText(false), 2800);
    addTimeout(() => setShowJackpot(false), 3000);
  }

  function triggerMegaWinCelebration() {
    setScreenShake(true);
    addTimeout(() => setScreenShake(false), 400);
    const colors = ["#ff2d8d", "#c8ff00", "#ffde00", "#00e5ff"];
    setParticles(generateParticles(30, colors));
    setCoinDrops(generateCoinDrops(8));
    addTimeout(() => setParticles([]), 2000);
    addTimeout(() => setCoinDrops([]), 2200);
    setShowWinnerText(true);
    addTimeout(() => setShowWinnerText(false), 2200);
  }

  function spin() {
    if (spinning) return;

    const inBonusActive = bonusRound && bonusSpinsLeft > 0;
    const nextSpinNumber = spins + 1;
    const isLucky = nextSpinNumber % LUCKY_SPIN_INTERVAL === 0;

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
    setShowWinnerText(false);
    setWinnerReels([false, false, false, false, false]);
    setIsLuckySpin(isLucky);
    setSpinning(true);

    const newSpinCount = spins + 1;
    setSpins(newSpinCount);

    const newStats = { ...stats, totalSpins: stats.totalSpins + 1 };
    setStats(newStats);
    saveStats(newStats);

    if (newSpinCount % BONUS_ROUND_INTERVAL === 0) {
      setShowBonusBanner(true);
      setBonusRound(true);
      setBonusSpinsLeft(3);
      addTimeout(() => setShowBonusBanner(false), 2800);
    }

    if (isLucky) {
      setShowLuckyBanner(true);
      addTimeout(() => setShowLuckyBanner(false), 2000);
    }

    let finalSymbols: Symbol[] = Array.from({ length: REEL_COUNT }, () => weightedRandom());

    if (isLucky) {
      const luckySymbol = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 2)) + 1] as Symbol;
      finalSymbols[0] = luckySymbol;
      finalSymbols[1] = luckySymbol;
      finalSymbols[2] = luckySymbol;
    }

    setReelStopped([false, false, false, false, false]);
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

        if (reelIdx === REEL_COUNT - 1) {
          addTimeout(() => {
            setSpinning(false);

            const payMult = (inBonusActive ? 2 : 1) * betMultiplier * (isLucky ? 2 : 1);
            const { win, matchCount, hasStar, hadWild } = calcWin(finalSymbols, payMult);

            const currentWin = win > 0;
            const newRecent = [...recentResults, currentWin].slice(-5);
            setRecentResults(newRecent);

            const hotZone = newRecent.filter(Boolean).length >= 2;
            let finalWin = win;
            if (hotZone && win > 0) finalWin = Math.floor(win * 1.5);

            const resolved = resolveWilds(finalSymbols);
            const isUltraJackpot = resolved.every(s => s === CROWN_SYMBOL);
            const isJackpot = resolved.every(s => s === STAR_SYMBOL);
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
              hadWild,
            };
            setResult(spinResult);

            if (finalWin > 0) {
              const updatedStats = {
                totalSpins: newStats.totalSpins,
                totalWon: newStats.totalWon + finalWin,
                bestWin: Math.max(newStats.bestWin, finalWin),
              };
              setStats(updatedStats);
              saveStats(updatedStats);

              onWin(finalWin);
              setSessionKarma(sk => sk + finalWin);
              setWinStreak(ws => ws + 1);
              setLossStreak(0);

              const winners = Array.from({ length: REEL_COUNT }, (_, i) => {
                if (matchCount === 5) return true;
                if (matchCount === 4) {
                  const counts: Record<string, number> = {};
                  for (const s of resolved) counts[s] = (counts[s] ?? 0) + 1;
                  const topSym = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
                  return resolved[i] === topSym;
                }
                if (matchCount === 3) return i < 3 && resolved.slice(0, 3).every(s => s === resolved[0]);
                if (hasStar && matchCount === 0) return resolved[i] === STAR_SYMBOL;
                return false;
              });
              setWinnerReels(winners);
              setShowPayline(true);

              triggerWinParticles();
              if (isUltraJackpot) triggerUltraJackpotCeremony(finalWin);
              else if (isJackpot) triggerJackpotCeremony();
              else if (isMegaWin) triggerMegaWinCelebration();

              setPetReaction("happy");
              addTimeout(() => setPetReaction(null), 2800);
            } else {
              const newLoss = lossStreak + 1;
              setLossStreak(newLoss);
              setWinStreak(0);
              setShakeLose(true);
              addTimeout(() => setShakeLose(false), 500);
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

  const inBonusActive = bonusRound && bonusSpinsLeft > 0;
  const canSpin = !spinning && (karma >= spinCost || inBonusActive);
  const hotZone = recentResults.slice(-5).filter(Boolean).length >= 2;
  const isNextLucky = (spins + 1) % LUCKY_SPIN_INTERVAL === 0;
  const recentWins = recentResults.slice(-5).filter(Boolean).length;
  const isHotStreak = recentWins >= 2;

  const paylineColor = result
    ? result.matchCount === 5
      ? "linear-gradient(90deg, transparent, #ffd700, #ff0080, #c8ff00, #ffd700, transparent)"
      : result.matchCount === 4
      ? "linear-gradient(90deg, transparent, #ff2d8d, #fff, #ff2d8d, transparent)"
      : "linear-gradient(90deg, transparent, #ff8c00, #ffde00, #ff8c00, transparent)"
    : "none";

  const paylineGlow = result
    ? result.matchCount === 5
      ? "0 0 16px #ffd700, 0 0 32px #ff008088"
      : result.matchCount === 4
      ? "0 0 12px #ff2d8d, 0 0 24px #ff2d8d88"
      : "0 0 8px #ff8c00"
    : "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative", userSelect: "none" }}>

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

      {/* ── "WINNER WINNER!" text ── */}
      <AnimatePresence>
        {showWinnerText && (
          <motion.div
            initial={{ y: -120, opacity: 0, scale: 0.7 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            style={{
              position: "fixed",
              top: 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9997,
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: 4,
              color: "#ffde00",
              textShadow: "0 0 30px #ffde00, 0 0 60px #ff800088, 4px 4px 0 #000",
              textAlign: "center",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            WINNER WINNER! 🏆
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Coin/Emoji Rain ── */}
      <AnimatePresence>
        {coinDrops.map(drop => (
          <motion.div
            key={drop.id}
            initial={{ top: "-5%", left: `${drop.x}%`, opacity: 1, scale: 1.2 }}
            animate={{ top: "110%", opacity: 0, scale: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: drop.duration, delay: drop.delay, ease: "easeIn" }}
            style={{ position: "fixed", fontSize: "1.6rem", pointerEvents: "none", zIndex: 9992 }}
          >
            {drop.emoji}
          </motion.div>
        ))}
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
            {Array.from({ length: 12 }, (_, i) => (
              <motion.div
                key={i}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  width: 2,
                  height: "50vmax",
                  background: "linear-gradient(to bottom, transparent, #ffde0088, transparent)",
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
            <div style={{
              color: "#ffde00",
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 3,
              textShadow: "0 0 30px #ffde00, 0 0 60px #ffde0088",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
              lineHeight: 1.2,
            }}>
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
              whiteSpace: "nowrap",
            }}
          >
            🎰 KARMA RUSH! 🎰<br />
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
              whiteSpace: "nowrap",
            }}
          >
            ⭐ LUCKY SPIN! ⭐<br />
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

      {/* ── Win Particles Burst ── */}
      <AnimatePresence>
        {winParticles.map(p => (
          <motion.div key={p.id}
            initial={{ y: "100%", opacity: 1, scale: 0.5 }}
            animate={{ y: "-200%", opacity: 0, scale: 1.5 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            style={{ position: "fixed", left: `${p.x}%`, bottom: 0, fontSize: "1.6rem", pointerEvents: "none", zIndex: 50 }}
          >{p.emoji}</motion.div>
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
          ARCADE CABINET OUTER FRAME
      ════════════════════════════════════════ */}
      <motion.div
        animate={screenShake ? {
          x: [-8, 8, -6, 6, -3, 3, 0],
          y: [-4, 4, -3, 3, -1, 1, 0],
        } : { x: 0, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "linear-gradient(135deg, #2a2a2a, #111, #333, #111)",
          borderRadius: 24,
          padding: "10px 20px 14px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 40px #c8ff0022",
          width: "100%",
          maxWidth: 500,
          position: "relative",
        }}
      >
        <NeonTubeStrip />
        <SidePanel side="left" />
        <SidePanel side="right" />

        {/* KARMA SLOTS Logo — glowing 3D header */}
        <div style={{ textAlign: "center", marginTop: 6, marginBottom: 8, position: "relative", zIndex: 1 }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: 16,
              background: "linear-gradient(90deg, #c8ff00, #00e5ff, #ff2d8d, #ffde00, #ff6b00, #c8ff00)",
              backgroundSize: "400% 100%",
              opacity: 0.6,
              filter: "blur(4px)",
              zIndex: -1,
            }}
          />
          <motion.div
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4,
              lineHeight: 1,
              background: "linear-gradient(90deg, #c8ff00, #00e5ff, #ff2d8d, #ffde00, #ff6b00, #c8ff00)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px #c8ff0088)",
            }}
          >
            🎰 KARMA SLOTS 🎰
          </motion.div>
          <div style={{ color: "#ffde0066", fontSize: 9, fontWeight: 600, letterSpacing: 2, marginTop: 3 }}>
            SESSION: <span style={{ color: "#ffde00", fontWeight: 800 }}>{sessionKarma} ⚡</span>
          </div>
        </div>

        {/* MEGA JACKPOT Counter */}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background: "linear-gradient(135deg, #1a0800, #2a1500)",
            border: "2.5px solid #ffd700",
            borderRadius: 16, padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 10,
            boxShadow: "0 0 30px #ffd70044",
            position: "relative", zIndex: 1,
          }}
        >
          <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} style={{ fontSize: "1.5rem" }}>🏆</motion.span>
          <div>
            <div style={{ fontSize: 9, color: "#ffd700", fontWeight: 800, letterSpacing: "0.15em" }}>MEGA JACKPOT</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>1,337 ⚡</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50", boxShadow: "0 0 6px #4caf50" }} />
          </div>
        </motion.div>

        {/* ════════════════════════════════════════
            INNER MACHINE BODY
        ════════════════════════════════════════ */}
        <motion.div
          animate={
            showUltraJackpot
              ? { boxShadow: "0 0 80px #bf00ff, 0 0 160px #bf00ff88" }
              : spinning
              ? { boxShadow: ["0 0 30px #ffde0044, 8px 8px 0 #000", "0 0 80px #ffde00cc, 8px 8px 0 #000", "0 0 30px #ffde0044, 8px 8px 0 #000"] }
              : inBonusActive
              ? { boxShadow: ["0 0 30px #ff6b0066, 8px 8px 0 #000", "0 0 80px #ff6b00cc, 8px 8px 0 #000", "0 0 30px #ff6b0066, 8px 8px 0 #000"] }
              : isNextLucky
              ? { boxShadow: ["0 0 20px #00e5ff44, 8px 8px 0 #000", "0 0 50px #00e5ffcc, 8px 8px 0 #000", "0 0 20px #00e5ff44, 8px 8px 0 #000"] }
              : { boxShadow: "0 0 20px #ffde0022, 8px 8px 0 #000" }
          }
          transition={{ repeat: spinning || inBonusActive || isNextLucky ? Infinity : 0, duration: 0.7 }}
          style={{
            background: "#1a0a00",
            border: `3px solid ${inBonusActive ? "#ff6b00" : isNextLucky ? "#00e5ff" : "#c8ff00"}`,
            borderRadius: 16,
            padding: "10px 10px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* ── Status Badges Row ── */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10, flexWrap: "wrap" }}>
            {inBonusActive && (
              <motion.div
                animate={{ opacity: [1, 0.6, 1], scale: [1, 1.04, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                style={{ background: "#1a0800", border: "2px solid #ff6b00", borderRadius: 10, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#ff6b00", letterSpacing: 1 }}
              >
                🎰 KARMA RUSH · {bonusSpinsLeft} LEFT
              </motion.div>
            )}
            {isHotStreak && (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ background: "#1a0800", border: "2px solid #ff6b35", borderRadius: 10, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#ff6b35", letterSpacing: 1 }}
              >
                🔥 HOT STREAK ({recentWins}/5)
              </motion.div>
            )}
            {winStreak >= 2 && !isHotStreak && (
              <div style={{ background: "#0a1a00", border: "2px solid #c8ff00", borderRadius: 10, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#c8ff00", letterSpacing: 1 }}>
                ✨ STREAK ×{winStreak}
              </div>
            )}
            {isNextLucky && !spinning && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ background: "#001a1a", border: "2px solid #00e5ff", borderRadius: 10, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#00e5ff", letterSpacing: 1 }}
              >
                ⭐ LUCKY SPIN READY!
              </motion.div>
            )}
          </div>

          {/* ── 5 Reel Windows ── */}
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 8, position: "relative" }}>
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
                isWild={reelStopped[i] && sym === WILD_SYMBOL}
              />
            ))}

            {/* Payline */}
            <AnimatePresence>
              {showPayline && result && result.win > 0 && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={result.matchCount === 5
                    ? { scaleX: 1, opacity: 1, backgroundPosition: ["0% 0%", "100% 0%"] }
                    : { scaleX: 1, opacity: [0, 1, 0.7, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "50%",
                    height: 3,
                    background: paylineColor,
                    backgroundSize: "200% 100%",
                    boxShadow: paylineGlow,
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

          {/* Frame divider */}
          <div style={{
            height: 2,
            background: "linear-gradient(90deg, transparent, #ffde0066, #ffde00, #ffde0066, transparent)",
            marginBottom: 12,
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
                style={{ textAlign: "center", marginBottom: 8, minHeight: 36 }}
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
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
                    <span style={{ color: "#ffde00", fontSize: 16, fontWeight: 800 }}>+{result.win} ⚡</span>
                    {result.hadWild && <span style={{ color: "#00ffcc", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>🌀 WILD!</span>}
                    {inBonusActive && <span style={{ color: "#ff6b00", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×2 RUSH</span>}
                    {hotZone && <span style={{ color: "#ff6b35", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×1.5 HOT</span>}
                    {isLuckySpin && <span style={{ color: "#00e5ff", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×2 LUCKY</span>}
                    {betLevelIdx === 1 && <span style={{ color: "#bf00ff", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×3 BET</span>}
                    {betLevelIdx === 2 && <span style={{ color: "#ff4444", fontSize: 11, fontWeight: 700, alignSelf: "center" }}>×6 MAX</span>}
                    {result.hasStar && result.matchCount === 0 && (
                      <span style={{ color: "#888", fontSize: 11, alignSelf: "center" }}>🌟 consolation</span>
                    )}
                  </div>
                )}
              </motion.div>
            )}
            {!result && !spinning && (
              <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#333", fontSize: 12, letterSpacing: 2 }}>PRESS SPIN TO PLAY</div>
              </div>
            )}
            {spinning && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <div style={{ color: "#ffde0099", fontSize: 13, letterSpacing: 4, fontWeight: 700 }}>SPINNING...</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Jackpot overlay */}
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
                  borderRadius: 18,
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

          {/* ── SPIN BUTTON ── */}
          <motion.button
            whileTap={{ scale: canSpin ? 0.93 : 1 }}
            animate={
              shakeLose
                ? { x: [-6, 6, -5, 5, -3, 3, 0] }
                : canSpin && !spinning
                ? { boxShadow: [
                    "0 6px 0 #000, 0 0 20px rgba(200,255,0,0.3)",
                    "0 6px 0 #000, 0 0 40px rgba(200,255,0,0.8)",
                    "0 6px 0 #000, 0 0 20px rgba(200,255,0,0.3)",
                  ] }
                : {}
            }
            transition={shakeLose ? { duration: 0.4 } : { duration: 1.4, repeat: Infinity }}
            onClick={spin}
            disabled={!canSpin}
            style={{
              width: "100%",
              height: 52,
              padding: "0 16px",
              background: !canSpin
                ? "#222"
                : spinning
                ? "#1a1a1a"
                : inBonusActive
                ? "linear-gradient(135deg, #ff6b00, #ffde00)"
                : isNextLucky
                ? "linear-gradient(135deg, #00e5ff, #c8ff00)"
                : hotZone
                ? "linear-gradient(135deg, #ff4000, #ffde00)"
                : "linear-gradient(135deg, #ffde00, #c8ff00)",
              border: `3px solid ${canSpin && !spinning ? "#0a0a0a" : "#333"}`,
              borderRadius: 16,
              fontSize: spinning ? 16 : 20,
              fontWeight: 900,
              color: canSpin && !spinning ? "#0a0a0a" : spinning ? "#ffde00aa" : "#555",
              cursor: canSpin ? "pointer" : "not-allowed",
              letterSpacing: spinning ? 4 : 3,
              transition: "background 0.15s, color 0.15s, font-size 0.15s",
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {spinning ? (
              <>
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  style={{ display: "inline-block" }}
                >
                  ⚡
                </motion.span>
                SPINNING...
              </>
            ) : inBonusActive ? (
              `🎰 FREE SPIN (${bonusSpinsLeft} LEFT)`
            ) : isNextLucky ? (
              "⭐ LUCKY SPIN (FREE · 2×)"
            ) : hotZone ? (
              `🔥 SPIN! ⚡  (-${spinCost} ⚡  +50%!)`
            ) : (
              `SPIN! 🎰  -${spinCost} ⚡`
            )}
          </motion.button>

          {karma < spinCost && !inBonusActive && (
            <p style={{ color: "#ff2d8d", fontSize: 12, textAlign: "center", marginTop: 6, fontWeight: 600 }}>
              Need {spinCost} ⚡ to spin
            </p>
          )}
        </motion.div>

        {/* ── Bet Level Selector ── */}
        <div style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginTop: 8,
          background: "#0d0d0d",
          border: "2px solid #2a2a2a",
          borderRadius: 12,
          padding: "6px 10px",
        }}>
          <span style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 2, flexShrink: 0 }}>BET:</span>
          {BET_LEVELS.map((level, idx) => {
            const isMax = idx === 2;
            const isSelected = betLevelIdx === idx;
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.93 }}
                onClick={() => setBetLevelIdx(idx as 0 | 1 | 2)}
                animate={isMax && isSelected ? {
                  boxShadow: [
                    "0 0 8px #ff4444, 0 0 16px #ff440044",
                    "0 0 16px #ffd700, 0 0 32px #ffd70044",
                    "0 0 8px #ff4444, 0 0 16px #ff440044",
                  ],
                } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  borderRadius: 10,
                  border: `2px solid ${isSelected ? (isMax ? "#ff4444" : idx === 1 ? "#bf00ff" : "#ffde00") : "#2a2a2a"}`,
                  background: isSelected ? (isMax ? "linear-gradient(135deg, #2a0000, #1a0000)" : idx === 1 ? "#1a0030" : "#2a2000") : "#0a0a0a",
                  color: isSelected ? (isMax ? "#ff4444" : idx === 1 ? "#bf00ff" : "#ffde00") : "#444",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer",
                  letterSpacing: 1,
                  transition: "all 0.1s",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                <div>{level.label}</div>
                <div style={{ fontSize: 9, opacity: 0.7, fontWeight: 600, marginTop: 1 }}>×{level.mult} MULT</div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Stats Row ── */}
        <div style={{
          display: "flex",
          marginTop: 6,
          background: "#080808",
          border: "1px solid #1a1a1a",
          borderRadius: 10,
          overflow: "hidden",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          {[
            { label: "SPINS", value: stats.totalSpins.toString() },
            { label: "WON", value: `${stats.totalWon}⚡` },
            { label: "BEST", value: `${stats.bestWin}⚡` },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "7px 6px",
                textAlign: "center",
                borderRight: i < 2 ? "1px solid #1a1a1a" : "none",
              }}
            >
              <div style={{ color: "#333", fontSize: 9 }}>{item.label}</div>
              <div style={{ color: "#666", marginTop: 1 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ── Pay Table (collapsible) ── */}
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowPayTable(p => !p)}
            style={{
              width: "100%",
              background: "#0d0900",
              border: "2px solid #2a2000",
              borderRadius: showPayTable ? "10px 10px 0 0" : 10,
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#ffde00",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            <span>PAY TABLE</span>
            <span style={{ fontSize: 14 }}>{showPayTable ? "▲" : "▼"}</span>
          </button>

          <AnimatePresence>
            {showPayTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  overflow: "hidden",
                  background: "#0d0900",
                  border: "2px solid #2a2000",
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                }}
              >
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ color: "#555", fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>5-OF-A-KIND</div>
                  {Object.entries(PAYOUTS_5).map(([combo, payout]) => {
                    const sym = combo[0] as Symbol;
                    const isUltra = sym === "👑";
                    const isJack = sym === "🌟";
                    return (
                      <div
                        key={combo}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 8px",
                          borderRadius: 7,
                          background: isUltra ? "#150020" : isJack ? "#2a1f00" : "#0a0800",
                          border: `1px solid ${isUltra ? "#bf00ff33" : isJack ? "#ffde0033" : "#1a1400"}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: "0.75rem" }}>{combo}</span>
                          {isUltra && <span style={{ color: "#bf00ff88", fontSize: 8, fontWeight: 700 }}>JACKPOT!</span>}
                        </div>
                        <span style={{ color: isUltra ? "#bf00ff" : isJack ? "#ffde00" : "#c8ff00", fontSize: 11, fontWeight: 700 }}>
                          +{payout} ⚡
                        </span>
                      </div>
                    );
                  })}

                  <div style={{ color: "#555", fontSize: 9, letterSpacing: 2, marginTop: 8, marginBottom: 4 }}>3-OF-A-KIND (FIRST 3 REELS)</div>
                  {Object.entries(PAYOUTS_3).slice(0, 5).map(([combo, payout]) => (
                    <div
                      key={combo}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 8px",
                        borderRadius: 7,
                        background: "#0a0800",
                        border: "1px solid #1a1400",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem" }}>{combo}</span>
                      <span style={{ color: "#ff8c00", fontSize: 11, fontWeight: 700 }}>+{payout} ⚡</span>
                    </div>
                  ))}

                  <div style={{ marginTop: 8, color: "#333", fontSize: 9, lineHeight: 1.6, borderTop: "1px solid #1a1400", paddingTop: 6 }}>
                    <div>4-of-a-kind = 50% of 5-of-kind payout</div>
                    <div>🌀 WILD acts as any symbol (rare)</div>
                    <div>Any 🌟 = +10⚡ consolation</div>
                    <div>Every {LUCKY_SPIN_INTERVAL} spins → ⭐ LUCKY SPIN (free · 2×)</div>
                    <div>Every {BONUS_ROUND_INTERVAL} spins → 🎰 KARMA RUSH (3 free · 2×)</div>
                    <div>2+ wins in last 5 → 🔥 HOT STREAK (+50%)</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
