"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Zap, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SHOP_ITEMS } from "@/lib/mock-data";

const CATEGORIES = ["ALL", "PET", "POWER", "COSMETICS"] as const;
type Category = (typeof CATEGORIES)[number];

const RARITY_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  common:    { label: "COMMON",    bg: "#e8e3d8", color: "#555" },
  uncommon:  { label: "UNCOMMON",  bg: "#d4f5c0", color: "#1b5e20" },
  rare:      { label: "RARE",      bg: "#cce8ff", color: "#0d47a1" },
  epic:      { label: "EPIC",      bg: "#e8d5ff", color: "#4c1d95" },
  legendary: { label: "LEGENDARY", bg: "#fff3c4", color: "#e65100" },
};

export default function ShopPage() {
  const { user, spendKarma } = useApp();
  const [category, setCategory] = useState<Category>("ALL");
  const [bought, setBought] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const items = category === "ALL"
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter((i) => i.category === category.toLowerCase());

  function handleBuy(id: string, price: number, name: string) {
    if (bought.has(id)) return;
    const success = spendKarma(price);
    if (!success) {
      setToast(`Not enough KARMA! Need ${price} ⚡`);
    } else {
      setBought((prev) => new Set(prev).add(id));
      setToast(`${name} purchased! 🎉`);
    }
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
              KARMA SHOP
            </h1>
            <p style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>
              {SHOP_ITEMS.length} ITEMS AVAILABLE
            </p>
          </div>
          {/* Karma balance */}
          <div
            className="flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "#c8ff00",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
              boxShadow: "3px 3px 0px #0a0a0a",
            }}
          >
            <Zap size={15} color="#0a0a0a" fill="#0a0a0a" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{user.karma.toLocaleString()}</span>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="flex-shrink-0 px-4 py-1.5"
              style={{
                background: category === cat ? "#0a0a0a" : "#fff",
                border: "2.5px solid #0a0a0a",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: category === cat ? "#c8ff00" : "#0a0a0a",
                boxShadow: category === cat ? "none" : "2px 2px 0px #0a0a0a",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-3 p-3 text-center neo-card-flat"
            style={{
              background: toast.includes("Not enough") ? "#ffd0d0" : "#c8ff00",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Featured item */}
      {category === "ALL" && (
        <div className="px-4 pt-4">
          <div
            className="neo-card-lg p-4 mb-1"
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #1f1f1f 100%)",
              color: "#fff",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "#ff6b35",
                  color: "#fff",
                  padding: "3px 10px",
                  borderRadius: 6,
                  letterSpacing: "0.08em",
                }}
              >
                ⭐ FEATURED
              </span>
              <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600 }}>LIMITED TIME</span>
            </div>
            <div className="flex items-center gap-4">
              <div style={{ fontSize: "3rem" }}>🎨</div>
              <div className="flex-1">
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#c8ff00" }}>
                  Pet Skin: Neon
                </div>
                <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
                  Give your companion a glowing neon look. Pure flex.
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} color="#c8ff00" fill="#c8ff00" />
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#c8ff00" }}>500</span>
                  </div>
                  <button
                    onClick={() => handleBuy("s3", 500, "Pet Skin: Neon")}
                    style={{
                      padding: "8px 20px",
                      background: bought.has("s3") ? "#333" : "#c8ff00",
                      border: "2.5px solid #c8ff00",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      color: bought.has("s3") ? "#888" : "#0a0a0a",
                      cursor: bought.has("s3") ? "default" : "pointer",
                    }}
                  >
                    {bought.has("s3") ? "OWNED ✓" : "BUY NOW"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items grid */}
      <div className="px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, i) => {
            if (category === "ALL" && item.id === "s3") return null; // shown in featured
            const rarity = RARITY_STYLE[item.rarity];
            const isBought = bought.has(item.id);
            const canAfford = user.karma >= item.price;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="neo-card p-4 flex flex-col"
              >
                {/* Tag */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="badge"
                    style={{ background: rarity.bg, color: rarity.color, fontSize: 9 }}
                  >
                    {rarity.label}
                  </span>
                  {item.tag && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        background: "#ff2d8d",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: 4,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {item.tag}
                    </span>
                  )}
                </div>

                {/* Emoji */}
                <div
                  style={{
                    fontSize: "2.5rem",
                    textAlign: "center",
                    marginBottom: 8,
                    lineHeight: 1,
                  }}
                >
                  {item.emoji}
                </div>

                {/* Name & desc */}
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
                <p style={{ fontSize: 12, color: "#666", lineHeight: 1.4, flex: 1, marginBottom: 12 }}>
                  {item.description}
                </p>

                {/* Price & buy */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Zap size={13} color="#0a0a0a" fill={canAfford ? "#c8ff00" : "#ccc"} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: canAfford ? "#0a0a0a" : "#aaa" }}>
                      {item.price}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(item.id, item.price, item.name)}
                    disabled={isBought}
                    style={{
                      padding: "6px 14px",
                      background: isBought ? "#e8e3d8" : canAfford ? "#0a0a0a" : "#f5f0e8",
                      border: `2px solid ${isBought ? "#ccc" : canAfford ? "#0a0a0a" : "#ccc"}`,
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      color: isBought ? "#888" : canAfford ? "#c8ff00" : "#aaa",
                      cursor: isBought ? "default" : canAfford ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isBought ? (
                      <>
                        <Check size={12} />
                        OWNED
                      </>
                    ) : canAfford ? (
                      "BUY"
                    ) : (
                      "NEED ⚡"
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
