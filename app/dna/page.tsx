"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, Zap, FlaskConical, BookOpen, ShoppingBag, Clock, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { FRIENDS } from "@/lib/mock-data";
import type { Friend } from "@/types/game";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpliceResult {
  id: string;
  petAEmoji: string;
  petAName: string;
  petBEmoji: string;
  petBName: string;
  hybridEmoji: string;
  hybridName: string;
  isMutation: boolean;
  karmaEarned: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DNA_SPLICES_KEY = "karma_dna_splices_v1";
const DNA_LAST_KEY    = "karma_dna_last_v1";
const COOLDOWN_MS     = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENERGY      = 5;
const ENERGY_REFILL_MS = COOLDOWN_MS / MAX_ENERGY;

const HYBRID_NAMES = [
  "Nexus", "Vortex", "Prisma", "Aether", "Zephyr", "Nova", "Cipher", "Flux",
  "Spectra", "Xenon", "Quark", "Prism", "Echo", "Nyx", "Solus", "Dusk",
  "Rift", "Glyph", "Ember", "Pulse",
];

const MUTATION_NAMES = [
  "Glitch", "Corrupt", "Virus", "Chaos", "Void", "Wraith", "Blight", "Hex",
  "Malform", "Toxin",
];

const RARITY_COLOR: Record<SpliceResult["rarity"], string> = {
  Common:    "#aaaaaa",
  Rare:      "#4488ff",
  Epic:      "#9933ff",
  Legendary: "#ffcc00",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadSplices(): SpliceResult[] {
  try {
    const v = localStorage.getItem(DNA_SPLICES_KEY);
    return v ? (JSON.parse(v) as SpliceResult[]) : [];
  } catch { return []; }
}

function saveSplices(splices: SpliceResult[]) {
  localStorage.setItem(DNA_SPLICES_KEY, JSON.stringify(splices));
}

function getRarity(karma: number): SpliceResult["rarity"] {
  if (karma >= 200) return "Legendary";
  if (karma >= 150) return "Epic";
  if (karma >= 100) return "Rare";
  return "Common";
}

function getEnergy(lastSplice: number): number {
  const elapsed = Date.now() - lastSplice;
  return Math.min(MAX_ENERGY, Math.floor(elapsed / ENERGY_REFILL_MS));
}

function formatCooldown(lastSplice: number): string {
  const nextAt = lastSplice + COOLDOWN_MS;
  const remaining = Math.max(0, nextAt - Date.now());
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EnergyGauge({ energy }: { energy: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", letterSpacing: "0.12em", fontFamily: "monospace" }}>
        SPLICE ENERGY: {energy}/{MAX_ENERGY}
      </span>
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: MAX_ENERGY }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8 }}
            animate={{ scale: i < energy ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 1.4, repeat: i < energy ? Infinity : 0, delay: i * 0.15 }}
            style={{
              width: 28, height: 10,
              borderRadius: 4,
              background: i < energy
                ? "linear-gradient(90deg, #8b5cf6, #ec4899)"
                : "#222",
              border: `1.5px solid ${i < energy ? "#8b5cf6" : "#333"}`,
              boxShadow: i < energy ? "0 0 8px #8b5cf644" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PetCard({
  emoji,
  name,
  label,
  dim,
}: {
  emoji: string;
  name: string;
  label: string;
  dim?: boolean;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      opacity: dim ? 0.4 : 1, transition: "opacity 0.3s",
    }}>
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 72, height: 72,
          background: "linear-gradient(135deg, #1a0a2e, #0d001a)",
          border: "2px solid #8b5cf644",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.2rem",
          boxShadow: "0 0 20px #8b5cf622, 0 0 40px #8b5cf611",
        }}
      >
        {emoji}
      </motion.div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#ddd" }}>{name}</span>
      <span style={{ fontSize: 9, fontWeight: 600, color: "#666", letterSpacing: "0.1em", fontFamily: "monospace" }}>{label}</span>
    </div>
  );
}

function SpliceAnimation({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const sparks = Array.from({ length: 12 });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 24,
    }}>
      {/* Sparks */}
      {sparks.map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: 4, height: 4,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#8b5cf6" : "#ec4899",
          }}
          animate={{
            x: Math.cos((i / sparks.length) * Math.PI * 2) * (80 + (i % 3) * 30),
            y: Math.sin((i / sparks.length) * Math.PI * 2) * (80 + (i % 3) * 30),
            opacity: [1, 0],
            scale: [1, 0],
          }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1, ease: "easeOut" }}
        />
      ))}

      {/* Rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{
          width: 120, height: 120,
          border: "3px dashed #8b5cf6",
          borderRadius: "50%",
          position: "absolute",
          boxShadow: "0 0 30px #8b5cf6, 0 0 60px #8b5cf644",
        }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
        style={{
          width: 80, height: 80,
          border: "2px dashed #ec4899",
          borderRadius: "50%",
          position: "absolute",
          boxShadow: "0 0 20px #ec4899",
        }}
      />

      {/* DNA icon pulsing */}
      <motion.div
        animate={{ scale: [0.9, 1.3, 0.9], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        style={{ fontSize: "3rem", zIndex: 1 }}
      >
        🧬
      </motion.div>

      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#8b5cf6", letterSpacing: "0.15em", zIndex: 1 }}>
        SPLICING DNA...
      </div>

      {/* Progress bar */}
      <div style={{ width: 200, height: 4, background: "#222", borderRadius: 4, overflow: "hidden", zIndex: 1 }}>
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "linear" }}
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
            boxShadow: "0 0 8px #8b5cf6",
          }}
        />
      </div>
    </div>
  );
}

function ResultModal({
  result,
  onClose,
}: {
  result: SpliceResult;
  onClose: () => void;
}) {
  const rarityColor = RARITY_COLOR[result.rarity];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.3, y: 60 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg, #0d0015, #1a0a2e)",
          border: `2px solid ${rarityColor}`,
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 340,
          textAlign: "center",
          boxShadow: `0 0 40px ${rarityColor}44, 0 0 80px ${rarityColor}22`,
        }}
      >
        {result.isMutation && (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{
              background: "#ff333322",
              border: "1px solid #ff3333",
              borderRadius: 8, padding: "4px 12px",
              fontSize: 11, fontWeight: 700, color: "#ff5555",
              letterSpacing: "0.12em", marginBottom: 12,
              display: "inline-block",
            }}
          >
            ⚠ MUTATION DETECTED
          </motion.div>
        )}

        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: result.isMutation ? [0, -5, 5, 0] : 0 }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: "4rem", marginBottom: 8 }}
        >
          {result.hybridEmoji}
        </motion.div>

        <div style={{
          fontSize: 22, fontWeight: 900, color: "#fff",
          fontFamily: "monospace", letterSpacing: "-0.02em", marginBottom: 4,
        }}>
          {result.hybridName}
        </div>

        <div style={{
          display: "inline-block",
          background: `${rarityColor}22`,
          border: `1px solid ${rarityColor}`,
          borderRadius: 8, padding: "3px 12px",
          fontSize: 11, fontWeight: 700, color: rarityColor,
          letterSpacing: "0.1em", marginBottom: 16,
        }}>
          {result.rarity.toUpperCase()}
        </div>

        <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
          {result.petAEmoji} {result.petAName} × {result.petBEmoji} {result.petBName}
        </div>

        <div style={{
          background: "#0a0a0a",
          border: "1px solid #8b5cf644",
          borderRadius: 12, padding: "10px 16px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 20,
        }}>
          <Zap size={16} color="#8b5cf6" fill="#8b5cf6" />
          <span style={{ fontSize: 18, fontWeight: 700, color: "#8b5cf6" }}>
            +{result.karmaEarned} KARMA
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
            border: "none", borderRadius: 14,
            padding: "14px",
            fontSize: 14, fontWeight: 700, color: "#fff",
            cursor: "pointer", letterSpacing: "0.06em",
          }}
        >
          AWESOME! 🧬
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Tab: LAB ─────────────────────────────────────────────────────────────────
function LabTab() {
  const { pet, addKarma, showToast } = useApp();
  const [selectedFriend, setSelectedFriend] = useState<Friend>(FRIENDS[0]);
  const [isSplicing, setIsSplicing] = useState(false);
  const [result, setResult] = useState<SpliceResult | null>(null);
  const [lastSplice, setLastSplice] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(DNA_LAST_KEY) ?? "0"); }
    catch { return 0; }
  });

  const energy = getEnergy(lastSplice);
  const canSplice = energy > 0;

  const doSplice = useCallback(() => {
    if (!canSplice) {
      showToast("No splice energy! Come back later.", undefined, "#ff3333", "⏳");
      return;
    }

    const now = Date.now();
    localStorage.setItem(DNA_LAST_KEY, String(now));
    setLastSplice(now);
    setIsSplicing(true);
  }, [canSplice, showToast]);

  const onAnimDone = useCallback(() => {
    setIsSplicing(false);

    const isMutation = Math.random() < 0.1;
    const namePool = isMutation ? MUTATION_NAMES : HYBRID_NAMES;
    const hybridName = (isMutation ? "☠️ " : "") + namePool[Math.floor(Math.random() * namePool.length)];
    const hybridEmoji = isMutation
      ? `☠️${pet.name ? "👾" : "👾"}`
      : `${pet.unlockedAbilities?.length ? "🦊" : "🐾"}${selectedFriend.petEmoji}`;
    const karmaEarned = isMutation ? 25 : 100 + Math.floor(Math.random() * 150);
    const rarity = getRarity(karmaEarned);

    const newResult: SpliceResult = {
      id: `splice_${Date.now()}`,
      petAEmoji: "🦊",
      petAName: pet.name,
      petBEmoji: selectedFriend.petEmoji,
      petBName: selectedFriend.petName,
      hybridEmoji,
      hybridName,
      isMutation,
      karmaEarned,
      rarity,
      timestamp: Date.now(),
    };

    addKarma(karmaEarned, isMutation ? "DNA Mutation!" : "DNA Splice success!");

    const existing = loadSplices();
    saveSplices([newResult, ...existing].slice(0, 50));

    setResult(newResult);
  }, [pet, selectedFriend, addKarma]);

  return (
    <div style={{ padding: "16px 16px 32px" }}>
      {/* Energy gauge */}
      <div style={{
        background: "#0d0015", border: "1px solid #8b5cf633",
        borderRadius: 16, padding: 16, marginBottom: 20,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <EnergyGauge energy={energy} />
        {!canSplice && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} color="#666" />
            <span style={{ fontSize: 11, color: "#666", fontFamily: "monospace" }}>
              Next refill in {formatCooldown(lastSplice)}
            </span>
          </div>
        )}
      </div>

      {/* Pet display */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, marginBottom: 20,
      }}>
        <PetCard emoji="🦊" name={pet.name} label="YOUR PET" />

        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: "1.8rem" }}
        >
          🧬
        </motion.div>

        <PetCard
          emoji={selectedFriend.petEmoji}
          name={selectedFriend.petName}
          label={`@${selectedFriend.username}`}
        />
      </div>

      {/* Friend selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 10 }}>
          VÄLJ VÄNNS HUSDJUR
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {FRIENDS.map((f) => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedFriend(f)}
              style={{
                flexShrink: 0,
                background: selectedFriend.id === f.id
                  ? "linear-gradient(135deg, #8b5cf633, #ec489922)"
                  : "#0d0015",
                border: `1.5px solid ${selectedFriend.id === f.id ? "#8b5cf6" : "#333"}`,
                borderRadius: 12,
                padding: "8px 12px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                cursor: "pointer",
                boxShadow: selectedFriend.id === f.id ? "0 0 12px #8b5cf644" : "none",
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>{f.petEmoji}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: selectedFriend.id === f.id ? "#8b5cf6" : "#666", fontFamily: "monospace" }}>
                {f.petName}
              </span>
              <span style={{ fontSize: 8, color: "#555" }}>@{f.username}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* SPLICE button */}
      <motion.button
        whileTap={{ scale: canSplice ? 0.95 : 1 }}
        onClick={doSplice}
        disabled={!canSplice}
        style={{
          width: "100%",
          background: canSplice
            ? "linear-gradient(135deg, #8b5cf6, #ec4899)"
            : "#1a1a1a",
          border: canSplice ? "none" : "2px solid #333",
          borderRadius: 18,
          padding: "18px",
          fontSize: 18, fontWeight: 900, color: canSplice ? "#fff" : "#444",
          cursor: canSplice ? "pointer" : "not-allowed",
          letterSpacing: "0.1em",
          boxShadow: canSplice ? "0 0 30px #8b5cf666, 0 0 60px #ec489933" : "none",
          fontFamily: "monospace",
        }}
      >
        {canSplice ? "⚡ SPLICE!" : "⏳ ENERGI LADDAS..."}
      </motion.button>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 10, color: "#555", fontFamily: "monospace" }}>
        90% chans till hybrid · 10% chans till MUTATION
      </div>

      {/* Splice animation overlay */}
      {isSplicing && <SpliceAnimation onDone={onAnimDone} />}

      {/* Result modal */}
      <AnimatePresence>
        {result && (
          <ResultModal result={result} onClose={() => setResult(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: SAMLING ─────────────────────────────────────────────────────────────
function SamlingTab() {
  const [splices, setSplices] = useState<SpliceResult[]>([]);
  const [selected, setSelected] = useState<SpliceResult | null>(null);

  useEffect(() => {
    setSplices(loadSplices());
  }, []);

  if (splices.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>🧬</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#666", marginBottom: 6 }}>Ingen samling ännu</div>
        <div style={{ fontSize: 12, color: "#444" }}>Gå till LAB och skapa din första hybrid!</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 32px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 14 }}>
        {splices.length} HYBRIDER SKAPADE
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {splices.map((s) => {
          const color = RARITY_COLOR[s.rarity];
          return (
            <motion.div
              key={s.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(s)}
              style={{
                background: "linear-gradient(135deg, #0d0015, #1a0a2e)",
                border: `1.5px solid ${color}44`,
                borderRadius: 16,
                padding: 14,
                cursor: "pointer",
                boxShadow: `0 0 12px ${color}22`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}
            >
              <div style={{ fontSize: "2rem" }}>{s.hybridEmoji}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ddd", textAlign: "center", fontFamily: "monospace" }}>
                {s.hybridName}
              </div>
              <div style={{
                background: `${color}22`, border: `1px solid ${color}`,
                borderRadius: 6, padding: "2px 8px",
                fontSize: 9, fontWeight: 700, color,
                letterSpacing: "0.08em",
              }}>
                {s.rarity.toUpperCase()}
              </div>
              {s.isMutation && (
                <div style={{ fontSize: 9, color: "#ff5555", fontFamily: "monospace" }}>⚠ MUTATION</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <ResultModal result={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: MARKNAD ─────────────────────────────────────────────────────────────
function MarknadTab() {
  const PLACEHOLDER_LISTINGS = [
    { emoji: "🦊🐲", name: "FoxDragon Prime", rarity: "Legendary" },
    { emoji: "🦋🌙", name: "MoonWing Specter", rarity: "Epic" },
    { emoji: "☠️👾", name: "Glitch Spawn", rarity: "Rare" },
  ];

  return (
    <div style={{ padding: "16px 16px 32px" }}>
      <div style={{
        background: "linear-gradient(135deg, #1a0a2e, #0d0015)",
        border: "1px solid #8b5cf633",
        borderRadius: 18, padding: 20,
        textAlign: "center", marginBottom: 24,
      }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🧬</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#8b5cf6", fontFamily: "monospace", marginBottom: 4 }}>
          DNA-MARKNADEN
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>kommer snart</div>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 14 }}>
        KOMMANDE LISTOR
      </div>

      {PLACEHOLDER_LISTINGS.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{
            background: "linear-gradient(135deg, #0d0015, #1a0a2e)",
            border: "1px solid #8b5cf622",
            borderRadius: 16, padding: 16,
            marginBottom: 10,
            display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <div style={{
            width: 52, height: 52,
            background: "#0a0010",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem",
            filter: "blur(0.5px)",
          }}>
            {item.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa", fontFamily: "monospace" }}>
              {item.name}
            </div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 3 }}>{item.rarity}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              background: "#8b5cf622",
              border: "1px solid #8b5cf644",
              borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 700, color: "#8b5cf6",
              letterSpacing: "0.08em",
              filter: "blur(3px)", userSelect: "none",
            }}>
              ??? ⚡
            </div>
            <div style={{
              background: "#ec489922", border: "1px solid #ec4899",
              borderRadius: 6, padding: "2px 8px",
              fontSize: 9, fontWeight: 700, color: "#ec4899",
              letterSpacing: "0.1em", marginTop: 4,
            }}>
              SNART
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "lab",     icon: FlaskConical, label: "LAB" },
  { id: "samling", icon: BookOpen,     label: "SAMLING" },
  { id: "marknad", icon: ShoppingBag,  label: "MARKNAD" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DNAPage() {
  const [activeTab, setActiveTab] = useState<TabId>("lab");

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "#0a0a0a",
        borderBottom: "1px solid #8b5cf633",
        padding: "14px 16px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Dna size={22} color="#8b5cf6" />
          </motion.div>
          <div>
            <h1 style={{
              fontSize: "1.3rem", fontWeight: 900, letterSpacing: "0.06em",
              fontFamily: "monospace",
              background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              DNA SPLICE LAB
            </h1>
            <div style={{ fontSize: 9, color: "#666", letterSpacing: "0.14em", fontFamily: "monospace" }}>
              BIOLOGISK DJURUPPFÖDNING
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  background: "none", border: "none",
                  borderBottom: `2px solid ${active ? "#8b5cf6" : "transparent"}`,
                  padding: "8px 4px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={13} color={active ? "#8b5cf6" : "#555"} />
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: active ? "#8b5cf6" : "#555",
                  letterSpacing: "0.08em", fontFamily: "monospace",
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "lab"     && <LabTab />}
          {activeTab === "samling" && <SamlingTab />}
          {activeTab === "marknad" && <MarknadTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
