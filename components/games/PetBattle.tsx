"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleEnemy, BattleAbility } from "@/types/game";
import type { Pet } from "@/types/pet";
import { BATTLE_ENEMIES } from "@/lib/mock-data";

/* ─── Player abilities ────────────────────────────────────────────────── */
const PLAYER_ABILITIES: Record<string, BattleAbility[]> = {
  "Grinder Beast": [
    { name: "Iron Will", emoji: "🛡️", damage: [14, 24], effect: "heal 10" },
    { name: "Grind Force", emoji: "⚒️", damage: [20, 32] },
    { name: "Titan Smash", emoji: "💥", damage: [26, 38] },
  ],
  "Influencer Spirit": [
    { name: "Charm Wave", emoji: "💫", damage: [12, 20], effect: "heal 12" },
    { name: "Social Burst", emoji: "📣", damage: [18, 28] },
    { name: "Star Power", emoji: "⭐", damage: [24, 36] },
  ],
  "Merchant King": [
    { name: "Trade Slash", emoji: "⚔️", damage: [16, 26] },
    { name: "Gold Strike", emoji: "💰", damage: [20, 30] },
    { name: "Market Crash", emoji: "📉", damage: [28, 40] },
  ],
};

/* ─── Types ───────────────────────────────────────────────────────────── */
type Phase = "select_enemy" | "battle" | "result";
type TurnPhase = "player" | "enemy" | "animating";

interface DmgNumState {
  id: number;
  value: number;
  x: number;
  y: number;
  color: string;
}

interface Projectile {
  id: number;
  emoji: string;
  fromPlayer: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function difficultyStars(level: number): number {
  if (level > 12) return 3;
  if (level > 7) return 2;
  return 1;
}

function difficultyLabel(level: number): string {
  if (level > 12) return "HARD";
  if (level > 7) return "MED";
  return "EASY";
}

function difficultyColor(level: number): string {
  if (level > 12) return "#ff2d2d";
  if (level > 7) return "#ff9800";
  return "#4caf50";
}

const CLASS_BADGE_COLOR: Record<string, string> = {
  "Grinder Beast": "#ff6b35",
  "Influencer Spirit": "#ff2d8d",
  "Merchant King": "#c8ff00",
};

/* ─── Sub-components ──────────────────────────────────────────────────── */

function DmgNum({ value, x, y, color }: { value: number; x: number; y: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      transition={{ duration: 1.2 }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        color,
        fontWeight: 900,
        fontSize: 22,
        pointerEvents: "none",
        zIndex: 20,
        textShadow: `0 0 8px ${color}`,
      }}
    >
      -{value}
    </motion.div>
  );
}

function HealNum({ value, x, y }: { value: number; x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -50, scale: 1.1 }}
      transition={{ duration: 1.0 }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        color: "#c8ff00",
        fontWeight: 900,
        fontSize: 18,
        pointerEvents: "none",
        zIndex: 20,
        textShadow: "0 0 8px #c8ff00",
      }}
    >
      +{value}
    </motion.div>
  );
}

function SegmentedHPBar({
  current,
  max,
  color,
}: {
  current: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, (current / max) * 100);
  const barColor = pct > 50 ? color : pct > 20 ? "#ff9800" : "#ff2d2d";
  const segments = 10;
  const filledSegments = Math.round((pct / 100) * segments);

  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: segments }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            opacity: i < filledSegments ? 1 : 0.15,
            scale: i < filledSegments ? 1 : 0.85,
          }}
          transition={{ duration: 0.3, delay: i * 0.02 }}
          style={{
            flex: 1,
            height: 14,
            background: i < filledSegments ? barColor : "#222",
            border: `1.5px solid ${i < filledSegments ? barColor : "#333"}`,
            borderRadius: 3,
            boxShadow: i < filledSegments ? `0 0 6px ${barColor}88` : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */
type Props = { pet: Pet; onEnd: (won: boolean, karma: number) => void };

export default function PetBattle({ pet, onEnd }: Props) {
  const [phase, setPhase] = useState<Phase>("select_enemy");
  const [enemy, setEnemy] = useState<BattleEnemy | null>(null);
  const [playerHP, setPlayerHP] = useState(100);
  const [enemyHP, setEnemyHP] = useState(100);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("player");
  const [log, setLog] = useState<string[]>([]);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [combo, setCombo] = useState(0);
  const [dmgNums, setDmgNums] = useState<DmgNumState[]>([]);
  const [healNums, setHealNums] = useState<{ id: number; value: number; x: number; y: number }[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [playerBuff, setPlayerBuff] = useState<string | null>(null);
  const dmgIdRef = useRef(0);

  const playerAbilities = PLAYER_ABILITIES[pet.class] ?? PLAYER_ABILITIES["Grinder Beast"];

  const petAvatarEmoji =
    pet.evolution === "legendary"
      ? "🌋"
      : pet.evolution === "adult"
      ? "🦁"
      : pet.evolution === "teen"
      ? "🦊"
      : "🐣";

  function spawnDmg(value: number, x: number, y: number, color: string) {
    const id = ++dmgIdRef.current;
    setDmgNums((prev) => [...prev, { id, value, x, y, color }]);
    setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== id)), 1400);
  }

  function spawnHeal(value: number, x: number, y: number) {
    const id = ++dmgIdRef.current;
    setHealNums((prev) => [...prev, { id, value, x, y }]);
    setTimeout(() => setHealNums((prev) => prev.filter((h) => h.id !== id)), 1200);
  }

  function fireProjectile(emoji: string, fromPlayer: boolean) {
    const id = ++dmgIdRef.current;
    setProjectiles((prev) => [...prev, { id, emoji, fromPlayer }]);
    setTimeout(() => setProjectiles((prev) => prev.filter((p) => p.id !== id)), 700);
  }

  function selectEnemy(e: BattleEnemy) {
    setEnemy(e);
    setPlayerHP(100);
    setEnemyHP(e.hp);
    setLog([`⚔️ Battle start! ${pet.name} vs ${e.petEmoji} ${e.name}'s pet!`]);
    setPhase("battle");
    setTurnPhase("player");
    setCombo(0);
    setPlayerBuff(null);
  }

  const useAbility = useCallback(
    (ability: BattleAbility) => {
      if (turnPhase !== "player" || !enemy) return;
      setTurnPhase("animating");

      const dmg = rnd(...ability.damage);
      const heal = ability.effect?.startsWith("heal")
        ? parseInt(ability.effect.split(" ")[1])
        : 0;

      // Fire projectile from player to enemy
      fireProjectile(ability.emoji, true);

      setTimeout(() => {
        setShakeEnemy(true);
        setTimeout(() => setShakeEnemy(false), 400);
        // Damage number on enemy side (right)
        spawnDmg(dmg, 180, 20, "#ff2d2d");

        if (heal) {
          spawnHeal(heal, 30, 20);
          setPlayerBuff(`+${heal} HP`);
          setTimeout(() => setPlayerBuff(null), 1500);
        }

        const newEnemyHP = Math.max(0, enemyHP - dmg);
        const newPlayerHP = Math.min(100, playerHP + heal);
        const newCombo = combo + 1;

        setEnemyHP(newEnemyHP);
        setPlayerHP(newPlayerHP);
        setCombo(newCombo);

        const comboBadge = newCombo >= 3 ? ` 🔥 COMBO ×${newCombo}!` : "";
        setLog((l) => [
          `${ability.emoji} ${pet.name} used ${ability.name}! ${dmg} dmg${heal ? ` · +${heal} HP` : ""}${comboBadge}`,
          ...l.slice(0, 5),
        ]);

        if (newEnemyHP <= 0) {
          setTimeout(() => {
            setPhase("result");
            onEnd(true, 100 + newCombo * 10);
          }, 800);
          return;
        }

        // Enemy turn
        setTimeout(() => {
          const ea = enemy.abilities[Math.floor(Math.random() * enemy.abilities.length)];
          const edm = rnd(...ea.damage);
          const eheal = ea.effect?.startsWith("heal")
            ? parseInt(ea.effect.split(" ")[1])
            : 0;

          // Fire projectile from enemy to player
          fireProjectile(ea.emoji, false);

          setTimeout(() => {
            setShakePlayer(true);
            setTimeout(() => setShakePlayer(false), 400);
            spawnDmg(edm, 30, 60, "#ff9800");

            const finalPlayerHP = Math.max(0, newPlayerHP - edm);
            setPlayerHP(Math.max(0, newPlayerHP - edm));
            if (eheal) setEnemyHP((h) => Math.min(enemy.hp, h + eheal));

            setLog((l) => [
              `${ea.emoji} ${enemy.name}'s pet used ${ea.name}! ${edm} dmg${
                eheal ? ` · healed ${eheal}` : ""
              }`,
              ...l.slice(0, 5),
            ]);
            setCombo(0);

            if (finalPlayerHP <= 0) {
              setTimeout(() => {
                setPhase("result");
                onEnd(false, 20);
              }, 600);
            } else {
              setTurnPhase("player");
            }
          }, 350);
        }, 900);
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turnPhase, enemy, enemyHP, playerHP, combo, pet, onEnd]
  );

  /* ── Enemy select screen ────────────────────────────────────────────── */
  if (phase === "select_enemy") {
    return (
      <div>
        <div
          style={{
            color: "#ff6b35",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 3,
            marginBottom: 4,
            textShadow: "0 0 12px #ff6b3588",
          }}
        >
          SELECT OPPONENT
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#555",
            fontWeight: 600,
            letterSpacing: 1,
            marginBottom: 14,
          }}
        >
          CHOOSE YOUR CHALLENGE WISELY
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {BATTLE_ENEMIES.map((e) => {
            const stars = difficultyStars(e.level);
            const label = difficultyLabel(e.level);
            const dColor = difficultyColor(e.level);
            const classBadgeColor = CLASS_BADGE_COLOR[e.petClass] ?? "#888";
            return (
              <motion.button
                key={e.id}
                whileHover={{ scale: 1.01, borderColor: "#ff6b35" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectEnemy(e)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background:
                    "linear-gradient(135deg, #150a00 0%, #1f0d00 100%)",
                  border: "2px solid #2a1200",
                  borderRadius: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Glow accent */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(ellipse at 0% 50%, ${dColor}10 0%, transparent 65%)`,
                    pointerEvents: "none",
                  }}
                />
                {/* Pet avatar circle */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#0a0500",
                    border: `2px solid ${dColor}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.9rem",
                    flexShrink: 0,
                    boxShadow: `0 0 12px ${dColor}44`,
                  }}
                >
                  {e.petEmoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.name}&apos;s pet
                  </div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        background: `${classBadgeColor}22`,
                        border: `1px solid ${classBadgeColor}55`,
                        borderRadius: 4,
                        color: classBadgeColor,
                        letterSpacing: 0.5,
                      }}
                    >
                      {e.petClass.toUpperCase()}
                    </span>
                    <span style={{ color: "#555", fontSize: 10 }}>
                      LVL {e.level}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {/* Stars */}
                  <div style={{ marginBottom: 3 }}>
                    {Array.from({ length: 3 }).map((_, si) => (
                      <span
                        key={si}
                        style={{
                          color: si < stars ? dColor : "#333",
                          fontSize: 12,
                          textShadow: si < stars ? `0 0 6px ${dColor}` : "none",
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: dColor,
                      letterSpacing: 1,
                      textShadow: `0 0 8px ${dColor}`,
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ color: "#555", fontSize: 10, fontWeight: 700 }}>
                    {e.hp} HP
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Result screen ──────────────────────────────────────────────────── */
  if (phase === "result") {
    const won = enemyHP <= 0;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ position: "relative" }}
      >
        {/* Full-screen overlay shimmer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          style={{
            textAlign: "center",
            padding: "32px 20px",
            background: won
              ? "linear-gradient(160deg, #0a1a00 0%, #1a2800 50%, #0a1a00 100%)"
              : "linear-gradient(160deg, #1a0000 0%, #2a0505 50%, #1a0000 100%)",
            border: `3px solid ${won ? "#c8ff00" : "#ff2d2d"}`,
            borderRadius: 20,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Background rune glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: won
                ? "radial-gradient(ellipse at 50% 50%, #c8ff0015 0%, transparent 70%)"
                : "radial-gradient(ellipse at 50% 50%, #ff2d2d15 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Trophy / skull */}
          <motion.div
            animate={{ scale: [1, 1.12, 0.95, 1.05, 1], rotate: [0, -5, 5, -3, 0] }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ fontSize: "4rem", marginBottom: 10 }}
          >
            {won ? "🏆" : "💀"}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              color: won ? "#c8ff00" : "#ff2d2d",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 3,
              textShadow: `0 0 24px ${won ? "#c8ff00" : "#ff2d2d"}`,
              marginBottom: 6,
            }}
          >
            {won ? "VICTORY!" : "DEFEATED!"}
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{ color: "#aaa", fontSize: 14, marginBottom: 6 }}
          >
            {won
              ? `+${100 + combo * 10} karma earned!`
              : "+20 karma for trying"}
          </motion.div>

          {combo >= 3 && won && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.6 }}
              style={{
                color: "#ffde00",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
                textShadow: "0 0 10px #ffde00",
              }}
            >
              🔥 Combo bonus ×{combo}!
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            onClick={() => {
              setPhase("select_enemy");
              setEnemy(null);
              setLog([]);
              setDmgNums([]);
              setHealNums([]);
              setProjectiles([]);
            }}
            style={{
              marginTop: 14,
              padding: "12px 36px",
              background: won ? "#c8ff00" : "#ff2d2d",
              border: "3px solid #0a0a0a",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              color: won ? "#0a0a0a" : "#fff",
              cursor: "pointer",
              letterSpacing: 2,
              boxShadow: `4px 4px 0 #0a0a0a, 0 0 20px ${won ? "#c8ff0044" : "#ff2d2d44"}`,
            }}
          >
            FIGHT AGAIN
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  /* ── Battle screen ──────────────────────────────────────────────────── */
  const playerLow = playerHP < 20;
  const enemyLow = enemyHP < (enemy?.hp ?? 100) * 0.2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Isometric Arena ─────────────────────────────────────────────── */}
      <div
        style={{
          background: "#0e0600",
          border: "2px solid #ff6b3544",
          borderRadius: 16,
          padding: "14px 14px 10px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Arena floor */}
        <div
          style={{
            background:
              "repeating-linear-gradient(45deg, #0a0500 0px, #0a0500 24px, #150800 24px, #150800 48px)",
            transform: "perspective(400px) rotateX(40deg)",
            border: "2px solid #ff6b3566",
            boxShadow: "0 0 40px #ff6b3522 inset",
            borderRadius: 10,
            height: 100,
            position: "relative",
            marginBottom: 10,
            overflow: "hidden",
          }}
        >
          {/* Rune glows on floor */}
          {[
            { left: "20%", top: "40%" },
            { left: "50%", top: "60%" },
            { left: "75%", top: "35%" },
          ].map((pos, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.15, 0.45, 0.15] }}
              transition={{ duration: 2 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#ff6b35",
                filter: "blur(10px)",
                ...pos,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        {/* Fighters row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 8,
            position: "relative",
            minHeight: 120,
            padding: "0 6px",
          }}
        >
          {/* Damage numbers */}
          {dmgNums.map((d) => (
            <DmgNum key={d.id} value={d.value} x={d.x} y={d.y} color={d.color} />
          ))}
          {healNums.map((h) => (
            <HealNum key={h.id} value={h.value} x={h.x} y={h.y} />
          ))}

          {/* Projectiles */}
          <AnimatePresence>
            {projectiles.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  x: p.fromPlayer ? 20 : 220,
                  y: p.fromPlayer ? -10 : -30,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: p.fromPlayer ? 220 : 20,
                  y: p.fromPlayer ? -40 : -10,
                  opacity: 0,
                  scale: 1.6,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  fontSize: "1.6rem",
                  pointerEvents: "none",
                  zIndex: 15,
                  bottom: 30,
                  left: 0,
                }}
              >
                {p.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Player fighter — larger, bottom-left foreground */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: 1, textAlign: "center" }}>
              {pet.name}
            </div>
            {/* HP bar */}
            <div style={{ width: "100%" }}>
              <SegmentedHPBar current={playerHP} max={100} color="#c8ff00" />
              <div style={{ color: "#c8ff00", fontSize: 10, fontWeight: 700, textAlign: "center", marginTop: 2 }}>
                {playerHP}/100
              </div>
            </div>
            {/* Avatar */}
            <motion.div
              animate={
                shakePlayer
                  ? { x: [-8, 8, -5, 5, 0] }
                  : turnPhase === "player"
                  ? { y: [0, -4, 0] }
                  : {}
              }
              transition={
                shakePlayer
                  ? { duration: 0.35 }
                  : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "#0a0500",
                border: `3px solid ${turnPhase === "player" ? "#c8ff00" : "#333"}`,
                boxShadow:
                  turnPhase === "player"
                    ? "0 0 18px #c8ff0088, 0 0 4px #c8ff00"
                    : playerLow
                    ? "0 0 12px #ff2d2d88"
                    : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.8rem",
                filter: playerLow ? "grayscale(0.4) brightness(0.8)" : "none",
              }}
            >
              {petAvatarEmoji}
            </motion.div>
            {/* Buff badge */}
            <AnimatePresence>
              {playerBuff && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{
                    background: "#c8ff0033",
                    border: "1px solid #c8ff00",
                    borderRadius: 6,
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#c8ff00",
                  }}
                >
                  {playerBuff}
                </motion.div>
              )}
            </AnimatePresence>
            {combo >= 2 && (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                style={{
                  background: "#ff6b3533",
                  border: "1px solid #ff6b35",
                  borderRadius: 6,
                  padding: "2px 7px",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#ff6b35",
                  letterSpacing: 0.5,
                }}
              >
                🔥 ×{combo}
              </motion.div>
            )}
          </div>

          {/* VS divider */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingBottom: 20,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                color: "#ff6b35",
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: 2,
                textShadow: "0 0 10px #ff6b35",
              }}
            >
              VS
            </motion.div>
            <div
              style={{
                width: 1,
                height: 30,
                background:
                  "linear-gradient(to bottom, #ff6b3588, transparent)",
              }}
            />
          </div>

          {/* Enemy fighter — smaller, top-right background feel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: 1, textAlign: "center" }}>
              {enemy?.name}&apos;s pet
            </div>
            {/* HP bar */}
            <div style={{ width: "100%" }}>
              <SegmentedHPBar current={enemyHP} max={enemy?.hp ?? 100} color="#ff6b35" />
              <div style={{ color: "#ff6b35", fontSize: 10, fontWeight: 700, textAlign: "center", marginTop: 2 }}>
                {enemyHP}/{enemy?.hp}
              </div>
            </div>
            {/* Avatar — slightly smaller to sell depth */}
            <motion.div
              animate={
                shakeEnemy
                  ? { x: [8, -8, 5, -5, 0] }
                  : turnPhase === "enemy"
                  ? { y: [0, -4, 0] }
                  : {}
              }
              transition={
                shakeEnemy
                  ? { duration: 0.35 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "#0a0500",
                border: `3px solid ${
                  turnPhase === "enemy" || turnPhase === "animating"
                    ? "#ff6b35"
                    : "#333"
                }`,
                boxShadow:
                  turnPhase === "enemy" || turnPhase === "animating"
                    ? "0 0 18px #ff6b3588, 0 0 4px #ff6b35"
                    : enemyLow
                    ? "0 0 12px #ff2d2d88"
                    : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.2rem",
                filter: enemyLow ? "grayscale(0.4) brightness(0.7)" : "none",
              }}
            >
              {enemy?.petEmoji}
            </motion.div>
            {/* Enemy difficulty badge */}
            {enemy && (
              <div
                style={{
                  background: `${difficultyColor(enemy.level)}22`,
                  border: `1px solid ${difficultyColor(enemy.level)}55`,
                  borderRadius: 5,
                  padding: "2px 6px",
                  fontSize: 9,
                  fontWeight: 800,
                  color: difficultyColor(enemy.level),
                  letterSpacing: 0.5,
                }}
              >
                LVL {enemy.level}
              </div>
            )}
          </div>
        </div>

        {/* Battle log */}
        <div
          style={{
            background: "#050200",
            borderRadius: 8,
            padding: "8px 10px",
            minHeight: 44,
            border: "1px solid #1a0900",
            marginTop: 6,
          }}
        >
          <AnimatePresence mode="popLayout">
            {log.slice(0, 3).map((line, i) => (
              <motion.div
                key={line + i}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1 - i * 0.32, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  fontSize: 11,
                  color: i === 0 ? "#fff" : "#444",
                  fontWeight: i === 0 ? 600 : 400,
                  lineHeight: 1.45,
                }}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Abilities ──────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 8,
            color: turnPhase === "player" ? "#ff6b35" : "#444",
            textShadow: turnPhase === "player" ? "0 0 10px #ff6b3566" : "none",
            transition: "all 0.3s",
          }}
        >
          {turnPhase === "player" ? "CHOOSE AN ABILITY:" : "ENEMY IS ATTACKING…"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {playerAbilities.map((a) => {
            const active = turnPhase === "player";
            return (
              <motion.button
                key={a.name}
                whileHover={active ? { scale: 1.03, y: -2 } : {}}
                whileTap={active ? { scale: 0.92 } : {}}
                onClick={() => useAbility(a)}
                disabled={!active}
                style={{
                  padding: "11px 6px 9px",
                  background: active
                    ? "linear-gradient(160deg, #1a0500, #2a0800)"
                    : "#111",
                  border: `2px solid ${active ? "#ff6b35" : "#222"}`,
                  borderRadius: 14,
                  cursor: active ? "pointer" : "not-allowed",
                  textAlign: "center",
                  transition: "border-color 0.2s, background 0.2s",
                  boxShadow: active ? "0 0 10px #ff6b3533" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(ellipse at 50% 0%, #ff6b350a, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <div style={{ fontSize: "1.6rem" }}>{a.emoji}</div>
                <div
                  style={{
                    color: active ? "#fff" : "#444",
                    fontSize: 10,
                    fontWeight: 700,
                    marginTop: 3,
                    letterSpacing: 0.3,
                  }}
                >
                  {a.name}
                </div>
                <div style={{ color: active ? "#ff6b35" : "#333", fontSize: 10, marginTop: 1 }}>
                  {a.damage[0]}–{a.damage[1]} dmg
                </div>
                {a.effect && (
                  <div style={{ color: active ? "#c8ff00" : "#333", fontSize: 9, marginTop: 1 }}>
                    {a.effect}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Combo indicator */}
      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              textAlign: "center",
              color: "#ffde00",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              textShadow: "0 0 12px #ffde00",
            }}
          >
            🔥 COMBO ×{combo} — Keep it going!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
