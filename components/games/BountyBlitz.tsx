"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
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

// Verification tips keyed loosely by keywords in the bounty title
const VERIFICATION_TIPS: Array<{ match: string; tip: string }> = [
  { match: "stretch", tip: "Did you set a timer? Count it as done if you did any amount!" },
  { match: "water", tip: "Filled a bottle counts! Even half is progress 💧" },
  { match: "read", tip: "Even 5 minutes of real reading counts. Did you open the book?" },
  { match: "call", tip: "Did you send a text if they didn't pick up? That counts too!" },
  { match: "smile", tip: "Even 1 genuine smile at a stranger is a win 😊" },
  { match: "grateful", tip: "Mental gratitude counts too — did anything good happen today?" },
  { match: "exercise", tip: "Any movement is valid — did you at least start?" },
  { match: "meditat", tip: "Even 1 minute of focused breathing counts!" },
  { match: "walk", tip: "Did you at least go outside? Any steps are steps!" },
  { match: "journal", tip: "A single sentence in your notes app counts as journaling." },
];

function getVerificationTip(title: string): string | null {
  const lower = title.toLowerCase();
  for (const { match, tip } of VERIFICATION_TIPS) {
    if (lower.includes(match)) return tip;
  }
  return null;
}

type Bounty = typeof ALL_BOUNTIES[number];
type Result = { accepted: number; skipped: number; xp: number; combo: number };

type Props = { onEnd: (result: Result) => void };

const DIFF_COLOR: Record<string, string> = { easy: "#4caf50", medium: "#ff9800", hard: "#f44336", legendary: "#8b5cf6" };

// Sub-component for the verification card with swipe support
function VerifyCard({
  bounty,
  index,
  total,
  onConfirm,
  onDeny,
}: {
  bounty: Bounty;
  index: number;
  total: number;
  onConfirm: () => void;
  onDeny: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-10, 10]);
  const confirmOpacity = useTransform(x, [20, 80], [0, 1]);
  const denyOpacity = useTransform(x, [-80, -20], [1, 0]);
  const tip = getVerificationTip(bounty.title);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 80) onConfirm();
    else if (info.offset.x < -80) onDeny();
    else x.set(0);
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Progress */}
      <div style={{ color: "#aaa", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>
        Verifying <span style={{ color: "#00e5ff", fontWeight: 700 }}>{index + 1}</span>/{total}
      </div>
      {/* Progress bar */}
      <div style={{ width: "100%", height: 5, background: "#111", borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((index) / total) * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: "#00e5ff", borderRadius: 999 }}
        />
      </div>

      {/* Swipe hint */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0 4px" }}>
        <div style={{ color: "#ff2d8d", fontSize: 11, fontWeight: 600 }}>← Swipe left = skip</div>
        <div style={{ color: "#c8ff00", fontSize: 11, fontWeight: 600 }}>Swipe right = done →</div>
      </div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        style={{ x, rotate, cursor: "grab", position: "relative", width: "100%", maxWidth: 320 }}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          background: "#0d1214", border: "2px solid #1a3040",
          borderRadius: 18, padding: "20px 18px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          userSelect: "none",
        }}>
          {/* Confirm overlay */}
          <motion.div style={{
            opacity: confirmOpacity, position: "absolute", top: 12, right: 12,
            background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 10,
            padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#0a0a0a",
          }}>
            DONE ✓
          </motion.div>
          {/* Deny overlay */}
          <motion.div style={{
            opacity: denyOpacity, position: "absolute", top: 12, left: 12,
            background: "#ff2d8d", border: "2px solid #0a0a0a", borderRadius: 10,
            padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#fff",
          }}>
            SKIP ✗
          </motion.div>

          <div style={{ fontSize: "2.4rem", marginBottom: 8, textAlign: "center" }}>{bounty.categoryEmoji}</div>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 10, textAlign: "center" }}>
            {bounty.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: tip ? 12 : 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: DIFF_COLOR[bounty.difficulty ?? "easy"],
              background: (DIFF_COLOR[bounty.difficulty ?? "easy"]) + "22",
              border: `1.5px solid ${DIFF_COLOR[bounty.difficulty ?? "easy"]}`,
              borderRadius: 6, padding: "2px 8px",
            }}>
              {bounty.difficulty?.toUpperCase() ?? "EASY"}
            </span>
            <span style={{ background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 8, padding: "2px 10px", fontSize: 13, fontWeight: 700, color: "#0a0a0a" }}>
              +{bounty.xpReward} XP
            </span>
          </div>

          {/* Verification tip */}
          {tip && (
            <div style={{
              background: "#0a1a2a", border: "1px solid #1a3a4a", borderRadius: 10,
              padding: "8px 12px", marginTop: 8,
              color: "#7dd3fc", fontSize: 12, lineHeight: 1.5, fontStyle: "italic",
            }}>
              💡 {tip}
            </div>
          )}
        </div>
      </motion.div>

      {/* Tap buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
        <button
          onClick={onDeny}
          style={{
            padding: "13px", background: "#1a0010", border: "3px solid #ff2d8d",
            borderRadius: 14, fontSize: 16, fontWeight: 700, color: "#ff2d8d", cursor: "pointer",
          }}
        >
          ❌ Didn't do it
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "13px", background: "#0a1a00", border: "3px solid #c8ff00",
            borderRadius: 14, fontSize: 16, fontWeight: 700, color: "#c8ff00", cursor: "pointer",
          }}
        >
          ✅ I DID THIS
        </button>
      </div>
    </div>
  );
}

export default function BountyBlitz({ onEnd }: Props) {
  const [phase, setPhase] = useState<"idle" | "on" | "verifying" | "over">("idle");
  const [timeLeft, setTimeLeft] = useState(BLITZ_TIME);
  const [queue, setQueue] = useState<typeof ALL_BOUNTIES>([]);
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<"accept" | "skip" | null>(null);

  // Verification state
  const [acceptedBounties, setAcceptedBounties] = useState<Bounty[]>([]);
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [verifiedBounties, setVerifiedBounties] = useState<Bounty[]>([]);
  const [verifyFeedback, setVerifyFeedback] = useState<"confirm" | "deny" | null>(null);

  // Final results after verification
  const [finalXP, setFinalXP] = useState(0);
  const [finalKarma, setFinalKarma] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-12, 12]);
  const opacity = useTransform(x, [-200, -80, 0, 80, 200], [0, 1, 1, 1, 0]);
  const acceptOpacity = useTransform(x, [20, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, -20], [1, 0]);

  // Accumulate accepted bounties list during blitz
  const acceptedListRef = useRef<Bounty[]>([]);
  const acceptedRef = useRef(0);
  const skippedRef = useRef(0);
  const totalXPRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);

  const start = useCallback(() => {
    const shuffled = [...ALL_BOUNTIES].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrent(0);
    setAccepted(0); setSkipped(0); setTotalXP(0); setCombo(0); setMaxCombo(0);
    setTimeLeft(BLITZ_TIME);
    setAcceptedBounties([]);
    acceptedListRef.current = [];
    acceptedRef.current = 0;
    skippedRef.current = 0;
    totalXPRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    setPhase("on");
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "on") return;
    if (timeLeft <= 0) {
      // Move to verification phase
      setPhase("verifying");
      setVerifyIndex(0);
      setVerifiedBounties([]);
      // Store snapshot of accepted bounties for verification
      setAcceptedBounties([...acceptedListRef.current]);
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  function accept() {
    if (phase !== "on") return;
    const b = queue[current];
    if (!b) return;
    const newCombo = comboRef.current + 1;
    const bonusXP = newCombo >= COMBO_THRESHOLD ? Math.floor(b.xpReward * 0.3) : 0;
    acceptedRef.current += 1;
    totalXPRef.current += b.xpReward + bonusXP;
    comboRef.current = newCombo;
    maxComboRef.current = Math.max(maxComboRef.current, newCombo);
    acceptedListRef.current = [...acceptedListRef.current, b];
    setAccepted(acceptedRef.current);
    setTotalXP(totalXPRef.current);
    setCombo(newCombo);
    setMaxCombo(maxComboRef.current);
    setFeedback("accept");
    setTimeout(() => { setFeedback(null); setCurrent(c => c + 1); x.set(0); }, 200);
  }

  function skip() {
    if (phase !== "on") return;
    skippedRef.current += 1;
    comboRef.current = 0;
    setSkipped(skippedRef.current);
    setCombo(0);
    setFeedback("skip");
    setTimeout(() => { setFeedback(null); setCurrent(c => c + 1); x.set(0); }, 200);
  }

  // Verification handlers
  function verifyConfirm() {
    const b = acceptedBounties[verifyIndex];
    setVerifyFeedback("confirm");
    setTimeout(() => {
      setVerifyFeedback(null);
      setVerifiedBounties(prev => [...prev, b]);
      advanceVerification(verifyIndex + 1, [...verifiedBounties, b]);
    }, 300);
  }

  function verifyDeny() {
    setVerifyFeedback("deny");
    setTimeout(() => {
      setVerifyFeedback(null);
      advanceVerification(verifyIndex + 1, verifiedBounties);
    }, 300);
  }

  function advanceVerification(nextIndex: number, currentVerified: Bounty[]) {
    if (nextIndex >= acceptedBounties.length) {
      // All done — compute final rewards from verified only
      const verifiedXP = currentVerified.reduce((sum, b) => sum + b.xpReward, 0);
      const verifiedKarma = currentVerified.reduce((sum, b) => sum + (b.karmaReward ?? 0), 0)
        + (maxComboRef.current >= 3 ? 50 : 0);
      setFinalXP(verifiedXP);
      setFinalKarma(verifiedKarma);
      setVerifiedBounties(currentVerified);
      const result: Result = {
        accepted: currentVerified.length,
        skipped: skippedRef.current + (acceptedBounties.length - currentVerified.length),
        xp: verifiedXP,
        combo: maxComboRef.current,
      };
      setPhase("over");
      onEnd(result);
    } else {
      setVerifyIndex(nextIndex);
    }
  }

  const bounty = queue[current];
  const timerPct = (timeLeft / BLITZ_TIME) * 100;
  const timerColor = timeLeft <= 5 ? "#ff2d8d" : timeLeft <= 10 ? "#ff6b35" : "#00e5ff";
  const currentVerifyBounty = acceptedBounties[verifyIndex];

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
        {phase === "verifying" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#00e5ff", fontSize: 14, fontWeight: 700 }}>VERIFY</div>
            <div style={{ color: "#555", fontSize: 10 }}>phase</div>
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
        {combo >= COMBO_THRESHOLD && phase === "on" && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }}
            style={{ textAlign: "center", color: "#ffde00", fontSize: 14, fontWeight: 700, background: "#1a1400", border: "2px solid #ffde00", borderRadius: 10, padding: "4px 12px" }}>
            🔥 COMBO ×{combo} — +{Math.floor(30)}% XP BONUS!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BLITZ PHASE ─── */}
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

      {/* Buttons for blitz phase */}
      {phase === "on" && bounty && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={skip} style={{ padding: "14px", background: "#1a0010", border: "3px solid #ff2d8d", borderRadius: 14, fontSize: 18, fontWeight: 700, color: "#ff2d8d", cursor: "pointer" }}>✗ SKIP</button>
          <button onClick={accept} style={{ padding: "14px", background: "#0a1a00", border: "3px solid #c8ff00", borderRadius: 14, fontSize: 18, fontWeight: 700, color: "#c8ff00", cursor: "pointer" }}>✓ ACCEPT</button>
        </div>
      )}

      {/* XP total live */}
      {phase === "on" && <div style={{ textAlign: "center", color: "#c8ff00", fontSize: 15, fontWeight: 700 }}>⚡ {totalXP} XP so far</div>}

      {/* ─── VERIFICATION PHASE ─── */}
      <AnimatePresence mode="wait">
        {phase === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Verification header */}
            <div style={{ background: "#001a1a", border: "3px solid #00e5ff", borderRadius: 16, padding: "14px 18px", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>🔍</div>
              <div style={{ color: "#00e5ff", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>VERIFY COMPLETIONS</div>
              <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                Did you actually do these? Only confirmed ones count!
              </div>
              <div style={{ color: "#555", fontSize: 11, marginTop: 6 }}>
                You accepted {acceptedBounties.length} bounty{acceptedBounties.length !== 1 ? "ies" : "y"}
              </div>
            </div>

            {acceptedBounties.length === 0 ? (
              // No bounties accepted — skip straight to results
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", padding: 20, color: "#555" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>😅</div>
                <div>Nothing to verify!</div>
                <button
                  onClick={() => {
                    setFinalXP(0); setFinalKarma(0);
                    setPhase("over");
                    onEnd({ accepted: 0, skipped: skippedRef.current, xp: 0, combo: maxComboRef.current });
                  }}
                  style={{ marginTop: 14, padding: "10px 28px", background: "#00e5ff", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0a0a0a", cursor: "pointer" }}
                >
                  See Results
                </button>
              </motion.div>
            ) : currentVerifyBounty ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={verifyIndex}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Verification feedback flash */}
                  <AnimatePresence>
                    {verifyFeedback && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ position: "absolute", fontSize: "3rem", pointerEvents: "none", zIndex: 10, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
                      >
                        {verifyFeedback === "confirm" ? "✅" : "❌"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <VerifyCard
                    bounty={currentVerifyBounty}
                    index={verifyIndex}
                    total={acceptedBounties.length}
                    onConfirm={verifyConfirm}
                    onDeny={verifyDeny}
                  />
                </motion.div>
              </AnimatePresence>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── IDLE ─── */}
      {phase === "idle" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
            Accept as many bounties as you can in {BLITZ_TIME} seconds! Swipe right ✓ or tap ACCEPT. Build combos for bonus XP. Then verify what you actually did!
          </div>
          <button onClick={start} style={{ padding: "14px 44px", background: "#00e5ff", border: "3px solid #0a0a0a", borderRadius: 14, fontSize: 16, fontWeight: 700, color: "#0a0a0a", cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a" }}>START BLITZ!</button>
        </div>
      )}

      {/* ─── RESULTS ─── */}
      {phase === "over" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#001a1a", border: "3px solid #00e5ff", borderRadius: 18, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 6 }}>💥</div>
          <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>BLITZ COMPLETE!</div>

          {/* Verified vs accepted badge */}
          <div style={{
            background: "#0a1a1a", border: "2px solid #1a3a3a", borderRadius: 12,
            padding: "10px 16px", margin: "12px 0 8px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <span style={{ color: "#c8ff00", fontSize: 18, fontWeight: 700 }}>{verifiedBounties.length}</span>
            <span style={{ color: "#555", fontSize: 12 }}>verified</span>
            <span style={{ color: "#333", fontSize: 18 }}>/</span>
            <span style={{ color: "#aaa", fontSize: 18, fontWeight: 700 }}>{accepted}</span>
            <span style={{ color: "#555", fontSize: 12 }}>accepted</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "10px 0" }}>
            {[
              ["✅ Verified", verifiedBounties.length],
              ["✗ Not Done", accepted - verifiedBounties.length + skipped],
              ["⚡ XP Earned", finalXP],
              ["🔥 Max Combo", `×${maxComboRef.current}`],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ background: "#0a1a1a", border: "2px solid #1a3a3a", borderRadius: 10, padding: "10px 6px" }}>
                <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>{val}</div>
                <div style={{ color: "#555", fontSize: 11 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ color: "#c8ff00", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            +{finalKarma} karma earned!
          </div>
          <button onClick={start} style={{ padding: "10px 32px", background: "#00e5ff", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#0a0a0a", cursor: "pointer", boxShadow: "3px 3px 0 #0a0a0a" }}>BLITZ AGAIN</button>
        </motion.div>
      )}
    </div>
  );
}
