"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CW = 360, CH = 480;
const PAD_W = 70, PAD_H = 10, PAD_Y = CH - 45;
const BALL_R = 7;
const BLOCK_COLS = 8, BLOCK_ROWS = 5;
const BW = Math.floor(CW / BLOCK_COLS) - 3;
const BH = 22;
const DNA_CHANCE = 0.18;

type Phase = "idle" | "playing" | "gameover" | "levelup";

type Block = { x: number; y: number; hp: number; maxHp: number; isDNA: boolean; color: string };
type DNA = { x: number; y: number; vy: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number };

const WAVE_COLORS = [
  ["#ff4444","#ff6644","#ff8844"],
  ["#4488ff","#44aaff","#44ccff"],
  ["#44ff88","#88ff44","#ccff44"],
  ["#cc44ff","#ff44cc","#ff44aa"],
  ["#ffcc44","#ffaa44","#ff8844"],
];

type GS = {
  padX: number;
  ball: { x: number; y: number; vx: number; vy: number; active: boolean };
  blocks: Block[];
  dnaPickups: DNA[];
  particles: Particle[];
  fusionCharge: number; // 0-100
  lives: number;
  score: number;
  wave: number;
  coins: number;
};

function buildBlocks(wave: number): Block[] {
  const blocks: Block[] = [];
  const colors = WAVE_COLORS[(wave - 1) % WAVE_COLORS.length];
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      const hp = r < 2 ? 1 : r < 4 ? 2 : 3;
      blocks.push({
        x: c * (BW + 3) + 3,
        y: 70 + r * (BH + 4),
        hp, maxHp: hp,
        isDNA: Math.random() < DNA_CHANCE,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
  return blocks;
}

function spawnParticles(gs: GS, x: number, y: number, color: string, n = 8) {
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n;
    gs.particles.push({
      x, y,
      vx: Math.cos(angle) * (Math.random() * 3 + 1),
      vy: Math.sin(angle) * (Math.random() * 3 + 1),
      life: 1,
      color,
      r: Math.random() * 3 + 1,
    });
  }
}

type Props = { onEnd: (score: number, coins: number) => void };

export default function DNABreaker({ onEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>({
    padX: CW / 2 - PAD_W / 2,
    ball: { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 2.5, vy: -3.5, active: false },
    blocks: buildBlocks(1),
    dnaPickups: [],
    particles: [],
    fusionCharge: 0,
    lives: 3,
    score: 0,
    wave: 1,
    coins: 0,
  });
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  const touchXRef = useRef<number | null>(null);
  const [render, setRender] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uiScore, setUiScore] = useState(0);
  const [uiLives, setUiLives] = useState(3);
  const [uiFusion, setUiFusion] = useState(0);
  const [uiWave, setUiWave] = useState(1);
  const [uiCoins, setUiCoins] = useState(0);

  function forceRender() { setRender(n => n + 1); }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    function draw() {
      const gs = gsRef.current;
      const p = phaseRef.current;
      ctx.clearRect(0, 0, CW, CH);

      // BG
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, "#0a0a1a"); bg.addColorStop(1, "#050510");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

      // Grid lines
      ctx.strokeStyle = "#ffffff05"; ctx.lineWidth = 1;
      for (let x = 0; x < CW; x += 30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke(); }
      for (let y = 0; y < CH; y += 30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke(); }

      // Blocks
      gs.blocks.forEach(b => {
        if (b.hp <= 0) return;
        const alpha = 0.4 + (b.hp / b.maxHp) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, BW, BH, 4);
        ctx.fill();
        // Border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = b.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(b.x, b.y, BW, BH, 4); ctx.stroke();
        // DNA indicator
        if (b.isDNA) {
          ctx.fillStyle = "#c8ff00"; ctx.font = "10px serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("🧬", b.x + BW - 10, b.y + BH / 2);
        }
      });

      // DNA pickups
      gs.dnaPickups.forEach(d => {
        ctx.font = "14px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🧬", d.x, d.y);
      });

      // Particles
      gs.particles.forEach(pt => {
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Paddle
      const fusionActive = gs.fusionCharge >= 100;
      const padGrad = ctx.createLinearGradient(gs.padX, 0, gs.padX + PAD_W, 0);
      if (fusionActive) {
        padGrad.addColorStop(0, "#ff8800"); padGrad.addColorStop(0.5, "#ffcc00"); padGrad.addColorStop(1, "#ff8800");
      } else {
        padGrad.addColorStop(0, "#4488ff"); padGrad.addColorStop(1, "#00e5ff");
      }
      ctx.fillStyle = padGrad;
      ctx.beginPath(); ctx.roundRect(gs.padX, PAD_Y, PAD_W, PAD_H, PAD_H / 2); ctx.fill();
      if (fusionActive) {
        ctx.shadowColor = "#ffcc00"; ctx.shadowBlur = 15;
        ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(gs.padX, PAD_Y, PAD_W, PAD_H, PAD_H / 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Ball
      if (gs.ball.active || p === "idle") {
        const bGrad = ctx.createRadialGradient(gs.ball.x - 2, gs.ball.y - 2, 1, gs.ball.x, gs.ball.y, BALL_R);
        bGrad.addColorStop(0, "#ffffff"); bGrad.addColorStop(1, "#44ff88");
        ctx.fillStyle = bGrad;
        ctx.shadowColor = "#44ff88"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Fusion charge bar
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(8, CH - 20, CW - 16, 8);
      const fColor = gs.fusionCharge >= 100 ? "#ffcc00" : gs.fusionCharge > 60 ? "#ff8800" : "#4488ff";
      ctx.fillStyle = fColor;
      ctx.fillRect(8, CH - 20, (CW - 16) * gs.fusionCharge / 100, 8);
      ctx.strokeStyle = fColor + "66"; ctx.lineWidth = 1;
      ctx.strokeRect(8, CH - 20, CW - 16, 8);
      ctx.fillStyle = "#888"; ctx.font = "9px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("FUSION CHARGE", CW - 10, CH - 23);
    }

    function tick() {
      const gs = gsRef.current;
      const p = phaseRef.current;

      if (p === "playing" && gs.ball.active) {
        const b = gs.ball;
        b.x += b.vx; b.y += b.vy;

        // Wall bounce
        if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
        if (b.x + BALL_R > CW) { b.x = CW - BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }

        // Paddle bounce
        if (b.vy > 0 && b.y + BALL_R >= PAD_Y && b.y + BALL_R <= PAD_Y + PAD_H + 4 &&
            b.x >= gs.padX - BALL_R && b.x <= gs.padX + PAD_W + BALL_R) {
          const rel = (b.x - gs.padX) / PAD_W;
          b.vx = (rel - 0.5) * 7;
          b.vy = -Math.abs(b.vy) * 1.01;
          const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (spd > 9) { b.vx = b.vx / spd * 9; b.vy = b.vy / spd * 9; }
        }

        // Ball lost
        if (b.y > CH + 20) {
          gs.lives--;
          setUiLives(gs.lives);
          if (gs.lives <= 0) {
            phaseRef.current = "gameover";
            setPhase("gameover");
            onEnd(gs.score, gs.coins);
          } else {
            b.x = gs.padX + PAD_W / 2;
            b.y = PAD_Y - BALL_R - 2;
            b.vx = 2.5; b.vy = -3.5;
            b.active = false;
          }
        }

        // Block collision
        gs.blocks.forEach(bl => {
          if (bl.hp <= 0) return;
          if (b.x + BALL_R > bl.x && b.x - BALL_R < bl.x + BW &&
              b.y + BALL_R > bl.y && b.y - BALL_R < bl.y + BH) {
            bl.hp--;
            gs.score += bl.maxHp * 10;
            setUiScore(gs.score);
            spawnParticles(gs, bl.x + BW / 2, bl.y + BH / 2, bl.color);
            if (bl.isDNA && bl.hp <= 0) {
              gs.dnaPickups.push({ x: bl.x + BW / 2, y: bl.y + BH / 2, vy: 1.5 });
              gs.coins++;
              setUiCoins(gs.coins);
            }
            // Reflect
            const overlapX = Math.min(b.x + BALL_R - bl.x, bl.x + BW - (b.x - BALL_R));
            const overlapY = Math.min(b.y + BALL_R - bl.y, bl.y + BH - (b.y - BALL_R));
            if (overlapX < overlapY) b.vx = -b.vx;
            else b.vy = -b.vy;
          }
        });

        // DNA pickup collect
        gs.dnaPickups = gs.dnaPickups.filter(d => {
          d.y += d.vy;
          if (Math.abs(d.x - b.x) < 12 && Math.abs(d.y - b.y) < 12) {
            gs.fusionCharge = Math.min(100, gs.fusionCharge + 25);
            setUiFusion(gs.fusionCharge);
            return false;
          }
          return d.y < CH;
        });
      }

      // Paddle follow touch
      if (p === "playing" && touchXRef.current !== null) {
        const tx = touchXRef.current;
        gs.padX += (tx - PAD_W / 2 - gs.padX) * 0.25;
        gs.padX = Math.max(0, Math.min(CW - PAD_W, gs.padX));
        if (!gs.ball.active) {
          gs.ball.x = gs.padX + PAD_W / 2;
        }
      }

      // Particles
      gs.particles = gs.particles.filter(pt => {
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.08; pt.life -= 0.035;
        return pt.life > 0;
      });

      // Level clear
      if (p === "playing" && gs.blocks.every(b => b.hp <= 0)) {
        gs.wave++;
        setUiWave(gs.wave);
        gs.blocks = buildBlocks(gs.wave);
        gs.ball.active = false;
        gs.ball.x = gs.padX + PAD_W / 2;
        gs.ball.y = PAD_Y - BALL_R - 2;
        gs.ball.vx = 2.5 + gs.wave * 0.15;
        gs.ball.vy = -(3.5 + gs.wave * 0.1);
        phaseRef.current = "levelup";
        setPhase("levelup");
        setTimeout(() => { phaseRef.current = "playing"; setPhase("playing"); }, 1500);
      }

      draw();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CW / rect.width;
    touchXRef.current = (e.touches[0].clientX - rect.left) * scaleX;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CW / rect.width;
    touchXRef.current = (e.clientX - rect.left) * scaleX;
  }, []);

  const handleStart = useCallback(() => {
    const gs = gsRef.current;
    if (phaseRef.current === "idle" || phaseRef.current === "levelup") {
      if (!gs.ball.active) {
        gs.ball.active = true;
        phaseRef.current = "playing";
        setPhase("playing");
      }
    }
  }, []);

  const handleFusion = useCallback(() => {
    const gs = gsRef.current;
    if (gs.fusionCharge < 100) return;
    gs.fusionCharge = 0;
    setUiFusion(0);
    // Explode blocks in 3x3 area around ball
    gs.blocks.forEach(bl => {
      const bx = bl.x + BW / 2;
      const by = bl.y + BH / 2;
      if (Math.abs(bx - gs.ball.x) < 80 && Math.abs(by - gs.ball.y) < 80 && bl.hp > 0) {
        bl.hp = 0;
        gs.score += bl.maxHp * 15;
        spawnParticles(gs, bx, by, "#ffcc00", 14);
      }
    });
    setUiScore(gs.score);
    // Speed up ball slightly
    const spd = Math.sqrt(gs.ball.vx ** 2 + gs.ball.vy ** 2);
    gs.ball.vx = gs.ball.vx / spd * Math.min(spd * 1.3, 8);
    gs.ball.vy = gs.ball.vy / spd * Math.min(spd * 1.3, 8);
  }, []);

  const handleReset = useCallback(() => {
    const gs = gsRef.current;
    gs.padX = CW / 2 - PAD_W / 2;
    gs.ball = { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 2.5, vy: -3.5, active: false };
    gs.blocks = buildBlocks(1);
    gs.dnaPickups = [];
    gs.particles = [];
    gs.fusionCharge = 0;
    gs.lives = 3;
    gs.score = 0;
    gs.wave = 1;
    gs.coins = 0;
    setUiScore(0); setUiLives(3); setUiFusion(0); setUiWave(1); setUiCoins(0);
    phaseRef.current = "idle";
    setPhase("idle");
  }, []);

  return (
    <div style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
      {/* Stats bar */}
      <div className="flex justify-between items-center mb-2 px-1" style={{ fontSize: 12, fontWeight: 700 }}>
        <span style={{ color: "#4488ff" }}>WAVE {uiWave}</span>
        <span style={{ color: "#888" }}>BLOCKS {gsRef.current.blocks.filter(b => b.hp > 0).length}</span>
        <span style={{ color: "#ff44cc" }}>{"❤️".repeat(uiLives)}</span>
        <span style={{ color: "#c8ff00" }}>🧬 {uiCoins}</span>
        <span style={{ color: "#ffcc44" }}>{uiScore}</span>
      </div>

      {/* Canvas */}
      <div
        onTouchMove={handleTouchMove}
        onMouseMove={handleMouseMove}
        onClick={handleStart}
        style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "2.5px solid #4488ff44", cursor: "crosshair", touchAction: "none" } as React.CSSProperties}
      >
        <canvas ref={canvasRef} width={CW} height={CH} style={{ display: "block", width: "100%", height: "auto" }} />

        {/* Idle overlay */}
        <AnimatePresence>
          {phase === "idle" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, background: "#00000088", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: "3rem" }}>🧬</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>DNA BREAKER</div>
              <div style={{ fontSize: 13, color: "#888" }}>Move paddle · Collect DNA → Fusion Strike</div>
              <div style={{ fontSize: 13, color: "#c8ff00", fontWeight: 700, marginTop: 8 }}>TAP TO LAUNCH</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level up overlay */}
        <AnimatePresence>
          {phase === "levelup" && (
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              style={{ position: "absolute", inset: 0, background: "#000000aa", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ fontSize: "2.5rem" }}>🧬</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#c8ff00" }}>WAVE {uiWave}</div>
              <div style={{ fontSize: 14, color: "#88cc88" }}>DNA evolving...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        <AnimatePresence>
          {phase === "gameover" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ position: "absolute", inset: 0, background: "#000000cc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ fontSize: "2.5rem" }}>💀</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#ff4444" }}>GAME OVER</div>
              <div style={{ fontSize: 16, color: "#c8ff00", fontWeight: 700 }}>Score: {uiScore}</div>
              <div style={{ fontSize: 13, color: "#888" }}>🧬 {uiCoins} DNA collected</div>
              <button onClick={handleReset}
                style={{ marginTop: 12, padding: "12px 28px", background: "#c8ff00", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#0a0a0a", cursor: "pointer", boxShadow: "4px 4px 0px #0a0a0a" }}>
                RETRY
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fusion Strike button */}
      <button
        onClick={handleFusion}
        disabled={uiFusion < 100}
        style={{
          width: "100%", marginTop: 10, padding: "14px",
          background: uiFusion >= 100 ? "linear-gradient(135deg, #ff8800, #ffcc00)" : "#111",
          border: `3px solid ${uiFusion >= 100 ? "#ffcc00" : "#222"}`,
          borderRadius: 14, fontSize: 16, fontWeight: 700,
          color: uiFusion >= 100 ? "#000" : "#333",
          cursor: uiFusion >= 100 ? "pointer" : "default",
          boxShadow: uiFusion >= 100 ? "0 0 20px #ffcc0066, 4px 4px 0px #000" : "none",
          letterSpacing: "0.04em",
          transition: "all 0.2s ease",
        }}
      >
        ⚡ FUSION STRIKE! {uiFusion < 100 ? `(${uiFusion}%)` : "— READY!"}
      </button>
    </div>
  );
}
