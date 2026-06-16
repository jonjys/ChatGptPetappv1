"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { getDailyQuests, msUntilMidnight } from "@/lib/quests";

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown() {
  const [ms, setMs] = useState(msUntilMidnight());
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return <span>{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

const QUEST_COLORS = ["#c8ff00", "#4488ff", "#ff44cc", "#ff6b35", "#00e5ff"];

export default function QuestsPage() {
  const { questProgress, questClaimed, claimQuest, addKarma, addXP, showToast, unlockAchievement } = useApp();
  const quests = getDailyQuests();
  const allClaimed = quests.every(q => questClaimed.includes(q.id));
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [claimAnim, setClaimAnim] = useState<string | null>(null);

  const completionPct = Math.round((questClaimed.length / quests.length) * 100);
  const totalKarmaAvailable = quests
    .filter(q => !questClaimed.includes(q.id))
    .reduce((sum, q) => sum + q.karmaReward, 0);

  function handleClaim(q: typeof quests[0]) {
    if (questClaimed.includes(q.id)) return;
    claimQuest(q.id, q.karmaReward, q.xpReward);
    addKarma(q.karmaReward, "Daily Quest");
    addXP(q.xpReward);
    unlockAchievement("quest_complete");
    setClaimAnim(q.id);
    setTimeout(() => setClaimAnim(null), 800);
    // Check if all 5 done
    const nowClaimed = [...questClaimed, q.id];
    if (quests.every(x => nowClaimed.includes(x.id))) {
      unlockAchievement("all_quests");
    }
  }

  function handleBonus() {
    setBonusClaimed(true);
    addKarma(1000, "Quest Bonus");
    addXP(250);
    showToast("ALL QUESTS COMPLETE!", 1000, "#ffcc00", "🏅");
  }

  return (
    <div style={{ background: "#080808", minHeight: "100dvh", color: "#fff" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{
          background: "#080808",
          borderBottom: "3px solid #c8ff0088",
          boxShadow: "0 2px 20px #c8ff0022",
        }}>
        <div className="flex items-center gap-3">
          <Link href="/games">
            <div style={{ width: 36, height: 36, background: "#111", border: "2px solid #c8ff00", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={18} color="#c8ff00" />
            </div>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#c8ff00", fontSize: 20, fontWeight: 900, letterSpacing: "0.04em" }}>📋 DAILY QUESTS</div>
            <div style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              Resets in <span style={{ color: "#888", fontFamily: "monospace" }}><Countdown /></span>
            </div>
          </div>
          {/* Completion badge */}
          <div style={{
            fontSize: 18, fontWeight: 900, color: "#080808",
            background: "#c8ff00",
            borderRadius: 10, padding: "4px 12px",
            boxShadow: "0 0 16px #c8ff0099, 0 0 4px #c8ff00",
            letterSpacing: "0.03em",
          }}>
            {completionPct}%
          </div>
        </div>

        {/* Karma available strip */}
        {totalKarmaAvailable > 0 && (
          <div style={{
            marginTop: 8,
            background: "#0f0f0f",
            border: "1px solid #c8ff0033",
            borderRadius: 8,
            padding: "5px 10px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: "#666", fontWeight: 600, letterSpacing: "0.08em" }}>UNCLAIMED KARMA AVAILABLE</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#c8ff00", textShadow: "0 0 8px #c8ff00" }}>+{totalKarmaAvailable} ⚡</span>
          </div>
        )}

        {/* Completion progress bar */}
        <div style={{ marginTop: 8, height: 4, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height: "100%", borderRadius: 4,
              background: "linear-gradient(90deg, #c8ff0088, #c8ff00)",
              boxShadow: "0 0 8px #c8ff00",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 10, color: "#555" }}>{questClaimed.length}/{quests.length} done</span>
          <span style={{ fontSize: 10, color: "#c8ff00", fontWeight: 700 }}>{completionPct}% complete</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3">
        {quests.map((q, i) => {
          const progress = questProgress[q.trackKey] ?? 0;
          const pct = Math.min(100, Math.round((progress / q.goal) * 100));
          const done = pct >= 100;
          const claimed = questClaimed.includes(q.id);
          const color = QUEST_COLORS[i % QUEST_COLORS.length];
          const isAnimating = claimAnim === q.id;

          return (
            <motion.div key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <motion.div
                animate={isAnimating ? { scale: [1, 1.04, 0.98, 1] } : {}}
                transition={{ duration: 0.5 }}
                style={{
                  background: claimed ? "#0a0a0a" : done ? `${color}0d` : "#111",
                  border: `2px solid ${claimed ? "#333" : done ? color : "#222"}`,
                  borderRadius: 18, padding: "16px",
                  boxShadow: done && !claimed
                    ? `0 0 30px ${color}44, inset 0 0 30px ${color}08`
                    : "none",
                  opacity: claimed ? 0.5 : 1,
                  transition: "all 0.3s ease",
                }}
              >
                <div className="flex items-start gap-12" style={{ gap: 12 }}>
                  {/* Emoji badge — pulsing when done & unclaimed */}
                  {done && !claimed ? (
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                        background: `${color}18`,
                        border: `2px solid ${color}66`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.6rem",
                      }}
                    >{q.emoji}</motion.div>
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: claimed ? "#1a1a1a" : `${color}18`,
                      border: `2px solid ${claimed ? "#333" : color + "66"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.6rem",
                    }}>{q.emoji}</div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center justify-between">
                      <div style={{ fontSize: 14, fontWeight: 700, color: claimed ? "#555" : "#fff" }}>{q.title}</div>
                      {claimed
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#555", background: "#1a1a1a", padding: "3px 8px", borderRadius: 6 }}>✅ CLAIMED</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "3px 8px", borderRadius: 6 }}>+{q.karmaReward}⚡</span>
                      }
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{q.description}</div>

                    {/* Progress bar — taller with stronger glow */}
                    <div style={{ marginTop: 10, height: 10, background: "#1a1a1a", borderRadius: 6, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 + 0.2, ease: "easeOut" }}
                        style={{
                          height: "100%", borderRadius: 6,
                          background: claimed ? "#333" : `linear-gradient(90deg, ${color}88, ${color})`,
                          boxShadow: claimed ? "none" : `0 0 8px ${color}, 0 0 2px ${color}`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div style={{ fontSize: 10, color: "#555" }}>{Math.min(progress, q.goal)} / {q.goal}</div>
                      <div style={{ fontSize: 10, color: color, fontWeight: 700 }}>{pct}%</div>
                    </div>
                  </div>
                </div>

                {/* Claim button */}
                <AnimatePresence>
                  {done && !claimed && (
                    <motion.button
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => handleClaim(q)}
                      style={{
                        width: "100%", marginTop: 12, padding: "15px",
                        background: `linear-gradient(135deg, ${color}cc, ${color})`,
                        border: `2px solid ${color}`,
                        borderRadius: 12, fontSize: 14, fontWeight: 700,
                        color: "#000", cursor: "pointer",
                        boxShadow: `0 0 30px ${color}77, 0 0 60px ${color}33, 3px 3px 0px #000`,
                        letterSpacing: "0.06em",
                      }}
                    >
                      <span>🎁 CLAIM REWARD — +{q.karmaReward} ⚡ · +{q.xpReward} XP</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        {/* All-quests bonus */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          {allClaimed && !bonusClaimed ? (
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px #ffcc0022",
                  "0 0 40px #ffcc0066",
                  "0 0 20px #ffcc0022",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: "linear-gradient(135deg, #1a1200, #2a2000)",
                border: "2px solid #ffcc0088",
                borderRadius: 18, padding: "16px",
              }}
            >
              <div className="flex items-center gap-3">
                <div style={{ fontSize: "2.2rem" }}>🏅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#ffcc00" }}>
                    COMPLETE ALL 5 QUESTS
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    Massive bonus reward
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ffcc00", textShadow: "0 0 10px #ffcc00" }}>+1000 ⚡</div>
              </div>

              {/* Mini quest checklist */}
              <div className="flex gap-2 mt-3">
                {quests.map((q) => {
                  const c = questClaimed.includes(q.id);
                  return (
                    <div key={q.id} style={{
                      flex: 1, padding: "6px 4px", borderRadius: 8, textAlign: "center",
                      background: c ? "#c8ff0018" : "#1a1a1a",
                      border: `1.5px solid ${c ? "#c8ff0066" : "#222"}`,
                    }}>
                      <div style={{ fontSize: "0.9rem" }}>{c ? "✅" : q.emoji}</div>
                    </div>
                  );
                })}
              </div>

              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleBonus}
                style={{
                  width: "100%", marginTop: 12, padding: "14px",
                  background: "linear-gradient(135deg, #ffcc0099, #ffcc00)",
                  border: "2px solid #ffcc00", borderRadius: 12,
                  fontSize: 15, fontWeight: 700, color: "#000",
                  cursor: "pointer", boxShadow: "0 0 30px #ffcc0055, 3px 3px 0px #000",
                  letterSpacing: "0.06em",
                }}
              >
                🏅 CLAIM BONUS — +1000 ⚡ · +250 XP
              </motion.button>
            </motion.div>
          ) : (
            <div style={{
              background: bonusClaimed ? "#0a0a0a" : "#0f0f0f",
              border: `2px solid ${bonusClaimed ? "#333" : "#1a1a1a"}`,
              borderRadius: 18, padding: "16px",
            }}>
              <div className="flex items-center gap-3">
                <div style={{ fontSize: "2.2rem" }}>{bonusClaimed ? "✅" : "🏅"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: bonusClaimed ? "#555" : "#ffcc00" }}>
                    COMPLETE ALL 5 QUESTS
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    Massive bonus reward
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: bonusClaimed ? "#555" : "#ffcc00" }}>+1000 ⚡</div>
              </div>

              {/* Mini quest checklist */}
              <div className="flex gap-2 mt-3">
                {quests.map((q) => {
                  const c = questClaimed.includes(q.id);
                  return (
                    <div key={q.id} style={{
                      flex: 1, padding: "6px 4px", borderRadius: 8, textAlign: "center",
                      background: c ? "#c8ff0018" : "#1a1a1a",
                      border: `1.5px solid ${c ? "#c8ff0066" : "#222"}`,
                    }}>
                      <div style={{ fontSize: "0.9rem" }}>{c ? "✅" : q.emoji}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Info card */}
        <div style={{ background: "#0a0a0a", border: "1px solid #c8ff0022", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7 }}>
            <strong style={{ color: "#c8ff00" }}>How quests work:</strong><br />
            Quests reset daily at midnight. Play games, feed your pet, and earn karma to make progress automatically. Claim rewards to collect your karma and XP.
          </div>
        </div>
      </div>
    </div>
  );
}
