"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const PETS = ["🐉","🦊","🐺","🦁","🐯","🦄","🐻","🐸","🦋","🦅","🐙","🦈"];
const FEATURES = [
  { icon:"⚡", title:"KARMA SYSTEM", desc:"Every action earns karma. Level up, unlock auras, ascend tiers." },
  { icon:"🎮", title:"8 MINI-GAMES", desc:"Tower defense, rhythm battles, speed challenges and more." },
  { icon:"🐾", title:"LIVE PET", desc:"Your pet evolves, speaks, gets hungry. It's actually alive." },
  { icon:"🏆", title:"SQUAD WARS", desc:"Form squads, fight rival clans, dominate the leaderboard." },
  { icon:"📡", title:"KARMA TV", desc:"Watch live streams from the top karma earners worldwide." },
  { icon:"⚔️", title:"LIVE EVENTS", desc:"Every 30min a new event drops. Karma Rush, Battle Royale, Mystery Drop." },
];

const STATS = [
  { label:"ACTIVE PETS", value:"2.4M" },
  { label:"KARMA EARNED", value:"18B" },
  { label:"SQUADS", value:"94K" },
  { label:"BATTLES TODAY", value:"1.2M" },
];

function FloatingPet({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <motion.div
      animate={{ y: [-12, 12, -12], rotate: [-6, 6, -6] }}
      transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: "absolute", fontSize: "2rem", filter: "drop-shadow(0 0 12px rgba(200,255,0,0.6))", pointerEvents: "none", ...style }}
    >
      {emoji}
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [statIdx, setStatIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Check any sign that the user has already onboarded
    const created     = localStorage.getItem("pet_created_v1");
    const petCreated  = localStorage.getItem("karma_pet_created_v1");
    const savedKarma  = localStorage.getItem("karma_user_karma_v2");
    const savedXP     = localStorage.getItem("karma_user_xp_v2");
    if (created || petCreated || savedKarma || savedXP) {
      router.replace("/feed");
      return;
    }
    setReady(true);
  }, [router]);

  // Animated particle canvas BG
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; maxLife: number };
    const particles: Particle[] = [];

    const COLORS = ["#c8ff00", "#ff2d8d", "#4488ff", "#a855f7", "#00e5ff"];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        size: 1 + Math.random() * 2.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: Math.random() * 200, maxLife: 200 + Math.random() * 200,
      });
    }

    let frame = 0;
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife) { p.life = 0; p.x = Math.random() * W; p.y = Math.random() * H; }
        const a = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready]);

  useEffect(() => {
    const id = setInterval(() => setStatIdx(i => (i + 1) % STATS.length), 2000);
    return () => clearInterval(id);
  }, []);

  const handleEnter = () => {
    localStorage.setItem("pet_created_v1", "1");
    setEntered(true);
    setTimeout(() => router.push("/feed"), 800);
  };

  if (!ready) return null;

  const floatingPets = [
    { emoji: PETS[0], style: { top: "12%", left: "8%" } },
    { emoji: PETS[1], style: { top: "20%", right: "10%" } },
    { emoji: PETS[2], style: { bottom: "30%", left: "5%" } },
    { emoji: PETS[3], style: { bottom: "22%", right: "8%" } },
    { emoji: PETS[4], style: { top: "45%", left: "3%" } },
    { emoji: PETS[5], style: { top: "60%", right: "5%" } },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: entered ? 0 : 1 }}
      transition={{ duration: 0.7 }}
      style={{ minHeight: "100dvh", background: "#000", overflowX: "hidden", position: "relative" }}
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />

      {/* Gradient overlays */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(200,255,0,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(255,45,141,0.06) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Floating pets */}
      {floatingPets.map((p, i) => <FloatingPet key={i} emoji={p.emoji} style={{ ...p.style, zIndex: 1 }} />)}

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px 120px" }}>

        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ marginTop: 48, marginBottom: 24 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(200,255,0,0.08)", border: "1.5px solid rgba(200,255,0,0.3)",
            borderRadius: 100, padding: "6px 16px", fontSize: 11, fontWeight: 700,
            color: "#c8ff00", letterSpacing: "0.12em",
          }}>
            <motion.span animate={{ opacity: [1,0.3,1] }} transition={{ repeat: Infinity, duration: 1.4 }}>●</motion.span>
            2.4M PETS ALIVE RIGHT NOW
          </div>
        </motion.div>

        {/* Main hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
          style={{ textAlign: "center", marginBottom: 8 }}
        >
          <div style={{ fontSize: "5rem", marginBottom: 8, filter: "drop-shadow(0 0 40px rgba(200,255,0,0.5))" }}>🐾</div>
          <h1 style={{
            fontSize: "clamp(2.6rem, 10vw, 4rem)", fontWeight: 900, lineHeight: 1.05,
            margin: "0 0 12px", letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #c8ff00 0%, #ffffff 40%, #ff2d8d 80%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            LEVEL UP<br />YOUR LIFE
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 32px", maxWidth: 280, lineHeight: 1.5 }}>
            The world&apos;s first karma-based pet game.<br />Every action. Every win. Every day.
          </p>
        </motion.div>

        {/* CTA button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEnter}
          style={{
            padding: "18px 52px", fontSize: 17, fontWeight: 900,
            background: "linear-gradient(135deg, #c8ff00, #a8e000)",
            border: "none", borderRadius: 16, color: "#000",
            cursor: "pointer", letterSpacing: "0.05em",
            boxShadow: "0 0 40px rgba(200,255,0,0.4), 0 4px 0 #6a9400",
            marginBottom: 14,
          }}
        >
          START YOUR JOURNEY →
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 48 }}
        >
          FREE · NO ADS · NO SUBSCRIPTIONS
        </motion.p>

        {/* Live stat ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            display: "flex", gap: 24, marginBottom: 52,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: "14px 24px",
          }}
        >
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <motion.div
                key={statIdx === i ? "active" : "idle"}
                animate={statIdx === i ? { scale: [1, 1.15, 1], color: ["#c8ff00", "#ffffff", "#c8ff00"] } : {}}
                transition={{ duration: 0.5 }}
                style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}
              >
                {s.value}
              </motion.div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          style={{ width: "100%", maxWidth: 420, marginBottom: 48 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textAlign: "center", marginBottom: 16 }}>
            WHAT MAKES US DIFFERENT
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95 + i * 0.08 }}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "14px 12px",
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>{f.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginBottom: 4, letterSpacing: "0.04em" }}>{f.title}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: -8, marginBottom: 10 }}>
            {["🐉","🦊","🐺","🦁","🐯","🦄","🐻","🐸"].map((p, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `hsl(${i * 45}, 70%, 40%)`,
                border: "2px solid #000",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", marginLeft: i === 0 ? 0 : -8,
              }}>{p}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            Join <strong style={{ color: "#c8ff00" }}>2.4 million</strong> pet owners worldwide
          </div>
        </motion.div>

        {/* Bottom CTA repeat */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEnter}
          style={{
            padding: "16px 48px", fontSize: 15, fontWeight: 900,
            background: "transparent",
            border: "2px solid rgba(200,255,0,0.5)", borderRadius: 14, color: "#c8ff00",
            cursor: "pointer", letterSpacing: "0.05em",
          }}
        >
          GET STARTED FREE →
        </motion.button>

      </div>
    </motion.div>
  );
}
