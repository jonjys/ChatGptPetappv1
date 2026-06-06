"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GW = 360, GH = 210, GROUND = 162;
const PET_X = 62, PET_H = 42, GRAVITY = 0.68, JUMP_V = -14.5, BASE_SPD = 3;

type Obs = { id: number; x: number; w: number; h: number; emoji: string; yOff: number };
type Gem = { id: number; x: number; yOff: number; done: boolean };
type GS = {
  on: boolean; over: boolean; frame: number; speed: number;
  score: number; gems: number; petY: number; petVY: number;
  obs: Obs[]; gms: Gem[]; nxtObs: number; nxtGem: number;
  cx: number[];
};

const OBS = [
  { w: 26, h: 48, emoji: "🌵", yOff: 0 },
  { w: 30, h: 28, emoji: "🪨", yOff: 0 },
  { w: 36, h: 26, emoji: "🦅", yOff: -58 },
  { w: 22, h: 52, emoji: "⚡", yOff: 0 },
];

function mkGS(): GS {
  return { on: false, over: false, frame: 0, speed: BASE_SPD, score: 0, gems: 0, petY: 0, petVY: 0, obs: [], gms: [], nxtObs: 90, nxtGem: 55, cx: [80, 220, 310] };
}

export default function KarmaRunner({ petEmoji = "🦁", onEnd }: { petEmoji?: string; onEnd?: (score: number, gems: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const gs = useRef<GS>(mkGS());
  const raf = useRef<number>(0);
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [fin, setFin] = useState({ score: 0, gems: 0 });

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const x = c.getContext("2d")!;
    const g = gs.current;

    // Sky
    const sky = x.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "#060d12"); sky.addColorStop(1, "#0d2030");
    x.fillStyle = sky; x.fillRect(0, 0, GW, GROUND);

    // Stars
    x.fillStyle = "rgba(255,255,255,0.75)";
    [[25,12],[85,7],[145,22],[210,10],[275,18],[330,8],[355,24],[65,38],[170,4],[305,32]].forEach(([sx,sy]) => { x.beginPath(); x.arc(sx,sy,1,0,Math.PI*2); x.fill(); });

    // Clouds
    x.globalAlpha = 0.35; x.font = "20px serif";
    g.cx.forEach((cx, i) => x.fillText("☁️", cx, 20 + i * 12));
    x.globalAlpha = 1;

    // Ground
    const gr = x.createLinearGradient(0, GROUND, 0, GH);
    gr.addColorStop(0, "#1e4d10"); gr.addColorStop(1, "#0f2a08");
    x.fillStyle = gr; x.fillRect(0, GROUND, GW, GH - GROUND);
    x.strokeStyle = "#4caf50"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, GROUND); x.lineTo(GW, GROUND); x.stroke();

    // Ground dots
    x.fillStyle = "#4caf5066"; x.font = "9px monospace";
    const off = (g.frame * g.speed * 0.8) % 50;
    for (let d = -off; d < GW; d += 50) x.fillText("·  ·  ·", d, GROUND + 9);

    // Gems
    x.font = "15px serif";
    g.gms.forEach(gem => { if (!gem.done) x.fillText("💎", gem.x, GROUND + gem.yOff - 15); });

    // Obstacles
    g.obs.forEach(o => { x.font = `${o.h}px serif`; x.fillText(o.emoji, o.x, GROUND + o.yOff); });

    // Pet
    x.save();
    if (g.over) { x.translate(PET_X + 21, GROUND - g.petY - PET_H / 2); x.rotate(Math.PI / 2); x.translate(-PET_X - 21, -(GROUND - g.petY - PET_H / 2)); }
    x.font = `${PET_H}px serif`;
    x.fillText(petEmoji, PET_X, GROUND - g.petY);
    x.restore();

    // HUD
    x.fillStyle = "#c8ff00"; x.font = "bold 14px monospace"; x.textAlign = "right";
    x.fillText(String(g.score).padStart(5, "0"), GW - 10, 22);
    x.fillStyle = "#00e5ff"; x.textAlign = "left";
    x.font = "bold 12px monospace"; x.fillText(`💎×${g.gems}`, 10, 22);
    x.fillStyle = "#ffffff44"; x.font = "10px monospace"; x.textAlign = "right";
    x.fillText(`×${g.speed.toFixed(1)}`, GW - 10, 38);
    x.textAlign = "left";
  }, [petEmoji]);

  const loop = useCallback(() => {
    const g = gs.current;
    if (!g.on || g.over) return;
    g.frame++; g.score = Math.floor(g.frame * g.speed * 0.08);
    g.speed = Math.min(BASE_SPD + Math.floor(g.frame / 380) * 0.75, 12);

    // Clouds
    g.cx = g.cx.map((cx, i) => { const nx = cx - [0.38, 0.55, 0.42][i]; return nx < -40 ? GW + 20 : nx; });

    // Physics
    g.petVY += GRAVITY; g.petY = Math.max(0, g.petY - g.petVY);
    if (g.petY === 0) g.petVY = 0;

    // Obstacles
    g.nxtObs--;
    if (g.nxtObs <= 0) {
      const t = OBS[Math.floor(Math.random() * OBS.length)];
      g.obs.push({ id: g.frame, x: GW + 10, ...t });
      g.nxtObs = 52 + Math.floor(Math.random() * 68) - Math.floor(g.speed * 3);
    }
    g.obs = g.obs.map(o => ({ ...o, x: o.x - g.speed })).filter(o => o.x > -60);

    // Gems
    g.nxtGem--;
    if (g.nxtGem <= 0) {
      g.gms.push({ id: g.frame + 99999, x: GW + 10, yOff: Math.random() < 0.4 ? -58 : -8, done: false });
      g.nxtGem = 32 + Math.floor(Math.random() * 32);
    }
    g.gms = g.gms.map(gem => ({ ...gem, x: gem.x - g.speed })).filter(gem => gem.x > -20);

    // Collision
    const pL = PET_X + 5, pR = PET_X + PET_H - 5;
    const pT = GROUND - g.petY - PET_H + 6, pB = GROUND - g.petY - 6;
    for (const o of g.obs) {
      const oL = o.x + 4, oR = o.x + o.w - 4;
      const oT = GROUND + o.yOff - o.h + 4, oB = GROUND + o.yOff - 4;
      if (pR > oL && pL < oR && pB > oT && pT < oB) {
        g.over = true; g.on = false;
        draw(); setFin({ score: g.score, gems: g.gems });
        onEnd?.(g.score, g.gems); setPhase("over"); return;
      }
    }

    // Gems
    g.gms.forEach(gem => {
      if (gem.done) return;
      if (gem.x < pR && gem.x + 15 > pL && GROUND + gem.yOff - 15 < pB && GROUND + gem.yOff > pT) { gem.done = true; g.gems++; }
    });

    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, onEnd]);

  function jump() {
    const g = gs.current;
    if (phase === "idle") { g.on = true; setPhase("on"); raf.current = requestAnimationFrame(loop); return; }
    if (g.petY === 0 && !g.over) g.petVY = JUMP_V;
  }

  function restart() {
    cancelAnimationFrame(raf.current); gs.current = mkGS(); setPhase("idle"); setFin({ score: 0, gems: 0 }); requestAnimationFrame(draw);
  }

  useEffect(() => { requestAnimationFrame(draw); return () => cancelAnimationFrame(raf.current); }, [draw]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  });

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none" }}>
      <canvas ref={cvs} width={GW} height={GH}
        style={{ width: "100%", height: "auto", borderRadius: 16, border: "3px solid #0a0a0a", display: "block", cursor: "pointer" }}
        onClick={jump} onTouchStart={e => { e.preventDefault(); jump(); }} />

      {phase === "idle" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", borderRadius: 14, gap: 8 }}>
          <div style={{ fontSize: "3.2rem" }}>{petEmoji}</div>
          <div style={{ color: "#c8ff00", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>KARMA RUNNER</div>
          <div style={{ color: "#aaa", fontSize: 13 }}>TAP / SPACE TO START & JUMP</div>
          <div style={{ color: "#555", fontSize: 11 }}>Collect 💎 gems for bonus karma</div>
        </div>
      )}

      {phase === "over" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)", borderRadius: 14, gap: 10 }}>
          <div style={{ fontSize: "2.8rem" }}>💀</div>
          <div style={{ color: "#ff2d8d", fontSize: 20, fontWeight: 700 }}>GAME OVER</div>
          <div style={{ color: "#c8ff00", fontSize: 36, fontWeight: 700 }}>{fin.score}</div>
          <div style={{ color: "#00e5ff", fontSize: 14, fontWeight: 600 }}>💎 ×{fin.gems} = +{fin.gems * 5} KARMA</div>
          <button onClick={e => { e.stopPropagation(); restart(); }} style={{ marginTop: 6, padding: "9px 30px", background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0a0a0a", cursor: "pointer" }}>RETRY</button>
        </div>
      )}

      {phase === "on" && <div style={{ textAlign: "center", marginTop: 6, color: "#555", fontSize: 11, fontWeight: 600 }}>TAP · SPACE · ↑ TO JUMP</div>}
    </div>
  );
}
