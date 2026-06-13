"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── MEGA UPGRADE: bigger canvas, dynamic sky, parallax city, 6 powerups, 12 obstacles, milestones ──

const GW = 390, GH = 260, GROUND = 200;
const PET_X = 68, PET_H = 44, GRAVITY = 0.72, JUMP_V = -15.5, BASE_SPD = 3.2;

type ObsKind = "normal" | "tornado" | "bomb" | "spiderweb" | "chain_top" | "chain_bot";
type PwupKind = "shield" | "boost" | "magnet" | "star" | "beat" | "warp";

type Obs  = { id: number; x: number; w: number; h: number; emoji: string; yOff: number; kind: ObsKind; vy?: number; timer?: number; exploded?: boolean; paired?: number };
type Gem  = { id: number; x: number; yOff: number; done: boolean };
type Pwup = { id: number; x: number; type: PwupKind; done: boolean };
type Ptcl = { id: number; x: number; y: number; vx: number; vy: number; life: number; emoji: string; size?: number };
type Star  = { x: number; y: number; len: number; speed: number; life: number };
type TrailPt = { x: number; y: number };

type GS = {
  on: boolean; over: boolean; frame: number; speed: number;
  score: number; gems: number; petY: number; petVY: number;
  jumpsLeft: number; hasShield: boolean; hasMagnet: boolean; hasStar: boolean; hasBeat: boolean;
  shieldTimer: number; magnetTimer: number; starTimer: number; beatTimer: number;
  comboCount: number; maxCombo: number;
  warpActive: boolean; warpFrame: number;
  obs: Obs[]; gms: Gem[]; pwups: Pwup[]; particles: Ptcl[];
  shootingStars: Star[];
  trail: TrailPt[];
  nxtObs: number; nxtGem: number; nxtPwup: number;
  cx: number[]; cy: number[]; cspd: number[];
  flashAlpha: number; flashColor: string; screenShake: number;
  milestoneFrame: number; milestoneScore: number; lastMilestone: number;
  startFrame: number; scoreBonus: number;
};

// Normal obstacle pool (8 existing)
const OBS_POOL_NORMAL: Array<Omit<Obs,"id"|"x"|"kind">> = [
  { w: 28, h: 50, emoji: "🌵", yOff: 0   },
  { w: 32, h: 30, emoji: "🪨", yOff: 0   },
  { w: 38, h: 28, emoji: "🦅", yOff: -74 },
  { w: 24, h: 54, emoji: "⚡", yOff: 0   },
  { w: 30, h: 40, emoji: "🔥", yOff: 0   },
  { w: 42, h: 22, emoji: "🐦", yOff: -60 },
  { w: 26, h: 58, emoji: "🗿", yOff: 0   },
  { w: 36, h: 34, emoji: "🌊", yOff: 0   },
];

function mkGS(): GS {
  return {
    on: false, over: false, frame: 0, speed: BASE_SPD,
    score: 0, gems: 0, petY: 0, petVY: 0,
    jumpsLeft: 2, hasShield: false, hasMagnet: false, hasStar: false, hasBeat: false,
    shieldTimer: 0, magnetTimer: 0, starTimer: 0, beatTimer: 0,
    comboCount: 0, maxCombo: 0,
    warpActive: false, warpFrame: 0,
    obs: [], gms: [], pwups: [], particles: [],
    shootingStars: [],
    trail: [],
    nxtObs: 90, nxtGem: 55, nxtPwup: 220,
    cx: [60, 180, 290, 340], cy: [18, 12, 24, 10],
    cspd: [0.3, 0.48, 0.36, 0.22],
    flashAlpha: 0, flashColor: "255,255,255", screenShake: 0,
    milestoneFrame: 0, milestoneScore: 0, lastMilestone: 0,
    startFrame: 0, scoreBonus: 0,
  };
}

function spawnPtcls(g: GS, x: number, y: number, emoji: string, count = 5, size = 12) {
  for (let i = 0; i < count; i++) {
    g.particles.push({
      id: g.frame * 1000 + i + Math.random() * 999,
      x, y,
      vx: (Math.random() - 0.5) * 4.5,
      vy: -Math.random() * 4 - 1,
      life: 1.0,
      emoji,
      size,
    });
  }
}

// ─── City skyline data (back layer) ──────────────────────────────────────────
const CITY_BACK: Array<{x: number; w: number; h: number}> = [
  {x:0,w:28,h:55},{x:32,w:20,h:38},{x:56,w:35,h:70},{x:95,w:18,h:42},
  {x:116,w:30,h:60},{x:150,w:22,h:35},{x:176,w:40,h:80},{x:220,w:18,h:45},
  {x:242,w:28,h:58},{x:274,w:32,h:66},{x:310,w:22,h:50},{x:336,w:30,h:42},
  {x:370,w:24,h:55},{x:398,w:18,h:38},
];

// Mid layer tree/lamppost shapes
const CITY_MID: Array<{x: number; kind: "tree"|"lamp"}> = [
  {x:20,kind:"lamp"},{x:70,kind:"tree"},{x:120,kind:"lamp"},{x:170,kind:"tree"},
  {x:220,kind:"lamp"},{x:265,kind:"tree"},{x:310,kind:"lamp"},{x:360,kind:"tree"},
  {x:400,kind:"lamp"},
];

function skyColor(speed: number): [string,string] {
  const t = Math.max(0, Math.min(1, (speed - BASE_SPD) / (14 - BASE_SPD)));
  if (t < 0.4) {
    // day → dusk
    const u = t / 0.4;
    const r0 = 135, g0 = 206, b0 = 235;
    const r1 = 26,  g1 = 26,  b1 = 74;
    const r = Math.round(r0 + (r1-r0)*u);
    const gg = Math.round(g0 + (g1-g0)*u);
    const b = Math.round(b0 + (b1-b0)*u);
    const r2 = Math.round(14 + (10-14)*u), g2 = Math.round(30 + (12-30)*u), b2 = Math.round(60 + (35-60)*u);
    return [`rgb(${r},${gg},${b})`, `rgb(${r2},${g2},${b2})`];
  } else {
    // dusk → deep night
    const u = (t - 0.4) / 0.6;
    const r0 = 26, g0 = 26, b0 = 74;
    const r1 = 0,  g1 = 8,  b1 = 32;
    const r = Math.round(r0 + (r1-r0)*u);
    const gg = Math.round(g0 + (g1-g0)*u);
    const b = Math.round(b0 + (b1-b0)*u);
    return [`rgb(${r},${gg},${b})`, `rgb(0,4,16)`];
  }
}

export default function KarmaRunner({ petEmoji = "🦁", onEnd }: { petEmoji?: string; onEnd?: (score: number, gems: number) => void }) {
  const cvs  = useRef<HTMLCanvasElement>(null);
  const gs   = useRef<GS>(mkGS());
  const raf  = useRef<number>(0);
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [fin,   setFin]   = useState({ score: 0, gems: 0, maxCombo: 0, timeSec: 0 });
  const [best,  setBest]  = useState(0);
  const [ui,    setUi]    = useState({ combo: 0, shield: false, magnet: false, star: false, beat: false, speed: BASE_SPD, beatTimer: 0 });
  const [copied, setCopied] = useState(false);

  // Load best on mount
  useEffect(() => {
    try { setBest(parseInt(localStorage.getItem("karma_runner_best_v1") ?? "0") || 0); } catch {}
  }, []);

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const g   = gs.current;

    ctx.save();
    if (g.screenShake > 0) ctx.translate((Math.random()-0.5)*g.screenShake, (Math.random()-0.5)*g.screenShake);

    // ── Dynamic sky ──────────────────────────────────────────────────────────
    const [skyTop, skyBot] = skyColor(g.speed);
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(1, skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GW, GROUND);

    // Aurora borealis at very high speed (speed > 11)
    if (g.speed > 11) {
      const aAlpha = Math.min(0.35, (g.speed - 11) / 3 * 0.35);
      const bands = [
        { y: 40, color: `rgba(0,255,120,${aAlpha})` },
        { y: 65, color: `rgba(140,0,255,${aAlpha * 0.7})` },
        { y: 85, color: `rgba(0,200,255,${aAlpha * 0.5})` },
      ];
      bands.forEach(({ y, color }) => {
        const wave = ctx.createLinearGradient(0, y - 14, 0, y + 14);
        wave.addColorStop(0, "rgba(0,0,0,0)");
        wave.addColorStop(0.5, color);
        wave.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = wave;
        // wavy horizontal band
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let bx = 0; bx <= GW; bx += 20) {
          ctx.lineTo(bx, y + Math.sin((bx / GW) * Math.PI * 4 + g.frame * 0.04) * 8);
        }
        ctx.lineTo(GW, y + 28); ctx.lineTo(0, y + 28); ctx.closePath();
        ctx.fill();
      });
    }

    // Stars (visible when speed > 4 / dusk)
    const starAlpha = Math.min(1, Math.max(0, (g.speed - BASE_SPD - 0.5) / 2));
    if (starAlpha > 0) {
      [[20,8],[75,5],[130,18],[195,7],[250,22],[310,11],[340,20],[55,34],[165,4],[295,28],[50,15],[225,16],[155,30],[380,9],[10,28]].forEach(([sx,sy],i) => {
        const tw = starAlpha * (0.4 + 0.4 * Math.sin(g.frame * 0.04 + i * 1.3));
        ctx.fillStyle = `rgba(255,255,255,${tw})`; ctx.beginPath(); ctx.arc(sx, sy, 1 + (i%3===0?0.5:0), 0, Math.PI*2); ctx.fill();
      });
    }

    // Shooting stars at high speed
    g.shootingStars.forEach(ss => {
      const alpha = ss.life * 0.8;
      ctx.strokeStyle = `rgba(255,255,200,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x + ss.len, ss.y + ss.len * 0.4);
      ctx.stroke();
    });

    // Sun (low speed) or Moon (high speed)
    const sunMoonT = Math.min(1, Math.max(0, (g.speed - BASE_SPD) / 5));
    if (sunMoonT < 0.7) {
      // Sun
      const sunAlpha = 1 - sunMoonT / 0.7;
      const sunX = 320, sunY = 38;
      const grad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 22);
      grad.addColorStop(0, `rgba(255,255,100,${sunAlpha})`);
      grad.addColorStop(0.6, `rgba(255,200,0,${sunAlpha * 0.6})`);
      grad.addColorStop(1, `rgba(255,150,0,0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(255,240,80,${sunAlpha})`; ctx.beginPath(); ctx.arc(sunX, sunY, 11, 0, Math.PI*2); ctx.fill();
    }
    if (sunMoonT > 0.3) {
      // Moon
      const moonAlpha = Math.min(1, (sunMoonT - 0.3) / 0.4);
      const moonX = 320, moonY = 38;
      const mGrad = ctx.createRadialGradient(moonX, moonY, 3, moonX, moonY, 16);
      mGrad.addColorStop(0, `rgba(255,248,200,${moonAlpha})`);
      mGrad.addColorStop(1, `rgba(200,200,120,${moonAlpha * 0.3})`);
      ctx.fillStyle = mGrad; ctx.beginPath(); ctx.arc(moonX, moonY, 11, 0, Math.PI*2); ctx.fill();
      // crescent shadow
      ctx.fillStyle = skyTop; ctx.beginPath(); ctx.arc(moonX + 5, moonY - 2, 8.5, 0, Math.PI*2); ctx.fill();
    }

    // ── Clouds ───────────────────────────────────────────────────────────────
    ctx.font = "18px serif";
    g.cx.forEach((cx,i) => { ctx.globalAlpha = Math.max(0.05, 0.25+i*0.04 - sunMoonT*0.2); ctx.fillText("☁️", cx, g.cy[i]); });
    ctx.globalAlpha = 1;

    // ── Back city layer (parallax ×0.2) ─────────────────────────────────────
    const backOff = ((g.frame * g.speed * 0.2) % (GW + 60));
    ctx.fillStyle = "#1a1a2a";
    CITY_BACK.forEach(b => {
      const bx = ((b.x - backOff + GW + 60) % (GW + 60)) - 10;
      ctx.fillRect(bx, GROUND - b.h, b.w, b.h);
      // windows
      ctx.fillStyle = "rgba(255,230,80,0.25)";
      for (let wy = GROUND - b.h + 6; wy < GROUND - 6; wy += 10) {
        for (let wx = bx + 4; wx < bx + b.w - 4; wx += 7) {
          if (Math.sin(wx * 3.7 + wy * 2.1 + g.frame * 0.01) > 0.3) ctx.fillRect(wx, wy, 3, 4);
        }
      }
      ctx.fillStyle = "#1a1a2a";
    });

    // Mountain silhouette
    ctx.fillStyle = "rgba(12,10,22,0.7)";
    ctx.beginPath(); ctx.moveTo(0, GROUND);
    [[0,165],[40,120],[80,155],[120,108],[170,130],[230,102],[280,138],[320,112],[390,145],[390,GROUND]].forEach(([mx,my]) => ctx.lineTo(mx,my));
    ctx.fill();

    // ── Mid layer trees/lamps (parallax ×0.5) ────────────────────────────────
    const midOff = ((g.frame * g.speed * 0.5) % (GW + 60));
    CITY_MID.forEach(m => {
      const mx = ((m.x - midOff + GW + 60) % (GW + 60)) - 10;
      if (m.kind === "tree") {
        ctx.fillStyle = "#1a3a10";
        ctx.beginPath(); ctx.moveTo(mx+8, GROUND-42); ctx.lineTo(mx+1, GROUND-18); ctx.lineTo(mx+15, GROUND-18); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(mx+8, GROUND-56); ctx.lineTo(mx+3, GROUND-36); ctx.lineTo(mx+13, GROUND-36); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#2a1a08"; ctx.fillRect(mx+6, GROUND-18, 4, 18);
      } else {
        ctx.fillStyle = "#444";
        ctx.fillRect(mx+7, GROUND-38, 2, 38);
        ctx.fillStyle = "rgba(255,220,80,0.8)";
        ctx.beginPath(); ctx.arc(mx+8, GROUND-40, 4, 0, Math.PI*2); ctx.fill();
      }
    });

    // ── Ground ───────────────────────────────────────────────────────────────
    const gr = ctx.createLinearGradient(0, GROUND, 0, GH);
    gr.addColorStop(0, "#1e5a0a"); gr.addColorStop(0.4, "#0e2a05"); gr.addColorStop(1, "#070f03");
    ctx.fillStyle = gr; ctx.fillRect(0, GROUND, GW, GH - GROUND);

    // Ground gradient overlay (darker at edges, lighter center)
    const grEdge = ctx.createLinearGradient(0, GROUND, GW, GROUND);
    grEdge.addColorStop(0,   "rgba(0,0,0,0.4)");
    grEdge.addColorStop(0.3, "rgba(0,0,0,0)");
    grEdge.addColorStop(0.7, "rgba(0,0,0,0)");
    grEdge.addColorStop(1,   "rgba(0,0,0,0.4)");
    ctx.fillStyle = grEdge; ctx.fillRect(0, GROUND, GW, GH - GROUND);

    ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(GW, GROUND); ctx.stroke();

    // Ground texture tiles (moving)
    ctx.fillStyle = "#4caf5033"; ctx.font = "8px monospace";
    const tileOff = (g.frame * g.speed * 0.7) % 60;
    for (let d = -tileOff; d < GW; d += 60) ctx.fillText("· · ·", d, GROUND + 10);

    // ── Speed lines ──────────────────────────────────────────────────────────
    if (g.speed > 8) {
      const alpha = Math.min(0.3, (g.speed - 8) / 6 * 0.3);
      ctx.strokeStyle = `rgba(200,255,0,${alpha})`; ctx.lineWidth = 1;
      for (let li = 0; li < 12; li++) {
        const ly = GROUND - 22 - li * 14;
        const lineLen = 30 + (g.speed - 8) * 6 + li * 3;
        const lx = GW - ((g.frame * g.speed * 1.5 + li * 55) % (GW + lineLen + 100));
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lineLen, ly); ctx.stroke();
      }
    }

    // ── Powerups ─────────────────────────────────────────────────────────────
    const pwupEmoji: Record<PwupKind, string> = { shield:"🛡️", boost:"💨", magnet:"🧲", star:"⭐", beat:"🎵", warp:"🌀" };
    const pwupColor: Record<PwupKind, string> = { shield:"#00e5ff", boost:"#c8ff00", magnet:"#ff44cc", star:"#ffdd00", beat:"#ff6600", warp:"#aa44ff" };
    ctx.font = "18px serif";
    g.pwups.forEach(p => {
      if (p.done) return;
      const yy = GROUND - 68 + Math.sin(g.frame * 0.12 + p.id) * 5;
      ctx.fillText(pwupEmoji[p.type], p.x, yy);
      ctx.strokeStyle = pwupColor[p.type];
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(g.frame * 0.15);
      ctx.beginPath(); ctx.arc(p.x + 9, yy - 9, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // ── Gems ─────────────────────────────────────────────────────────────────
    ctx.font = "16px serif";
    g.gms.forEach(gem => {
      if (gem.done) return;
      const yy = GROUND + gem.yOff - 14 + Math.sin(g.frame * 0.12 + gem.id * 0.5) * 3;
      ctx.fillText("💎", gem.x, yy);
    });

    // ── Obstacles ────────────────────────────────────────────────────────────
    g.obs.forEach(o => {
      if (o.kind === "bomb") {
        const pulse = 1 + 0.15 * Math.sin(g.frame * 0.2);
        ctx.font = `${Math.round(o.h * pulse)}px serif`;
        // timer warning: flash red when < 60 frames
        if ((o.timer ?? 120) < 60) {
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.frame * 0.4);
        }
        ctx.fillText(o.emoji, o.x, GROUND + o.yOff);
        ctx.globalAlpha = 1;
        // fuse countdown arc
        const timerFrac = Math.max(0, (o.timer ?? 120) / 120);
        ctx.strokeStyle = timerFrac < 0.4 ? "#ff2200" : "#ffaa00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, GROUND + o.yOff - o.h / 2, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - timerFrac));
        ctx.stroke();
      } else if (o.kind === "tornado") {
        ctx.font = `${o.h}px serif`;
        // slight horizontal wobble
        const tx = o.x + Math.sin(g.frame * 0.15 + o.id) * 2;
        ctx.fillText(o.emoji, tx, GROUND + o.yOff);
      } else if (o.kind === "spiderweb") {
        ctx.font = `${o.h}px serif`;
        ctx.fillText(o.emoji, o.x, GROUND + o.yOff);
        // wide hit indicator
        ctx.strokeStyle = "rgba(200,200,200,0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x, GROUND + o.yOff - o.h, o.w, o.h);
      } else if (o.kind === "chain_top" || o.kind === "chain_bot") {
        ctx.font = `${o.h}px serif`;
        ctx.fillText(o.emoji, o.x, GROUND + o.yOff);
        // chain link between pair
        if (o.kind === "chain_top") {
          ctx.strokeStyle = "rgba(180,180,180,0.5)";
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, GROUND + o.yOff - o.h);
          ctx.lineTo(o.x + o.w / 2, GROUND + o.yOff);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.font = `${o.h}px serif`;
        ctx.fillText(o.emoji, o.x, GROUND + o.yOff);
      }
    });

    // ── Ghost trail (5 previous positions) ───────────────────────────────────
    const rainbowColors = ["#ff0000","#ff8800","#ffff00","#00ff00","#8800ff"];
    g.trail.slice().reverse().forEach((pt, i) => {
      const opacity = [0.15, 0.12, 0.09, 0.06, 0.03][i] ?? 0;
      ctx.globalAlpha = opacity;
      ctx.font = `${PET_H}px serif`;
      if (g.hasStar) {
        ctx.fillStyle = rainbowColors[i % rainbowColors.length];
      }
      ctx.fillText(petEmoji, pt.x - 4 - i * 3, pt.y);
    });
    ctx.globalAlpha = 1;

    // ── Pet ──────────────────────────────────────────────────────────────────
    ctx.save();
    const petScreenY = GROUND - g.petY;
    if (g.over) {
      ctx.translate(PET_X + 22, petScreenY - PET_H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-PET_X - 22, -(petScreenY - PET_H / 2));
    }

    // Star rainbow aura
    if (g.hasStar) {
      const sHue = (g.frame * 5) % 360;
      ctx.strokeStyle = `hsl(${sHue},100%,60%)`; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(g.frame * 0.25);
      ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 32, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `hsl(${(sHue+120)%360},100%,60%)`; ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 38, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Shield aura
    if (g.hasShield && !g.hasStar) {
      ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(g.frame * 0.2);
      ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Magnet aura
    if (g.hasMagnet) {
      ctx.strokeStyle = "#ff44cc"; ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(g.frame * 0.18);
      ctx.beginPath(); ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 52, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Beat ×2 badge
    if (g.hasBeat) {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#ff6600";
      ctx.globalAlpha = 0.85 + 0.15 * Math.sin(g.frame * 0.2);
      ctx.fillText("×2", PET_X + 16, petScreenY - PET_H - 10);
      ctx.globalAlpha = 1;
    }

    ctx.font = `${PET_H}px serif`;
    ctx.fillText(petEmoji, PET_X, petScreenY);
    ctx.restore();

    // ── Warp portal swirl ────────────────────────────────────────────────────
    if (g.warpActive && g.frame - g.warpFrame < 30) {
      const wt = (g.frame - g.warpFrame) / 30;
      const wa = (1 - wt) * 0.8;
      ctx.strokeStyle = `rgba(170,68,255,${wa})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(PET_X + 22, petScreenY - PET_H / 2, 20 + wt * 30, g.frame * 0.2, g.frame * 0.2 + Math.PI * 1.5);
      ctx.stroke();
    }

    // ── Particles ────────────────────────────────────────────────────────────
    g.particles.forEach(p => {
      ctx.globalAlpha = p.life; ctx.font = `${p.size ?? 12}px serif`;
      ctx.fillText(p.emoji, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    // ── HUD ──────────────────────────────────────────────────────────────────
    ctx.fillStyle = "#c8ff00"; ctx.font = "bold 15px monospace"; ctx.textAlign = "right";
    ctx.fillText(String(g.score).padStart(6, "0"), GW - 10, 22);
    ctx.fillStyle = "#00e5ff"; ctx.textAlign = "left"; ctx.font = "bold 12px monospace";
    ctx.fillText(`💎×${g.gems}`, 10, 22);
    ctx.fillStyle = g.speed > 9 ? "#ff4444" : g.speed > 6 ? "#ff9900" : "#ffffff55";
    ctx.font = "10px monospace"; ctx.textAlign = "right";
    ctx.fillText(`SPD ×${g.speed.toFixed(1)}`, GW - 10, 38);
    if (g.comboCount > 1) {
      ctx.fillStyle = "#ffcc00"; ctx.font = `bold ${10 + Math.min(g.comboCount, 6)}px monospace`; ctx.textAlign = "left";
      ctx.fillText(`🔥 ×${g.comboCount}`, 10, 38);
    }
    if (g.hasBeat) {
      ctx.fillStyle = "#ff6600"; ctx.font = "bold 11px monospace"; ctx.textAlign = "right";
      ctx.fillText("×2 SCORE!", GW - 10, 52);
    }

    // Active powerup icons
    let iconX = 10;
    if (g.hasShield)  { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("🛡️", iconX, 54); iconX += 20; }
    if (g.hasMagnet)  { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("🧲", iconX, 54); iconX += 20; }
    if (g.hasStar)    { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("⭐", iconX, 54); iconX += 20; }
    if (g.hasBeat)    { ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("🎵", iconX, 54); }

    // ── Milestone flash ───────────────────────────────────────────────────────
    if (g.milestoneFrame > 0) {
      const mAge = g.frame - g.milestoneFrame;
      if (mAge < 90) {
        const mAlpha = mAge < 15 ? mAge / 15 : mAge > 70 ? (90 - mAge) / 20 : 1;
        ctx.fillStyle = `rgba(200,255,0,${mAlpha * 0.18})`;
        ctx.fillRect(0, 0, GW, GH);
        ctx.fillStyle = `rgba(255,255,100,${mAlpha})`;
        ctx.font = "bold 22px monospace"; ctx.textAlign = "center";
        ctx.fillText(`🏁 ${g.milestoneScore} POINTS!`, GW / 2, GH / 2 - 10);
        ctx.font = "13px monospace";
        ctx.fillText("MILESTONE!", GW / 2, GH / 2 + 14);
      } else {
        g.milestoneFrame = 0;
      }
    }

    // ── Screen flash ─────────────────────────────────────────────────────────
    if (g.flashAlpha > 0) {
      ctx.fillStyle = `rgba(${g.flashColor},${g.flashAlpha})`;
      ctx.fillRect(0, 0, GW, GH);
      g.flashAlpha -= 0.06;
    }

    ctx.textAlign = "left";
    ctx.restore();
  }, [petEmoji]);

  const loop = useCallback(() => {
    const g = gs.current;
    if (!g.on || g.over) return;

    g.frame++;
    g.speed = Math.min(BASE_SPD + Math.floor(g.frame / 320) * 0.8, 14);
    const beatMult = g.hasBeat ? 2 : 1;
    g.score = Math.floor(g.frame * g.speed * 0.09 * beatMult) + g.gems * 10 * Math.max(1, g.comboCount) + g.scoreBonus;

    // Milestone check
    const msTarget = Math.floor(g.score / 1000) * 1000;
    if (msTarget > 0 && msTarget > g.lastMilestone) {
      g.lastMilestone = msTarget;
      g.milestoneFrame = g.frame;
      g.milestoneScore = msTarget;
      g.flashColor = "200,255,0";
      g.flashAlpha = 0.35;
      spawnPtcls(g, GW / 2, GH / 2, "🏁", 8, 18);
    }

    // Update clouds
    g.cx = g.cx.map((cx, i) => { const nx = cx - g.cspd[i]; return nx < -40 ? GW + 30 : nx; });

    // Timer powerups
    if (g.shieldTimer > 0) { g.shieldTimer--; if (g.shieldTimer === 0) g.hasShield = false; }
    if (g.magnetTimer > 0) { g.magnetTimer--; if (g.magnetTimer === 0) g.hasMagnet = false; }
    if (g.starTimer   > 0) { g.starTimer--;   if (g.starTimer   === 0) g.hasStar   = false; }
    if (g.beatTimer   > 0) { g.beatTimer--;   if (g.beatTimer   === 0) g.hasBeat   = false; }
    if (g.screenShake > 0) g.screenShake = Math.max(0, g.screenShake - 0.5);

    // Physics
    g.petVY += GRAVITY; g.petY = Math.max(0, g.petY - g.petVY);
    if (g.petY === 0) { g.petVY = 0; g.jumpsLeft = 2; }

    // Trail
    g.trail.unshift({ x: PET_X, y: GROUND - g.petY });
    if (g.trail.length > 5) g.trail.length = 5;

    // Shooting stars at high speed
    if (g.speed > 9 && Math.random() < (g.speed - 9) * 0.008) {
      g.shootingStars.push({
        x: Math.random() * GW,
        y: Math.random() * (GROUND * 0.6),
        len: 20 + Math.random() * 30,
        speed: 3 + Math.random() * 5,
        life: 1,
      });
    }
    g.shootingStars = g.shootingStars
      .map(ss => ({ ...ss, x: ss.x + ss.speed, y: ss.y + ss.speed * 0.4, life: ss.life - 0.06 }))
      .filter(ss => ss.life > 0 && ss.x < GW + 60);

    // ── Obstacles ──
    g.nxtObs--;
    if (g.nxtObs <= 0) {
      const roll = Math.random();
      let obs: Obs;
      if (roll < 0.55) {
        // Normal
        const t = OBS_POOL_NORMAL[Math.floor(Math.random() * OBS_POOL_NORMAL.length)];
        obs = { id: g.frame, x: GW + 10, kind: "normal", ...t };
      } else if (roll < 0.67) {
        // Tornado
        obs = { id: g.frame, x: GW + 10, w: 32, h: 60, emoji: "🌪️", yOff: 0, kind: "tornado", vy: 0.8 };
      } else if (roll < 0.78) {
        // Bomb
        obs = { id: g.frame, x: GW + 10, w: 30, h: 34, emoji: "💣", yOff: 0, kind: "bomb", timer: 120 };
      } else if (roll < 0.88) {
        // Spiderweb — wide, low (must jump over)
        obs = { id: g.frame, x: GW + 10, w: 60, h: 22, emoji: "🕸️", yOff: 0, kind: "spiderweb" };
      } else {
        // Chain — top + bottom with gap; spawn both
        const chainId = g.frame;
        g.obs.push({ id: chainId,       x: GW + 10, w: 24, h: 50, emoji: "⛓️", yOff: 0,    kind: "chain_bot", paired: chainId });
        obs =        { id: chainId + 1, x: GW + 10, w: 24, h: 40, emoji: "⛓️", yOff: -110, kind: "chain_top", paired: chainId };
      }
      g.obs.push(obs);
      g.nxtObs = Math.max(40, 65 + Math.floor(Math.random() * 60) - Math.floor(g.speed * 4));
    }

    // Move obstacles, handle tornado vertical movement and bomb timer
    g.obs = g.obs.map(o => {
      const nx = o.x - g.speed;
      if (o.kind === "tornado") {
        let ny = (o.yOff ?? 0) - (o.vy ?? 0);
        let nvy = o.vy ?? 0;
        if (ny < -60) nvy = -Math.abs(nvy);
        if (ny > 0)   nvy =  Math.abs(nvy);
        return { ...o, x: nx, yOff: ny, vy: nvy };
      }
      if (o.kind === "bomb") {
        const newTimer = (o.timer ?? 120) - 1;
        if (newTimer <= 0 && !o.exploded) {
          // Explode
          spawnPtcls(g, o.x + o.w / 2, GROUND + o.yOff - o.h / 2, "💥", 8, 16);
          g.screenShake = 6;
          g.flashColor = "255,80,0";
          g.flashAlpha = 0.35;
          return { ...o, x: nx, timer: 0, exploded: true };
        }
        return { ...o, x: nx, timer: newTimer };
      }
      return { ...o, x: nx };
    }).filter(o => o.x > -80 && !(o.kind === "bomb" && o.exploded && (o.timer ?? 0) <= 0 && o.x < PET_X - 50));

    // ── Gems ──
    g.nxtGem--;
    if (g.nxtGem <= 0) {
      g.gms.push({ id: g.frame + 99999, x: GW + 10, yOff: Math.random() < 0.35 ? -80 : -6, done: false });
      g.nxtGem = Math.max(20, 35 + Math.floor(Math.random() * 30));
    }
    g.gms = g.gms.map(gem => ({ ...gem, x: gem.x - g.speed })).filter(gem => gem.x > -25);

    // ── Powerups ──
    g.nxtPwup--;
    if (g.nxtPwup <= 0) {
      const types: PwupKind[] = ["shield", "boost", "magnet", "star", "beat", "warp"];
      // Weight rarer powerups less
      const weights = [3, 3, 3, 1, 1, 1.5];
      const total = weights.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * total;
      let chosen: PwupKind = "boost";
      for (let ti = 0; ti < types.length; ti++) {
        rnd -= weights[ti];
        if (rnd <= 0) { chosen = types[ti]; break; }
      }
      g.pwups.push({ id: g.frame, x: GW + 10, type: chosen, done: false });
      g.nxtPwup = 280 + Math.floor(Math.random() * 180);
    }
    g.pwups = g.pwups.map(p => ({ ...p, x: p.x - g.speed })).filter(p => p.x > -30);

    // ── Collision boxes ──
    const pL = PET_X + 6, pR = PET_X + PET_H - 6;
    const pT = GROUND - g.petY - PET_H + 8, pB = GROUND - g.petY - 8;

    // ── Obstacle collisions ──
    for (const o of g.obs) {
      if (o.kind === "bomb" && (o.exploded || (o.timer ?? 120) <= 0)) continue;

      const oL = o.x + 4, oR = o.x + o.w - 4;
      const oT = GROUND + o.yOff - o.h + 4, oB = GROUND + o.yOff - 4;

      if (pR > oL && pL < oR && pB > oT && pT < oB) {
        // Star invincibility — phase through
        if (g.hasStar) continue;

        if (g.hasShield) {
          g.hasShield = false; g.shieldTimer = 0;
          spawnPtcls(g, PET_X + 22, GROUND - g.petY - PET_H / 2, "🛡️", 6);
          g.screenShake = 4; g.comboCount = 0;
          g.obs = g.obs.filter(x => x !== o);
          // If bomb, trigger explosion
          if (o.kind === "bomb") { spawnPtcls(g, o.x, GROUND + o.yOff - o.h / 2, "💥", 6, 14); g.screenShake = 5; }
          continue;
        }
        // Dead
        g.over = true; g.on = false; g.flashAlpha = 0.8; g.flashColor = "255,50,50"; g.screenShake = 10;
        const timeSec = Math.floor((g.frame - g.startFrame) / 60);
        g.maxCombo = Math.max(g.maxCombo, g.comboCount);
        draw();
        setFin({ score: g.score, gems: g.gems, maxCombo: g.maxCombo, timeSec });
        try {
          const prev = parseInt(localStorage.getItem("karma_runner_best_v1") ?? "0") || 0;
          if (g.score > prev) {
            localStorage.setItem("karma_runner_best_v1", String(g.score));
            setBest(g.score);
          }
        } catch {}
        onEnd?.(g.score, g.gems); setPhase("over"); return;
      }
    }

    // ── Gem collection ──
    g.gms.forEach(gem => {
      if (gem.done) return;
      const gy = GROUND + gem.yOff - 14;
      const inRange = g.hasMagnet
        ? (Math.abs(gem.x - (PET_X + 22)) < 55 && Math.abs(gy - (GROUND - g.petY - PET_H / 2)) < 55)
        : (gem.x < pR && gem.x + 16 > pL && gy < pB && gy + 16 > pT);
      if (inRange) {
        gem.done = true; g.gems++;
        g.comboCount++;
        g.maxCombo = Math.max(g.maxCombo, g.comboCount);
        spawnPtcls(g, gem.x, gy, "✨", 4);
      }
    });

    // ── Powerup collection ──
    g.pwups.forEach(p => {
      if (p.done) return;
      const py = GROUND - 68;
      if (Math.abs(p.x - (PET_X + 22)) < 28 && Math.abs(py - (GROUND - g.petY - PET_H / 2)) < 48) {
        p.done = true;
        const pwupEmoji: Record<PwupKind, string> = { shield:"🛡️", boost:"💨", magnet:"🧲", star:"⭐", beat:"🎵", warp:"🌀" };
        spawnPtcls(g, p.x, py, pwupEmoji[p.type], 6);
        switch (p.type) {
          case "shield": g.hasShield = true; g.shieldTimer = 300; break;
          case "boost":  g.scoreBonus += 80; g.flashColor = "200,255,0"; g.flashAlpha = 0.25; break;
          case "magnet": g.hasMagnet = true; g.magnetTimer = 400; break;
          case "star":
            g.hasStar = true; g.starTimer = 180;
            g.flashColor = "255,220,0"; g.flashAlpha = 0.3;
            spawnPtcls(g, PET_X + 22, GROUND - g.petY - PET_H / 2, "⭐", 8, 16);
            break;
          case "beat":
            g.hasBeat = true; g.beatTimer = 300;
            g.flashColor = "255,100,0"; g.flashAlpha = 0.2;
            break;
          case "warp":
            // Teleport forward — remove obstacles in front (simulate passing 200px)
            g.obs = g.obs.filter(o => o.x < PET_X + 50 || o.x > PET_X + 250);
            g.warpActive = true; g.warpFrame = g.frame;
            g.flashColor = "170,68,255"; g.flashAlpha = 0.3;
            spawnPtcls(g, PET_X + 22, GROUND - g.petY - PET_H / 2, "🌀", 8, 14);
            break;
        }
      }
    });

    // Warp deactivate
    if (g.warpActive && g.frame - g.warpFrame > 30) g.warpActive = false;

    // ── Particles ──
    g.particles = g.particles
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 0.04 }))
      .filter(p => p.life > 0);

    if (g.frame % 4 === 0) {
      setUi({ combo: g.comboCount, shield: g.hasShield, magnet: g.hasMagnet, star: g.hasStar, beat: g.hasBeat, speed: g.speed, beatTimer: g.beatTimer });
    }

    draw(); raf.current = requestAnimationFrame(loop);
  }, [draw, onEnd]);

  function jump() {
    const g = gs.current;
    if (phase === "idle") {
      g.on = true; g.startFrame = 0;
      setPhase("on"); raf.current = requestAnimationFrame(loop); return;
    }
    if (g.jumpsLeft > 0 && !g.over) {
      g.petVY = g.jumpsLeft === 2 ? JUMP_V : JUMP_V * 0.82; g.jumpsLeft--;
    }
  }

  function restart() {
    cancelAnimationFrame(raf.current);
    gs.current = mkGS(); setPhase("idle"); setFin({ score: 0, gems: 0, maxCombo: 0, timeSec: 0 });
    setUi({ combo: 0, shield: false, magnet: false, star: false, beat: false, speed: BASE_SPD, beatTimer: 0 });
    setCopied(false);
    requestAnimationFrame(draw);
  }

  function copyScore() {
    const text = `I scored ${fin.score} pts (${fin.gems} 💎 gems) in Karma Runner! 🔥`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }

  useEffect(() => { requestAnimationFrame(draw); return () => cancelAnimationFrame(raf.current); }, [draw]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  });

  const formatTime = (s: number) => `${Math.floor(s/60)}m ${s%60}s`;

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none" }}>
      <canvas ref={cvs} width={GW} height={GH}
        style={{ width: "100%", height: "auto", borderRadius: 18, border: "2.5px solid #1a2a10", display: "block", cursor: "pointer", boxShadow: "0 0 30px #4caf5022" }}
        onClick={jump} onTouchStart={e => { e.preventDefault(); jump(); }} />

      {/* IDLE SCREEN */}
      {phase === "idle" && (
        <div onClick={jump} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.78)", borderRadius: 16, gap: 8, cursor: "pointer" }}>
          <div style={{ fontSize: "3.5rem" }}>{petEmoji}</div>
          <div style={{ color: "#c8ff00", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>KARMA RUNNER</div>
          <div style={{ color: "#aaa", fontSize: 13 }}>TAP / SPACE TO START</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 }}>
            {([["💎","+karma"],["🛡️","shield"],["💨","+score"],["🧲","magnet"],["⭐","invincible"],["🎵","×2 score"],["🌀","warp"]] as [string,string][]).map(([e,t]) => (
              <div key={t} style={{ textAlign: "center", background: "#0a0a0a", borderRadius: 8, padding: "5px 8px", border: "1px solid #2a2a2a" }}>
                <div style={{ fontSize: "1rem" }}>{e}</div><div style={{ fontSize: 8, color: "#666", fontWeight: 700 }}>{t}</div>
              </div>
            ))}
          </div>
          {best > 0 && <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>BEST: <span style={{ color: "#c8ff00", fontWeight: 700 }}>{best}</span></div>}
          <div style={{ color: "#555", fontSize: 10, marginTop: 2 }}>Double-jump • Powerups • Combos • Milestones</div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {phase === "over" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.92)", borderRadius: 16, gap: 8 }}>
          {/* Pulsing skull */}
          <div style={{ fontSize: "2.8rem", animation: "pulse 0.7s ease-in-out infinite alternate" }}>💀</div>
          <div style={{ color: "#ff2d8d", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>GAME OVER</div>
          <div style={{ color: "#c8ff00", fontSize: 42, fontWeight: 900, textShadow: "0 0 24px #c8ff0077", lineHeight: 1 }}>{fin.score}</div>
          {fin.score > best && <div style={{ color: "#ffdd00", fontSize: 12, fontWeight: 700 }}>NEW BEST!</div>}
          {fin.score <= best && best > 0 && <div style={{ color: "#666", fontSize: 11 }}>BEST: <span style={{ color: "#c8ff00" }}>{best}</span></div>}
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 18px", marginTop: 4, marginBottom: 4 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#00e5ff", fontSize: 16, fontWeight: 700 }}>💎 ×{fin.gems}</div>
              <div style={{ color: "#444", fontSize: 9 }}>GEMS</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ffcc00", fontSize: 16, fontWeight: 700 }}>🔥 ×{fin.maxCombo}</div>
              <div style={{ color: "#444", fontSize: 9 }}>MAX COMBO</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ff8844", fontSize: 16, fontWeight: 700 }}>+{fin.gems * 10} ⚡</div>
              <div style={{ color: "#444", fontSize: 9 }}>GEM BONUS</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#aaaaff", fontSize: 16, fontWeight: 700 }}>⏱ {formatTime(fin.timeSec)}</div>
              <div style={{ color: "#444", fontSize: 9 }}>SURVIVED</div>
            </div>
          </div>
          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={e => { e.stopPropagation(); restart(); }}
              style={{ padding: "10px 28px", background: "#c8ff00", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0a0a0a", cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a" }}>
              ↺ RETRY
            </button>
            <button onClick={e => { e.stopPropagation(); copyScore(); }}
              style={{ padding: "10px 18px", background: copied ? "#00aa44" : "#1a1a1a", border: "3px solid #333", borderRadius: 12, fontSize: 13, fontWeight: 700, color: copied ? "#fff" : "#aaa", cursor: "pointer" }}>
              {copied ? "✓ COPIED!" : "📤 SHARE"}
            </button>
          </div>
        </div>
      )}

      {/* IN-GAME HUD BELOW CANVAS */}
      {phase === "on" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ color: "#555", fontSize: 10, fontWeight: 600 }}>TAP / ↑ JUMP (2×)</span>
          <span style={{ color: ui.speed > 9 ? "#ff4444" : ui.speed > 6 ? "#ff9900" : "#666", fontSize: 10, fontWeight: 700 }}>SPD ×{ui.speed.toFixed(1)}</span>
          {ui.combo > 1 && <span style={{ color: "#ffcc00", fontSize: 11, fontWeight: 700 }}>🔥 ×{ui.combo}</span>}
          {ui.beat && <span style={{ color: "#ff6600", fontSize: 11, fontWeight: 700 }}>×2 SCORE!</span>}
          {ui.shield && <span style={{ fontSize: 13 }}>🛡️</span>}
          {ui.magnet && <span style={{ fontSize: 13 }}>🧲</span>}
          {ui.star   && <span style={{ fontSize: 13 }}>⭐</span>}
        </div>
      )}

      {/* CSS for pulsing skull */}
      <style>{`@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.18); } }`}</style>
    </div>
  );
}
