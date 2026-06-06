"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleEnemy, BattleAbility } from "@/types/game";
import type { Pet } from "@/types/pet";
import { BATTLE_ENEMIES } from "@/lib/mock-data";

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

type Phase = "select_enemy" | "battle" | "result";
type TurnPhase = "player" | "enemy" | "animating";

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function HPBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <div style={{ height: 12, background: "#222", border: "2px solid #555", borderRadius: 999 }}>
      <motion.div animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 100 }}
        style={{ height: "100%", background: pct > 50 ? color : pct > 20 ? "#ff9800" : "#f44336", borderRadius: 999 }} />
    </div>
  );
}

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

  const playerAbilities = PLAYER_ABILITIES[pet.class] ?? PLAYER_ABILITIES["Grinder Beast"];

  function selectEnemy(e: BattleEnemy) {
    setEnemy(e);
    setPlayerHP(100);
    setEnemyHP(e.hp);
    setLog([`⚔️ Battle start! ${pet.name} vs ${e.petEmoji} ${e.name}'s pet!`]);
    setPhase("battle");
    setTurnPhase("player");
    setCombo(0);
  }

  function useAbility(ability: BattleAbility) {
    if (turnPhase !== "player" || !enemy) return;
    setTurnPhase("animating");

    const dmg = rnd(...ability.damage);
    const heal = ability.effect?.startsWith("heal") ? parseInt(ability.effect.split(" ")[1]) : 0;

    setShakeEnemy(true);
    setTimeout(() => setShakeEnemy(false), 400);

    const newEnemyHP = Math.max(0, enemyHP - dmg);
    const newPlayerHP = Math.min(100, playerHP + heal);
    const newCombo = combo + 1;

    setEnemyHP(newEnemyHP);
    setPlayerHP(newPlayerHP);
    setCombo(newCombo);

    const comboBadge = newCombo >= 3 ? ` 🔥 COMBO ×${newCombo}!` : "";
    setLog(l => [`${ability.emoji} ${pet.name} used ${ability.name}! ${dmg} damage${heal ? ` · +${heal} HP` : ""}${comboBadge}`, ...l.slice(0, 5)]);

    if (newEnemyHP <= 0) {
      setTimeout(() => { setPhase("result"); onEnd(true, 100 + newCombo * 10); }, 600);
      return;
    }

    // Enemy turn
    setTimeout(() => {
      const ea = enemy.abilities[Math.floor(Math.random() * enemy.abilities.length)];
      const edm = rnd(...ea.damage);
      const eheal = ea.effect?.startsWith("heal") ? parseInt(ea.effect.split(" ")[1]) : 0;

      setShakePlayer(true);
      setTimeout(() => setShakePlayer(false), 400);

      const finalPlayerHP = Math.max(0, newPlayerHP - edm);
      setPlayerHP(p => Math.min(100, Math.max(0, p - edm)));
      if (eheal) setEnemyHP(h => Math.min(enemy.hp, h + eheal));

      setLog(l => [`${ea.emoji} ${enemy.name}'s pet used ${ea.name}! ${edm} damage${eheal ? ` · healed ${eheal}` : ""}`, ...l.slice(0, 5)]);
      setCombo(0);

      if (finalPlayerHP <= 0) {
        setTimeout(() => { setPhase("result"); onEnd(false, 20); }, 600);
      } else {
        setTurnPhase("player");
      }
    }, 900);
  }

  if (phase === "select_enemy") {
    return (
      <div>
        <div style={{ color: "#ff6b35", fontSize: 13, fontWeight: 700, letterSpacing: 3, marginBottom: 16 }}>SELECT OPPONENT</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {BATTLE_ENEMIES.map(e => (
            <motion.button key={e.id} whileTap={{ scale: 0.97 }} onClick={() => selectEnemy(e)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#150a00", border: "2.5px solid #ff6b35", borderRadius: 14, cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: "2rem" }}>{e.petEmoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{e.petEmoji} {e.name}&apos;s pet</div>
                <div style={{ color: "#888", fontSize: 12 }}>@{e.name} · LVL {e.level} · {e.petClass}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#ff6b35", fontWeight: 700, fontSize: 13 }}>HP {e.hp}</div>
                <div style={{ color: "#555", fontSize: 11 }}>{e.level > 12 ? "⚠️ Hard" : e.level > 7 ? "Medium" : "Easy"}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const won = enemyHP <= 0;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: "center", padding: 24, background: "#150a00", border: "3px solid #ff6b35", borderRadius: 20 }}>
        <div style={{ fontSize: "3rem", marginBottom: 8 }}>{won ? "🏆" : "💀"}</div>
        <div style={{ color: won ? "#c8ff00" : "#ff2d8d", fontSize: 22, fontWeight: 700 }}>{won ? "VICTORY!" : "DEFEATED!"}</div>
        <div style={{ color: "#fff", fontSize: 15, margin: "8px 0" }}>{won ? `+${100 + combo * 10} karma earned!` : "+20 karma for trying"}</div>
        {combo >= 3 && won && <div style={{ color: "#ffde00", fontSize: 13 }}>🔥 Combo bonus ×{combo}!</div>}
        <button onClick={() => { setPhase("select_enemy"); setEnemy(null); setLog([]); }}
          style={{ marginTop: 16, padding: "10px 32px", background: "#ff6b35", border: "3px solid #0a0a0a", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a" }}>
          FIGHT AGAIN
        </button>
      </motion.div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Arena */}
      <div style={{ background: "#150a00", border: "2px solid #ff6b35", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
          {/* Player */}
          <div>
            <div style={{ color: "#aaa", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{pet.name} (YOU)</div>
            <HPBar current={playerHP} max={100} color="#c8ff00" />
            <div style={{ color: "#c8ff00", fontSize: 13, fontWeight: 700, marginTop: 2 }}>{playerHP}/100 HP</div>
          </div>
          {/* Enemy */}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#aaa", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{enemy?.name}&apos;s pet</div>
            <HPBar current={enemyHP} max={enemy?.hp ?? 100} color="#ff6b35" />
            <div style={{ color: "#ff6b35", fontSize: 13, fontWeight: 700, marginTop: 2 }}>{enemyHP}/{enemy?.hp} HP</div>
          </div>
        </div>

        {/* Sprites */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <motion.div animate={shakePlayer ? { x: [-6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.3 }}
            style={{ fontSize: "3.5rem", filter: playerHP < 20 ? "grayscale(0.5)" : "none" }}>
            {pet.evolution === "legendary" ? "🌋" : pet.evolution === "adult" ? "🦁" : pet.evolution === "teen" ? "🦊" : "🐣"}
          </motion.div>
          <div style={{ color: "#ff6b35", fontWeight: 700, fontSize: 18 }}>VS</div>
          <motion.div animate={shakeEnemy ? { x: [6, -6, 4, -4, 0] } : {}} transition={{ duration: 0.3 }}
            style={{ fontSize: "3.5rem", filter: enemyHP < 20 ? "grayscale(0.5)" : "none" }}>
            {enemy?.petEmoji}
          </motion.div>
        </div>

        {/* Battle log */}
        <div style={{ background: "#0a0a0a", borderRadius: 8, padding: "8px 12px", minHeight: 48 }}>
          <AnimatePresence mode="popLayout">
            {log.slice(0, 3).map((line, i) => (
              <motion.div key={line} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1 - i * 0.3, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: 12, color: i === 0 ? "#fff" : "#555", fontWeight: i === 0 ? 600 : 400, lineHeight: 1.4 }}>
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Abilities */}
      <div>
        <div style={{ color: "#ff6b35", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
          {turnPhase === "player" ? "CHOOSE AN ABILITY:" : "ENEMY TURN..."}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {playerAbilities.map(a => (
            <motion.button key={a.name} whileTap={{ scale: 0.93 }}
              onClick={() => useAbility(a)}
              disabled={turnPhase !== "player"}
              style={{
                padding: "10px 6px", background: turnPhase === "player" ? "#1a0500" : "#111",
                border: "2px solid " + (turnPhase === "player" ? "#ff6b35" : "#333"),
                borderRadius: 12, cursor: turnPhase === "player" ? "pointer" : "not-allowed",
                textAlign: "center", transition: "all 0.15s",
              }}>
              <div style={{ fontSize: "1.4rem" }}>{a.emoji}</div>
              <div style={{ color: turnPhase === "player" ? "#fff" : "#555", fontSize: 11, fontWeight: 700, marginTop: 2 }}>{a.name}</div>
              <div style={{ color: "#ff6b35", fontSize: 10 }}>{a.damage[0]}-{a.damage[1]} dmg</div>
            </motion.button>
          ))}
        </div>
      </div>

      {combo >= 2 && <div style={{ textAlign: "center", color: "#ffde00", fontSize: 13, fontWeight: 700 }}>🔥 COMBO ×{combo} — Keep it going!</div>}
    </div>
  );
}
