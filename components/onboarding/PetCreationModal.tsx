"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import type { PetClass } from "@/types/pet";

const PET_EMOJIS = ["🐉","🐺","🦊","🐱","🦋","🐻","🦁","🐸","🌟","🦄","🐯","🦅"];

const CLASSES: { id: PetClass; emoji: string; label: string; desc: string; color: string; stats: string }[] = [
  {
    id: "Grinder Beast",
    emoji: "🔥", label: "GRINDER BEAST",
    desc: "You go hard. Bounties, XP runs, zero days off. The streets respect the grind.",
    color: "#ff6b35",
    stats: "⚡ HIGH ACTION · 💪 IRON WILL",
  },
  {
    id: "Influencer Spirit",
    emoji: "✨", label: "INFLUENCER SPIRIT",
    desc: "Vibes, reach, and social power. Your presence is the product.",
    color: "#ff2d8d",
    stats: "💎 HIGH SOCIAL · 🌟 STAR POWER",
  },
  {
    id: "Merchant King",
    emoji: "👑", label: "MERCHANT KING",
    desc: "Every move is calculated. You trade karma like markets. Smart money energy.",
    color: "#c8ff00",
    stats: "💰 HIGH COMMERCE · 🧠 DEAL SENSE",
  },
];

export default function PetCreationModal() {
  const { petCreated, setupPet, addKarma, addXP } = useApp();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(PET_EMOJIS[0]);
  const [petName, setPetName] = useState("");
  const [selectedClass, setSelectedClass] = useState<PetClass>("Grinder Beast");
  const [done, setDone] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || petCreated) return null;

  function handleComplete() {
    if (!petName.trim()) return;
    setDone(true);
    addKarma(100, "Welcome bonus");
    addXP(200);
    // Delay context update so the celebration screen can play out first
    setTimeout(() => {
      setupPet(petName.trim(), selectedEmoji, selectedClass);
    }, 3200);
  }

  const cls = CLASSES.find(c => c.id === selectedClass)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "linear-gradient(180deg, #000000 0%, #0a0014 50%, #000000 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 20px",
        overflowY: "auto",
      }}
    >
      {/* Stars background */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 29 + 7) % 100}%`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.3 + (i % 4) * 0.15,
          }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      <AnimatePresence mode="wait">
        {done ? (
          <DoneScreen petName={petName} emoji={selectedEmoji} cls={cls} />
        ) : step === 0 ? (
          <Step1
            key="s1"
            selected={selectedEmoji}
            onSelect={setSelectedEmoji}
            onNext={() => setStep(1)}
          />
        ) : step === 1 ? (
          <Step2
            key="s2"
            emoji={selectedEmoji}
            name={petName}
            onChange={setPetName}
            onBack={() => setStep(0)}
            onNext={() => { if (petName.trim()) setStep(2); }}
          />
        ) : (
          <Step3
            key="s3"
            emoji={selectedEmoji}
            name={petName}
            selected={selectedClass}
            onSelect={setSelectedClass}
            onBack={() => setStep(1)}
            onComplete={handleComplete}
          />
        )}
      </AnimatePresence>

      {/* Step dots */}
      {!done && (
        <div style={{ position: "absolute", bottom: 36, display: "flex", gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? "#c8ff00" : "#333",
              transition: "all 0.3s",
            }} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Step1({ selected, onSelect, onNext }: {
  selected: string;
  onSelect: (e: string) => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      style={{ textAlign: "center", width: "100%", maxWidth: 400 }}
    >
      <div style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: "#c8ff00", marginBottom: 12 }}>
        STEP 1 OF 3
      </div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", marginBottom: 8, lineHeight: 1.2 }}>
        Choose Your<br />
        <span style={{ color: "#c8ff00" }}>Pet</span>
      </h1>
      <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 32 }}>
        This creature will grow with you. Choose wisely.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40 }}>
        {PET_EMOJIS.map(emoji => (
          <motion.button
            key={emoji}
            whileTap={{ scale: 0.88 }}
            onClick={() => onSelect(emoji)}
            style={{
              background: selected === emoji ? "#c8ff0022" : "#111",
              border: `2.5px solid ${selected === emoji ? "#c8ff00" : "#222"}`,
              borderRadius: 16,
              padding: "14px 0",
              fontSize: "2rem",
              cursor: "pointer",
              boxShadow: selected === emoji ? "0 0 16px #c8ff0055" : "none",
              transition: "all 0.2s",
            }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      <motion.div
        style={{
          fontSize: "4rem",
          marginBottom: 24,
          filter: "drop-shadow(0 0 20px #c8ff0055)",
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {selected}
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        style={{
          width: "100%", padding: "16px 0",
          background: "#c8ff00", color: "#000",
          fontWeight: 900, fontSize: "1rem",
          border: "none", borderRadius: 14,
          cursor: "pointer", letterSpacing: "0.1em",
        }}
      >
        CHOOSE THIS ONE →
      </motion.button>
    </motion.div>
  );
}

function Step2({ emoji, name, onChange, onBack, onNext }: {
  emoji: string; name: string;
  onChange: (n: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      style={{ textAlign: "center", width: "100%", maxWidth: 400 }}
    >
      <div style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: "#ff2d8d", marginBottom: 12 }}>
        STEP 2 OF 3
      </div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
        Name Your<br />
        <span style={{ color: "#ff2d8d" }}>Pet</span>
      </h1>
      <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 32 }}>
        Give it a name that hits different.
      </p>

      <motion.div
        style={{ fontSize: "5rem", marginBottom: 24 }}
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        {emoji}
      </motion.div>

      {name && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 16, letterSpacing: "0.05em" }}
        >
          "{name}"
        </motion.div>
      )}

      <input
        value={name}
        onChange={e => onChange(e.target.value.slice(0, 18))}
        placeholder="Enter pet name..."
        maxLength={18}
        autoFocus
        style={{
          width: "100%", padding: "16px 20px",
          background: "#111", border: "2.5px solid #ff2d8d",
          borderRadius: 14, color: "#fff",
          fontSize: "1.1rem", fontWeight: 700,
          outline: "none", boxSizing: "border-box",
          textAlign: "center", marginBottom: 8,
          fontFamily: "inherit",
        }}
      />
      <div style={{ fontSize: "0.75rem", color: "#555", marginBottom: 32, textAlign: "right" }}>
        {name.length}/18
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: "14px 0",
            background: "transparent", border: "2px solid #333",
            borderRadius: 14, color: "#888", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← BACK
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={!name.trim()}
          style={{
            flex: 2, padding: "14px 0",
            background: name.trim() ? "#ff2d8d" : "#222",
            color: name.trim() ? "#fff" : "#555",
            fontWeight: 900, fontSize: "1rem",
            border: "none", borderRadius: 14,
            cursor: name.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s", fontFamily: "inherit",
          }}
        >
          PERFECT →
        </motion.button>
      </div>
    </motion.div>
  );
}

function Step3({ emoji, name, selected, onSelect, onBack, onComplete }: {
  emoji: string; name: string;
  selected: PetClass;
  onSelect: (c: PetClass) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      style={{ textAlign: "center", width: "100%", maxWidth: 400 }}
    >
      <div style={{ fontSize: "0.7rem", letterSpacing: "0.3em", color: "#a855f7", marginBottom: 12 }}>
        STEP 3 OF 3
      </div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
        Choose Your<br />
        <span style={{ color: "#a855f7" }}>Path</span>
      </h1>
      <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 24 }}>
        Your class defines your playstyle.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {CLASSES.map(cls => (
          <motion.button
            key={cls.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(cls.id)}
            style={{
              background: selected === cls.id ? `${cls.color}18` : "#0d0d0d",
              border: `2.5px solid ${selected === cls.id ? cls.color : "#222"}`,
              borderRadius: 16, padding: "14px 18px",
              cursor: "pointer", textAlign: "left",
              boxShadow: selected === cls.id ? `0 0 20px ${cls.color}44` : "none",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.8rem" }}>{cls.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 900, color: cls.color, letterSpacing: "0.12em", marginBottom: 2 }}>
                  {cls.label}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#aaa", lineHeight: 1.3 }}>{cls.desc}</div>
                <div style={{ fontSize: "0.65rem", color: selected === cls.id ? cls.color : "#555", marginTop: 6, letterSpacing: "0.06em" }}>
                  {cls.stats}
                </div>
              </div>
              {selected === cls.id && (
                <div style={{ fontSize: "1.2rem" }}>✓</div>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: "14px 0",
            background: "transparent", border: "2px solid #333",
            borderRadius: 14, color: "#888", fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← BACK
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
          style={{
            flex: 2, padding: "14px 0",
            background: "#a855f7",
            color: "#fff", fontWeight: 900, fontSize: "1rem",
            border: "none", borderRadius: 14,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 0 24px #a855f766",
          }}
        >
          START JOURNEY ⚡
        </motion.button>
      </div>
    </motion.div>
  );
}

function DoneScreen({ petName, emoji, cls }: { petName: string; emoji: string; cls: (typeof CLASSES)[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 12 }}
      style={{ textAlign: "center", maxWidth: 400 }}
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", left: "50%", top: "40%",
            fontSize: "1.5rem", pointerEvents: "none",
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos((i / 16) * Math.PI * 2) * (120 + (i % 3) * 40),
            y: Math.sin((i / 16) * Math.PI * 2) * (100 + (i % 3) * 30),
            opacity: 0, scale: 1.8,
          }}
          transition={{ duration: 1.2, delay: 0.1 + i * 0.05 }}
        >
          {["⭐","✨","💫","🌟","⚡","🎉","🎊","💥"][i % 8]}
        </motion.div>
      ))}

      <motion.div
        style={{ fontSize: "6rem", marginBottom: 16 }}
        animate={{ scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {emoji}
      </motion.div>

      <div style={{ fontSize: "0.75rem", letterSpacing: "0.3em", color: cls.color, marginBottom: 8 }}>
        {cls.label} UNLOCKED
      </div>

      <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
        Meet <span style={{ color: cls.color }}>{petName}</span>!
      </h1>

      <p style={{ fontSize: "0.9rem", color: "#aaa", marginBottom: 32, lineHeight: 1.5 }}>
        Your journey begins now. Feed it, train it, grind with it. The world is yours.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{
          background: `${cls.color}18`,
          border: `2px solid ${cls.color}`,
          borderRadius: 14, padding: "12px 20px",
          marginBottom: 28,
        }}
      >
        <div style={{ fontSize: "0.75rem", color: cls.color, fontWeight: 700, letterSpacing: "0.1em" }}>
          🎁 STARTER BONUS
        </div>
        <div style={{ fontSize: "1rem", color: "#fff", fontWeight: 700, marginTop: 4 }}>
          +100 Karma · +200 XP · 3-Day Streak Starter
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ fontSize: "0.85rem", color: "#555" }}
      >
        Loading your world...
      </motion.div>
    </motion.div>
  );
}
