"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";

const STORE_KEY = "karma_spinwheel_last_v1";
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

const SEGMENTS = [
  { label: "+25 ⚡",   karma: 25,  color: "#c8ff00",  textColor: "#0a0a0a", emoji: "⚡" },
  { label: "+50 ⚡",   karma: 50,  color: "#00e5ff",  textColor: "#0a0a0a", emoji: "💎" },
  { label: "+10 ⚡",   karma: 10,  color: "#ff6b35",  textColor: "#fff",    emoji: "🔥" },
  { label: "+100 ⚡",  karma: 100, color: "#ff2d8d",  textColor: "#fff",    emoji: "🌟" },
  { label: "+15 ⚡",   karma: 15,  color: "#8b5cf6",  textColor: "#fff",    emoji: "✨" },
  { label: "+200 ⚡",  karma: 200, color: "#ffde00",  textColor: "#0a0a0a", emoji: "👑" },
  { label: "+5 ⚡",    karma: 5,   color: "#4488ff",  textColor: "#fff",    emoji: "⚡" },
  { label: "+500 ⚡",  karma: 500, color: "#e040fb",  textColor: "#fff",    emoji: "💰" },
];

const SEG_ANGLE = 360 / SEGMENTS.length;

export default function SpinWheel() {
  const { addKarma, showToast } = useApp();
  const [show, setShow] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [finalAngle, setFinalAngle] = useState(0);
  const [result, setResult] = useState<typeof SEGMENTS[0] | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [canSpin, setCanSpin] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    function check() {
      try {
        const last = parseInt(localStorage.getItem(STORE_KEY) ?? "0") || 0;
        const elapsed = Date.now() - last;
        if (elapsed >= COOLDOWN_MS) {
          setCanSpin(true);
          setCooldownLeft(0);
        } else {
          setCanSpin(false);
          setCooldownLeft(Math.ceil((COOLDOWN_MS - elapsed) / 60000));
        }
      } catch { setCanSpin(true); }
    }
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, []);

  function spin() {
    if (!canSpin || spinning) return;

    setResult(null);
    setSpinning(true);

    // Weighted pick: higher karma = rarer
    const weights = [30, 25, 35, 15, 30, 8, 40, 2];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { idx = i; break; }
    }

    // Spin to that segment (land pointer at top = 270° offset needed)
    const targetAngle = 360 - (idx * SEG_ANGLE + SEG_ANGLE / 2);
    const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const total_angle = spins * 360 + targetAngle;

    setFinalAngle(prev => prev + total_angle);

    setTimeout(() => {
      const seg = SEGMENTS[idx];
      setResult(seg);
      setSpinning(false);
      setCanSpin(false);
      setCooldownLeft(360);

      addKarma(seg.karma, "Spin Wheel");
      showToast(`Spin! +${seg.karma} karma ${seg.emoji}`, seg.karma, seg.color, seg.emoji);

      try { localStorage.setItem(STORE_KEY, String(Date.now())); } catch {}
    }, 4200);
  }

  // Render wheel segments as SVG paths
  const R = 120, CX = 130, CY = 130;

  function segPath(i: number) {
    const startDeg = i * SEG_ANGLE - 90;
    const endDeg = startDeg + SEG_ANGLE;
    const s = Math.PI / 180;
    const x1 = CX + R * Math.cos(startDeg * s);
    const y1 = CY + R * Math.sin(startDeg * s);
    const x2 = CX + R * Math.cos(endDeg * s);
    const y2 = CY + R * Math.sin(endDeg * s);
    return `M${CX},${CY} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`;
  }

  function segLabelPos(i: number) {
    const midDeg = i * SEG_ANGLE + SEG_ANGLE / 2 - 90;
    const r2 = R * 0.65;
    return {
      x: CX + r2 * Math.cos(midDeg * Math.PI / 180),
      y: CY + r2 * Math.sin(midDeg * Math.PI / 180),
    };
  }

  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShow(true)}
        style={{
          background: canSpin
            ? "linear-gradient(135deg, #c8ff00, #88ff00)"
            : "#111",
          border: `2px solid ${canSpin ? "#c8ff00" : "#222"}`,
          borderRadius: 16, padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
          boxShadow: canSpin ? "0 0 20px #c8ff0044" : "none",
          width: "100%",
        }}
      >
        <motion.span
          animate={canSpin ? { rotate: [0, 30, -30, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          style={{ fontSize: "1.5rem" }}
        >🎡</motion.span>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: canSpin ? "#0a0a0a" : "#c8ff00" }}>
            {canSpin ? "SNURRA HJULET!" : "KARMA SPINWHEEL"}
          </div>
          <div style={{ fontSize: 10, color: canSpin ? "#333" : "#555" }}>
            {canSpin ? "Gratis belöning varje 6h" : `Nästa snurra om ~${cooldownLeft}min`}
          </div>
        </div>
        {canSpin && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ fontSize: 10, fontWeight: 800, background: "#0a0a0a", color: "#c8ff00", borderRadius: 8, padding: "4px 8px" }}
          >GRATIS</motion.div>
        )}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 10002,
              background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", padding: 20,
            }}
            onClick={e => { if (!spinning && e.target === e.currentTarget) setShow(false); }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              style={{
                background: "#111",
                border: "3px solid #c8ff00",
                borderRadius: 28,
                padding: "24px 20px 28px",
                width: "100%",
                maxWidth: 320,
                textAlign: "center",
                boxShadow: "0 0 60px #c8ff0033",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Title */}
              <div style={{ fontSize: 20, fontWeight: 900, color: "#c8ff00", marginBottom: 4 }}>
                🎡 KARMA WHEEL
              </div>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>
                {canSpin ? "Tryck SNURRA för din belöning!" : `Gratis varje 6h · ~${cooldownLeft}min kvar`}
              </div>

              {/* Wheel */}
              <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
                {/* Pointer */}
                <div style={{
                  position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "22px solid #c8ff00",
                  zIndex: 10, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                }} />

                <motion.svg
                  ref={svgRef}
                  width={260} height={260}
                  viewBox="0 0 260 260"
                  style={{ display: "block" }}
                  animate={{ rotate: finalAngle }}
                  transition={spinning ? { duration: 4, ease: [0.2, 0.8, 0.4, 1] } : { duration: 0 }}
                >
                  {SEGMENTS.map((seg, i) => (
                    <g key={i}>
                      <path d={segPath(i)} fill={seg.color} stroke="#0a0a0a" strokeWidth={2} />
                      <text
                        x={segLabelPos(i).x}
                        y={segLabelPos(i).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={seg.textColor}
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        transform={`rotate(${i * SEG_ANGLE + SEG_ANGLE / 2}, ${segLabelPos(i).x}, ${segLabelPos(i).y})`}
                      >
                        {seg.label}
                      </text>
                    </g>
                  ))}
                  {/* Center hub */}
                  <circle cx={CX} cy={CY} r={18} fill="#0a0a0a" stroke="#c8ff00" strokeWidth={3} />
                  <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="14">⚡</text>
                </motion.svg>
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                    style={{
                      background: result.color + "22",
                      border: `2px solid ${result.color}`,
                      borderRadius: 16, padding: "12px 16px",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: "2rem" }}>{result.emoji}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: result.color }}>
                      +{result.karma} karma!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spin button */}
              {!result ? (
                <motion.button
                  whileTap={canSpin ? { scale: 0.94 } : {}}
                  onClick={spin}
                  disabled={!canSpin || spinning}
                  style={{
                    width: "100%", padding: "16px",
                    background: canSpin && !spinning
                      ? "linear-gradient(135deg, #c8ff00, #88ff00)"
                      : "#1a1a1a",
                    border: "none", borderRadius: 16,
                    fontSize: 17, fontWeight: 900,
                    color: canSpin && !spinning ? "#0a0a0a" : "#555",
                    cursor: canSpin && !spinning ? "pointer" : "default",
                    letterSpacing: "0.04em",
                  }}
                >
                  {spinning ? "🎡 SNURRAR..." : canSpin ? "🎡 SNURRA!" : `⏱ ${cooldownLeft}min kvar`}
                </motion.button>
              ) : (
                <button
                  onClick={() => { setShow(false); setResult(null); }}
                  style={{
                    width: "100%", padding: "16px",
                    background: "#c8ff00", border: "none", borderRadius: 16,
                    fontSize: 16, fontWeight: 900, color: "#0a0a0a", cursor: "pointer",
                  }}
                >STÄNG ✓</button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
