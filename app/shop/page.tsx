"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Zap, Check, Star, Flame } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SHOP_ITEMS } from "@/lib/mock-data";

const CATEGORIES = ["ALL", "PET", "POWER", "COSMETICS"] as const;
type Category = (typeof CATEGORIES)[number];

const RARITY_STYLE: Record<string, { label: string; border: string; glow: string; bg: string; color: string }> = {
  common:    { label: "COMMON",    border: "#555",   glow: "#55555544",   bg: "#111",     color: "#888" },
  uncommon:  { label: "UNCOMMON",  border: "#4caf50",glow: "#4caf5044",   bg: "#0a1a0a",  color: "#4caf50" },
  rare:      { label: "RARE",      border: "#4488ff",glow: "#4488ff44",   bg: "#000d1a",  color: "#4488ff" },
  epic:      { label: "EPIC",      border: "#cc55ff",glow: "#cc55ff44",   bg: "#0d001a",  color: "#cc55ff" },
  legendary: { label: "LEGENDARY", border: "#ffcc00",glow: "#ffcc0044",   bg: "#1a1000",  color: "#ffcc00" },
};

export default function ShopPage() {
  const { user, spendKarma } = useApp();
  const [category, setCategory] = useState<Category>("ALL");
  const [bought, setBought] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const items = category === "ALL"
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((i) => i.category === category.toLowerCase());

  function handleBuy(id: string, price: number, name: string) {
    if (bought.has(id)) return;
    const success = spendKarma(price);
    if (!success) {
      setToast({ msg: `Not enough KARMA! Need ${price} ⚡`, ok: false });
    } else {
      setBought((prev) => new Set(prev).add(id));
      setToast({ msg: `${name} purchased! 🎉`, ok: true });
    }
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div style={{ background: "#050505", minHeight: "100dvh", color: "#fff" }}>

      {/* ── Ambient glow blobs ─────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, #c8ff0009 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 200, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #ff2d8d06 0%, transparent 70%)" }} />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: "rgba(5,5,5,0.95)", backdropFilter: "blur(12px)", borderBottom: "2px solid #c8ff0033" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} color="#c8ff00" />
              <h1 style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1 }}>
                KARMA <span style={{ color: "#c8ff00" }}>SHOP</span>
              </h1>
            </div>
            <p style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>
              {SHOP_ITEMS.length} ITEMS · SPEND YOUR KARMA WISELY
            </p>
          </div>

          {/* Karma balance */}
          <motion.div
            animate={{ boxShadow: ["0 0 12px #c8ff0033", "0 0 24px #c8ff0066", "0 0 12px #c8ff0033"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "linear-gradient(135deg, #1a1a00, #0d1400)",
              border: "2px solid #c8ff0066", borderRadius: 14,
            }}
          >
            <Zap size={15} color="#c8ff00" fill="#c8ff00" />
            <span style={{ fontSize: 16, fontWeight: 900, color: "#c8ff00" }}>{user.karma.toLocaleString()}</span>
          </motion.div>
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.94 }}
              onClick={() => setCategory(cat)}
              style={{
                flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 800,
                background: category === cat ? "#c8ff00" : "#111",
                border: `2px solid ${category === cat ? "#c8ff00" : "#222"}`,
                borderRadius: 10, color: category === cat ? "#000" : "#555",
                cursor: "pointer", letterSpacing: "0.04em",
                boxShadow: category === cat ? "0 0 16px #c8ff0044" : "none",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            style={{
              position: "fixed", top: 80, left: 16, right: 16, zIndex: 200,
              background: toast.ok ? "linear-gradient(135deg, #0a1400, #111)" : "linear-gradient(135deg, #1a0000, #111)",
              border: `2px solid ${toast.ok ? "#c8ff00" : "#ff3333"}`,
              borderRadius: 14, padding: "12px 16px",
              textAlign: "center", fontWeight: 700, fontSize: 14,
              color: toast.ok ? "#c8ff00" : "#ff6666",
              boxShadow: `0 0 24px ${toast.ok ? "#c8ff0033" : "#ff333333"}`,
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-4 pb-24 space-y-4" style={{ position: "relative", zIndex: 1 }}>

        {/* ── Featured item ──────────────────────────────────────────────── */}
        {category === "ALL" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "linear-gradient(135deg, #1a1000, #0a0800, #1a1500)",
              border: "2px solid #ffcc0077",
              borderRadius: 22, padding: "20px 18px",
              boxShadow: "0 0 40px #ffcc0018, 0 0 80px #ffcc0009",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Shimmer overlay */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(105deg, transparent 40%, rgba(255,204,0,0.04) 50%, transparent 60%)",
            }} />

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Star size={12} color="#ffcc00" fill="#ffcc00" />
              <span style={{ fontSize: 10, fontWeight: 800, color: "#ffcc00", letterSpacing: "0.12em" }}>FEATURED ITEM</span>
              <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, background: "#ff6b35", color: "#fff", padding: "2px 7px", borderRadius: 4 }}>LIMITED</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, -5, 5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                style={{ fontSize: "3.2rem", flexShrink: 0 }}
              >🎨</motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#ffcc00", marginBottom: 4 }}>Pet Skin: Neon</div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, marginBottom: 12 }}>
                  Give your companion a glowing neon look. Pure flex energy.
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Zap size={16} color="#ffcc00" fill="#ffcc00" />
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#ffcc00" }}>500</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleBuy("s3", 500, "Pet Skin: Neon")}
                    style={{
                      padding: "10px 22px",
                      background: bought.has("s3") ? "#1a1a1a" : "linear-gradient(135deg, #ffcc00, #ff9900)",
                      border: `2px solid ${bought.has("s3") ? "#333" : "#ffcc00"}`,
                      borderRadius: 12, fontSize: 13, fontWeight: 800,
                      color: bought.has("s3") ? "#555" : "#000",
                      cursor: bought.has("s3") ? "default" : "pointer",
                      boxShadow: bought.has("s3") ? "none" : "0 0 20px #ffcc0044",
                    }}
                  >
                    {bought.has("s3") ? "✓ OWNED" : "BUY NOW"}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Hot deals strip ─────────────────────────────────────────────── */}
        {category === "ALL" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#ff2d8d11", border: "1.5px solid #ff2d8d33",
            borderRadius: 12, padding: "8px 14px",
          }}>
            <Flame size={14} color="#ff2d8d" fill="#ff2d8d" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ff2d8d" }}>HOT DEALS THIS WEEK</span>
            <span style={{ fontSize: 10, color: "#555", marginLeft: "auto" }}>Expires in 3d 12h</span>
          </div>
        )}

        {/* ── Items grid ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {items.map((item, i) => {
            if (category === "ALL" && item.id === "s3") return null;
            const rarity = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common;
            const isBought = bought.has(item.id);
            const canAfford = user.karma >= item.price;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: rarity.bg,
                  border: `2px solid ${isBought ? "#333" : rarity.border + "88"}`,
                  borderRadius: 18, padding: "14px 12px",
                  display: "flex", flexDirection: "column",
                  boxShadow: isBought ? "none" : `0 0 16px ${rarity.glow}`,
                  position: "relative", overflow: "hidden",
                  opacity: isBought ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {/* Rarity glow in corner */}
                <div style={{
                  position: "absolute", top: 0, right: 0, width: 60, height: 60,
                  background: `radial-gradient(circle at 80% 20%, ${rarity.border}22, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                {/* Rarity badge + optional tag */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
                    color: rarity.color, background: rarity.border + "22",
                    border: `1px solid ${rarity.border}44`,
                    borderRadius: 4, padding: "2px 6px",
                  }}>{rarity.label}</span>
                  {item.tag && (
                    <span style={{ fontSize: 8, fontWeight: 700, background: "#ff2d8d", color: "#fff", padding: "2px 5px", borderRadius: 4 }}>
                      {item.tag}
                    </span>
                  )}
                </div>

                {/* Emoji */}
                <motion.div
                  animate={!isBought ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.3 }}
                  style={{ fontSize: "2.4rem", textAlign: "center", marginBottom: 8, lineHeight: 1 }}
                >
                  {item.emoji}
                </motion.div>

                {/* Name & desc */}
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3, color: "#fff" }}>{item.name}</div>
                <p style={{ fontSize: 11, color: "#666", lineHeight: 1.4, flex: 1, marginBottom: 10 }}>
                  {item.description}
                </p>

                {/* Price & buy */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Zap size={13} color={canAfford && !isBought ? rarity.color : "#444"} fill={canAfford && !isBought ? rarity.color : "#444"} />
                    <span style={{ fontSize: 15, fontWeight: 800, color: canAfford && !isBought ? rarity.color : "#444" }}>
                      {item.price}
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleBuy(item.id, item.price, item.name)}
                    disabled={isBought}
                    style={{
                      padding: "6px 12px",
                      background: isBought ? "#111" : canAfford ? rarity.border : "#1a1a1a",
                      border: `2px solid ${isBought ? "#333" : canAfford ? rarity.border : "#333"}`,
                      borderRadius: 9, fontSize: 11, fontWeight: 800,
                      color: isBought ? "#444" : canAfford ? "#000" : "#444",
                      cursor: isBought ? "default" : canAfford ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", gap: 4,
                      boxShadow: (!isBought && canAfford) ? `0 0 10px ${rarity.border}44` : "none",
                    }}
                  >
                    {isBought ? <><Check size={11} /> OWNED</> : canAfford ? "BUY" : "NEED ⚡"}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Bottom info ─────────────────────────────────────────────────── */}
        <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#444", lineHeight: 1.7 }}>
            <strong style={{ color: "#c8ff00" }}>💡 Tips:</strong> Earn karma by completing bounties, fishing, and winning battles. Rare items give permanent stat boosts to your pet.
          </div>
        </div>
      </div>
    </div>
  );
}
