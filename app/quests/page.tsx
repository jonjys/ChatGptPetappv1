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
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "#080808", borderBottom: "2px solid #c8ff0066" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#111", border: "2px solid #c8ff00", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#c8ff00" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#c8ff00", fontSize: 16, fontWeight: 700 }}>📋 DAILY QUESTS</div>
          <div style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
            Resets in <span style={{ color: "#888", fontFamily: "monospace" }}><Countdown /></span>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#c8ff00", background: "#111", border: "1.5px solid #c8ff0044", borderRadius: 8, padding: "4px 10px" }}>
          {questClaimed.length}/{quests.length} done
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
                  boxShadow: done && !claimed ? `0 0 20px ${color}22` : "none",
                  opacity: claimed ? 0.5 : 1,
                  transition: "all 0.3s ease",
                }}
              >
                <div className="flex items-start gap-12" style={{ gap: 12 }}>
                  {/* Emoji badge */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: claimed ? "#1a1a1a" : `${color}18`,
                    border: `2px solid ${claimed ? "#333" : color + "66"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.6rem",
                  }}>{q.emoji}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center justify-between">
                      <div style={{ fontSize: 14, fontWeight: 700, color: claimed ? "#555" : "#fff" }}>{q.title}</div>
                      {claimed
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#555", background: "#1a1a1a", padding: "3px 8px", borderRadius: 6 }}>✅ CLAIMED</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: color, background: `${color}18`, padding: "3px 8px", borderRadius: 6 }}>+{q.karmaReward}⚡</span>
                      }
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{q.description}</div>

                    {/* Progress bar */}
                    <div style={{ marginTop: 10, height: 6, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 + 0.2, ease: "easeOut" }}
                        style={{
                          height: "100%", borderRadius: 4,
                          background: claimed ? "#333" : `linear-gradient(90deg, ${color}88, ${color})`,
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
                        width: "100%", marginTop: 12, padding: "13px",
                        background: `linear-gradient(135deg, ${color}cc, ${color})`,
                        border: `2px solid ${color}`,
                        borderRadius: 12, fontSize: 14, fontWeight: 700,
                        color: "#000", cursor: "pointer",
                        boxShadow: `0 0 20px ${color}55, 3px 3px 0px #000`,
                        letterSpacing: "0.06em",
                      }}
                    >
                      🎁 CLAIM REWARD — +{q.karmaReward} ⚡ · +{q.xpReward} XP
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        {/* All-quests bonus */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div style={{
            background: allClaimed && !bonusClaimed ? "linear-gradient(135deg, #1a1200, #2a2000)" : "#0f0f0f",
            border: `2px solid ${allClaimed && !bonusClaimed ? "#ffcc0088" : "#1a1a1a"}`,
            borderRadius: 18, padding: "16px",
            boxShadow: allClaimed && !bonusClaimed ? "0 0 30px #ffcc0022" : "none",
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
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffcc00" }}>+1000 ⚡</div>
            </div>

            {/* Mini quest checklist */}
            <div className="flex gap-2 mt-3">
              {quests.map((q, i) => {
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

            {allClaimed && !bonusClaimed && (
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
            )}
          </div>
        </motion.div>

        {/* Info card */}
        <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7 }}>
            <strong style={{ color: "#c8ff00" }}>How quests work:</strong><br />
            Quests reset daily at midnight. Play games, feed your pet, and earn karma to make progress automatically. Claim rewards to collect your karma and XP.
          </div>
        </div>
      </div>
    </div>
  );
}
