"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "casting" | "waiting" | "timing" | "result";
type Rarity = "common" | "rare" | "legendary";

type FishType = {
  emoji: string; name: string; rarity: Rarity;
  zone: number; karma: number; xp: number; color: string;
};

const FISH: FishType[] = [
  { emoji: "🐟", name: "Sardine",    rarity: "common",    zone: 36, karma: 15,  xp: 10,  color: "#88ccff" },
  { emoji: "🐠", name: "Clownfish",  rarity: "common",    zone: 33, karma: 22,  xp: 14,  color: "#ff9944" },
  { emoji: "🦐", name: "Shrimp",     rarity: "common",    zone: 38, karma: 12,  xp: 8,   color: "#ffaacc" },
  { emoji: "🐡", name: "Pufferfish", rarity: "rare",      zone: 22, karma: 55,  xp: 35,  color: "#ffdd44" },
  { emoji: "🦞", name: "Lobster",    rarity: "rare",      zone: 18, karma: 70,  xp: 45,  color: "#ff4444" },
  { emoji: "🐙", name: "Octopus",    rarity: "rare",      zone: 20, karma: 80,  xp: 55,  color: "#cc55ff" },
  { emoji: "🦈", name: "Shark",      rarity: "legendary", zone: 11, karma: 180, xp: 120, color: "#4488ff" },
  { emoji: "🐋", name: "Whale",      rarity: "legendary", zone: 7,  karma: 300, xp: 200, color: "#2255cc" },
];

const RARITY_COLOR: Record<Rarity, string> = {
  common: "#88ccff",
  rare: "#cc55ff",
  legendary: "#ffcc00",
};

type GS = {
  fish: Array<{ type: FishType; x: number; y: number; vx: number; vy: number; flip: boolean }>;
  hookY: number;
  bubbles: Array<{ x: number; y: number; r: number; vy: number }>;
  targetFish: number;
};

type Props = {
  onCatch: (karma: number, xp: number) => void;
};

export default function DeepCatch({ onCatch }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>({ fish: [], hookY: -60, bubbles: [], targetFish: -1 });
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  const markerRef = useRef(50); // 0-100
  const markerDirRef = useRef(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [caughtFish, setCaughtFish] = useState<FishType | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [markerPct, setMarkerPct] = useState(50);
  const speedRef = useRef(1.8);

  const CW = 360, CH = 280;
  const SURFACE_Y = 55;

  function spawnFish() {
    const weights = FISH.map(f => f.rarity === "common" ? 60 : f.rarity === "rare" ? 30 : 10);
    const total = weights.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;
    let cum = 0;
    let type = FISH[0];
    for (let i = 0; i < FISH.length; i++) {
      cum += weights[i];
      if (r <= cum) { type = FISH[i]; break; }
    }
    const depth = 0.2 + Math.random() * 0.75;
    return {
      type,
      x: Math.random() < 0.5 ? -30 : CW + 30,
      y: SURFACE_Y + depth * (CH - SURFACE_Y - 30),
      vx: (Math.random() * 0.6 + 0.3) * (Math.random() < 0.5 ? 1 : -1),
      vy: (Math.random() - 0.5) * 0.15,
      flip: false,
    };
  }

  useEffect(() => {
    const gs = gsRef.current;
    for (let i = 0; i < 6; i++) gs.fish.push(spawnFish());
    for (let i = 0; i < 20; i++) {
      gs.bubbles.push({
        x: Math.random() * CW,
        y: SURFACE_Y + Math.random() * (CH - SURFACE_Y),
        r: Math.random() * 3 + 1,
        vy: -(Math.random() * 0.4 + 0.2),
      });
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const gs = gsRef.current;
      ctx.clearRect(0, 0, CW, CH);

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
      sky.addColorStop(0, "#0a1628");
      sky.addColorStop(1, "#1a3a5c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CW, SURFACE_Y);

      // Stars
      ctx.fillStyle = "#ffffff44";
      for (let i = 0; i < 15; i++) {
        const sx = ((i * 73) % CW);
        const sy = ((i * 31) % SURFACE_Y);
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
      }

      // Water body
      const water = ctx.createLinearGradient(0, SURFACE_Y, 0, CH);
      water.addColorStop(0, "#0d3a5a");
      water.addColorStop(0.4, "#082a44");
      water.addColorStop(1, "#020d18");
      ctx.fillStyle = water;
      ctx.fillRect(0, SURFACE_Y, CW, CH - SURFACE_Y);

      // Surface shimmer
      ctx.strokeStyle = "#4488ff44";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < CW; x += 4) {
        const y = SURFACE_Y + Math.sin((x + Date.now() * 0.003) * 0.08) * 2;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Light beams
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = "#88ccff";
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        const bx = 60 + b * 80;
        ctx.moveTo(bx - 15, SURFACE_Y);
        ctx.lineTo(bx + 15, SURFACE_Y);
        ctx.lineTo(bx + 40, CH);
        ctx.lineTo(bx - 40, CH);
        ctx.fill();
      }
      ctx.restore();

      // Bubbles
      ctx.fillStyle = "#88ccff33";
      ctx.strokeStyle = "#88ccff66";
      ctx.lineWidth = 0.5;
      gs.bubbles.forEach(b => {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });

      // Fish
      gs.fish.forEach((f, idx) => {
        const scale = 0.7 + (f.y - SURFACE_Y) / (CH - SURFACE_Y) * 0.5;
        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.vx < 0) ctx.scale(-1, 1);
        ctx.font = `${Math.round(18 * scale)}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";

        // Highlight targeted fish
        if (phaseRef.current === "waiting" && gs.targetFish === idx) {
          ctx.shadowColor = "#ffdd44"; ctx.shadowBlur = 12;
        }
        ctx.fillText(f.type.emoji, 0, 0);
        ctx.restore();
      });

      // Fishing line & hook
      if (phaseRef.current !== "idle") {
        ctx.strokeStyle = "#ffdd8888";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(CW * 0.5, 0); ctx.lineTo(CW * 0.5, gs.hookY);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.font = "20px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🪝", CW * 0.5, gs.hookY + 8);
      }
    }

    function tick() {
      const gs = gsRef.current;
      const p = phaseRef.current;

      // Animate fish
      gs.fish.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        if (f.x < -50) f.x = CW + 30;
        if (f.x > CW + 50) f.x = -30;
        f.y = Math.max(SURFACE_Y + 15, Math.min(CH - 20, f.y));
        f.vy += (Math.random() - 0.5) * 0.03;
        f.vy = Math.max(-0.3, Math.min(0.3, f.vy));
      });
      while (gs.fish.length < 6) gs.fish.push(spawnFish());

      // Bubbles
      gs.bubbles.forEach(b => {
        b.y += b.vy;
        b.x += (Math.random() - 0.5) * 0.3;
        if (b.y < SURFACE_Y) {
          b.y = CH - 20;
          b.x = Math.random() * CW;
        }
      });

      // Hook descent
      if (p === "casting") {
        gs.hookY += 2.5;
        // Find nearest fish
        const fi = gs.fish.findIndex(f =>
          Math.abs(f.x - CW * 0.5) < 50 && Math.abs(f.y - gs.hookY) < 30
        );
        if (fi >= 0) {
          gs.targetFish = fi;
          phaseRef.current = "waiting";
          setPhase("waiting");
          setTimeout(() => {
            phaseRef.current = "timing";
            speedRef.current = 1.8 + Math.random() * 1.5;
            setPhase("timing");
          }, 800);
        }
        if (gs.hookY > CH + 20) {
          // No fish, reel back
          gs.hookY = -60;
          gs.targetFish = -1;
          phaseRef.current = "idle";
          setPhase("idle");
        }
      }

      // Timing marker
      if (p === "timing") {
        markerRef.current += markerDirRef.current * speedRef.current;
        if (markerRef.current >= 100) { markerRef.current = 100; markerDirRef.current = -1; }
        if (markerRef.current <= 0)   { markerRef.current = 0;   markerDirRef.current = 1; }
        setMarkerPct(Math.round(markerRef.current));
      }

      draw();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCast = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    gsRef.current.hookY = SURFACE_Y - 5;
    phaseRef.current = "casting";
    setPhase("casting");
  }, []);

  const handleTiming = useCallback(() => {
    if (phaseRef.current !== "timing") return;
    const gs = gsRef.current;
    const fish = gs.fish[gs.targetFish];
    if (!fish) return;
    const zone = fish.type.zone;
    const zoneStart = 35;
    const zoneEnd = zoneStart + zone;
    const hit = markerRef.current >= zoneStart && markerRef.current <= zoneEnd;

    phaseRef.current = "result";
    gs.hookY = -60;
    gs.targetFish = -1;

    if (hit) {
      setCaughtFish(fish.type);
      const newScore = score + 1;
      setScore(newScore);
      setBest(b => Math.max(b, newScore));
      onCatch(fish.type.karma, fish.type.xp);
      gs.fish.splice(gs.fish.indexOf(fish), 1);
    } else {
      setCaughtFish(null);
    }
    setPhase("result");
    setTimeout(() => {
      phaseRef.current = "idle";
      setPhase("idle");
      setCaughtFish(null);
    }, 2200);
  }, [score, onCatch]);

  const zoneStart = 35;
  const activeFish = phase === "timing" || phase === "waiting"
    ? gsRef.current.fish[gsRef.current.targetFish]?.type
    : null;

  return (
    <div style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
      {/* Canvas */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "2.5px solid #0d4a7a", boxShadow: "0 0 24px #0066aa44" }}>
        <canvas ref={canvasRef} width={CW} height={CH} style={{ display: "block", width: "100%", height: "auto" }} />

        {/* Timing bar overlay */}
        <AnimatePresence>
          {phase === "timing" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                bottom: 12,
                left: 16,
                right: 16,
                height: 28,
                background: "#000000aa",
                borderRadius: 14,
                border: "2px solid #ffffff22",
                overflow: "hidden",
              }}
            >
              {/* Yellow zone */}
              <div style={{
                position: "absolute",
                top: 0, bottom: 0,
                left: `${zoneStart}%`,
                width: `${activeFish?.zone ?? 25}%`,
                background: "#ffdd0066",
                borderLeft: "2px solid #ffdd00",
                borderRight: "2px solid #ffdd00",
              }} />
              {/* Marker */}
              <motion.div
                style={{
                  position: "absolute",
                  top: 3, bottom: 3,
                  width: 4,
                  borderRadius: 2,
                  background: "#ffffff",
                  left: `${markerPct}%`,
                  boxShadow: "0 0 6px #fff",
                  transform: "translateX(-50%)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result overlay */}
        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                textAlign: "center",
                background: "#000000cc",
                borderRadius: 20,
                padding: "20px 32px",
                border: caughtFish ? `2px solid ${RARITY_COLOR[caughtFish.rarity]}` : "2px solid #ff4444",
                boxShadow: caughtFish ? `0 0 24px ${RARITY_COLOR[caughtFish.rarity]}` : "none",
              }}
            >
              {caughtFish ? (
                <>
                  <div style={{ fontSize: "3rem" }}>{caughtFish.emoji}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: RARITY_COLOR[caughtFish.rarity], marginTop: 4 }}>
                    {caughtFish.name} caught!
                  </div>
                  <div style={{ fontSize: 13, color: "#c8ff00", fontWeight: 700, marginTop: 4 }}>
                    +{caughtFish.karma} ⚡ · +{caughtFish.xp} XP
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "2rem" }}>💨</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ff5555", marginTop: 4 }}>Missed!</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Next time, aim better</div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Score bar */}
      <div className="flex justify-between items-center px-1 mt-3 mb-3">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4488ff" }}>Caught: {score} · Best: {best}</span>
        {activeFish && (
          <span style={{ fontSize: 12, fontWeight: 700, color: RARITY_COLOR[activeFish.rarity], textTransform: "uppercase" }}>
            {activeFish.rarity} · {activeFish.name}
          </span>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={phase === "timing" ? handleTiming : phase === "idle" ? handleCast : undefined}
        disabled={phase === "casting" || phase === "waiting" || phase === "result"}
        style={{
          width: "100%",
          padding: "18px",
          background: phase === "timing"
            ? "linear-gradient(135deg, #ffcc00, #ff8800)"
            : phase === "idle"
            ? "linear-gradient(135deg, #0d4a7a, #1a6aa0)"
            : "#222",
          border: `3px solid ${phase === "timing" ? "#ffcc00" : phase === "idle" ? "#4488ff" : "#333"}`,
          borderRadius: 16,
          fontSize: 18,
          fontWeight: 700,
          color: phase === "timing" ? "#000" : "#fff",
          cursor: phase === "casting" || phase === "waiting" || phase === "result" ? "default" : "pointer",
          letterSpacing: "0.04em",
          boxShadow: phase === "timing" ? "0 0 20px #ffcc0066, 4px 4px 0px #000" : phase === "idle" ? "4px 4px 0px #000" : "none",
          transition: "all 0.15s ease",
        }}
      >
        {phase === "idle"    && "🎣 CAST!"}
        {phase === "casting" && "🎣 Casting..."}
        {phase === "waiting" && `⚡ ${activeFish?.name} biting!`}
        {phase === "timing"  && "🎯 TIMING!"}
        {phase === "result"  && (caughtFish ? "🐟 Caught!" : "💨 Missed!")}
      </button>

      {/* Instruction */}
      {(phase === "timing" || phase === "waiting") && (
        <p style={{ textAlign: "center", fontSize: 12, color: "#ffdd00", fontWeight: 600, marginTop: 8 }}>
          TAP WHEN THE MARKER IS IN THE YELLOW ZONE!
        </p>
      )}
    </div>
  );
}
