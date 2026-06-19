"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";

type Product = { id: string; name: string; emoji: string; price: number; sold: number };
type BrandData = {
  name: string;
  emoji: string;
  tagline: string;
  followers: number;
  revenue: number;
  products: Product[];
  createdAt: string;
};

const BRAND_KEY = "karma_brand_v1";
const LOGO_EMOJIS = ["👟","🧢","💎","🔥","⚡","🌟","🎯","🏆","💰","🎮","🦋","🌙","🎨","🚀","💜","🌈"];

const DEFAULT_BRAND: BrandData = {
  name: "", emoji: "🔥", tagline: "", followers: 0, revenue: 0,
  products: [], createdAt: "",
};

function loadBrand(): BrandData {
  try {
    const v = localStorage.getItem(BRAND_KEY);
    return v ? JSON.parse(v) : DEFAULT_BRAND;
  } catch { return DEFAULT_BRAND; }
}
function saveBrand(b: BrandData) {
  localStorage.setItem(BRAND_KEY, JSON.stringify(b));
}

type Tab = "HOME" | "PRODUCTS" | "STATS";

export default function BrandPage() {
  const { addKarma, addXP, showToast, user, pet } = useApp();
  const [brand, setBrand] = useState<BrandData>(DEFAULT_BRAND);
  const [tab, setTab] = useState<Tab>("HOME");
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftTagline, setDraftTagline] = useState("");
  const [draftEmoji, setDraftEmoji] = useState("🔥");
  const [addingProduct, setAddingProduct] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodEmoji, setProdEmoji] = useState("👟");
  const [prodPrice, setProdPrice] = useState("100");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBrand(loadBrand());
  }, []);

  if (!mounted) return null;

  const hasBrand = !!brand.name;

  function createBrand() {
    if (!draftName.trim()) return;
    const nb: BrandData = {
      name: draftName.trim(),
      emoji: draftEmoji,
      tagline: draftTagline.trim(),
      followers: 12,
      revenue: 0,
      products: [],
      createdAt: new Date().toISOString(),
    };
    saveBrand(nb);
    setBrand(nb);
    setCreating(false);
    addXP(100);
    addKarma(50, "Brand launch");
    showToast(`${nb.emoji} ${nb.name} is LIVE!`, 50, "#c8ff00", "🚀");
  }

  function addProduct() {
    if (!prodName.trim()) return;
    const prod: Product = {
      id: `prod_${Date.now()}`,
      name: prodName.trim(),
      emoji: prodEmoji,
      price: Math.max(1, parseInt(prodPrice) || 50),
      sold: 0,
    };
    const nb = { ...brand, products: [...brand.products, prod] };
    saveBrand(nb);
    setBrand(nb);
    setAddingProduct(false);
    setProdName("");
    setProdPrice("50");
    addXP(30);
    showToast(`${prod.emoji} ${prod.name} listed!`, undefined, "#ff2d8d", "✅");
  }

  function sellProduct(prodId: string) {
    const prod = brand.products.find(p => p.id === prodId);
    if (!prod) return;
    const nb = {
      ...brand,
      products: brand.products.map(p => p.id === prodId ? { ...p, sold: p.sold + 1 } : p),
      revenue: brand.revenue + prod.price,
      followers: brand.followers + Math.floor(Math.random() * 3) + 1,
    };
    saveBrand(nb);
    setBrand(nb);
    addKarma(prod.price, `${brand.name} sale`);
    addXP(20);
    showToast(`Sale! +${prod.price} karma`, prod.price, "#c8ff00", prod.emoji);
  }

  function boostBrand() {
    const nb = {
      ...brand,
      followers: brand.followers + Math.floor(Math.random() * 15) + 5,
    };
    saveBrand(nb);
    setBrand(nb);
    addKarma(25, "Brand boost");
    showToast("Brand boosted! +followers", 25, "#a855f7", "⚡");
  }

  if (!hasBrand && !creating) {
    return (
      <div style={{ minHeight: "100dvh", background: "#000", padding: "60px 20px 100px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center", maxWidth: 360 }}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ fontSize: "5rem", marginBottom: 24 }}
          >
            🚀
          </motion.div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
            Launch Your<br /><span style={{ color: "#c8ff00" }}>Brand</span>
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: 36, lineHeight: 1.6 }}>
            Create your own brand, drop products, earn followers, and stack karma. This is your creator economy.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
            {[
              { icon: "🏪", text: "List unlimited products" },
              { icon: "💰", text: "Earn karma from every sale" },
              { icon: "📈", text: "Grow your follower count" },
              { icon: "🎯", text: "Complete brand quests" },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#0d0d0d", borderRadius: 10, border: "1px solid #1a1a1a" }}>
                <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                <span style={{ fontSize: "0.85rem", color: "#bbb" }}>{item.text}</span>
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreating(true)}
            style={{
              width: "100%", padding: "16px 0",
              background: "#c8ff00", color: "#000",
              fontWeight: 900, fontSize: "1rem",
              border: "none", borderRadius: 14, cursor: "pointer",
            }}
          >
            🚀 CREATE MY BRAND
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (creating) {
    return (
      <div style={{ minHeight: "100dvh", background: "#000", padding: "60px 20px 100px" }}>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: "#c8ff00", marginBottom: 12 }}>
            BRAND CREATION
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", marginBottom: 32 }}>
            Build Your<br /><span style={{ color: "#c8ff00" }}>Empire</span>
          </h1>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 8, letterSpacing: "0.1em" }}>CHOOSE LOGO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, marginBottom: 12 }}>
              {LOGO_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setDraftEmoji(em)}
                  style={{
                    fontSize: "1.4rem", padding: "8px 0",
                    background: draftEmoji === em ? "#c8ff0022" : "#111",
                    border: `2px solid ${draftEmoji === em ? "#c8ff00" : "#222"}`,
                    borderRadius: 10, cursor: "pointer",
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "3rem", textAlign: "center", padding: "16px 0" }}>{draftEmoji}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 8, letterSpacing: "0.1em" }}>BRAND NAME</div>
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value.slice(0, 24))}
              placeholder="e.g. Feffes Drip Co."
              style={{
                width: "100%", padding: "14px 16px",
                background: "#111", border: "2px solid #c8ff00",
                borderRadius: 12, color: "#fff",
                fontSize: "1rem", fontWeight: 700,
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 8, letterSpacing: "0.1em" }}>TAGLINE</div>
            <input
              value={draftTagline}
              onChange={e => setDraftTagline(e.target.value.slice(0, 48))}
              placeholder="e.g. Real ones only."
              style={{
                width: "100%", padding: "14px 16px",
                background: "#111", border: "2px solid #333",
                borderRadius: 12, color: "#fff",
                fontSize: "0.9rem",
                outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setCreating(false)}
              style={{
                flex: 1, padding: "14px 0",
                background: "transparent", border: "2px solid #333",
                borderRadius: 12, color: "#888", fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              CANCEL
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={createBrand}
              disabled={!draftName.trim()}
              style={{
                flex: 2, padding: "14px 0",
                background: draftName.trim() ? "#c8ff00" : "#222",
                color: draftName.trim() ? "#000" : "#555",
                fontWeight: 900, fontSize: "1rem",
                border: "none", borderRadius: 12,
                cursor: draftName.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              🚀 LAUNCH
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Main brand dashboard
  const TABS: Tab[] = ["HOME", "PRODUCTS", "STATS"];
  return (
    <div style={{ minHeight: "100dvh", background: "#000", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #0a0a0a 0%, #000 100%)",
        padding: "20px 20px 0",
        borderBottom: "1px solid #111",
      }}>
        {/* Brand card */}
        <div style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #111 100%)",
          border: "2px solid #1a1a1a",
          borderRadius: 20, padding: "20px",
          marginBottom: 16,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -20, right: -20,
            fontSize: "6rem", opacity: 0.07, transform: "rotate(15deg)",
          }}>
            {brand.emoji}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "#c8ff0022", border: "2px solid #c8ff00",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem",
            }}>
              {brand.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>{brand.name}</div>
              {brand.tagline && (
                <div style={{ fontSize: "0.8rem", color: "#888", marginTop: 2 }}>{brand.tagline}</div>
              )}
              <div style={{ fontSize: "0.7rem", color: "#c8ff00", marginTop: 4, letterSpacing: "0.1em" }}>
                BY {pet.name.toUpperCase()} × {user.displayName.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { label: "FOLLOWERS", value: brand.followers.toLocaleString(), color: "#ff2d8d" },
              { label: "REVENUE", value: `${brand.revenue}⚡`, color: "#c8ff00" },
              { label: "PRODUCTS", value: brand.products.length, color: "#a855f7" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#0a0a0a", borderRadius: 12, padding: "12px 10px", textAlign: "center",
                border: "1px solid #1a1a1a",
              }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: "0.6rem", color: "#555", letterSpacing: "0.1em", marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={boostBrand}
              style={{
                flex: 1, padding: "10px 0",
                background: "#a855f722", border: "1.5px solid #a855f7",
                borderRadius: 10, color: "#a855f7",
                fontWeight: 700, fontSize: "0.8rem",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              ⚡ BOOST
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setTab("PRODUCTS"); setAddingProduct(true); }}
              style={{
                flex: 2, padding: "10px 0",
                background: "#c8ff0022", border: "1.5px solid #c8ff00",
                borderRadius: 10, color: "#c8ff00",
                fontWeight: 700, fontSize: "0.8rem",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              + ADD PRODUCT
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "none" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "12px 0",
                background: "transparent",
                border: "none",
                borderBottom: `3px solid ${tab === t ? "#c8ff00" : "transparent"}`,
                color: tab === t ? "#c8ff00" : "#555",
                fontWeight: 700, fontSize: "0.75rem",
                cursor: "pointer", letterSpacing: "0.1em",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "20px" }}>
        <AnimatePresence mode="wait">
          {tab === "HOME" && <HomeTab key="home" brand={brand} pet={pet} />}
          {tab === "PRODUCTS" && (
            <ProductsTab
              key="products"
              brand={brand}
              onSell={sellProduct}
              onAdd={() => setAddingProduct(true)}
              adding={addingProduct}
              prodName={prodName}
              onProdName={setProdName}
              prodEmoji={prodEmoji}
              onProdEmoji={setProdEmoji}
              prodPrice={prodPrice}
              onProdPrice={setProdPrice}
              onConfirmAdd={addProduct}
              onCancelAdd={() => setAddingProduct(false)}
            />
          )}
          {tab === "STATS" && <StatsTab key="stats" brand={brand} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HomeTab({ brand, pet }: { brand: BrandData; pet: { name: string } }) {
  const recentSales = brand.products.filter(p => p.sold > 0).slice(0, 3);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div style={{ fontSize: "0.7rem", color: "#555", letterSpacing: "0.15em", marginBottom: 16 }}>ACTIVITY</div>

      {brand.products.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          background: "#0a0a0a", borderRadius: 16,
          border: "1px dashed #222",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🛍️</div>
          <div style={{ color: "#555", fontSize: "0.9rem" }}>
            No products yet. Add your first drop!
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentSales.length > 0 && recentSales.map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#0a0a0a", borderRadius: 12, padding: "12px 14px",
              border: "1px solid #1a1a1a",
            }}>
              <span style={{ fontSize: "1.5rem" }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{p.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#888" }}>{p.sold} sold · {p.price * p.sold}⚡ earned</div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#c8ff00", fontWeight: 700 }}>🔥</div>
            </div>
          ))}

          {recentSales.length === 0 && (
            <div style={{
              textAlign: "center", padding: "32px 20px",
              background: "#0a0a0a", borderRadius: 16,
              border: "1px solid #1a1a1a", color: "#555", fontSize: "0.85rem",
            }}>
              Start selling to see activity here!
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: "0.7rem", color: "#555", letterSpacing: "0.15em", marginBottom: 12 }}>BRAND QUESTS</div>
        {[
          { icon: "🏆", text: `Get ${brand.followers >= 50 ? "✓" : "50"} followers`, done: brand.followers >= 50 },
          { icon: "💰", text: `Earn ${brand.revenue >= 500 ? "✓" : "500"} karma revenue`, done: brand.revenue >= 500 },
          { icon: "🛍️", text: `List ${brand.products.length >= 3 ? "✓" : "3"} products`, done: brand.products.length >= 3 },
        ].map(q => (
          <div key={q.text} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#0a0a0a", borderRadius: 12, padding: "12px 14px",
            border: `1px solid ${q.done ? "#c8ff0033" : "#1a1a1a"}`,
            marginBottom: 8, opacity: q.done ? 0.6 : 1,
          }}>
            <span style={{ fontSize: "1.2rem" }}>{q.icon}</span>
            <span style={{ fontSize: "0.85rem", color: q.done ? "#c8ff00" : "#bbb", flex: 1 }}>{q.text}</span>
            {q.done && <span style={{ color: "#c8ff00", fontWeight: 700 }}>✓</span>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProductsTab({ brand, onSell, onAdd, adding, prodName, onProdName, prodEmoji, onProdEmoji, prodPrice, onProdPrice, onConfirmAdd, onCancelAdd }: {
  brand: BrandData; onSell: (id: string) => void; onAdd: () => void;
  adding: boolean; prodName: string; onProdName: (s: string) => void;
  prodEmoji: string; onProdEmoji: (s: string) => void;
  prodPrice: string; onProdPrice: (s: string) => void;
  onConfirmAdd: () => void; onCancelAdd: () => void;
}) {
  const PROD_EMOJIS = ["👟","🧢","💎","👗","⌚","🎒","📱","🎧","🌹","🍕","🎮","📸"];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {adding && (
        <div style={{
          background: "#0d0d0d", border: "2px solid #c8ff00",
          borderRadius: 16, padding: "20px", marginBottom: 20,
        }}>
          <div style={{ fontSize: "0.75rem", color: "#c8ff00", letterSpacing: "0.1em", marginBottom: 14 }}>NEW PRODUCT DROP</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 14 }}>
            {PROD_EMOJIS.map(em => (
              <button key={em} onClick={() => onProdEmoji(em)} style={{
                fontSize: "1.3rem", padding: "6px 0",
                background: prodEmoji === em ? "#c8ff0022" : "#111",
                border: `2px solid ${prodEmoji === em ? "#c8ff00" : "#222"}`,
                borderRadius: 8, cursor: "pointer",
              }}>{em}</button>
            ))}
          </div>
          <input
            value={prodName}
            onChange={e => onProdName(e.target.value.slice(0, 32))}
            placeholder="Product name..."
            style={{
              width: "100%", padding: "12px 14px", marginBottom: 10,
              background: "#111", border: "1.5px solid #333",
              borderRadius: 10, color: "#fff", fontSize: "0.9rem",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.8rem", color: "#888" }}>Price (karma):</span>
            <input
              type="number"
              value={prodPrice}
              onChange={e => onProdPrice(e.target.value)}
              min="1" max="9999"
              style={{
                flex: 1, padding: "10px 12px",
                background: "#111", border: "1.5px solid #333",
                borderRadius: 10, color: "#c8ff00", fontSize: "1rem", fontWeight: 700,
                outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancelAdd} style={{ flex: 1, padding: "12px 0", background: "transparent", border: "1.5px solid #333", borderRadius: 10, color: "#888", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              CANCEL
            </button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onConfirmAdd} disabled={!prodName.trim()} style={{
              flex: 2, padding: "12px 0",
              background: prodName.trim() ? "#c8ff00" : "#222",
              color: prodName.trim() ? "#000" : "#555",
              fontWeight: 900, border: "none", borderRadius: 10,
              cursor: prodName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
            }}>
              {prodEmoji} DROP IT
            </motion.button>
          </div>
        </div>
      )}

      {brand.products.length === 0 && !adding ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🛍️</div>
          <div style={{ color: "#555", marginBottom: 20, fontSize: "0.9rem" }}>No products yet. Drop your first one.</div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onAdd} style={{
            padding: "14px 32px", background: "#c8ff00", color: "#000",
            fontWeight: 900, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
            + DROP PRODUCT
          </motion.button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {brand.products.map(p => (
            <motion.div key={p.id} layout style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "#0a0a0a", borderRadius: 14, padding: "14px 16px",
              border: "1px solid #1a1a1a",
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 12,
                background: "#111", border: "1.5px solid #222",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
              }}>
                {p.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>{p.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2 }}>{p.sold} sold · {p.price}⚡ each</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onSell(p.id)}
                style={{
                  padding: "8px 14px",
                  background: "#c8ff0022", border: "1.5px solid #c8ff00",
                  borderRadius: 8, color: "#c8ff00",
                  fontWeight: 700, fontSize: "0.75rem",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                SELL
              </motion.button>
            </motion.div>
          ))}
          {!adding && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAdd} style={{
              padding: "14px 0", background: "#0a0a0a",
              border: "1.5px dashed #333", borderRadius: 14,
              color: "#555", fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}>
              + ADD ANOTHER DROP
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function StatsTab({ brand }: { brand: BrandData }) {
  const totalSold = brand.products.reduce((acc, p) => acc + p.sold, 0);
  const topProduct = [...brand.products].sort((a, b) => b.sold - a.sold)[0];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "TOTAL SALES", value: totalSold, icon: "🛒", color: "#c8ff00" },
          { label: "TOTAL REVENUE", value: `${brand.revenue}⚡`, icon: "💰", color: "#ffde00" },
          { label: "FOLLOWERS", value: brand.followers, icon: "👥", color: "#ff2d8d" },
          { label: "PRODUCTS", value: brand.products.length, icon: "🛍️", color: "#a855f7" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#0a0a0a", borderRadius: 14, padding: "18px 14px",
            border: "1px solid #1a1a1a", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.6rem", color: "#555", letterSpacing: "0.1em", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {topProduct && (
        <div style={{
          background: "#0a0a0a", borderRadius: 14, padding: "16px",
          border: "1px solid #c8ff0033",
        }}>
          <div style={{ fontSize: "0.7rem", color: "#c8ff00", letterSpacing: "0.15em", marginBottom: 10 }}>🏆 BEST SELLER</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "2rem" }}>{topProduct.emoji}</span>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>{topProduct.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>{topProduct.sold} units · {topProduct.price * topProduct.sold}⚡ total</div>
            </div>
          </div>
        </div>
      )}

      {brand.createdAt && (
        <div style={{ textAlign: "center", marginTop: 24, color: "#333", fontSize: "0.75rem" }}>
          Brand launched {new Date(brand.createdAt).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
}
