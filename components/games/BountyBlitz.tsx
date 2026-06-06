"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { BOUNTIES } from "@/lib/mock-data";

const BLITZ_TIME = 30;
const COMBO_THRESHOLD = 3;

const EXTRA_BOUNTIES = [
  { id: "bx1", title: "Smile at 5 strangers", xpReward: 30, karmaReward: 15, difficulty: "easy", categoryEmoji: "😊" },
  { id: "bx2", title: "Drink 2L of water today", xpReward: 40, karmaReward: 20, difficulty: "easy", categoryEmoji: "💧" },
  { id: "bx3", title: "Read for 20 minutes", xpReward: 60, karmaReward: 30, difficulty: "easy", categoryEmoji: "📖" },
  { id: "bx4", title: "Call someone you miss", xpReward: 90, karmaReward: 45, difficulty: "medium", categoryEmoji: "📞" },
  { id: "bx5", title: "Write 3 things you're grateful for", xpReward: 50, karmaReward: 25, difficulty: "easy", categoryEmoji: "✍️" },
  { id: "bx6", title: "Do 20 minutes of stretching", xpReward: 70, karmaReward: 35, difficulty: "easy", categoryEmoji: "🧘" },
];

const ALL_BOUNTIES = [...BOUNTIES, ...EXTRA_BOUNTIES];

type Result = { accepted: number; skipped: number; xp: number; combo: number };

type Props = { onEnd: (result: Result) => void };

const DIFF_COLOR: Record<string, string> = { easy: "#4caf50", medium: "#ff9800", hard: "#f44336", legendary: "#8b5cf6" };

export default function BountyBlitz({ onEnd }: Props) {
  const [phase, setPhase] = useState<"idle" | "on" | "over">("idle");
  const [timeLeft, setTimeLeft] = useState(BLITZ_TIME);
  const [queue, setQueue] = useState<typeof ALL_BOUNTIES>([]);
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<"accept" | "skip" | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-12, 12]);
  const opacity = useTransform(x, [-200, -80, 0, 80, 200], [0, 1, 1, 1, 0]);
  const acceptOpacity = useTransform(x, [20, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, -20], [1, 0]);

  const start = useCallback(() => {
    const shuffled = [...ALL_BOUNTIES].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrent(0);
    setAccepted(0); setSkipped(0); setTotalXP(0); setCombo(0); setMaxCombo(0);
    setTimeLeft(BLITZ_TIME);
    setPhase("on");
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "on") return;
    if (timeLeft <= 0) {
      const result = { accepted, skipped, xp: totalXP, combo: maxCombo };
      setPhase("over");
      onEnd(result);
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, accepted, skipped, totalXP, maxCombo, onEnd]);

  function accept() {
    if (phase !== "on") return;
    const b = queue[current];
    if (!b) return;
    const newCombo = combo + 1;
    const bonusXP = newCombo >= COMBO_THRESHOLD ? Math.floor(b.xpReward * 0.3) : 0;
    setAccepted(a => a + 1);
    setTotalXP(t => t + b.xpReward + bonusXP);
    setCombo(newCombo);
    setMaxCombo(m => Math.max(m, newCombo));
    setFeedback("accept");
    setTimeout(() => { setFeedback(null); setCurrent(c => c + 1); x.set(0); }, 200);
  }

  function skip() {
    if (phase !== "on") return;
    setSkipped(s => s + 1);
    setCombo(0);
    setFeedback("skip");
    setTimeout(() => { setFeedback(null); setCurrent(c => c + 1); x.set(0); }, 200);
  }

  const bounty = queue[current];
  const timerPct = (timeLeft / BLITZ_TIME) * 100;
  const timerColor = timeLeft <= 5 ? "#ff2d8d" : timeLeft <= 10 ? "#ff6b35" : "#00e5ff";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#00e5ff", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>BOUNTY BLITZ</div>
          <div style={{ color: "#555", fontSize: 12 }}>✓ {accepted} accepted · ✗ {skipped} skipped</div>
        </div>
        {phase === "on" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: timerColor, fontSize: 32, fontWeight: 700, fontFamily: "monospace", lineHeight: 1, textShadow: timeLeft <= 5 ? "0 0 10px #ff2d8d" : "none" }}>{timeLeft}</div>
            <div style={{ color: "#555", fontSize: 10 }}>seconds</div>
          </div>
        )}
      </div>

      {/* Timer bar */}
      {phase === "on" && (
        <div style={{ height: 6, background: "#111", borderRadius: 999, overflow: "hidden" }}>
          <motion.div animate={{ width: `${timerPct}%` }} style={{ height: "100%", background: timerColor, borderRadius: 999, transition: "background 0.3s" }} />
        </div>
      )}

      {/* Combo badge */}
      <AnimatePresence>
        {combo >= COMBO_THRESHOLD && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }}
            style={{ textAlign: "center", color: "#ffde00", fontSize: 14, fontWeight: 700, background: "#1a1400", border: "2px solid #ffde00", borderRadius: 10, padding: "4px 12px" }}>
            🔥 COMBO ×{combo} — +{Math.floor(30)}% XP BONUS!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card area */}
      {phase === "on" && bounty ? (
        <div style={{ position: "relative", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Next card peek */}
          {queue[current + 1] && (
            <div style={{ position: "absolute", top: 8, width: "90%", height: 170, background: "#0d1214", border: "2px solid #1a2a2a", borderRadius: 16, transform: "rotate(2deg)" }} />
          )}

          {/* Current card */}
          <motion.div
            drag="x" dragConstraints={{ left: -200, right: 200 }}
            style={{ x, rotate, opacity, cursor: "grab", position: "relative", zIndex: 2 }}
            onDragEnd={(_, info) => { if (info.offset.x > 80) accept(); else if (info.offset.x < -80) skip(); else x.set(0); }}
          >
            <div style={{ width: 300, background: "#0d1214", border: "2px solid #1a3040", borderRadius: 18, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              {/* Accept overlay */}
              <motion.div style={{ opacity: acceptOpacity, position: "absolute", top: 12, right: 12, background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 10, padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#0a0a0a" }}>ACCEPT ✓</motion.div>
              {/* Skip overlay */}
              <motion.div style={{ opacity: skipOpacity, position: "absolute", top: 12, left: 12, background: "#ff2d8d", border: "2px solid #0a0a0a", borderRadius: 10, padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#fff" }}>SKIP ✗</motion.div>

              <div style={{ fontSize: "2rem", marginBottom: 8 }}>{bounty.categoryEmoji}</div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 10 }}>{bounty.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: DIFF_COLOR[bounty.difficulty ?? "easy"], background: DIFF_COLOR[bounty.difficulty ?? "easy"] + "22", border: `1.5px solid ${DIFF_COLOR[bounty.difficulty ?? "easy"]}`, borderRadius: 6, padding: "2px 8px" }}>
                  {bounty.difficulty?.toUpperCase() ?? "EASY"}
                </span>
                <span style={{ background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 8, padding: "2px 10px", fontSize: 13, fontWeight: 700, color: "#0a0a0a", marginLeft: "auto" }}>
                  +{bounty.xpReward} XP
                </span>
              </div>
            </div>
          </motion.div>

          {/* Feedback flash */}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.3 }}
                style={{ position: "absolute", fontSize: "3rem", pointerEvents: "none" }}>
                {feedback === "accept" ? "✅" : "❌"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : phase === "on" ? (
        <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No more bounties! Wait for timer...</div>
      ) : null}

      {/* Buttons */}
      {phase === "on" && bounty && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={skip} style={{ padding: "14px", background: "#1a0010", border: "3px solid #ff2d8d", borderRadius: 14, fontSize: 18, fontWeight: 700, color: "#ff2d8d", cursor: "pointer" }}>✗ SKIP</button>
          <button onClick={accept} style={{ padding: "14px", background: "#0a1a00", border: "3px solid #c8ff00", borderRadius: 14, fontSize: 18, fontWeight: 700, color: "#c8ff00", cursor: "pointer" }}>✓ ACCEPT</button>
        </div>
      )}

      {/* XP total live */}
      {phase === "on" && <div style={{ textAlign: "center", color: "#c8ff00", fontSize: 15, fontWeight: 700 }}>⚡ {totalXP} XP so far</div>}

      {/* Idle start */}
      {phase === "idle" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
            Accept as many bounties as you can in {BLITZ_TIME} seconds! Swipe right ✓ or tap ACCEPT. Build combos for bonus XP.
          </div>
          <button onClick={start} style={{ padding: "14px 44px", background: "#00e5ff", border: "3px solid #0a0a0a", borderRadius: 14, fontSize: 16, fontWeight: 700, color: "#0a0a0a", cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a" }}>START BLITZ!</button>
        </div>
      )}

      {/* Results */}
      {phase === "over" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#001a1a", border: "3px solid #00e5ff", borderRadius: 18, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 6 }}>💥</div>
          <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>BLITZ COMPLETE!</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
            {[["✓ Accepted", accepted], ["✗ Skipped", skipped], ["⚡ XP Earned", totalXP], ["🔥 Max Combo", `×${maxCombo}`]].map(([label, val]) => (
              <div key={String(label)} style={{ background: "#0a1a1a", border: "2px solid #1a3a3a", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>{val}</div>
                <div style={{ color: "#555", fontSize: 11 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ color: "#c8ff00", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            +{Math.floor(accepted * 15 + (maxCombo >= 3 ? 50 : 0))} karma earned!
          </div>
          <button onClick={start} style={{ padding: "10px 32px", background: "#00e5ff", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0a0a0a", cursor: "pointer", boxShadow: "3px 3px 0 #0a0a0a" }}>BLITZ AGAIN</button>
        </motion.div>
      )}
    </div>
  );
}
