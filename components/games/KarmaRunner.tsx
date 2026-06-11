"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── EXTREME UPGRADE: double-jump, shield/boost/magnet powerups, particle FX, combo system ──

const GW = 360, GH = 220, GROUND = 168;
const PET_X = 68, PET_H = 44, GRAVITY = 0.72, JUMP_V = -15.5, BASE_SPD = 3.2;

type Obs  = { id: number; x: number; w: number; h: number; emoji: string; yOff: number };
type Gem  = { id: number; x: number; yOff: number; done: boolean };
type Pwup = { id: number; x: number; type: "shield" | "boost" | "magnet"; done: boolean };
type Ptcl = { id: number; x: number; y: number; vx: number; vy: number; life: number; emoji: string };

type GS = {
  on: boolean; over: boolean; frame: number; speed: number;
  score: number; gems: number; petY: number; petVY: number;
  jumpsLeft: number; hasShield: boolean; hasMagnet: boolean;
  shieldTimer: number; magnetTimer: number; comboCount: number;
  obs: Obs[]; gms: Gem[]; pwups: Pwup[]; particles: Ptcl[];
  nxtObs: number; nxtGem: number; nxtPwup: number;
  cx: number[]; cy: number[]; cspd: number[];
  flashAlpha: number; screenShake: number;
};

const OBS_POOL = [
  { w: 28, h: 50, emoji: "🌵", yOff: 0   },
  { w: 32, h: 30, emoji: "🪨", yOff: 0   },
  { w: 38, h: 28, emoji: "🦅", yOff: -62 },
  { w: 24, h: 54, emoji: "⚡", yOff: 0   },
  { w: 30, h: 40, emoji: "🔥", yOff: 0   },
  { w: 42, h: 22, emoji: "🐦", yOff: -48 },
  { w: 26, h: 58, emoji: "🗿", yOff: 0   },
  { w: 36, h: 34, emoji: "🌊", yOff: 0   },
];

function mkGS(): GS {
  return {
    on: false, over: false, frame: 0, speed: BASE_SPD,
    score: 0, gems: 0, petY: 0, petVY: 0,
    jumpsLeft: 2, hasShield: false, hasMagnet: false,
    shieldTimer: 0, magnetTimer: 0, comboCount: 0,
    obs: [], gms: [], pwups: [], particles: [],
    nxtObs: 90, nxtGem: 55, nxtPwup: 220,
    cx: [60, 180, 290, 340], cy: [18, 12, 24, 10],
    cspd: [0.3, 0.48, 0.36, 0.22],
    flashAlpha: 0, screenShake: 0,
  };
}

function spawnPtcls(g: GS, x: number, y: number, emoji: string, count = 5) {
  for (let i = 0; i < count; i++) {
    g.particles.push({
      id: g.frame * 1000 + i + Math.random() * 999,
      x, y,
      vx: (Math.random() - 0.5) * 4.5,
      vy: -Math.random() * 4 - 1,
      life: 1.0,
      emoji,
    });
  }
}

export default function KarmaRunner({ petEmoji = "🦁", onEnd }: { petEmoji?: string; onEnd?: (score: number, gems: number) => void }) {
  const cvs  = useRef<HTMLCanvasElement>(null);
  const gs   = useRef<GS>(mkGS());
  const raf  = useRef<number>(0);
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [fin,   setFin]   = useState({ score: 0, gems: 0 });
  const [ui,    setUi]    = useState({ combo: 0, shield: false, magnet: false });

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const g   = gs.current;

    ctx.save();
    if (g.screenShake > 0) ctx.translate((Math.random()-0.5)*g.screenShake, (Math.random()-0.5)*g.screenShake);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "#06101a"); sky.addColorStop(1, "#091820");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, GW, GROUND);

    // Stars
    [[20,8],[75,5],[130,18],[195,7],[250,22],[310,11],[340,20],[55,34],[165,4],[295,28],[50,15],[225,16]].forEach(([sx,sy],i) => {
      const tw = 0.4 + 0.4 * Math.sin(g.frame * 0.04 + i * 1.3);
      ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.beginPath(); ctx.arc(sx, sy, 1 + (i%3===0?0.5:0), 0, Math.PI*2); ctx.fill();
    });

    // Moon
    const moonX = (GW + 30) - ((g.frame * 0.08) % (GW + 60));
    ctx.fillStyle = "rgba(255,240,180,0.85)"; ctx.beginPath(); ctx.arc(moonX, 32, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#06101a"; ctx.beginPath(); ctx.arc(moonX+5, 29, 8, 0, Math.PI*2); ctx.fill();

    // Clouds
    ctx.font = "18px serif";
    g.cx.forEach((cx,i) => { ctx.globalAlpha = 0.25+i*0.04; ctx.fillText("☁️", cx, g.cy[i]); });
    ctx.globalAlpha = 1;

    // Mountain silhouette
    ctx.fillStyle = "rgba(12,18,26,0.7)";
    ctx.beginPath(); ctx.moveTo(0, GROUND);
    [[0,140],[40,100],[80,130],[120,90],[170,110],[230,85],[280,115],[320,95],[360,120],[360,GROUND]].forEach(([mx,my]) => ctx.lineTo(mx,my));
    ctx.fill();

    // Ground
    const gr = ctx.createLinearGradient(0, GROUND, 0, GH);
    gr.addColorStop(0, "#1a4a08"); gr.addColorStop(0.4, "#0e2a05"); gr.addColorStop(1, "#070f03");
    ctx.fillStyle = gr; ctx.fillRect(0, GROUND, GW, GH-GROUND);
    ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(GW, GROUND); ctx.stroke();

    // Speed lines
    if (g.speed > 7) {
      const alpha = Math.min(0.4, (g.speed-7)/5*0.4);
      ctx.strokeStyle = `rgba(200,255,0,${alpha})`; ctx.lineWidth = 1;
      for (let li = 0; li < 8; li++) {
        const ly = GROUND-20-li*18;
        const lx = (GW - ((g.frame*g.speed*1.5 + li*55) % (GW+100)));
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx+40+li*5, ly); ctx.stroke();
      }
    }

    // Ground texture
    ctx.fillStyle = "#4caf5033"; ctx.font = "8px monospace";
    const off = (g.frame * g.speed * 0.7) % 60;
    for (let d = -off; d < GW; d += 60) ctx.fillText("· · ·", d, GROUND+10);

    // Powerups
    ctx.font = "18px serif";
    g.pwups.forEach(p => {
      if (p.done) return;
      const yy = GROUND-55 + Math.sin(g.frame*0.12+p.id)*5;
      ctx.fillText(p.type==="shield"?"🛡️":p.type==="boost"?"💨":"🧲", p.x, yy);
      ctx.strokeStyle = p.type==="shield"?"#00e5ff":p.type==="boost"?"#c8ff00":"#ff44cc";
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4+0.3*Math.sin(g.frame*0.15);
      ctx.beginPath(); ctx.arc(p.x+9, yy-9, 14, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Gems
    ctx.font = "16px serif";
    g.gms.forEach(gem => {
      if (gem.done) return;
      const yy = GROUND+gem.yOff-14 + Math.sin(g.frame*0.12+gem.id*0.5)*3;
      ctx.fillText("💎", gem.x, yy);
    });

    // Obstacles
    g.obs.forEach(o => { ctx.font = `${o.h}px serif`; ctx.fillText(o.emoji, o.x, GROUND+o.yOff); });

    // Pet
    ctx.save();
    const petScreenY = GROUND - g.petY;
    if (g.over) {
      ctx.translate(PET_X+22, petScreenY-PET_H/2);
      ctx.rotate(Math.PI/2);
      ctx.translate(-PET_X-22, -(petScreenY-PET_H/2));
    }
    if (g.hasShield) {
      ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5+0.3*Math.sin(g.frame*0.2);
      ctx.beginPath(); ctx.arc(PET_X+22, petScreenY-PET_H/2, 30, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (g.hasMagnet) {
      ctx.strokeStyle = "#ff44cc"; ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3+0.2*Math.sin(g.frame*0.18);
      ctx.beginPath(); ctx.arc(PET_X+22, petScreenY-PET_H/2, 52, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.font = `${PET_H}px serif`;
    ctx.fillText(petEmoji, PET_X, petScreenY);
    ctx.restore();

    // Particles
    g.particles.forEach(p => {
      ctx.globalAlpha = p.life; ctx.font = "12px serif";
      ctx.fillText(p.emoji, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = "#c8ff00"; ctx.font = "bold 15px monospace"; ctx.textAlign = "right";
    ctx.fillText(String(g.score).padStart(6,"0"), GW-10, 22);
    ctx.fillStyle = "#00e5ff"; ctx.textAlign = "left"; ctx.font = "bold 12px monospace";
    ctx.fillText(`💎×${g.gems}`, 10, 22);
    ctx.fillStyle = g.speed>9?"#ff4444":g.speed>6?"#ff9900":"#ffffff55";
    ctx.font = "10px monospace"; ctx.textAlign = "right";
    ctx.fillText(`×${g.speed.toFixed(1)}`, GW-10, 38);
    if (g.comboCount > 1) {
      ctx.fillStyle = "#ffcc00"; ctx.font = `bold ${10+Math.min(g.comboCount,6)}px monospace`; ctx.textAlign = "left";
      ctx.fillText(`🔥 ×${g.comboCount}`, 10, 38);
    }
    if (g.hasShield)  { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("🛡️", 10, 54); }
    if (g.hasMagnet)  { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("🧲", g.hasShield?30:10, 54); }

    if (g.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${g.flashAlpha})`;
      ctx.fillRect(0, 0, GW, GH);
      g.flashAlpha -= 0.06;
    }

    ctx.restore();
  }, [petEmoji]);

  const loop = useCallback(() => {
    const g = gs.current;
    if (!g.on || g.over) return;

    g.frame++;
    g.speed = Math.min(BASE_SPD + Math.floor(g.frame/320)*0.8, 14);
    g.score = Math.floor(g.frame*g.speed*0.09) + g.gems*10*Math.max(1, g.comboCount);

    g.cx = g.cx.map((cx,i) => { const nx = cx - g.cspd[i]; return nx < -40 ? GW+30 : nx; });

    if (g.shieldTimer > 0) { g.shieldTimer--; if (g.shieldTimer===0) g.hasShield=false; }
    if (g.magnetTimer > 0) { g.magnetTimer--; if (g.magnetTimer===0) g.hasMagnet=false; }
    if (g.screenShake > 0) g.screenShake = Math.max(0, g.screenShake-0.5);

    g.petVY += GRAVITY; g.petY = Math.max(0, g.petY-g.petVY);
    if (g.petY === 0) { g.petVY = 0; g.jumpsLeft = 2; }

    // Obstacles
    g.nxtObs--;
    if (g.nxtObs <= 0) {
      const t = OBS_POOL[Math.floor(Math.random()*OBS_POOL.length)];
      g.obs.push({ id: g.frame, x: GW+10, ...t });
      g.nxtObs = Math.max(40, 65 + Math.floor(Math.random()*60) - Math.floor(g.speed*4));
    }
    g.obs = g.obs.map(o => ({ ...o, x: o.x-g.speed })).filter(o => o.x > -70);

    // Gems
    g.nxtGem--;
    if (g.nxtGem <= 0) {
      g.gms.push({ id: g.frame+99999, x: GW+10, yOff: Math.random()<0.35 ? -65 : -6, done: false });
      g.nxtGem = Math.max(20, 35+Math.floor(Math.random()*30));
    }
    g.gms = g.gms.map(gem => ({ ...gem, x: gem.x-g.speed })).filter(gem => gem.x > -25);

    // Powerups
    g.nxtPwup--;
    if (g.nxtPwup <= 0) {
      const types = ["shield","boost","magnet"] as const;
      g.pwups.push({ id: g.frame, x: GW+10, type: types[Math.floor(Math.random()*types.length)], done: false });
      g.nxtPwup = 280+Math.floor(Math.random()*180);
    }
    g.pwups = g.pwups.map(p => ({ ...p, x: p.x-g.speed })).filter(p => p.x > -30);

    const pL = PET_X+6, pR = PET_X+PET_H-6;
    const pT = GROUND-g.petY-PET_H+8, pB = GROUND-g.petY-8;

    for (const o of g.obs) {
      const oL = o.x+4, oR = o.x+o.w-4;
      const oT = GROUND+o.yOff-o.h+4, oB = GROUND+o.yOff-4;
      if (pR>oL && pL<oR && pB>oT && pT<oB) {
        if (g.hasShield) {
          g.hasShield=false; g.shieldTimer=0;
          spawnPtcls(g, PET_X+22, GROUND-g.petY-PET_H/2, "🛡️", 6);
          g.screenShake=4; g.comboCount=0;
          g.obs = g.obs.filter(x => x!==o); continue;
        }
        g.over=true; g.on=false; g.flashAlpha=0.8; g.screenShake=8;
        draw(); setFin({ score: g.score, gems: g.gems });
        onEnd?.(g.score, g.gems); setPhase("over"); return;
      }
    }

    g.gms.forEach(gem => {
      if (gem.done) return;
      const gy = GROUND+gem.yOff-14;
      const inRange = g.hasMagnet
        ? (Math.abs(gem.x-(PET_X+22))<55 && Math.abs(gy-(GROUND-g.petY-PET_H/2))<55)
        : (gem.x<pR && gem.x+16>pL && gy<pB && gy+16>pT);
      if (inRange) { gem.done=true; g.gems++; g.comboCount++; spawnPtcls(g, gem.x, gy, "✨", 4); }
    });

    g.pwups.forEach(p => {
      if (p.done) return;
      const py = GROUND-55;
      if (Math.abs(p.x-(PET_X+22))<28 && Math.abs(py-(GROUND-g.petY-PET_H/2))<40) {
        p.done=true;
        spawnPtcls(g, p.x, py, p.type==="shield"?"🛡️":p.type==="boost"?"💨":"🧲", 5);
        if (p.type==="shield") { g.hasShield=true; g.shieldTimer=300; }
        if (p.type==="boost")  { g.score+=80; g.flashAlpha=0.25; }
        if (p.type==="magnet") { g.hasMagnet=true; g.magnetTimer=400; }
      }
    });

    g.particles = g.particles
      .map(p => ({ ...p, x: p.x+p.vx, y: p.y+p.vy, vy: p.vy+0.15, life: p.life-0.04 }))
      .filter(p => p.life>0);

    if (g.frame%4===0) setUi({ combo: g.comboCount, shield: g.hasShield, magnet: g.hasMagnet });

    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, onEnd]);

  function jump() {
    const g = gs.current;
    if (phase==="idle") { g.on=true; setPhase("on"); raf.current=requestAnimationFrame(loop); return; }
    if (g.jumpsLeft>0 && !g.over) { g.petVY = g.jumpsLeft===2 ? JUMP_V : JUMP_V*0.82; g.jumpsLeft--; }
  }

  function restart() {
    cancelAnimationFrame(raf.current);
    gs.current = mkGS(); setPhase("idle"); setFin({ score:0, gems:0 });
    setUi({ combo:0, shield:false, magnet:false }); requestAnimationFrame(draw);
  }

  useEffect(() => { requestAnimationFrame(draw); return () => cancelAnimationFrame(raf.current); }, [draw]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code==="Space"||e.code==="ArrowUp") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  });

  return (
    <div style={{ position:"relative", userSelect:"none", touchAction:"none" }}>
      <canvas ref={cvs} width={GW} height={GH}
        style={{ width:"100%", height:"auto", borderRadius:18, border:"2.5px solid #1a2a10", display:"block", cursor:"pointer", boxShadow:"0 0 30px #4caf5022" }}
        onClick={jump} onTouchStart={e => { e.preventDefault(); jump(); }} />

      {phase==="idle" && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", borderRadius:16, gap:8 }}>
          <div style={{ fontSize:"3.5rem" }}>{petEmoji}</div>
          <div style={{ color:"#c8ff00", fontSize:22, fontWeight:700, letterSpacing:2 }}>KARMA RUNNER</div>
          <div style={{ color:"#aaa", fontSize:13 }}>TAP / SPACE TO START</div>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            {[["💎","+karma"],["🛡️","shield"],["💨","+80 score"],["🧲","magnet"]].map(([e,t]) => (
              <div key={t} style={{ textAlign:"center", background:"#0a0a0a", borderRadius:8, padding:"5px 8px", border:"1px solid #2a2a2a" }}>
                <div style={{ fontSize:"1rem" }}>{e}</div><div style={{ fontSize:8, color:"#666", fontWeight:700 }}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{ color:"#555", fontSize:10, marginTop:4 }}>Double-jump • Powerups • Combos</div>
        </div>
      )}

      {phase==="over" && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.9)", borderRadius:16, gap:10 }}>
          <div style={{ fontSize:"3rem" }}>💀</div>
          <div style={{ color:"#ff2d8d", fontSize:22, fontWeight:700 }}>GAME OVER</div>
          <div style={{ color:"#c8ff00", fontSize:40, fontWeight:900, textShadow:"0 0 20px #c8ff0066" }}>{fin.score}</div>
          <div style={{ display:"flex", gap:16 }}>
            <div style={{ textAlign:"center" }}><div style={{ color:"#00e5ff", fontSize:18, fontWeight:700 }}>💎 ×{fin.gems}</div><div style={{ color:"#555", fontSize:10 }}>gems</div></div>
            <div style={{ textAlign:"center" }}><div style={{ color:"#c8ff00", fontSize:18, fontWeight:700 }}>+{fin.gems*10} ⚡</div><div style={{ color:"#555", fontSize:10 }}>bonus</div></div>
          </div>
          <button onClick={e => { e.stopPropagation(); restart(); }}
            style={{ marginTop:6, padding:"11px 36px", background:"#c8ff00", border:"3px solid #0a0a0a", borderRadius:12, fontSize:15, fontWeight:700, color:"#0a0a0a", cursor:"pointer", boxShadow:"4px 4px 0 #0a0a0a" }}>
            ↺ RETRY
          </button>
        </div>
      )}

      {phase==="on" && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginTop:6 }}>
          <span style={{ color:"#555", fontSize:10, fontWeight:600 }}>TAP / ↑ JUMP (2×)</span>
          {ui.combo>1 && <span style={{ color:"#ffcc00", fontSize:11, fontWeight:700 }}>🔥 ×{ui.combo}</span>}
          {ui.shield && <span style={{ fontSize:13 }}>🛡️</span>}
          {ui.magnet && <span style={{ fontSize:13 }}>🧲</span>}
        </div>
      )}
    </div>
  );
}
