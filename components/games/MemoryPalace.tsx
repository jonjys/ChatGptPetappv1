"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// ─── Emoji sets ──────────────────────────────────────────────────────────────
const EMOJI_SETS: Record<string, string[]> = {
  nature:  ["🌿","🌸","🍄","🌊","🌺","🌞","🍀","🌙","🌴","🌻","❄️","🌈"],
  cosmic:  ["🌌","⭐","🪐","☄️","🌠","💫","🌀","🔭","🪐","✨","🌑","💥"],
  animals: ["🦁","🐺","🦊","🐉","🦋","🐸","🦅","🐙","🦜","🦄","🐬","🦓"],
  misc:    ["💎","⚡","🔥","🏆","🎯","🧠","🎮","💡","⚔️","🛡️","🎭","🌋"],
};

function getEmojiPool(level: number): string[] {
  if (level === 1) return EMOJI_SETS.nature;
  if (level === 2) return EMOJI_SETS.cosmic;
  if (level === 3) return [...EMOJI_SETS.animals, ...EMOJI_SETS.nature];
  return [...EMOJI_SETS.nature, ...EMOJI_SETS.cosmic, ...EMOJI_SETS.animals, ...EMOJI_SETS.misc];
}

// ─── Level config ─────────────────────────────────────────────────────────────
interface LevelConfig {
  pairs: number;
  rings: number[];   // radii for each ring
  timeLimit: number;
}

function getLevelConfig(level: number): LevelConfig {
  if (level === 1) return { pairs: 4,  rings: [110],       timeLimit: 60 };
  if (level === 2) return { pairs: 6,  rings: [120],       timeLimit: 55 };
  if (level === 3) return { pairs: 8,  rings: [90, 150],   timeLimit: 50 };
  if (level === 4) return { pairs: 10, rings: [90, 155],   timeLimit: 45 };
  // level 5+
  const extra = level - 5;
  return {
    pairs: 12 + extra * 2,
    rings: [85, 145, 195],
    timeLimit: Math.max(30, 45 - extra * 3),
  };
}

// ─── Card positions ───────────────────────────────────────────────────────────
const CARD_SIZE = 52;
const CX = 160; // centre x of 320px container
const CY = 170; // centre y

interface CardPos { x: number; y: number }

function buildPositions(rings: number[], totalCards: number): CardPos[] {
  const positions: CardPos[] = [];
  // distribute cards evenly across rings
  const perRing = distributeToRings(totalCards, rings.length);
  let startAngle = -Math.PI / 2; // start from top

  rings.forEach((radius, ri) => {
    const count = perRing[ri];
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (2 * Math.PI * i) / count;
      positions.push({
        x: CX + radius * Math.cos(angle) - CARD_SIZE / 2,
        y: CY + radius * Math.sin(angle) - CARD_SIZE / 2,
      });
    }
  });
  return positions;
}

function distributeToRings(total: number, rings: number): number[] {
  if (rings === 1) return [total];
  if (rings === 2) {
    // inner ring gets 40%, outer 60%, both even
    const inner = Math.floor(total * 0.4);
    return [inner % 2 === 0 ? inner : inner - 1, total - (inner % 2 === 0 ? inner : inner - 1)];
  }
  // 3 rings
  const inner = Math.floor(total * 0.3);
  const mid   = Math.floor(total * 0.35);
  return [inner, mid, total - inner - mid];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
  shaking: boolean;
}

function makeCards(level: number): Card[] {
  const { pairs } = getLevelConfig(level);
  const pool = getEmojiPool(level);
  const emojis = [...pool.slice(0, pairs), ...pool.slice(0, pairs)];
  for (let i = emojis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojis[i], emojis[j]] = [emojis[j], emojis[i]];
  }
  return emojis.map((emoji, id) => ({ id, emoji, flipped: false, matched: false, shaking: false }));
}

// ─── Stars background ─────────────────────────────────────────────────────────
function Stars() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {stars.map(s => (
        <motion.div
          key={s.id}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
          }}
          animate={{ opacity: [0.1, 0.8, 0.1] }}
          transition={{ delay: s.delay, duration: s.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Circular timer ring ──────────────────────────────────────────────────────
function TimerRing({ timeLeft, timeLimit }: { timeLeft: number; timeLimit: number }) {
  const R = 22;
  const circ = 2 * Math.PI * R;
  const progress = timeLeft / timeLimit;
  const dash = circ * progress;
  const color = timeLeft <= 10 ? "#ff2d8d" : timeLeft <= Math.floor(timeLimit * 0.4) ? "#ff6b35" : "#8b5cf6";

  return (
    <svg width={56} height={56} style={{ display: "block" }}>
      <circle cx={28} cy={28} r={R} fill="none" stroke="#1a1a2a" strokeWidth={4} />
      <motion.circle
        cx={28} cy={28} r={R}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 28 28)"
        animate={{ stroke: color }}
        transition={{ duration: 0.3 }}
      />
      <text x={28} y={33} textAnchor="middle" fill={color} fontSize={11} fontWeight={700} fontFamily="monospace">
        {timeLeft}
      </text>
    </svg>
  );
}

// ─── Center hub ───────────────────────────────────────────────────────────────
function CenterHub({ level, combo }: { level: number; combo: number }) {
  return (
    <div style={{ position: "absolute", left: CX - 34, top: CY - 34, width: 68, height: 68, zIndex: 10 }}>
      {/* Outer pulse ring */}
      <motion.div
        style={{
          position: "absolute", inset: -10,
          borderRadius: "50%",
          border: "2px solid #8b5cf6",
          opacity: 0,
        }}
        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
      {/* Main circle */}
      <motion.div
        style={{
          width: 68, height: 68,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%, #2d1060, #0a0012 70%)",
          border: "2px solid #8b5cf6",
          boxShadow: "0 0 20px #8b5cf699, inset 0 0 15px #8b5cf622",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <AnimatePresence mode="wait">
          {combo >= 2 ? (
            <motion.div
              key={`combo-${combo}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: "center" }}
            >
              <div style={{ color: "#c8ff00", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>COMBO</div>
              <div style={{ color: "#c8ff00", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>×{combo}</div>
            </motion.div>
          ) : (
            <motion.div
              key={`level-${level}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: "center" }}
            >
              <div style={{ color: "#9c7dff", fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Level</div>
              <div style={{ color: "#e0d0ff", fontSize: 24, fontWeight: 900, lineHeight: 1, textShadow: "0 0 12px #8b5cf6" }}>{level}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────
interface CardTileProps {
  card: Card;
  pos: CardPos;
  onClick: () => void;
  active: boolean;
}

function CardTile({ card, pos, onClick, active }: CardTileProps) {
  const isVisible = card.flipped || card.matched;

  return (
    <motion.div
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={
        card.shaking
          ? { x: [0, -6, 6, -6, 6, 0], scale: 1, opacity: 1 }
          : card.matched
          ? { scale: [1, 1.15, 0], opacity: [1, 1, 0] }
          : { scale: 1, opacity: 1, x: 0 }
      }
      transition={
        card.shaking
          ? { duration: 0.4 }
          : card.matched
          ? { duration: 0.5, times: [0, 0.4, 1] }
          : { type: "spring", stiffness: 260, damping: 20, delay: card.id * 0.04 }
      }
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: 12,
        border: card.matched
          ? "2px solid #8b5cf6"
          : card.flipped
          ? "2px solid #a78bfa"
          : "2px solid #2d1a4a",
        background: card.matched
          ? "linear-gradient(135deg, #1a0d2e, #2d1060)"
          : card.flipped
          ? "linear-gradient(135deg, #1a1040, #2a1060)"
          : "linear-gradient(135deg, #0d0920, #150b30)",
        boxShadow: card.matched
          ? "0 0 20px #8b5cf6, 0 0 40px #8b5cf644"
          : card.flipped
          ? "0 0 10px #a78bfa55"
          : "0 2px 8px #00000066",
        cursor: active ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        userSelect: "none",
        zIndex: card.flipped || card.matched ? 5 : 2,
        overflow: "hidden",
      }}
      whileTap={active ? { scale: 0.9 } : {}}
    >
      {/* Shimmer on face-down cards */}
      {!isVisible && (
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(105deg, transparent 40%, #ffffff0a 50%, transparent 60%)",
            borderRadius: 10,
          }}
          animate={{ x: [-60, 60] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: card.id * 0.15 }}
        />
      )}

      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.span
            key="face"
            initial={{ scale: 0, rotateY: 90, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {card.emoji}
          </motion.span>
        ) : (
          <motion.span
            key="back"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ color: "#4a2a6a", fontSize: 16, fontWeight: 900 }}
          >
            ?
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Level cleared overlay ────────────────────────────────────────────────────
function LevelClearedOverlay({ level, onNext }: { level: number; onNext: () => void }) {
  const starCount = 8 + level * 2;
  const stars = Array.from({ length: starCount }, (_, i) => ({
    id: i,
    angle: (360 / starCount) * i,
    delay: i * 0.05,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute", inset: 0,
        background: "rgba(10,0,18,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 100,
        borderRadius: 16,
      }}
    >
      {/* Exploding stars */}
      {stars.map(s => (
        <motion.div
          key={s.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos((s.angle * Math.PI) / 180) * 120,
            y: Math.sin((s.angle * Math.PI) / 180) * 120,
            scale: [0, 1.2, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 1, delay: s.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            fontSize: 18,
            pointerEvents: "none",
          }}
        >
          ⭐
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0.3, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
        style={{ textAlign: "center" }}
      >
        <div style={{ fontSize: 36, marginBottom: 4 }}>🏆</div>
        <div style={{ color: "#c8ff00", fontSize: 26, fontWeight: 900, letterSpacing: 3, textShadow: "0 0 20px #c8ff00" }}>
          LEVEL CLEARED!
        </div>
        <motion.div
          style={{
            color: "#8b5cf6",
            fontSize: 14,
            fontWeight: 700,
            marginTop: 6,
            letterSpacing: 2,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          LEVEL {level + 1} INCOMING...
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Props & component ────────────────────────────────────────────────────────
export type Props = { onEnd: (matched: number, time: number, level: number) => void };

type Phase = "idle" | "on" | "levelcleared" | "over";

export default function MemoryPalace({ onEnd }: Props) {
  const [level, setLevel]       = useState(1);
  const [highLevel, setHighLevel] = useState(1);
  const [cards, setCards]       = useState<Card[]>(() => makeCards(1));
  const [positions, setPositions] = useState<CardPos[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked]     = useState(false);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [matched, setMatched]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo]       = useState(0);
  const [totalMatched, setTotalMatched] = useState(0);

  const cfg = getLevelConfig(level);

  // Build card positions whenever level changes
  useEffect(() => {
    const newCards = makeCards(level);
    setCards(newCards);
    setPositions(buildPositions(cfg.rings, newCards.length));
  }, [level]);

  const startLevel = useCallback((lvl: number) => {
    const c = getLevelConfig(lvl);
    const newCards = makeCards(lvl);
    setCards(newCards);
    setPositions(buildPositions(c.rings, newCards.length));
    setSelected([]);
    setLocked(false);
    setMatched(0);
    setCombo(0);
    setTimeLeft(c.timeLimit);
    setPhase("on");
  }, []);

  const start = useCallback(() => {
    setLevel(1);
    setTotalMatched(0);
    startLevel(1);
  }, [startLevel]);

  // Timer
  useEffect(() => {
    if (phase !== "on") return;
    if (timeLeft <= 0) {
      setPhase("over");
      onEnd(totalMatched, 0, level);
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, totalMatched, level, onEnd]);

  // Level cleared -> auto-advance
  useEffect(() => {
    if (phase !== "levelcleared") return;
    const t = setTimeout(() => {
      const next = level + 1;
      setLevel(next);
      setHighLevel(h => Math.max(h, next));
      startLevel(next);
    }, 2200);
    return () => clearTimeout(t);
  }, [phase, level, startLevel]);

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
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, matched: true } : c));
          setCombo(c => c + 1);
          const newMatched = matched + 1;
          setMatched(newMatched);
          setTotalMatched(t => t + 1);

          if (newMatched === cfg.pairs) {
            // Level complete
            setTimeout(() => setPhase("levelcleared"), 300);
          }

          setSelected([]);
          setLocked(false);
        }, 350);
      } else {
        // Miss — shake
        setCombo(0);
        setCards(prev => prev.map(c =>
          c.id === a || c.id === b ? { ...c, shaking: true } : c
        ));
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a || c.id === b ? { ...c, flipped: false, shaking: false } : c
          ));
          setSelected([]);
          setLocked(false);
        }, 700);
      }
    }
  }

  // Container height: max ring radius + card size + top/bottom padding
  const maxRadius = Math.max(...cfg.rings);
  const containerH = (CY + maxRadius + CARD_SIZE / 2 + 20);

  const timerColor = timeLeft <= 10 ? "#ff2d8d" : timeLeft <= Math.floor(cfg.timeLimit * 0.4) ? "#ff6b35" : "#8b5cf6";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "#0a0012",
        borderRadius: 20,
        padding: "16px 12px 20px",
        border: "2px solid #1a0a30",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Stars />

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <div>
          <div style={{ color: "#8b5cf6", fontSize: 13, fontWeight: 900, letterSpacing: 4, textShadow: "0 0 10px #8b5cf6" }}>
            MEMORY PALACE
          </div>
          <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>
            {matched}/{cfg.pairs} pairs · best: Lv{highLevel}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {phase === "on" && <TimerRing timeLeft={timeLeft} timeLimit={cfg.timeLimit} />}
          <div style={{ textAlign: "right" }}>
            <div style={{
              background: "linear-gradient(135deg, #1a0a30, #2d1060)",
              border: "2px solid #8b5cf6",
              borderRadius: 10,
              padding: "4px 12px",
              color: "#c8a0ff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
            }}>
              LV {level}
            </div>
          </div>
        </div>
      </div>

      {/* ── Circular ring arena ── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: containerH,
          maxWidth: 340,
          margin: "0 auto",
        }}
      >
        {/* Ring decorations */}
        {cfg.rings.map((r, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            style={{
              position: "absolute",
              left: CX - r,
              top: CY - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: "1px solid #2a1050",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        ))}

        {/* Center hub */}
        <CenterHub level={level} combo={combo} />

        {/* Cards */}
        <AnimatePresence>
          {cards.map((card, idx) => {
            const pos = positions[idx];
            if (!pos) return null;
            return (
              <CardTile
                key={`${level}-${card.id}`}
                card={card}
                pos={pos}
                onClick={() => flip(card.id)}
                active={phase === "on" && !card.matched && !locked}
              />
            );
          })}
        </AnimatePresence>

        {/* Level cleared overlay (positioned inside arena) */}
        <AnimatePresence>
          {phase === "levelcleared" && (
            <LevelClearedOverlay level={level} onNext={() => {}} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Idle start screen ── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ textAlign: "center", position: "relative", zIndex: 20 }}
          >
            <div style={{ color: "#9c7dff", fontSize: 12, marginBottom: 4 }}>
              Match pairs in the ring. Combos multiply your score.
            </div>
            <div style={{ color: "#555", fontSize: 11, marginBottom: 14 }}>
              Each level adds more cards &amp; less time.
            </div>
            <motion.button
              onClick={start}
              whileHover={{ scale: 1.04, boxShadow: "0 0 24px #8b5cf6" }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "13px 44px",
                background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
                border: "2px solid #8b5cf6",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 900,
                color: "#fff",
                cursor: "pointer",
                letterSpacing: 3,
                boxShadow: "0 0 16px #8b5cf655",
              }}
            >
              ENTER TOWER
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game over screen ── */}
      <AnimatePresence>
        {phase === "over" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "relative", zIndex: 20,
              textAlign: "center",
              padding: "20px 16px",
              background: "linear-gradient(135deg, #0d0920, #1a0a30)",
              border: "2px solid #8b5cf6",
              borderRadius: 16,
              boxShadow: "0 0 30px #8b5cf633",
            }}
          >
            <div style={{ fontSize: "2.4rem", marginBottom: 6 }}>
              {level > 2 ? "🏆" : timeLeft <= 0 ? "⏰" : "💀"}
            </div>
            <div style={{ color: "#8b5cf6", fontSize: 20, fontWeight: 900, letterSpacing: 2 }}>
              {timeLeft <= 0 ? "TIME UP!" : "GAME OVER"}
            </div>
            <div style={{ color: "#c8ff00", fontSize: 24, fontWeight: 900, margin: "8px 0 4px" }}>
              LEVEL {level} REACHED
            </div>
            <div style={{ color: "#9c7dff", fontSize: 13, marginBottom: 6 }}>
              {totalMatched} total pairs matched
            </div>
            <div style={{ color: "#aaa", fontSize: 12, marginBottom: 16 }}>
              Best level: <span style={{ color: "#c8ff00", fontWeight: 700 }}>{highLevel}</span>
            </div>
            <motion.button
              onClick={start}
              whileHover={{ scale: 1.04, boxShadow: "0 0 24px #8b5cf6" }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "11px 36px",
                background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
                border: "2px solid #8b5cf6",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 900,
                color: "#fff",
                cursor: "pointer",
                letterSpacing: 2,
                boxShadow: "0 0 12px #8b5cf655",
              }}
            >
              TRY AGAIN
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
