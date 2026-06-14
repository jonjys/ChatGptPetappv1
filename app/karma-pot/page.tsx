"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

// ─── Pot definitions ──────────────────────────────────────────────────────────

const POTS = [
  {
    id: "hourly",
    label: "⚡ TIMME",
    sublabel: "Resetar varje timme",
    period: 3600,
    baseKr: 12,
    color: "#c8ff00",
    textColor: "#0a0a0a",
    bg: "#0f1a00",
    borderColor: "#c8ff0066",
    icon: "⚡",
    ticketKey: "hour",
  },
  {
    id: "halfday",
    label: "🌅 12 TIMMAR",
    sublabel: "Halvdagspotten",
    period: 43200,
    baseKr: 89,
    color: "#00e5ff",
    textColor: "#0a0a0a",
    bg: "#001a1f",
    borderColor: "#00e5ff66",
    icon: "🌅",
    ticketKey: "halfday",
  },
  {
    id: "daily",
    label: "🌍 DAGLIG POTT",
    sublabel: "Resetar midnatt",
    period: 86400,
    baseKr: 249,
    color: "#ff6b35",
    textColor: "#fff",
    bg: "#1a0a00",
    borderColor: "#ff6b3566",
    icon: "🌍",
    ticketKey: "day",
  },
  {
    id: "weekly",
    label: "👑 VECKOPOTT",
    sublabel: "Varje måndag midnatt",
    period: 604800,
    baseKr: 1249,
    color: "#e040fb",
    textColor: "#fff",
    bg: "#12001a",
    borderColor: "#e040fb66",
    icon: "👑",
    ticketKey: "week",
  },
];

const ACTIVITY_FEED = [
  { emoji: "🎮", user: "AlexK",  action: "spelade DNA Breaker",      tickets: "+1", ago: "2m" },
  { emoji: "✅", user: "MiaS",   action: "slutförde Bounty #12",     tickets: "+5", ago: "4m" },
  { emoji: "🔥", user: "ZaraQ",  action: "15-dagars streak!",        tickets: "×2", ago: "8m" },
  { emoji: "📸", user: "LeoV",   action: "postade på FLASH",         tickets: "+2", ago: "12m" },
  { emoji: "🎣", user: "NickF",  action: "fångade en Legendary Fisk",tickets: "+3", ago: "15m" },
  { emoji: "⭐", user: "EvaP",   action: "nådde Level 20",           tickets: "+10", ago: "22m" },
  { emoji: "🎮", user: "AlexK",  action: "spelade Karma Slots",      tickets: "+1", ago: "28m" },
  { emoji: "💰", user: "MiaS",   action: "köpte KARMA PRO",          tickets: "×3 BOOST", ago: "1h" },
];

const RECENT_WINNERS = [
  { user: "AlexK",  emoji: "😎", amount: 249, pot: "🌍 Daglig", date: "igår" },
  { user: "ZaraQ",  emoji: "💜", amount: 1249, pot: "👑 Vecka",  date: "mån" },
  { user: "MiaS",   emoji: "🌸", amount: 89,  pot: "🌅 12h",    date: "igår" },
  { user: "LeoV",   emoji: "⚡", amount: 12,  pot: "⚡ Timme",  date: "idag" },
];

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(period: number) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = period - (now % period);
    setSecs(remaining);
    const iv = setInterval(() => setSecs(s => s <= 1 ? period : s - 1), 1000);
    return () => clearInterval(iv);
  }, [period]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pct = 1 - (secs / period);

  return {
    label: h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
    pct,
    secs,
  };
}

// ─── Ticket count (simulated from app activity) ───────────────────────────────
function getMyTickets(key: string): number {
  try {
    const n = parseInt(localStorage.getItem(`karma_pot_tickets_${key}_v1`) ?? "0") || 0;
    return Math.max(n, Math.floor(Math.random() * 12) + 3); // demo: show some tickets
  } catch {
    return Math.floor(Math.random() * 12) + 3;
  }
}

// ─── Pot card component ───────────────────────────────────────────────────────
function PotCard({ pot, myTickets, totalTickets }: {
  pot: typeof POTS[0];
  myTickets: number;
  totalTickets: number;
}) {
  const cd = useCountdown(pot.period);
  const myChancePct = Math.round((myTickets / (totalTickets + myTickets)) * 100);

  // Simulate pot growing with subscriptions
  const [displayKr, setDisplayKr] = useState(pot.baseKr);
  useEffect(() => {
    const iv = setInterval(() => {
      setDisplayKr(n => {
        const jitter = Math.random() * 0.5;
        return Math.round((n + jitter) * 10) / 10;
      });
    }, 8000 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, [pot.baseKr]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: pot.bg,
        border: `1.5px solid ${pot.borderColor}`,
        borderRadius: 20,
        padding: "18px 16px 14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 100, height: 100,
        background: pot.color, borderRadius: "50%", filter: "blur(40px)", opacity: 0.12,
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: pot.color, letterSpacing: "0.05em" }}>{pot.label}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{pot.sublabel}</div>
        </div>
        <div style={{
          background: pot.color + "22", border: `1px solid ${pot.color}66`,
          borderRadius: 10, padding: "4px 10px",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: pot.color }}>⏱ {cd.label}</span>
        </div>
      </div>

      {/* Amount */}
      <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 2 }}>
        {displayKr.toFixed(0)} <span style={{ fontSize: 16, fontWeight: 600, color: "#666" }}>kr</span>
      </div>
      <div style={{ fontSize: 10, color: "#555", marginBottom: 12 }}>
        Byggs upp av premium-betalningar · resetar snart
      </div>

      {/* Progress bar (time remaining) */}
      <div style={{ height: 3, background: "#222", borderRadius: 2, marginBottom: 10 }}>
        <motion.div
          style={{
            width: `${cd.pct * 100}%`,
            height: "100%", background: pot.color, borderRadius: 2,
          }}
        />
      </div>

      {/* My tickets */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 12, color: "#888" }}>Dina biljetter: </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: pot.color }}>{myTickets} st</span>
        </div>
        <div style={{
          background: myChancePct > 5 ? pot.color + "22" : "#111",
          border: `1px solid ${myChancePct > 5 ? pot.color + "44" : "#333"}`,
          borderRadius: 8, padding: "3px 8px",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: myChancePct > 5 ? pot.color : "#555" }}>
            ~{myChancePct}% chans
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function KarmaPotPage() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<"pots" | "how" | "winners">("pots");
  const [tickets] = useState(() => POTS.map(p => ({ id: p.id, count: getMyTickets(p.ticketKey) })));
  const totalPot = POTS.reduce((s, p) => s + p.baseKr, 0);

  const myTotalTickets = tickets.reduce((s, t) => s + t.count, 0);
  const totalPlayers = 1247 + Math.floor(Math.random() * 50);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff", paddingBottom: 100 }}>

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(10,10,10,0.96)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "14px 20px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/feed" style={{ color: "#888", fontSize: 22, textDecoration: "none" }}>←</Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.04em" }}>💰 KARMA POTTEN</div>
        </div>
        <Link href="/premium" style={{
          fontSize: 10, fontWeight: 800, color: "#0a0a0a",
          background: "#c8ff00", borderRadius: 8, padding: "5px 10px", textDecoration: "none",
        }}>PREMIUM ⚡</Link>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "28px 20px 20px" }}>
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
          style={{ fontSize: "4.5rem", display: "inline-block", marginBottom: 12 }}
        >
          💰
        </motion.div>

        {/* Total pool */}
        <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, color: "#c8ff00", textShadow: "0 0 30px #c8ff0066", marginBottom: 4 }}>
          {totalPot.toLocaleString("sv-SE")} kr
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          Total pott just nu · {totalPlayers.toLocaleString()} aktiva spelare
        </div>

        {/* My stats */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <div style={{
            background: "#111", border: "1px solid #222", borderRadius: 12,
            padding: "10px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#c8ff00" }}>{myTotalTickets}</div>
            <div style={{ fontSize: 10, color: "#555" }}>Mina biljetter</div>
          </div>
          <div style={{
            background: "#111", border: "1px solid #222", borderRadius: 12,
            padding: "10px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ff6b35" }}>0 kr</div>
            <div style={{ fontSize: 10, color: "#555" }}>Totalt vunnet</div>
          </div>
          <div style={{
            background: "#111", border: "1px solid #222", borderRadius: 12,
            padding: "10px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e040fb" }}>#{Math.floor(Math.random() * 200) + 300}</div>
            <div style={{ fontSize: 10, color: "#555" }}>Din ranking</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, padding: "0 20px 20px" }}>
        {(["pots", "how", "winners"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "10px 4px",
              background: activeTab === tab ? "#c8ff00" : "#111",
              border: `1.5px solid ${activeTab === tab ? "#c8ff00" : "#222"}`,
              borderRadius: 12, fontSize: 11, fontWeight: 800,
              color: activeTab === tab ? "#0a0a0a" : "#666",
              cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            {tab === "pots" ? "🏆 POTTER" : tab === "how" ? "🎯 TJÄNA" : "🥇 VINNARE"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0 20px" }}>
        <AnimatePresence mode="wait">

          {/* POTS tab */}
          {activeTab === "pots" && (
            <motion.div
              key="pots"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              {POTS.map((pot, i) => (
                <PotCard
                  key={pot.id}
                  pot={pot}
                  myTickets={tickets[i].count}
                  totalTickets={1200 + i * 300}
                />
              ))}

              {/* Live feed */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.08em", marginBottom: 12 }}>
                  🔴 LIVE AKTIVITET
                </div>
                {ACTIVITY_FEED.slice(0, 5).map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 0", borderBottom: "1px solid #111",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", width: 28, textAlign: "center" }}>{ev.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: "#fff", fontSize: 12 }}>{ev.user}</span>
                      <span style={{ color: "#666", fontSize: 12 }}> {ev.action}</span>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 800,
                      color: ev.tickets.includes("×") ? "#ff6b35" : "#c8ff00",
                    }}>{ev.tickets}</div>
                    <div style={{ fontSize: 10, color: "#444" }}>{ev.ago}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* HOW tab */}
          {activeTab === "how" && (
            <motion.div
              key="how"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* How it works */}
              <div style={{
                background: "#111", border: "1px solid #222", borderRadius: 16,
                padding: "18px 16px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
                  Hur fungerar det?
                </div>
                {[
                  ["1", "Var aktiv i appen — spela spel, slutför bounties, posta på socialt, håll din streak."],
                  ["2", "Varje aktivitet ger dig biljetter till potten."],
                  ["3", "När potten återställs lottas en vinnare bland alla biljetter."],
                  ["4", "Premium-användare får fler biljetter och pott-boosts."],
                ].map(([n, text]) => (
                  <div key={n} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: "#c8ff00", color: "#0a0a0a",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900, flexShrink: 0,
                    }}>{n}</div>
                    <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5, paddingTop: 3 }}>{text}</div>
                  </div>
                ))}
              </div>

              {/* Earn table */}
              <div style={{ fontSize: 12, fontWeight: 800, color: "#555", letterSpacing: "0.08em", marginBottom: 12 }}>
                HUR DU TJÄNAR BILJETTER
              </div>
              {[
                { emoji: "🎮", action: "Spela ett spel",         tickets: "+1 biljett",    color: "#c8ff00" },
                { emoji: "✅", action: "Slutföra en bounty",     tickets: "+5 biljetter",   color: "#00e5ff" },
                { emoji: "📸", action: "Posta på FLASH",         tickets: "+2 biljetter",   color: "#ff2d8d" },
                { emoji: "🔥", action: "Hålla din dagliga streak",tickets: "×1.5 per dag",  color: "#ff6b35" },
                { emoji: "⭐", action: "Level up",               tickets: "+10 biljetter",  color: "#ffde00" },
                { emoji: "🐠", action: "Fånga Legendary fisk",   tickets: "+3 biljetter",   color: "#00e5ff" },
                { emoji: "💰", action: "KARMA+ prenumeration",   tickets: "×2 alla biljetter", color: "#c8ff00" },
                { emoji: "👑", action: "KARMA PRO prenumeration", tickets: "×3 alla biljetter", color: "#ff8c00" },
                { emoji: "💀", action: "KARMA GOLD prenumeration",tickets: "×5 alla biljetter", color: "#e040fb" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", marginBottom: 6,
                  background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
                }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>{row.emoji}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#ccc" }}>{row.action}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: row.color }}>{row.tickets}</span>
                </div>
              ))}

              {/* Premium upsell */}
              <motion.div
                animate={{ scale: [1, 1.01, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  marginTop: 16,
                  background: "linear-gradient(135deg, #1a0e00, #0d1a00)",
                  border: "1.5px solid #ff8c0066",
                  borderRadius: 16, padding: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>👑</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#ff8c00", marginBottom: 6 }}>
                  KARMA PRO = ×3 BILJETTER
                </div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
                  Med KARMA PRO trippleras alla dina biljetter.<br />
                  39 kr/mån — betalar sig med en vinstpott.
                </div>
                <Link href="/premium" style={{
                  display: "inline-block", padding: "12px 28px",
                  background: "#ff8c00", color: "#fff",
                  borderRadius: 12, fontSize: 14, fontWeight: 900,
                  textDecoration: "none",
                }}>
                  UPPGRADERA NU →
                </Link>
              </motion.div>
            </motion.div>
          )}

          {/* WINNERS tab */}
          {activeTab === "winners" && (
            <motion.div
              key="winners"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: "0.08em", marginBottom: 16 }}>
                SENASTE VINNARNA
              </div>
              {RECENT_WINNERS.map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", marginBottom: 8,
                    background: "#111", border: "1.5px solid #1a1a1a", borderRadius: 16,
                    position: "relative", overflow: "hidden",
                  }}
                >
                  {i === 0 && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 2,
                      background: "linear-gradient(90deg, transparent, #c8ff00, transparent)",
                    }} />
                  )}
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#1a1a1a", border: "2px solid #222",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.5rem",
                  }}>{w.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{w.user}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{w.pot} · {w.date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#c8ff00" }}>+{w.amount} kr</div>
                    <div style={{ fontSize: 9, color: "#444" }}>VANN</div>
                  </div>
                </motion.div>
              ))}

              {/* Disclaimer */}
              <div style={{
                marginTop: 20, padding: "16px",
                background: "#0a0a0a", border: "1px solid #1a1a1a",
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 11, color: "#444", lineHeight: 1.7 }}>
                  ℹ️ KARMA POTTEN är en del av premiumplattformen.<br />
                  Utbetalningar sker via Swish till registrerat mobilnummer.<br />
                  Vinnare kontaktas inom 24h efter draw.<br />
                  Spellagen gäller. Minsta utbetalning 10 kr.
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
