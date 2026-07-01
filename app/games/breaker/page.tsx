"use client";

import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useState, useEffect, useRef, useCallback } from "react";

// ── KARMA FORGE — Rhythm-meets-crafting reaction game ──

type Element = "fire" | "ice" | "electric" | "void";

const ELEMENTS: Element[] = ["fire", "ice", "electric", "void"];

const ELEMENT_CONFIG: Record<Element, { emoji: string; color: string; glow: string; slot: number }> = {
  fire:     { emoji: "🔥", color: "#ff4422", glow: "rgba(255,68,34,0.7)",     slot: 0 },
  ice:      { emoji: "💧", color: "#44aaff", glow: "rgba(68,170,255,0.7)",    slot: 1 },
  electric: { emoji: "⚡", color: "#ccff00", glow: "rgba(200,255,0,0.7)",     slot: 2 },
  void:     { emoji: "🌀", color: "#cc44ff", glow: "rgba(200,68,255,0.7)",    slot: 3 },
};

const SLOT_LABELS = ["🔥", "💧", "⚡", "🌀"];

type FallingItem = {
  id: number;
  element: Element;
  y: number;
  x: number;
  speed: number;
  hit: boolean;
  forged: boolean;
  missed: boolean;
};

type Feedback = {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  created: number;
};

type GamePhase = "idle" | "playing" | "over";

const GAME_HEIGHT = 520;
const FORGE_Y = GAME_HEIGHT - 80; // y position of the forge zone
const PERFECT_WINDOW = 30; // px from center of forge zone
const GOOD_WINDOW = 60;

function KarmaForge({ onEnd }: { onEnd: (score: number, karma: number) => void }) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [items, setItems] = useState<FallingItem[]>([]);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [karma, setKarma] = useState(0);
  const [level, setLevel] = useState(1);
  const [forgedCount, setForgedCount] = useState(0);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [fusionStreak, setFusionStreak] = useState<{ element: Element | null; count: number }>({ element: null, count: 0 });
  const [lastFusionEl, setLastFusionEl] = useState<Element | null>(null);
  const [fusionBurst, setFusionBurst] = useState<{ active: boolean; count: number }>({ active: false, count: 0 });

  const itemIdRef = useRef(0);
  const feedbackIdRef = useRef(0);
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const heartsRef = useRef(3);
  const scoreRef = useRef(0);
  const karmaRef = useRef(0);
  const forgedCountRef = useRef(0);
  const levelRef = useRef(1);
  const fusionRef = useRef<{ element: Element | null; count: number }>({ element: null, count: 0 });
  const phaseRef = useRef<GamePhase>("idle");
  const itemsRef = useRef<FallingItem[]>([]);
  const feedbacksRef = useRef<Feedback[]>([]);
  const activeSlotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync refs
  useEffect(() => { heartsRef.current = hearts; }, [hearts]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { karmaRef.current = karma; }, [karma]);
  useEffect(() => { forgedCountRef.current = forgedCount; }, [forgedCount]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { fusionRef.current = fusionStreak; }, [fusionStreak]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { feedbacksRef.current = feedbacks; }, [feedbacks]);

  const addFeedback = useCallback((text: string, color: string, x: number, y: number) => {
    const fb: Feedback = { id: feedbackIdRef.current++, text, color, x, y, created: Date.now() };
    feedbacksRef.current = [...feedbacksRef.current, fb];
    setFeedbacks(prev => [...prev, fb]);
    setTimeout(() => {
      feedbacksRef.current = feedbacksRef.current.filter(f => f.id !== fb.id);
      setFeedbacks(prev => prev.filter(f => f.id !== fb.id));
    }, 900);
  }, []);

  const forgeSlot = useCallback((slotIndex: number) => {
    if (phaseRef.current !== "playing") return;

    // Flash slot
    setActiveSlot(slotIndex);
    if (activeSlotTimerRef.current) clearTimeout(activeSlotTimerRef.current);
    activeSlotTimerRef.current = setTimeout(() => setActiveSlot(null), 150);

    const el = ELEMENTS[slotIndex]!;
    const currentItems = itemsRef.current;

    // Find items in forge zone for this element
    const matchingItems = currentItems.filter(item =>
      item.element === el && !item.hit && !item.forged && !item.missed &&
      item.y >= FORGE_Y - GOOD_WINDOW && item.y <= FORGE_Y + 20
    );

    if (matchingItems.length === 0) {
      // Miss — wrong slot or no item
      return;
    }

    // Pick closest to FORGE_Y
    const target = matchingItems.reduce((a, b) =>
      Math.abs(a.y - FORGE_Y) < Math.abs(b.y - FORGE_Y) ? a : b
    );

    const dist = Math.abs(target.y - FORGE_Y);
    const isPerfect = dist <= PERFECT_WINDOW;
    const cfg = ELEMENT_CONFIG[el];

    // Fusion tracking
    const prevFusion = fusionRef.current;
    const newFusionCount = prevFusion.element === el ? prevFusion.count + 1 : 1;
    const newFusion = { element: el, count: newFusionCount };
    fusionRef.current = newFusion;
    setFusionStreak(newFusion);
    setLastFusionEl(el);

    const isFusion = newFusionCount >= 3 && newFusionCount % 3 === 0;

    let karmaGained = isPerfect ? 3 : 1;
    let scoreGained = isPerfect ? 150 : 50;

    if (isFusion) {
      karmaGained *= 5;
      scoreGained *= 5;
      setFusionBurst({ active: true, count: newFusionCount });
      addFeedback("⚗️ FUSION ×5!", "#ffd700", target.x, FORGE_Y - 40);
      setTimeout(() => setFusionBurst({ active: false, count: 0 }), 600);
    } else if (isPerfect) {
      addFeedback("PERFECT!", cfg.color, target.x, FORGE_Y - 30);
    } else {
      addFeedback("GOOD", "#aaaaaa", target.x, FORGE_Y - 20);
    }

    scoreRef.current += scoreGained;
    karmaRef.current += karmaGained;
    forgedCountRef.current += 1;

    setScore(s => s + scoreGained);
    setKarma(k => k + karmaGained);
    setForgedCount(c => {
      const next = c + 1;
      const newLevel = Math.floor(next / 10) + 1;
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel;
        setLevel(newLevel);
      }
      return next;
    });

    // Mark item as forged
    itemsRef.current = currentItems.map(item =>
      item.id === target.id ? { ...item, forged: true } : item
    );
    setItems(prev => prev.map(item =>
      item.id === target.id ? { ...item, forged: true } : item
    ));
  }, [addFeedback]);

  const gameLoop = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const now = Date.now();
    const spd = 1.2 + (levelRef.current - 1) * 0.25;
    const spawnInterval = Math.max(700, 1800 - (levelRef.current - 1) * 120);

    // Spawn new items
    if (now - lastSpawnRef.current > spawnInterval) {
      lastSpawnRef.current = now;
      const elIdx = Math.floor(Math.random() * 4);
      const el = ELEMENTS[elIdx]!;
      // x position based on slot
      const slotX = 20 + ELEMENT_CONFIG[el].slot * (320 / 4) + 20;
      // Add some jitter
      const jitter = (Math.random() - 0.5) * 20;
      const newItem: FallingItem = {
        id: itemIdRef.current++,
        element: el,
        y: -30,
        x: slotX + jitter,
        speed: spd,
        hit: false,
        forged: false,
        missed: false,
      };
      itemsRef.current = [...itemsRef.current, newItem];
      setItems(prev => [...prev, newItem]);
    }

    // Move items
    itemsRef.current = itemsRef.current.map(item => {
      if (item.forged || item.hit || item.missed) return item;
      return { ...item, y: item.y + item.speed };
    });

    // Check for missed items (passed FORGE_Y + 40)
    let missedAny = false;
    const updatedItems = itemsRef.current.map(item => {
      if (!item.missed && !item.forged && !item.hit && item.y > FORGE_Y + 40) {
        missedAny = true;
        addFeedback("MISS!", "#ff2222", item.x, FORGE_Y - 10);
        fusionRef.current = { element: null, count: 0 };
        setFusionStreak({ element: null, count: 0 });
        return { ...item, missed: true };
      }
      return item;
    });

    if (missedAny) {
      const newHearts = heartsRef.current - 1;
      heartsRef.current = newHearts;
      setHearts(newHearts);
      if (newHearts <= 0) {
        phaseRef.current = "over";
        setPhase("over");
        return;
      }
    }

    // Remove old items
    itemsRef.current = updatedItems.filter(item => !item.missed || item.y < GAME_HEIGHT + 60);
    setItems([...itemsRef.current]);

    frameRef.current = requestAnimationFrame(gameLoop);
  }, [addFeedback]);

  function startGame() {
    itemIdRef.current = 0;
    feedbackIdRef.current = 0;
    lastSpawnRef.current = Date.now();
    heartsRef.current = 3;
    scoreRef.current = 0;
    karmaRef.current = 0;
    forgedCountRef.current = 0;
    levelRef.current = 1;
    fusionRef.current = { element: null, count: 0 };
    itemsRef.current = [];
    feedbacksRef.current = [];
    setItems([]);
    setFeedbacks([]);
    setHearts(3);
    setScore(0);
    setKarma(0);
    setLevel(1);
    setForgedCount(0);
    setFusionStreak({ element: null, count: 0 });
    setLastFusionEl(null);
    setFusionBurst({ active: false, count: 0 });
    setActiveSlot(null);
    phaseRef.current = "playing";
    setPhase("playing");
    frameRef.current = requestAnimationFrame(gameLoop);
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      if (activeSlotTimerRef.current) clearTimeout(activeSlotTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "over") {
      cancelAnimationFrame(frameRef.current);
      onEnd(scoreRef.current, karmaRef.current);
    }
  }, [phase, onEnd]);

  useEffect(() => {
    if (phase === "playing") {
      frameRef.current = requestAnimationFrame(gameLoop);
      return () => cancelAnimationFrame(frameRef.current);
    }
  }, [phase, gameLoop]);

  const levelColor = ["#00ff88", "#4488ff", "#cc44ff", "#ff4444", "#ffd700"][Math.min(level - 1, 4)] ?? "#ffd700";

  return (
    <div style={{ position: "relative", userSelect: "none", touchAction: "none" }}>
      {/* Game arena */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: GAME_HEIGHT,
          background: `radial-gradient(ellipse at 50% 0%, rgba(80,30,10,0.6) 0%, #050508 70%)`,
          borderRadius: 18,
          overflow: "hidden",
          border: `2px solid ${levelColor}33`,
          boxShadow: `0 0 40px ${levelColor}22, inset 0 0 60px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Animated forge fire background */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
          background: "linear-gradient(to top, rgba(255,80,0,0.15), transparent)",
          pointerEvents: "none",
        }} />

        {/* Grid lines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

        {/* Forge zone line */}
        <div style={{
          position: "absolute",
          top: FORGE_Y - 2,
          left: 0, right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${levelColor}88, ${levelColor}, ${levelColor}88, transparent)`,
          boxShadow: `0 0 16px ${levelColor}`,
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          top: FORGE_Y - PERFECT_WINDOW,
          left: 0, right: 0,
          height: PERFECT_WINDOW * 2,
          background: `${levelColor}08`,
          borderTop: `1px dashed ${levelColor}33`,
          borderBottom: `1px dashed ${levelColor}33`,
          pointerEvents: "none",
        }} />

        {/* HUD top bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "8px 12px",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${levelColor}44`,
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ fontSize: 16, filter: i < hearts ? "none" : "grayscale(1) opacity(0.3)" }}>❤️</span>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: levelColor, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>LVL {level}</div>
            <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>{score}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#ffdd00", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>⚡ {karma}</div>
            {fusionStreak.count >= 2 && (
              <div style={{ color: ELEMENT_CONFIG[fusionStreak.element!]?.color ?? "#fff", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>
                {fusionStreak.count}× STREAK
              </div>
            )}
          </div>
        </div>

        {/* Falling items */}
        {items.map(item => {
          const cfg = ELEMENT_CONFIG[item.element];
          if (item.forged || item.missed) return null;
          return (
            <div
              key={item.id}
              style={{
                position: "absolute",
                left: item.x - 20,
                top: item.y - 20,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
                boxShadow: `0 0 12px ${cfg.color}, 0 0 24px ${cfg.glow}`,
                border: `2px solid ${cfg.color}`,
                filter: `drop-shadow(0 0 8px ${cfg.color})`,
                transition: "none",
                pointerEvents: "none",
              }}
            >
              {cfg.emoji}
            </div>
          );
        })}

        {/* Feedback texts */}
        {feedbacks.map(fb => (
          <div
            key={fb.id}
            style={{
              position: "absolute",
              left: Math.max(10, Math.min(fb.x - 40, 280)),
              top: fb.y,
              color: fb.color,
              fontSize: fb.text.includes("FUSION") ? 16 : 14,
              fontWeight: 900,
              fontFamily: "monospace",
              letterSpacing: 1,
              textShadow: `0 0 12px ${fb.color}`,
              pointerEvents: "none",
              animation: "feedbackFloat 0.9s ease-out forwards",
              whiteSpace: "nowrap",
            }}
          >
            {fb.text}
          </div>
        ))}

        {/* Fusion burst overlay */}
        {fusionBurst.active && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(255,215,0,0.08)",
            animation: "fusionFlash 0.6s ease-out forwards",
            pointerEvents: "none",
          }} />
        )}

        {/* Forge slots at bottom */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          display: "flex",
          padding: "0 8px 8px",
          gap: 8,
        }}>
          {ELEMENTS.map((el, i) => {
            const cfg = ELEMENT_CONFIG[el];
            const isActive = activeSlot === i;
            const streakMatch = fusionStreak.element === el && fusionStreak.count >= 2;
            return (
              <button
                key={el}
                onPointerDown={e => { e.preventDefault(); forgeSlot(i); }}
                style={{
                  flex: 1,
                  height: 64,
                  background: isActive
                    ? `radial-gradient(circle, ${cfg.glow} 0%, ${cfg.color}44 60%, transparent 100%)`
                    : streakMatch
                    ? `${cfg.color}22`
                    : "rgba(10,5,20,0.8)",
                  border: isActive
                    ? `2px solid ${cfg.color}`
                    : streakMatch
                    ? `2px solid ${cfg.color}88`
                    : "2px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  fontSize: 26,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  boxShadow: isActive
                    ? `0 0 20px ${cfg.color}, 0 0 40px ${cfg.glow}, inset 0 0 20px ${cfg.glow}`
                    : streakMatch
                    ? `0 0 8px ${cfg.color}66`
                    : "none",
                  transition: "all 0.08s ease",
                  transform: isActive ? "scale(0.95)" : "scale(1)",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "none",
                }}
              >
                <span>{SLOT_LABELS[i]}</span>
                {streakMatch && (
                  <span style={{ fontSize: 9, color: cfg.color, fontWeight: 700, fontFamily: "monospace" }}>
                    ×{fusionStreak.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* IDLE screen */}
        {phase === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(3,2,10,0.92)",
            borderRadius: 16, gap: 10,
          }}>
            <div style={{ fontSize: 48, filter: "drop-shadow(0 0 20px #ff6600)" }}>⚗️</div>
            <div style={{
              color: "#ff8800", fontSize: 24, fontWeight: 900,
              letterSpacing: 4, fontFamily: "monospace",
              textShadow: "0 0 20px #ff6600, 0 0 40px #ff330066",
            }}>KARMA FORGE</div>
            <div style={{ color: "#666", fontSize: 11, fontFamily: "monospace" }}>RHYTHM · CRAFTING · REACTION</div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {ELEMENTS.map(el => {
                const cfg = ELEMENT_CONFIG[el];
                return (
                  <div key={el} style={{ textAlign: "center" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
                      border: `2px solid ${cfg.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, marginBottom: 4,
                      boxShadow: `0 0 12px ${cfg.color}`,
                    }}>{cfg.emoji}</div>
                    <div style={{ color: cfg.color, fontSize: 9, fontFamily: "monospace", fontWeight: 700 }}>
                      {el.toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 12,
              padding: "12px 20px", marginTop: 4, maxWidth: 280,
            }}>
              <div style={{ color: "#aaa", fontSize: 10, lineHeight: 1.8, fontFamily: "monospace", textAlign: "center" }}>
                <div>Items fall from above — tap the matching slot</div>
                <div style={{ color: "#ffd700" }}>PERFECT timing = 3× karma</div>
                <div>3 in a row = <span style={{ color: "#ff8800" }}>FUSION ×5 burst!</span></div>
                <div style={{ color: "#ff4444", marginTop: 4 }}>Miss 3 = game over</div>
              </div>
            </div>

            <button
              onClick={startGame}
              style={{
                marginTop: 8, padding: "14px 40px",
                background: "linear-gradient(135deg, #ff6600, #ff8800)",
                border: "none", borderRadius: 14, fontSize: 16, fontWeight: 900,
                color: "#000", cursor: "pointer", fontFamily: "monospace",
                letterSpacing: 2,
                boxShadow: "0 0 20px #ff660088, 0 4px 0 #aa4400",
              }}
            >
              FORGE ⚗️
            </button>
          </div>
        )}

        {/* GAME OVER screen */}
        {phase === "over" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(3,2,10,0.95)",
            borderRadius: 16, gap: 8,
          }}>
            <div style={{ fontSize: 40 }}>💀</div>
            <div style={{
              color: "#ff2244", fontSize: 22, fontWeight: 900,
              letterSpacing: 3, fontFamily: "monospace",
              textShadow: "0 0 18px #ff2244",
            }}>FORGE COLD</div>

            <div style={{
              color: "#ffd700", fontSize: 48, fontWeight: 900,
              fontFamily: "monospace", lineHeight: 1,
              textShadow: "0 0 30px #ffd70077",
            }}>{score}</div>
            <div style={{ color: "#666", fontSize: 11, fontFamily: "monospace" }}>TOTAL SCORE</div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px",
              marginTop: 8, marginBottom: 8,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#ffdd00", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>⚡ {karma}</div>
                <div style={{ color: "#444", fontSize: 9, fontFamily: "monospace" }}>KARMA FORGED</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#00ff88", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>⚗️ {forgedCount}</div>
                <div style={{ color: "#444", fontSize: 9, fontFamily: "monospace" }}>ITEMS FORGED</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: levelColor, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>LVL {level}</div>
                <div style={{ color: "#444", fontSize: 9, fontFamily: "monospace" }}>LEVEL REACHED</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#cc44ff", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>
                  {lastFusionEl ? ELEMENT_CONFIG[lastFusionEl].emoji : "—"}
                </div>
                <div style={{ color: "#444", fontSize: 9, fontFamily: "monospace" }}>LAST FUSION</div>
              </div>
            </div>

            <button
              onClick={startGame}
              style={{
                padding: "12px 36px",
                background: "linear-gradient(135deg, #ff6600, #ff8800)",
                border: "none", borderRadius: 14, fontSize: 15, fontWeight: 900,
                color: "#000", cursor: "pointer", fontFamily: "monospace",
                letterSpacing: 2,
                boxShadow: "0 0 20px #ff660088, 0 4px 0 #aa4400",
              }}
            >
              PLAY AGAIN ⚗️
            </button>
          </div>
        )}
      </div>

      {/* In-game bottom hint */}
      {phase === "playing" && (
        <div style={{
          marginTop: 8, textAlign: "center",
          color: "#333", fontSize: 10, fontFamily: "monospace",
        }}>
          TAP SLOTS TO FORGE • 3-IN-A-ROW = FUSION BURST • MISS 3 = GAME OVER
        </div>
      )}

      <style>{`
        @keyframes feedbackFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          60% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
        @keyframes fusionFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function BreakerPage() {
  const { addKarma, addXP, updateScore, gameScores, addActivity } = useApp();

  function handleEnd(score: number, karma: number) {
    addKarma(karma, "Karma Forge");
    addXP(Math.floor(score / 20) + karma * 2);
    updateScore("breaker", score);
    addActivity({
      emoji: "⚗️",
      title: `Karma Forge — Score ${score}`,
      detail: `${karma} karma forged · ${score} total score`,
      karma,
      source: "breaker",
    });
  }

  return (
    <div style={{ background: "#050508", minHeight: "100dvh", color: "#fff" }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: "#050508", borderBottom: "2px solid #ff6600" }}>
        <Link href="/games">
          <div style={{ width: 36, height: 36, background: "#0a0510", border: "2px solid #ff6600", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="#ff6600" />
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#ff8800", fontSize: 16, fontWeight: 700 }}>⚗️ KARMA FORGE</div>
          <div style={{ color: "#555", fontSize: 11 }}>Forge items · Chain fusions · Earn karma</div>
        </div>
        {(gameScores.breaker ?? 0) > 0 && (
          <div className="flex items-center gap-1" style={{ color: "#ff8800", fontSize: 12, fontWeight: 700 }}>
            <Trophy size={12} /> {gameScores.breaker}
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-4">
        <KarmaForge onEnd={handleEnd} />
      </div>
    </div>
  );
}
