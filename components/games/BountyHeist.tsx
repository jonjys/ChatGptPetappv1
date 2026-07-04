"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

// ─── BOUNTY HEIST ─────────────────────────────────────────────────────────────
// Swipe-driven risk-chain game. Grab bounties to build an unbanked LOOT CHAIN
// with a rising multiplier — but every grab adds HEAT, and too much heat means
// the next grab can BUST the whole chain. Swipe down to BANK before it burns.
// RIGHT = grab · LEFT = skip · DOWN = bank

type CardKind = "loot" | "jackpot" | "cooler" | "insurance" | "time" | "siren";

interface HeistCard {
  id: number;
  kind: CardKind;
  emoji: string;
  title: string;
  value: number;  // karma value added to chain
  heat: number;   // heat added on grab
}

export type HeistResult = {
  banked: number;     // total karma banked
  grabbed: number;    // cards grabbed
  skipped: number;
  busts: number;
  bestChain: number;  // longest chain length
  xp: number;
};

type Props = { onEnd: (r: HeistResult) => void };

const ACCENT = "#00e5ff";
const ROUND_SECONDS = 60;

const LOOT_POOL = [
  { emoji: "💼", title: "Briefcase Job" },
  { emoji: "📦", title: "Cargo Grab" },
  { emoji: "💳", title: "Data Chip" },
  { emoji: "🖼️", title: "Art Lift" },
  { emoji: "⌚", title: "Watch Snatch" },
  { emoji: "💍", title: "Ring Run" },
  { emoji: "🔑", title: "Master Key" },
  { emoji: "🏆", title: "Trophy Haul" },
];

function makeCard(id: number, heat: number): HeistCard {
  const r = Math.random();
  if (r < 0.08) return { id, kind: "jackpot", emoji: "💎", title: "JACKPOT VAULT", value: 200 + Math.floor(Math.random() * 200), heat: 32 };
  if (r < 0.16) return { id, kind: "cooler", emoji: "🧊", title: "COOLER", value: 0, heat: -28 };
  if (r < 0.21) return { id, kind: "insurance", emoji: "🛡️", title: "INSURANCE", value: 0, heat: 0 };
  if (r < 0.28) return { id, kind: "time", emoji: "⏱️", title: "TIME EXTEND", value: 0, heat: 0 };
  // sirens show up more when you're hot
  if (r < 0.28 + (heat > 55 ? 0.12 : 0.06)) return { id, kind: "siren", emoji: "🚨", title: "SIREN — DITCH IT!", value: 0, heat: 0 };
  const loot = LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)];
  return { id, kind: "loot", emoji: loot.emoji, title: loot.title, value: 20 + Math.floor(Math.random() * 100), heat: 8 + Math.floor(Math.random() * 11) };
}

function bustChance(heat: number): number {
  // 0% below 40 heat, ~72% at 100
  return Math.max(0, (heat - 40) * 1.2);
}

export default function BountyHeist({ onEnd }: Props) {
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [card, setCard] = useState<HeistCard | null>(null);
  const [chain, setChain] = useState<number[]>([]);
  const [heat, setHeat] = useState(0);
  const [banked, setBanked] = useState(0);
  const [busts, setBusts] = useState(0);
  const [insured, setInsured] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [flash, setFlash] = useState<{ kind: "bust" | "bank" | "insured"; amount?: number } | null>(null);
  const [sirenDeadline, setSirenDeadline] = useState(0); // 0-1 progress

  const idRef = useRef(0);
  const grabbedRef = useRef(0);
  const skippedRef = useRef(0);
  const bestChainRef = useRef(0);
  const statsRef = useRef({ banked: 0, busts: 0 });
  const heatRef = useRef(0);
  const endedRef = useRef(false);

  const mult = 1 + chain.length * 0.15;
  const chainValue = Math.floor(chain.reduce((a, b) => a + b, 0) * mult);

  // Card drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-16, 16]);
  const grabGlow = useTransform(x, [40, 140], [0, 1]);
  const skipGlow = useTransform(x, [-140, -40], [1, 0]);
  const bankGlow = useTransform(y, [40, 130], [0, 1]);

  const nextCard = useCallback(() => {
    setCard(makeCard(idRef.current++, heatRef.current));
  }, []);

  const start = useCallback(() => {
    setPhase("on");
    setChain([]); setHeat(0); heatRef.current = 0;
    setBanked(0); setBusts(0); setInsured(false);
    setTimeLeft(ROUND_SECONDS);
    grabbedRef.current = 0; skippedRef.current = 0; bestChainRef.current = 0;
    statsRef.current = { banked: 0, busts: 0 };
    endedRef.current = false;
    idRef.current = 0;
    setCard(makeCard(0, 0));
    idRef.current = 1;
  }, []);

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPhase("over");
    const s = statsRef.current;
    onEnd({
      banked: s.banked,
      grabbed: grabbedRef.current,
      skipped: skippedRef.current,
      busts: s.busts,
      bestChain: bestChainRef.current,
      xp: Math.floor(s.banked / 2) + grabbedRef.current * 4,
    });
  }, [onEnd]);

  // Round timer
  useEffect(() => {
    if (phase !== "on") return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, finish]);

  const doBust = useCallback(() => {
    if (insured) {
      setInsured(false);
      setFlash({ kind: "insured" });
      setTimeout(() => setFlash(null), 900);
      return;
    }
    setChain([]);
    setBusts(b => { statsRef.current.busts = b + 1; return b + 1; });
    setHeat(30); heatRef.current = 30;
    setFlash({ kind: "bust" });
    setTimeout(() => setFlash(null), 1100);
  }, [insured]);

  // Siren countdown — ditch it fast or the chain busts
  useEffect(() => {
    if (phase !== "on" || card?.kind !== "siren") { setSirenDeadline(0); return; }
    const started = performance.now();
    const DURATION = 1300;
    let raf = 0;
    const tick = () => {
      const p = (performance.now() - started) / DURATION;
      if (p >= 1) {
        doBust();
        nextCard();
        return;
      }
      setSirenDeadline(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, card, doBust, nextCard]);

  const resolveGrab = useCallback((c: HeistCard) => {
    grabbedRef.current++;
    if (c.kind === "cooler") { setHeat(h => { const n = Math.max(0, h + c.heat); heatRef.current = n; return n; }); nextCard(); return; }
    if (c.kind === "insurance") { setInsured(true); nextCard(); return; }
    if (c.kind === "time") { setTimeLeft(t => t + 5); nextCard(); return; }
    if (c.kind === "siren") { doBust(); nextCard(); return; } // grabbing a siren = instant bust roll
    // loot / jackpot
    const newHeat = Math.min(100, heatRef.current + c.heat);
    heatRef.current = newHeat;
    setHeat(newHeat);
    if (Math.random() * 100 < bustChance(newHeat)) {
      doBust();
    } else {
      setChain(prev => {
        const n = [...prev, c.value];
        bestChainRef.current = Math.max(bestChainRef.current, n.length);
        return n;
      });
    }
    nextCard();
  }, [doBust, nextCard]);

  const doBank = useCallback(() => {
    if (chain.length === 0) return;
    const v = chainValue;
    setBanked(b => { statsRef.current.banked = b + v; return b + v; });
    setChain([]);
    setHeat(h => { const n = Math.floor(h * 0.35); heatRef.current = n; return n; });
    setFlash({ kind: "bank", amount: v });
    setTimeout(() => setFlash(null), 900);
  }, [chain.length, chainValue]);

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number; y: number } }) => {
    if (!card) return;
    const { offset } = info;
    if (offset.y > 90 && Math.abs(offset.x) < 80) { doBank(); return; }
    if (offset.x > 100) { resolveGrab(card); return; }
    if (offset.x < -100) { skippedRef.current++; nextCard(); return; }
  }, [card, doBank, resolveGrab, nextCard]);

  const heatColor = heat > 75 ? "#ff2244" : heat > 50 ? "#ff8800" : ACCENT;
  const risk = Math.round(bustChance(heat));

  return (
    <div style={{ position: "relative", background: "#060a0e", border: "2px solid #0e2a33", borderRadius: 20, padding: "14px 14px 18px", overflow: "hidden", minHeight: 520 }}>

      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#446", letterSpacing: "0.1em" }}>BANKED</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#c8ff00" }}>{banked}⚡</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#446", letterSpacing: "0.1em" }}>TIME</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: timeLeft <= 10 ? "#ff2244" : "#fff", fontVariantNumeric: "tabular-nums" }}>{timeLeft}s</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#446", letterSpacing: "0.1em" }}>CHAIN ×{mult.toFixed(2)}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: chain.length ? ACCENT : "#334" }}>{chainValue}⚡</div>
        </div>
      </div>

      {/* Heat meter */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: heatColor, letterSpacing: "0.12em" }}>
            🔥 HEAT {heat > 75 ? "— CRITICAL!" : ""}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: risk > 0 ? heatColor : "#334" }}>
            bust risk {risk}%
          </span>
        </div>
        <div style={{ height: 8, background: "#0a1418", borderRadius: 4, overflow: "hidden", border: "1px solid #123" }}>
          <motion.div
            animate={{ width: `${heat}%`, backgroundColor: heatColor, opacity: heat > 75 ? [1, 0.55, 1] : 1 }}
            transition={{ opacity: { duration: 0.5, repeat: heat > 75 ? Infinity : 0 } }}
            style={{ height: "100%", borderRadius: 4 }}
          />
        </div>
        {insured && (
          <div style={{ fontSize: 9, fontWeight: 800, color: "#4caf50", marginTop: 3 }}>🛡️ INSURED — next bust is free</div>
        )}
      </div>

      {/* Card arena */}
      <div style={{ position: "relative", height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Direction hints */}
        {phase === "on" && (
          <>
            <motion.div style={{ opacity: skipGlow, position: "absolute", left: 6, top: "42%", zIndex: 1, color: "#888", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em" }}>← SKIP</motion.div>
            <motion.div style={{ opacity: grabGlow, position: "absolute", right: 6, top: "42%", zIndex: 1, color: ACCENT, fontSize: 11, fontWeight: 900, letterSpacing: "0.08em" }}>GRAB →</motion.div>
            <motion.div style={{ opacity: bankGlow, position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", zIndex: 1, color: "#c8ff00", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em" }}>↓ BANK {chainValue}⚡</motion.div>
          </>
        )}

        <AnimatePresence mode="popLayout">
          {phase === "on" && card && (
            <motion.div
              key={card.id}
              drag
              dragSnapToOrigin
              onDragEnd={handleDragEnd}
              style={{ x, y, rotate, touchAction: "none", cursor: "grab", zIndex: 2 }}
              initial={{ scale: 0.7, opacity: 0, y: -30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.14 } }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              <div style={{
                width: 220, height: 270,
                background: card.kind === "jackpot" ? "linear-gradient(160deg, #1a1400, #2a2000)"
                  : card.kind === "siren" ? "linear-gradient(160deg, #1a0005, #300010)"
                  : card.kind === "cooler" ? "linear-gradient(160deg, #001a20, #002a35)"
                  : card.kind === "insurance" ? "linear-gradient(160deg, #04140a, #0a2a14)"
                  : card.kind === "time" ? "linear-gradient(160deg, #10081a, #1e1030)"
                  : "linear-gradient(160deg, #0a1218, #101c26)",
                border: `2.5px solid ${card.kind === "jackpot" ? "#ffcc00" : card.kind === "siren" ? "#ff2244" : card.kind === "cooler" ? "#00e5ff" : card.kind === "insurance" ? "#4caf50" : card.kind === "time" ? "#a855f7" : "#1e3a4a"}`,
                borderRadius: 22, padding: 18,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: card.kind === "jackpot" ? "0 0 34px #ffcc0044" : card.kind === "siren" ? "0 0 34px #ff224466" : "0 8px 30px rgba(0,0,0,0.55)",
                userSelect: "none",
              }}>
                {card.kind === "siren" && (
                  <div style={{ width: "100%", height: 5, background: "#300", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${(1 - sirenDeadline) * 100}%`, height: "100%", background: "#ff2244" }} />
                  </div>
                )}
                <motion.div
                  animate={card.kind === "siren" ? { rotate: [-6, 6, -6], transition: { duration: 0.25, repeat: Infinity } } : card.kind === "jackpot" ? { scale: [1, 1.1, 1], transition: { duration: 1.2, repeat: Infinity } } : {}}
                  style={{ fontSize: "3.6rem" }}
                >{card.emoji}</motion.div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", textAlign: "center", letterSpacing: "0.03em" }}>{card.title}</div>
                {card.kind === "loot" || card.kind === "jackpot" ? (
                  <>
                    <div style={{ fontSize: 26, fontWeight: 900, color: card.kind === "jackpot" ? "#ffcc00" : ACCENT }}>+{card.value}⚡</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: card.heat > 25 ? "#ff8800" : "#667", letterSpacing: "0.06em" }}>+{card.heat} HEAT</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "#889", textAlign: "center", lineHeight: 1.5 }}>
                    {card.kind === "cooler" && "Grab to vent −28 heat"}
                    {card.kind === "insurance" && "Grab to survive one bust"}
                    {card.kind === "time" && "Grab for +5 seconds"}
                    {card.kind === "siren" && "SWIPE LEFT NOW — grabbing or waiting busts your chain!"}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flash overlays */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              style={{
                position: "absolute", inset: 0, zIndex: 5,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: "3.4rem" }}>{flash.kind === "bust" ? "💥" : flash.kind === "insured" ? "🛡️" : "💰"}</div>
              <div style={{
                fontSize: 24, fontWeight: 900, letterSpacing: "0.04em",
                color: flash.kind === "bust" ? "#ff2244" : flash.kind === "insured" ? "#4caf50" : "#c8ff00",
                textShadow: `0 0 24px ${flash.kind === "bust" ? "#ff2244" : "#c8ff00"}`,
              }}>
                {flash.kind === "bust" ? "BUSTED!" : flash.kind === "insured" ? "INSURANCE SAVED YOU" : `BANKED +${flash.amount}⚡`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle / start */}
        {phase === "idle" && (
          <div style={{ textAlign: "center", zIndex: 2 }}>
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>🚨</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 6 }}>BOUNTY HEIST</div>
            <div style={{ fontSize: 12, color: "#889", lineHeight: 1.7, marginBottom: 14, maxWidth: 250, margin: "0 auto 14px" }}>
              GRAB loot to build a chain — every grab raises the multiplier <em>and</em> the heat.
              Too hot = <strong style={{ color: "#ff2244" }}>BUST</strong>, chain gone.<br />
              <strong style={{ color: ACCENT }}>→ grab</strong> · <strong style={{ color: "#888" }}>← skip</strong> · <strong style={{ color: "#c8ff00" }}>↓ bank</strong>
            </div>
            <motion.button whileTap={{ scale: 0.94 }} onClick={start}
              style={{ padding: "14px 40px", background: ACCENT, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 900, color: "#000", cursor: "pointer", boxShadow: `0 0 26px ${ACCENT}55`, fontFamily: "inherit" }}>
              START HEIST
            </motion.button>
          </div>
        )}

        {/* Game over */}
        {phase === "over" && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", zIndex: 2 }}>
            <div style={{ fontSize: "3rem", marginBottom: 6 }}>{banked > 0 ? "💰" : "🚔"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#c8ff00", marginBottom: 4 }}>+{banked}⚡ BANKED</div>
            <div style={{ fontSize: 11, color: "#889", marginBottom: 14 }}>
              {grabbedRef.current} grabs · best chain {bestChainRef.current} · {busts} bust{busts === 1 ? "" : "s"}
            </div>
            <motion.button whileTap={{ scale: 0.94 }} onClick={start}
              style={{ padding: "12px 34px", background: ACCENT, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 900, color: "#000", cursor: "pointer", fontFamily: "inherit" }}>
              RUN IT BACK
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Chain visualization */}
      {phase === "on" && (
        <div style={{ marginTop: 10, minHeight: 34 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center", overflowX: "auto", scrollbarWidth: "none" }}>
            {chain.length === 0 ? (
              <span style={{ fontSize: 10, color: "#334", fontWeight: 700, letterSpacing: "0.06em" }}>CHAIN EMPTY — GRAB SOMETHING</span>
            ) : chain.map((v, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{
                  flexShrink: 0, padding: "4px 8px", background: "#0a1a22",
                  border: `1.5px solid ${ACCENT}55`, borderRadius: 8,
                  fontSize: 10, fontWeight: 800, color: ACCENT,
                }}>
                {v}⚡
              </motion.div>
            ))}
            {chain.length > 0 && (
              <motion.button whileTap={{ scale: 0.9 }} onClick={doBank}
                style={{ flexShrink: 0, marginLeft: "auto", padding: "6px 14px", background: "#c8ff00", border: "none", borderRadius: 10, fontSize: 11, fontWeight: 900, color: "#000", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 0 14px #c8ff0055" }}>
                BANK {chainValue}⚡
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
