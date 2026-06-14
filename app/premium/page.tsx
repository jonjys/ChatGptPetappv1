"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

const TIERS = [
  {
    id: "plus",
    name: "KARMA+",
    price: 19,
    color: "#c8ff00",
    textColor: "#0a0a0a",
    border: "#c8ff00",
    bg: "#111",
    emoji: "⚡",
    popular: false,
    perks: [
      { icon: "✅", text: "175% XP på allt" },
      { icon: "✅", text: "+150 daily login coins" },
      { icon: "✅", text: "Prioritet i uppdrag" },
      { icon: "✅", text: "Grön ✅ badge" },
    ],
    potShare: 5,
    potEmoji: "⚡",
  },
  {
    id: "pro",
    name: "KARMA PRO",
    price: 39,
    color: "#ff8c00",
    textColor: "#fff",
    border: "#ff8c00",
    bg: "#1a0e00",
    emoji: "👑",
    popular: true,
    perks: [
      { icon: "🔥", text: "2.5x XP TURBO BOOST" },
      { icon: "🔥", text: "+300 daily login coins" },
      { icon: "🔥", text: "Exklusiva pet-skins" },
      { icon: "🔥", text: "Guld 🥇 badge + aura" },
      { icon: "🔥", text: "Bonusuppdrag varje vecka" },
    ],
    potShare: 15,
    potEmoji: "🔥",
  },
  {
    id: "gold",
    name: "KARMA GOLD",
    price: 89,
    color: "#e040fb",
    textColor: "#fff",
    border: "#e040fb",
    bg: "#0d0014",
    emoji: "💀",
    popular: false,
    perks: [
      { icon: "💀", text: "3x XP GODMODE" },
      { icon: "💀", text: "Obegränsade drops" },
      { icon: "💀", text: "Early access till allt nytt" },
      { icon: "💀", text: "badge + special effects" },
    ],
    potShare: 30,
    potEmoji: "👑",
  },
];

export default function PremiumPage() {
  const { user } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function handleSelect(id: string) {
    setSelected(id);
    setShowConfirm(true);
  }

  function handleConfirm() {
    setShowConfirm(false);
    setConfirmed(true);
  }

  const tier = TIERS.find(t => t.id === selected);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #222",
        padding: "16px 20px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/profile" style={{ color: "#888", fontSize: 22, textDecoration: "none" }}>←</Link>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.04em" }}>KARMA PREMIUM</span>
        <div style={{ width: 24 }} />
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "32px 20px 24px" }}>
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          style={{ fontSize: "4rem", marginBottom: 16, display: "inline-block" }}
        >
          👑
        </motion.div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 8 }}>
          UPPGRADERA DIN LEGEND
        </div>
        <div style={{ fontSize: 13, color: "#888", maxWidth: 280, margin: "0 auto" }}>
          Mer XP, fler coins, exklusiva features — och din del av{" "}
          <span style={{ color: "#c8ff00", fontWeight: 700 }}>KARMA POTTEN 💰</span>
        </div>
      </div>

      {/* Pot teaser */}
      <div style={{
        margin: "0 20px 28px",
        background: "linear-gradient(135deg, #1a1200, #0d1a00)",
        border: "1.5px solid #c8ff0044",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: "2rem" }}>💰</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#c8ff00", marginBottom: 2 }}>
            DU KAN TJÄNA RIKTIGA PENGAR
          </div>
          <div style={{ fontSize: 11, color: "#888" }}>
            En del av varje premium-betalning läggs i KARMA POTTEN. Aktivitet = biljetter. Biljetter = chans att vinna.
          </div>
        </div>
        <Link href="/karma-pot" style={{
          background: "#c8ff00", color: "#0a0a0a", fontSize: 10, fontWeight: 800,
          borderRadius: 8, padding: "6px 10px", textDecoration: "none", whiteSpace: "nowrap",
        }}>SE POTTEN →</Link>
      </div>

      {/* Tier cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 20px" }}>
        {TIERS.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              background: t.bg,
              border: `2px solid ${t.border}`,
              borderRadius: 20,
              padding: "20px 18px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Glow */}
            <div style={{
              position: "absolute", top: -30, right: -30, width: 120, height: 120,
              background: t.color, borderRadius: "50%", filter: "blur(50px)", opacity: 0.12,
              pointerEvents: "none",
            }} />

            {/* Popular badge */}
            {t.popular && (
              <div style={{
                position: "absolute", top: 14, right: 14,
                background: t.color, color: "#0a0a0a",
                fontSize: 9, fontWeight: 900, padding: "3px 10px", borderRadius: 20,
                letterSpacing: "0.06em",
              }}>POPULÄRAST</div>
            )}

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: "1.6rem" }}>{t.emoji}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: t.color }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {t.potShare}% av pott-bidraget till KARMA POTTEN
                </div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{t.price} kr</div>
                <div style={{ fontSize: 10, color: "#555" }}>/mån</div>
              </div>
            </div>

            {/* Perks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {t.perks.map((p, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{p.icon}</span>
                  <span style={{ fontSize: 13, color: "#ccc" }}>{p.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(t.id)}
              style={{
                width: "100%", padding: "14px",
                background: confirmed && selected === t.id ? "#1a2a00" : t.color,
                border: "none", borderRadius: 14,
                fontSize: 15, fontWeight: 900,
                color: confirmed && selected === t.id ? "#c8ff00" : t.textColor,
                cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              {confirmed && selected === t.id ? "✅ AKTIVERAT!" : `KÖP ${t.name} →`}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Why premium */}
      <div style={{ padding: "32px 20px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#555", letterSpacing: "0.08em", marginBottom: 16 }}>
          VARFÖR PREMIUM?
        </div>
        {[
          { emoji: "💰", title: "KARMA POTTEN", desc: "Din andel av premium-betalningar läggs i potten. Vinn riktiga pengar varje dag, vecka och månad." },
          { emoji: "🚀", title: "XP BOOST", desc: "Nå högre nivåer snabbare. Lås upp sällsynta husdjur, effekter och exklusivt innehåll." },
          { emoji: "👑", title: "STATUS", desc: "Syns i sociala flödet med din premium-badge. Bli en legend i ditt område." },
          { emoji: "🎯", title: "PRIORITET", desc: "Bonusuppdrag och early access på allt nytt som lanseras." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "#111", border: "1.5px solid #222",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem", flexShrink: 0,
            }}>{item.emoji}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fine print */}
      <div style={{ padding: "24px 20px 0", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#333", lineHeight: 1.8 }}>
          Prenumerationen förnyas automatiskt. Avsluta när som helst.<br />
          KARMA POTTEN är simulerad i demo-versionen.<br />
          Priser i SEK inkl. moms.
        </div>
      </div>

      {/* Confirm sheet */}
      <AnimatePresence>
        {showConfirm && tier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#111", border: `2px solid ${tier.color}`,
                borderRadius: "28px 28px 0 0", padding: "28px 24px 44px",
                width: "100%", maxWidth: 480,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>{tier.emoji}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: tier.color }}>{tier.name}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginTop: 4 }}>{tier.price} kr/mån</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                  Automatisk förnyelse · Avsluta när som helst
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirm}
                style={{
                  width: "100%", padding: "18px",
                  background: tier.color, border: "none", borderRadius: 16,
                  fontSize: 17, fontWeight: 900,
                  color: tier.textColor, cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                BEKRÄFTA KÖP ✓
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
