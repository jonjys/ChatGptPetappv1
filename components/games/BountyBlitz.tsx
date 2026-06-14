"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { FRIENDS } from "@/lib/mock-data";

// ─── Constants ────────────────────────────────────────────────────────────────

const BLITZ_TIME = 30;
const COMBO_THRESHOLD = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "health" | "finance" | "social" | "learning" | "wellbeing";
type Difficulty = "easy" | "medium" | "hard";
type VerificationType =
  | "health_steps"
  | "health_water"
  | "health_sleep"
  | "workout_timer"
  | "finance_save"
  | "finance_read"
  | "finance_budget"
  | "social_streak"
  | "social_cheer"
  | "social_tag"
  | "social_share"
  | "learn_word"
  | "learn_podcast"
  | "learn_read"
  | "meditate_timer"
  | "wellbeing_gratitude"
  | "wellbeing_confirm";

interface Bounty {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  karmaReward: number;
  xpReward: number;
  verificationType: VerificationType;
  verificationHint: string;
  appHook?: string;
}

type Friend = (typeof FRIENDS)[number];
type Result = { accepted: number; skipped: number; xp: number; combo: number };
type Props = { onEnd: (result: Result) => void };

// ─── Category meta ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; color: string; emoji: string }> = {
  health:    { label: "HÄLSA",     color: "#22c55e", emoji: "🏃" },
  finance:   { label: "EKONOMI",   color: "#eab308", emoji: "💰" },
  social:    { label: "SOCIALT",   color: "#06b6d4", emoji: "👥" },
  learning:  { label: "LÄRANDE",   color: "#a855f7", emoji: "📚" },
  wellbeing: { label: "VÄLMÅENDE", color: "#14b8a6", emoji: "🌱" },
};

const DIFF_COLOR: Record<Difficulty, string> = {
  easy:   "#22c55e",
  medium: "#f59e0b",
  hard:   "#ef4444",
};

// ─── Bounty pool ──────────────────────────────────────────────────────────────

const BASE_BOUNTIES: Omit<Bounty, "title">[] & { titleTemplate: string }[] = [];

// We define bounties fully — social_streak titles are personalized at runtime
const STATIC_BOUNTIES: Bounty[] = [
  // ── HÄLSA ──
  {
    id: "h1", emoji: "👟", category: "health", difficulty: "easy",
    title: "Gå 10 000 steg idag",
    description: "Håll dig aktiv hela dagen och nå 10 000 steg.",
    karmaReward: 20, xpReward: 50,
    verificationType: "health_steps",
    verificationHint: "Öppna Hälsa-appen och kontrollera ditt stegantal",
    appHook: "Hälsa-appen",
  },
  {
    id: "h2", emoji: "💧", category: "health", difficulty: "easy",
    title: "Drick 2L vatten",
    description: "Håll dig hydrerad hela dagen.",
    karmaReward: 15, xpReward: 35,
    verificationType: "health_water",
    verificationHint: "Fyll en 2L flaska och drick den under dagen",
    appHook: "Dricka vatten",
  },
  {
    id: "h3", emoji: "🏋️", category: "health", difficulty: "medium",
    title: "Träna 20 min",
    description: "Valfri träning i minst 20 minuter.",
    karmaReward: 30, xpReward: 80,
    verificationType: "workout_timer",
    verificationHint: "Starta timern i verifieringsfasen och träna!",
    appHook: "Träningsapp",
  },
  {
    id: "h4", emoji: "😴", category: "health", difficulty: "easy",
    title: "Sov 7+ timmar",
    description: "Prioritera din sömn och vila ordentligt.",
    karmaReward: 25, xpReward: 60,
    verificationType: "health_sleep",
    verificationHint: "Kolla din sömndata i Hälsa-appen",
    appHook: "Hälsa-appen",
  },

  // ── EKONOMI ──
  {
    id: "e1", emoji: "🏦", category: "finance", difficulty: "easy",
    title: "Spara 50kr idag",
    description: "Gör en liten överföring till ditt sparkonto.",
    karmaReward: 35, xpReward: 70,
    verificationType: "finance_save",
    verificationHint: "Öppna Avanza/Swedbank och gör en överföring",
    appHook: "Avanza / Swedbank",
  },
  {
    id: "e2", emoji: "📈", category: "finance", difficulty: "easy",
    title: "Läs ett aktietips",
    description: "Håll dig uppdaterad på marknaden idag.",
    karmaReward: 20, xpReward: 40,
    verificationType: "finance_read",
    verificationHint: "Öppna din börsapp eller DI.se",
    appHook: "Avanza / DI.se",
  },
  {
    id: "e3", emoji: "💳", category: "finance", difficulty: "medium",
    title: "Kontrollera din budget",
    description: "Gå igenom veckans utgifter.",
    karmaReward: 30, xpReward: 65,
    verificationType: "finance_budget",
    verificationHint: "Öppna din bankkapp och granska utgifterna",
    appHook: "Bankapp",
  },

  // ── SOCIALT ──
  {
    id: "s2", emoji: "📣", category: "social", difficulty: "easy",
    title: "Skicka ett hejarop till en vän",
    description: "Peppa någon du känner med ett uppmuntrande meddelande.",
    karmaReward: 20, xpReward: 45,
    verificationType: "social_cheer",
    verificationHint: "Skicka ett riktigt meddelande till en kompis",
    appHook: "Messenger / Snapchat",
  },
  {
    id: "s3", emoji: "🏷️", category: "social", difficulty: "easy",
    title: "Tagga en vän i en utmaning",
    description: "Dela en utmaning och tagga någon som du tror kan klara den.",
    karmaReward: 25, xpReward: 55,
    verificationType: "social_tag",
    verificationHint: "Gå till sociala medier och tagga en vän",
    appHook: "Instagram / TikTok",
  },
  {
    id: "s4", emoji: "📱", category: "social", difficulty: "easy",
    title: "Dela ett framsteg på sociala medier",
    description: "Visa världen ditt senaste resultat.",
    karmaReward: 30, xpReward: 60,
    verificationType: "social_share",
    verificationHint: "Lägg upp en story eller ett inlägg",
    appHook: "Instagram / Snapchat",
  },

  // ── LÄRANDE ──
  {
    id: "l1", emoji: "🗣️", category: "learning", difficulty: "easy",
    title: "Lär dig ett nytt ord på ett nytt språk",
    description: "Utöka ditt ordförråd med minst ett ord.",
    karmaReward: 15, xpReward: 40,
    verificationType: "learn_word",
    verificationHint: "Öppna Duolingo eller Google Translate",
    appHook: "Duolingo",
  },
  {
    id: "l2", emoji: "🎙️", category: "learning", difficulty: "easy",
    title: "Lyssna på en podcast-episod",
    description: "Ta in ny kunskap via ett intressant avsnitt.",
    karmaReward: 20, xpReward: 50,
    verificationType: "learn_podcast",
    verificationHint: "Öppna Spotify eller Apple Podcasts",
    appHook: "Spotify / Podcasts",
  },
  {
    id: "l3", emoji: "📖", category: "learning", difficulty: "easy",
    title: "Läs 20 minuter",
    description: "En bok, artikel eller tidning — det räknas!",
    karmaReward: 25, xpReward: 55,
    verificationType: "learn_read",
    verificationHint: "Öppna din bok eller e-reader",
    appHook: "Kindle / Böcker",
  },

  // ── VÄLMÅENDE ──
  {
    id: "w1", emoji: "🧘", category: "wellbeing", difficulty: "easy",
    title: "Meditera 5 min",
    description: "Ta en paus och fokusera på andetaget.",
    karmaReward: 25, xpReward: 60,
    verificationType: "meditate_timer",
    verificationHint: "Starta timern och meditera tills den är klar",
    appHook: "Headspace / Calm",
  },
  {
    id: "w2", emoji: "✍️", category: "wellbeing", difficulty: "easy",
    title: "Skriv 3 saker du är tacksam för",
    description: "Fokusera på det positiva i din dag.",
    karmaReward: 20, xpReward: 45,
    verificationType: "wellbeing_gratitude",
    verificationHint: "Skriv dina tre saker nedan",
    appHook: "Anteckningar",
  },
  {
    id: "w3", emoji: "🚿", category: "wellbeing", difficulty: "hard",
    title: "Ta en kall dusch",
    description: "Bygg mental styrka och boosta cirkulationen.",
    karmaReward: 40, xpReward: 90,
    verificationType: "wellbeing_confirm",
    verificationHint: "Ärlighet är allt — gjorde du det?",
    appHook: undefined,
  },
];

// ─── Helper: pick a random online friend ─────────────────────────────────────

function pickOnlineFriend(): Friend {
  const online = FRIENDS.filter((f) => f.online);
  const pool = online.length > 0 ? online : FRIENDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Helper: get/set flash streak from localStorage ──────────────────────────

function getFlashStreak(friendId: string): number {
  if (typeof window === "undefined") return 0;
  const key = `flash_streak_${friendId}`;
  const stored = localStorage.getItem(key);
  if (stored) return parseInt(stored, 10);
  const rand = Math.floor(Math.random() * 7) + 1;
  localStorage.setItem(key, String(rand));
  return rand;
}

// ─── Difficulty dots component ────────────────────────────────────────────────

function DiffDots({ difficulty }: { difficulty: Difficulty }) {
  const filled = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  const color = DIFF_COLOR[difficulty];
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: i <= filled ? color : "#333",
            border: `1px solid ${i <= filled ? color : "#444"}`,
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

// ─── Step counter SVG ring ────────────────────────────────────────────────────

function StepRing({ steps, target = 10000 }: { steps: number; target?: number }) {
  const pct = Math.min(steps / target, 1);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="#1a2a1a" strokeWidth={12} />
        <motion.circle
          cx={65} cy={65} r={r}
          fill="none" stroke="#22c55e" strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "65px 65px" }}
        />
        <text x={65} y={60} textAnchor="middle" fill="#22c55e" fontSize={22} fontWeight="700">
          {steps.toLocaleString("sv-SE")}
        </text>
        <text x={65} y={78} textAnchor="middle" fill="#888" fontSize={11}>
          steg
        </text>
      </svg>
      <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>
        Mål: {target.toLocaleString("sv-SE")} steg
      </div>
    </div>
  );
}

// ─── Countdown timer component ────────────────────────────────────────────────

function CountdownTimer({
  totalSeconds,
  onDone,
}: {
  totalSeconds: number;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(totalSeconds);
  const doneCalledRef = useRef(false);

  useEffect(() => {
    if (left <= 0) {
      if (!doneCalledRef.current) {
        doneCalledRef.current = true;
        onDone();
      }
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);

  const pct = ((totalSeconds - left) / totalSeconds) * 100;
  const mins = Math.floor(left / 60);
  const secs = left % 60;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ color: "#14b8a6", fontSize: 40, fontWeight: 700, fontFamily: "monospace" }}>
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <div style={{ width: "100%", height: 8, background: "#1a2a2a", borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          style={{ height: "100%", background: "#14b8a6", borderRadius: 999 }}
          transition={{ duration: 0.5 }}
        />
      </div>
      {left > 0 ? (
        <div style={{ color: "#888", fontSize: 12 }}>Håll ut... du klarar det!</div>
      ) : (
        <div style={{ color: "#22c55e", fontSize: 14, fontWeight: 700 }}>Klart! 🎉</div>
      )}
    </div>
  );
}

// ─── App-connection verification screens ─────────────────────────────────────

function VerificationScreen({
  bounty,
  socialFriend,
  onReady,
}: {
  bounty: Bounty;
  socialFriend: Friend | null;
  onReady: (ready: boolean) => void;
}) {
  const vt = bounty.verificationType;

  // Steps
  if (vt === "health_steps") {
    const steps = useRef(Math.floor(Math.random() * 5001) + 7000).current;
    useEffect(() => { onReady(true); }, []);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0" }}>
        <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>HÄLSA-APPEN</div>
        <StepRing steps={steps} />
        <div style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>
          {bounty.verificationHint}
        </div>
      </div>
    );
  }

  // Workout timer (20 min = 1200s, but we demo 20s for UX)
  if (vt === "workout_timer") {
    const [timerDone, setTimerDone] = useState(false);
    useEffect(() => { onReady(timerDone); }, [timerDone]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
        <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, letterSpacing: 2, textAlign: "center" }}>TRÄNINGSTIIMER</div>
        <CountdownTimer totalSeconds={20} onDone={() => setTimerDone(true)} />
        {!timerDone && (
          <div style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>
            Timern måste löpa klart för att bekräfta
          </div>
        )}
      </div>
    );
  }

  // Meditation timer (5 min = 300s, demo 10s)
  if (vt === "meditate_timer") {
    const [timerDone, setTimerDone] = useState(false);
    useEffect(() => { onReady(timerDone); }, [timerDone]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
        <div style={{ color: "#14b8a6", fontSize: 13, fontWeight: 700, letterSpacing: 2, textAlign: "center" }}>MEDITATIONS-TIMER</div>
        <CountdownTimer totalSeconds={10} onDone={() => setTimerDone(true)} />
        {!timerDone && (
          <div style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>
            Ta djupa andetag tills timern är klar
          </div>
        )}
      </div>
    );
  }

  // Finance save — mini bank card + amount input
  if (vt === "finance_save") {
    const [amount, setAmount] = useState("");
    useEffect(() => { onReady(Number(amount) > 0); }, [amount]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 0" }}>
        {/* Bank card UI */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
          border: "1.5px solid #eab308",
          borderRadius: 16, padding: "18px 20px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ color: "#eab308", fontSize: 11, fontWeight: 700, letterSpacing: 3, marginBottom: 12 }}>AVANZA BANK</div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 4, marginBottom: 16 }}>
            •••• •••• •••• 4291
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ color: "#888", fontSize: 9, letterSpacing: 1 }}>KORTINNEHAVARE</div>
              <div style={{ color: "#eab308", fontSize: 13, fontWeight: 700 }}>DU</div>
            </div>
            <div style={{ color: "#eab308", fontSize: 20, fontWeight: 700 }}>✦</div>
          </div>
        </div>
        <div>
          <div style={{ color: "#aaa", fontSize: 12, marginBottom: 6 }}>Hur mycket sparade du? (kr)</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: "100%", padding: "10px 14px",
              background: "#0d1214", border: "2px solid #eab308",
              borderRadius: 10, color: "#eab308",
              fontSize: 20, fontWeight: 700, fontFamily: "monospace",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    );
  }

  // Health water — glasses tracker
  if (vt === "health_water") {
    const [glasses, setGlasses] = useState(0);
    const target = 8;
    useEffect(() => { onReady(glasses >= target); }, [glasses]);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0" }}>
        <div style={{ color: "#06b6d4", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>VATTEN-TRACKER</div>
        <div style={{ fontSize: 11, color: "#888" }}>Markera varje glas du druckit</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {Array.from({ length: target }).map((_, i) => (
            <motion.button key={i}
              whileTap={{ scale: 0.88 }}
              onClick={() => setGlasses(g => i < g ? i : i + 1)}
              style={{
                width: 40, height: 56, borderRadius: 10,
                background: i < glasses ? "#06b6d422" : "#0a1214",
                border: `2px solid ${i < glasses ? "#06b6d4" : "#1a3040"}`,
                fontSize: "1.4rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {i < glasses ? "💧" : "🫙"}
            </motion.button>
          ))}
        </div>
        <div style={{ color: glasses >= target ? "#22c55e" : "#06b6d4", fontSize: 13, fontWeight: 700 }}>
          {glasses}/{target} glas druckna
        </div>
      </div>
    );
  }

  // Health sleep — sleep quality selector
  if (vt === "health_sleep") {
    const [quality, setQuality] = useState<string | null>(null);
    useEffect(() => { onReady(!!quality); }, [quality]);
    const options = [
      { label: "😴 5-6h", q: "ok" }, { label: "😊 7h", q: "good" },
      { label: "🌟 8h+", q: "great" }, { label: "💤 Deep sleep", q: "perfect" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#8b5cf6", fontSize: 13, fontWeight: 700, letterSpacing: 2, textAlign: "center" }}>SÖMNKVALITET</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {options.map(o => (
            <motion.button key={o.q} whileTap={{ scale: 0.93 }} onClick={() => setQuality(o.q)} style={{
              padding: "12px 8px", borderRadius: 12, textAlign: "center",
              background: quality === o.q ? "#8b5cf622" : "#0a1214",
              border: `2px solid ${quality === o.q ? "#8b5cf6" : "#1a3040"}`,
              color: quality === o.q ? "#8b5cf6" : "#aaa",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>{o.label}</motion.button>
          ))}
        </div>
      </div>
    );
  }

  // Finance read — news article mock
  if (vt === "finance_read") {
    const [read, setRead] = useState(false);
    useEffect(() => { onReady(read); }, [read]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#eab308", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>BÖRS-NYHETER</div>
        <div style={{
          background: "#0d1214", border: "1.5px solid #1a3040",
          borderRadius: 12, padding: "12px",
        }}>
          <div style={{ fontSize: 9, color: "#eab308", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>DI.SE · IDAG</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.4, marginBottom: 6 }}>
            OMX Stockholm stiger på bred front — tech-sektorn leder uppgången
          </div>
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>
            Stockholmsbörsen handlas upp 1.3% i tidig handel. Teknikbolag och fintech leder uppgången...
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setRead(true)}
          style={{
            padding: "10px", background: read ? "#eab30822" : "#0d1214",
            border: `2px solid ${read ? "#eab308" : "#1a3040"}`,
            borderRadius: 10, color: read ? "#eab308" : "#aaa",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
          {read ? "✅ Läst!" : "📰 Markera som läst"}
        </motion.button>
      </div>
    );
  }

  // Finance budget — spending categories
  if (vt === "finance_budget") {
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const cats = ["🍕 Mat", "🎮 Underhållning", "👕 Kläder", "🚌 Transport"];
    useEffect(() => { onReady(checked.size >= 2); }, [checked.size]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#eab308", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>BUDGETÖVERSIKT</div>
        <div style={{ fontSize: 11, color: "#888" }}>Granska minst 2 kategorier</div>
        {cats.map(c => (
          <motion.button key={c} whileTap={{ scale: 0.97 }} onClick={() => setChecked(prev => {
            const n = new Set(prev);
            n.has(c) ? n.delete(c) : n.add(c);
            return n;
          })} style={{
            padding: "10px 12px", borderRadius: 10,
            background: checked.has(c) ? "#eab30822" : "#0a1214",
            border: `2px solid ${checked.has(c) ? "#eab308" : "#1a3040"}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
          }}>
            <span style={{ color: "#fff", fontSize: 13 }}>{c}</span>
            <span style={{ color: checked.has(c) ? "#eab308" : "#555", fontSize: 13 }}>
              {checked.has(c) ? "✓" : "+"}
            </span>
          </motion.button>
        ))}
      </div>
    );
  }

  // Social cheer — send message
  if (vt === "social_cheer") {
    const [msg, setMsg] = useState("");
    useEffect(() => { onReady(msg.trim().length > 5); }, [msg]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#06b6d4", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>HEJAROP</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["You got this! 💪", "Proud of you! 🌟", "Keep it up! 🔥", "Legend! 👑"].map(t => (
            <motion.button key={t} whileTap={{ scale: 0.9 }} onClick={() => setMsg(t)}
              style={{
                padding: "6px 10px", borderRadius: 8,
                background: msg === t ? "#06b6d422" : "#0a1214",
                border: `1.5px solid ${msg === t ? "#06b6d4" : "#1a3040"}`,
                color: msg === t ? "#06b6d4" : "#888",
                fontSize: 11, cursor: "pointer",
              }}>{t}</motion.button>
          ))}
        </div>
        <textarea value={msg} onChange={e => setMsg(e.target.value)}
          placeholder="Skriv ditt uppmuntrande meddelande..."
          rows={3} style={{
            width: "100%", padding: "10px 12px",
            background: "#0d1214", border: "2px solid #06b6d4",
            borderRadius: 10, color: "#fff", fontSize: 12,
            outline: "none", resize: "none", fontFamily: "inherit",
            boxSizing: "border-box",
          }} />
      </div>
    );
  }

  // Social tag — platform picker
  if (vt === "social_tag") {
    const [platform, setPlatform] = useState<string | null>(null);
    useEffect(() => { onReady(!!platform); }, [platform]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#06b6d4", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>TAGGA VÄN</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ icon: "📸", name: "Instagram" }, { icon: "🎵", name: "TikTok" }, { icon: "👻", name: "Snapchat" }, { icon: "🐦", name: "X / Twitter" }].map(p => (
            <motion.button key={p.name} whileTap={{ scale: 0.93 }} onClick={() => setPlatform(p.name)}
              style={{
                padding: "12px 8px", borderRadius: 12, textAlign: "center",
                background: platform === p.name ? "#06b6d422" : "#0a1214",
                border: `2px solid ${platform === p.name ? "#06b6d4" : "#1a3040"}`,
                color: platform === p.name ? "#06b6d4" : "#aaa",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{p.icon}</div>
              {p.name}
            </motion.button>
          ))}
        </div>
        {platform && <div style={{ color: "#06b6d4", fontSize: 12, textAlign: "center", fontWeight: 600 }}>Öppna {platform} och tagga en kompis ✓</div>}
      </div>
    );
  }

  // Social share — share preview
  if (vt === "social_share") {
    const [shared, setShared] = useState(false);
    useEffect(() => { onReady(shared); }, [shared]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#06b6d4", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>DELA FRAMSTEG</div>
        <div style={{
          background: "#0d1214", border: "1.5px solid #1a3040",
          borderRadius: 12, padding: "12px", textAlign: "center",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: 6 }}>⚡</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Karma App Update</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Jag klarade en utmaning och tjänade karma! 🌟</div>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShared(true)}
          style={{
            padding: "10px", background: shared ? "#06b6d422" : "#0a1214",
            border: `2px solid ${shared ? "#06b6d4" : "#1a3040"}`,
            borderRadius: 10, color: shared ? "#06b6d4" : "#aaa",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
          {shared ? "✅ Delat!" : "📤 Dela nu"}
        </motion.button>
      </div>
    );
  }

  // Learn word — word card flip
  if (vt === "learn_word") {
    const [revealed, setRevealed] = useState(false);
    const [learned, setLearned] = useState(false);
    useEffect(() => { onReady(learned); }, [learned]);
    const words = [{ word: "Serendipity", lang: "Engelska", meaning: "Att hitta bra saker av en slump" },
      { word: "Hygge", lang: "Danska", meaning: "Mysig, välmående samvaro" },
      { word: "Saudade", lang: "Portugisiska", meaning: "Längtan efter något älskat" }];
    const word = words[Math.floor(Math.random() * words.length)];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#a855f7", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>DAGLIGT ORD</div>
        <motion.div whileTap={{ scale: 0.97 }} onClick={() => setRevealed(true)}
          style={{
            background: revealed ? "#a855f722" : "#0a1214",
            border: `2px solid ${revealed ? "#a855f7" : "#1a3040"}`,
            borderRadius: 16, padding: "20px", textAlign: "center", cursor: "pointer",
          }}>
          <div style={{ fontSize: 9, color: "#a855f7", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>{word.lang.toUpperCase()}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 8 }}>{word.word}</div>
          {revealed ? (
            <div style={{ fontSize: 13, color: "#c084fc" }}>{word.meaning}</div>
          ) : (
            <div style={{ fontSize: 12, color: "#555" }}>Tryck för att avslöja</div>
          )}
        </motion.div>
        {revealed && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setLearned(true)}
            style={{
              padding: "10px", background: learned ? "#a855f722" : "#0d1214",
              border: `2px solid ${learned ? "#a855f7" : "#1a3040"}`,
              borderRadius: 10, color: learned ? "#a855f7" : "#aaa",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
            {learned ? "✅ Lärt mig!" : "🧠 Jag lärde mig det!"}
          </motion.button>
        )}
      </div>
    );
  }

  // Learn podcast — episode player
  if (vt === "learn_podcast") {
    const [started, setStarted] = useState(false);
    useEffect(() => { onReady(started); }, [started]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#a855f7", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>PODCAST</div>
        <div style={{
          background: "#0d1214", border: "1.5px solid #1a3040",
          borderRadius: 12, padding: "14px", display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "#a855f722", border: "1.5px solid #a855f744", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>🎙️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Ekonomipodden</div>
            <div style={{ fontSize: 11, color: "#888" }}>Avsnitt 142 · 28 min</div>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setStarted(true)}
          style={{
            padding: "12px", background: started ? "#a855f722" : "#0a1214",
            border: `2px solid ${started ? "#a855f7" : "#1a3040"}`,
            borderRadius: 10, color: started ? "#a855f7" : "#aaa",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
          {started ? "✅ Startad — lyssna nu!" : "▶️ Öppna Spotify / Podcasts"}
        </motion.button>
      </div>
    );
  }

  // Learn read — reading timer
  if (vt === "learn_read") {
    const [done, setDone] = useState(false);
    useEffect(() => { onReady(done); }, [done]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#a855f7", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>LÄSNING · 20 MIN</div>
        <CountdownTimer totalSeconds={15} onDone={() => setDone(true)} />
        {!done && <div style={{ color: "#888", fontSize: 12, textAlign: "center" }}>Öppna din bok eller artikel under läsningen</div>}
      </div>
    );
  }

  // Wellbeing confirm — honest check
  if (vt === "wellbeing_confirm") {
    const [honest, setHonest] = useState(false);
    useEffect(() => { onReady(honest); }, [honest]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 0", alignItems: "center" }}>
        <div style={{ color: "#14b8a6", fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>ÄRLIGHETSTEST</div>
        <div style={{ fontSize: "2.5rem" }}>🤔</div>
        <div style={{ fontSize: 14, color: "#fff", fontWeight: 700, textAlign: "center", lineHeight: 1.5 }}>
          {bounty.verificationHint}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHonest(false)}
            style={{ padding: "12px 20px", borderRadius: 12, background: !honest ? "#ff2d8d22" : "#0a1214", border: `2px solid ${!honest ? "#ff2d8d" : "#1a3040"}`, color: !honest ? "#ff2d8d" : "#555", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ❌ Nej
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHonest(true)}
            style={{ padding: "12px 20px", borderRadius: 12, background: honest ? "#14b8a622" : "#0a1214", border: `2px solid ${honest ? "#14b8a6" : "#1a3040"}`, color: honest ? "#14b8a6" : "#555", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ✅ Ja!
          </motion.button>
        </div>
      </div>
    );
  }

  // Social streak — friend avatar + streak animation
  if (vt === "social_streak" && socialFriend) {
    useEffect(() => { onReady(true); }, []);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "12px 0" }}>
        <div style={{ fontSize: "3.5rem" }}>{socialFriend.emoji}</div>
        <div style={{ color: "#06b6d4", fontSize: 16, fontWeight: 700 }}>@{socialFriend.username}</div>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            background: "#001a1a", border: "3px solid #06b6d4",
            borderRadius: 16, padding: "12px 24px", textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 4 }}>🤝</div>
          <div style={{ color: "#06b6d4", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>STREAK AKTIV</div>
        </motion.div>
        <div style={{ color: "#aaa", fontSize: 13, textAlign: "center" }}>
          Kontaktade du @{socialFriend.username} idag?
        </div>
      </div>
    );
  }

  // Gratitude — text input
  if (vt === "wellbeing_gratitude") {
    const [text, setText] = useState("");
    const lineCount = text.split("\n").filter((l) => l.trim().length > 0).length;
    useEffect(() => { onReady(lineCount >= 3); }, [lineCount]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        <div style={{ color: "#14b8a6", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
          Skriv 3 saker du är tacksam för ({lineCount}/3)
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"1. ...\n2. ...\n3. ..."}
          rows={5}
          style={{
            width: "100%", padding: "10px 12px",
            background: "#0d1214", border: "2px solid #14b8a6",
            borderRadius: 10, color: "#fff", fontSize: 13, lineHeight: 1.6,
            outline: "none", resize: "none", fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        {lineCount < 3 && (
          <div style={{ color: "#555", fontSize: 11 }}>
            Skriv minst 3 rader för att bekräfta
          </div>
        )}
      </div>
    );
  }

  // Default — simple confirm (health_water, health_sleep, social_cheer, etc.)
  useEffect(() => { onReady(true); }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "12px 0" }}>
      {bounty.appHook && (
        <div style={{
          background: "#0d1214", border: "1px solid #333",
          borderRadius: 10, padding: "8px 14px",
          color: "#aaa", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>📲</span>
          <span>Öppna: <strong style={{ color: "#fff" }}>{bounty.appHook}</strong></span>
        </div>
      )}
      <div style={{ color: "#888", fontSize: 13, textAlign: "center", lineHeight: 1.5 }}>
        {bounty.verificationHint}
      </div>
    </div>
  );
}

// ─── Bounty card (in blitz phase) ────────────────────────────────────────────

function BlitzCard({ bounty }: { bounty: Bounty }) {
  const cat = CATEGORY_META[bounty.category];
  return (
    <div style={{
      width: 300,
      background: "#0d1214",
      border: "2px solid #1a3040",
      borderRadius: 18,
      padding: 20,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      borderLeft: `5px solid ${cat.color}`,
      position: "relative",
    }}>
      {/* Category tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          color: cat.color, background: cat.color + "22",
          border: `1px solid ${cat.color}44`, borderRadius: 6,
          padding: "2px 7px",
        }}>
          {cat.emoji} {cat.label}
        </span>
        <DiffDots difficulty={bounty.difficulty} />
      </div>

      <div style={{ fontSize: "2rem", marginBottom: 8 }}>{bounty.emoji}</div>
      <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
        {bounty.title}
      </div>

      {/* Rewards row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          background: "#c8ff00", border: "2px solid #0a0a0a",
          borderRadius: 8, padding: "3px 10px",
          fontSize: 15, fontWeight: 700, color: "#0a0a0a",
        }}>
          +{bounty.xpReward} XP
        </span>
        <span style={{
          background: "#ff9f1c22", border: `1.5px solid #ff9f1c`,
          borderRadius: 8, padding: "3px 10px",
          fontSize: 13, fontWeight: 700, color: "#ff9f1c",
        }}>
          {bounty.karmaReward} karma
        </span>
      </div>

      {/* App hint */}
      {bounty.appHook && (
        <div style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 5,
          color: "#555", fontSize: 10,
        }}>
          <span>📲</span>
          <span>{bounty.appHook}</span>
        </div>
      )}
    </div>
  );
}

// ─── Verify card (swipeable) ──────────────────────────────────────────────────

function VerifyCard({
  bounty,
  index,
  total,
  socialFriend,
  onConfirm,
  onDeny,
}: {
  bounty: Bounty;
  index: number;
  total: number;
  socialFriend: Friend | null;
  onConfirm: () => void;
  onDeny: () => void;
}) {
  const cat = CATEGORY_META[bounty.category];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-10, 10]);
  const confirmOpacity = useTransform(x, [20, 80], [0, 1]);
  const denyOpacity = useTransform(x, [-80, -20], [1, 0]);

  const [verifyReady, setVerifyReady] = useState(false);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 80 && verifyReady) onConfirm();
    else if (info.offset.x < -80) onDeny();
    else x.set(0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Progress */}
      <div style={{ color: "#aaa", fontSize: 13, fontWeight: 600, letterSpacing: 1, textAlign: "center" }}>
        Verifierar <span style={{ color: "#00e5ff", fontWeight: 700 }}>{index + 1}</span>/{total}
      </div>
      <div style={{ width: "100%", height: 5, background: "#111", borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(index / total) * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: "#00e5ff", borderRadius: 999 }}
        />
      </div>

      {/* Swipe hint */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
        <div style={{ color: "#ff2d8d", fontSize: 11, fontWeight: 600 }}>← Swajpa = hoppa</div>
        <div style={{ color: "#c8ff00", fontSize: 11, fontWeight: 600 }}>Swajpa = klar →</div>
      </div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        style={{ x, rotate, cursor: "grab", position: "relative", width: "100%", maxWidth: 340 }}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          background: "#0d1214", border: "2px solid #1a3040",
          borderLeft: `5px solid ${cat.color}`,
          borderRadius: 18, padding: "18px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)", userSelect: "none",
        }}>
          {/* Confirm overlay */}
          <motion.div style={{
            opacity: confirmOpacity, position: "absolute", top: 12, right: 12,
            background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 10,
            padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#0a0a0a",
            pointerEvents: "none",
          }}>
            KLAR ✓
          </motion.div>
          {/* Deny overlay */}
          <motion.div style={{
            opacity: denyOpacity, position: "absolute", top: 12, left: 12,
            background: "#ff2d8d", border: "2px solid #0a0a0a", borderRadius: 10,
            padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#fff",
            pointerEvents: "none",
          }}>
            HOPPA ✗
          </motion.div>

          {/* Category tag */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: cat.color, background: cat.color + "22",
              border: `1px solid ${cat.color}44`, borderRadius: 6, padding: "2px 7px",
            }}>
              {cat.emoji} {cat.label}
            </span>
            <DiffDots difficulty={bounty.difficulty} />
          </div>

          <div style={{ fontSize: "1.8rem", marginBottom: 6, textAlign: "center" }}>{bounty.emoji}</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 10, textAlign: "center" }}>
            {bounty.title}
          </div>

          {/* Rewards */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              background: "#c8ff00", border: "2px solid #0a0a0a",
              borderRadius: 8, padding: "2px 10px",
              fontSize: 13, fontWeight: 700, color: "#0a0a0a",
            }}>
              +{bounty.xpReward} XP
            </span>
            <span style={{
              background: "#ff9f1c22", border: "1.5px solid #ff9f1c",
              borderRadius: 8, padding: "2px 10px",
              fontSize: 12, fontWeight: 700, color: "#ff9f1c",
            }}>
              {bounty.karmaReward} karma
            </span>
          </div>

          {/* App-specific verification screen */}
          <VerificationScreen
            bounty={bounty}
            socialFriend={socialFriend}
            onReady={setVerifyReady}
          />

          {!verifyReady && (
            <div style={{
              background: "#1a0010", border: "1px solid #ff2d8d44",
              borderRadius: 8, padding: "6px 10px", marginTop: 8,
              color: "#ff2d8d", fontSize: 11, textAlign: "center",
            }}>
              Slutför ovan för att bekräfta
            </div>
          )}
        </div>
      </motion.div>

      {/* Tap buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
        <button
          onClick={onDeny}
          style={{
            padding: "13px", background: "#1a0010",
            border: "3px solid #ff2d8d", borderRadius: 14,
            fontSize: 15, fontWeight: 700, color: "#ff2d8d", cursor: "pointer",
          }}
        >
          ❌ Inte gjort
        </button>
        <button
          onClick={verifyReady ? onConfirm : undefined}
          style={{
            padding: "13px",
            background: verifyReady ? "#0a1a00" : "#111",
            border: `3px solid ${verifyReady ? "#c8ff00" : "#333"}`,
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            color: verifyReady ? "#c8ff00" : "#444",
            cursor: verifyReady ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          ✅ JAG GJORDE DET
        </button>
      </div>
    </div>
  );
}

// ─── Flash Streak banner ──────────────────────────────────────────────────────

function FlashStreakBanner({ friend, streak }: { friend: Friend; streak: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(90deg, #001a1a 0%, #00111a 100%)",
        border: "2px solid #06b6d4",
        borderRadius: 14, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ fontSize: "1.8rem" }}
      >
        ⚡
      </motion.div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#06b6d4", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 2 }}>
          FLASH STREAK
        </div>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
          Du och{" "}
          <span style={{ color: "#06b6d4" }}>
            {friend.emoji} @{friend.username}
          </span>{" "}
          har en <span style={{ color: "#ffde00" }}>{streak}-dagars streak!</span> Håll den igång!
        </div>
      </div>
      <div style={{
        background: "#ffde0022", border: "2px solid #ffde00",
        borderRadius: 10, padding: "4px 10px",
        color: "#ffde00", fontSize: 18, fontWeight: 700,
        textAlign: "center", minWidth: 40,
      }}>
        {streak}
        <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 1, marginTop: -2 }}>DAGAR</div>
      </div>
    </motion.div>
  );
}

// ─── Category filter bar ──────────────────────────────────────────────────────

const CATEGORY_ORDER: Array<"all" | Category> = [
  "all", "health", "finance", "social", "learning", "wellbeing",
];

function CategoryFilter({
  selected,
  onChange,
}: {
  selected: "all" | Category;
  onChange: (c: "all" | Category) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
      {CATEGORY_ORDER.map((c) => {
        const isAll = c === "all";
        const meta = isAll ? null : CATEGORY_META[c as Category];
        const active = selected === c;
        const color = meta ? meta.color : "#00e5ff";
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              padding: "6px 12px",
              background: active ? color + "22" : "#0d1214",
              border: `2px solid ${active ? color : "#1a3040"}`,
              borderRadius: 999,
              color: active ? color : "#555",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {isAll ? "ALLA" : `${meta!.emoji} ${meta!.label}`}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BountyBlitz({ onEnd }: Props) {
  // ── Core state ──
  const [phase, setPhase] = useState<"idle" | "on" | "verifying" | "over">("idle");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [timeLeft, setTimeLeft] = useState(BLITZ_TIME);
  const [queue, setQueue] = useState<Bounty[]>([]);
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState<"accept" | "skip" | null>(null);

  // ── Verification state ──
  const [acceptedBounties, setAcceptedBounties] = useState<Bounty[]>([]);
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [verifiedBounties, setVerifiedBounties] = useState<Bounty[]>([]);
  const [verifyFeedback, setVerifyFeedback] = useState<"confirm" | "deny" | null>(null);

  // ── Results ──
  const [finalXP, setFinalXP] = useState(0);
  const [finalKarma, setFinalKarma] = useState(0);

  // ── Friend / streak (stable across renders) ──
  const streakFriendRef = useRef<Friend>(pickOnlineFriend());
  const streakCountRef = useRef<number>(0);
  const [streakReady, setStreakReady] = useState(false);

  useEffect(() => {
    streakCountRef.current = getFlashStreak(streakFriendRef.current.id);
    setStreakReady(true);
  }, []);

  // ── Social friend for social_streak bounties ──
  const socialFriendRef = useRef<Friend>(pickOnlineFriend());

  // ── Swipe motion values ──
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-12, 12]);
  const opacity = useTransform(x, [-200, -80, 0, 80, 200], [0, 1, 1, 1, 0]);
  const acceptOpacity = useTransform(x, [20, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, -20], [1, 0]);

  // ── Refs for closure-safe mutation ──
  const acceptedListRef = useRef<Bounty[]>([]);
  const acceptedRef = useRef(0);
  const skippedRef = useRef(0);
  const totalXPRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);

  // Build bounty pool with friend-personalized social_streak bounties
  function buildBountyPool(filter: "all" | Category): Bounty[] {
    const friend = socialFriendRef.current;
    const personalizedStreak: Bounty = {
      id: "s1", emoji: "🤝", category: "social", difficulty: "medium",
      title: `Gör en daily streak med @${friend.username}`,
      description: `Håll kontakten med ${friend.emoji} @${friend.username} varje dag.`,
      karmaReward: 40, xpReward: 85,
      verificationType: "social_streak",
      verificationHint: `Kontaktade du @${friend.username} idag?`,
      appHook: "Messenger / Snapchat",
    };
    const all: Bounty[] = [...STATIC_BOUNTIES, personalizedStreak];
    const filtered = filter === "all" ? all : all.filter((b) => b.category === filter);
    return [...filtered].sort(() => Math.random() - 0.5);
  }

  const start = useCallback(() => {
    const pool = buildBountyPool(categoryFilter);
    setQueue(pool);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // ── Timer ──
  useEffect(() => {
    if (phase !== "on") return;
    if (timeLeft <= 0) {
      setPhase("verifying");
      setVerifyIndex(0);
      setVerifiedBounties([]);
      setAcceptedBounties([...acceptedListRef.current]);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // ── Blitz actions ──
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
    setTimeout(() => { setFeedback(null); setCurrent((c) => c + 1); x.set(0); }, 200);
  }

  function skip() {
    if (phase !== "on") return;
    skippedRef.current += 1;
    comboRef.current = 0;
    setSkipped(skippedRef.current);
    setCombo(0);
    setFeedback("skip");
    setTimeout(() => { setFeedback(null); setCurrent((c) => c + 1); x.set(0); }, 200);
  }

  // ── Verification ──
  function verifyConfirm() {
    const b = acceptedBounties[verifyIndex];
    setVerifyFeedback("confirm");
    setTimeout(() => {
      setVerifyFeedback(null);
      const next = [...verifiedBounties, b];
      advanceVerification(verifyIndex + 1, next);
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
      const verifiedXP = currentVerified.reduce((sum, b) => sum + b.xpReward, 0);
      const verifiedKarma =
        currentVerified.reduce((sum, b) => sum + b.karmaReward, 0) +
        (maxComboRef.current >= 3 ? 50 : 0);
      setFinalXP(verifiedXP);
      setFinalKarma(verifiedKarma);
      setVerifiedBounties(currentVerified);
      setPhase("over");
      onEnd({
        accepted: currentVerified.length,
        skipped: skippedRef.current + (acceptedBounties.length - currentVerified.length),
        xp: verifiedXP,
        combo: maxComboRef.current,
      });
    } else {
      setVerifyIndex(nextIndex);
    }
  }

  // ── Derived ──
  const bounty = queue[current];
  const timerPct = (timeLeft / BLITZ_TIME) * 100;
  const timerColor = timeLeft <= 5 ? "#ff2d8d" : timeLeft <= 10 ? "#ff6b35" : "#00e5ff";
  const currentVerifyBounty = acceptedBounties[verifyIndex];

  // ── Render ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ─── Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#00e5ff", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>BOUNTY BLITZ</div>
          <div style={{ color: "#555", fontSize: 12 }}>✓ {accepted} accepterade · ✗ {skipped} hoppade</div>
        </div>
        {phase === "on" && (
          <div style={{ textAlign: "right" }}>
            <div style={{
              color: timerColor, fontSize: 32, fontWeight: 700,
              fontFamily: "monospace", lineHeight: 1,
              textShadow: timeLeft <= 5 ? "0 0 10px #ff2d8d" : "none",
            }}>
              {timeLeft}
            </div>
            <div style={{ color: "#555", fontSize: 10 }}>sekunder</div>
          </div>
        )}
        {phase === "verifying" && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#00e5ff", fontSize: 14, fontWeight: 700 }}>VERIFIERA</div>
            <div style={{ color: "#555", fontSize: 10 }}>fas</div>
          </div>
        )}
      </div>

      {/* Timer bar */}
      {phase === "on" && (
        <div style={{ height: 6, background: "#111", borderRadius: 999, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${timerPct}%` }}
            style={{ height: "100%", background: timerColor, borderRadius: 999, transition: "background 0.3s" }}
          />
        </div>
      )}

      {/* Combo badge */}
      <AnimatePresence>
        {combo >= COMBO_THRESHOLD && phase === "on" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }}
            style={{
              textAlign: "center", color: "#ffde00", fontSize: 14, fontWeight: 700,
              background: "#1a1400", border: "2px solid #ffde00", borderRadius: 10, padding: "4px 12px",
            }}
          >
            🔥 COMBO ×{combo} — +{Math.floor(30)}% XP BONUS!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── IDLE PHASE ─── */}
      {phase === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Flash Streak banner */}
          {streakReady && (
            <FlashStreakBanner friend={streakFriendRef.current} streak={streakCountRef.current} />
          )}

          {/* Category filter */}
          <CategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />

          <div style={{ color: "#aaa", fontSize: 13, textAlign: "center" }}>
            Acceptera så många uppdrag du kan på {BLITZ_TIME} sekunder! Swajpa höger ✓ eller tryck ACCEPTERA.
            Bygg kombos för bonus-XP. Verifiera sedan vad du faktiskt gjort!
          </div>
          <button
            onClick={start}
            style={{
              padding: "14px 44px", background: "#00e5ff",
              border: "3px solid #0a0a0a", borderRadius: 14,
              fontSize: 16, fontWeight: 700, color: "#0a0a0a",
              cursor: "pointer", boxShadow: "4px 4px 0 #0a0a0a",
              alignSelf: "center",
            }}
          >
            STARTA BLITZ!
          </button>
        </div>
      )}

      {/* ─── BLITZ PHASE ─── */}
      {phase === "on" && bounty ? (
        <>
          <div style={{ position: "relative", height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Next card peek */}
            {queue[current + 1] && (
              <div style={{
                position: "absolute", top: 8, width: "90%", height: 200,
                background: "#0d1214", border: "2px solid #1a2a2a",
                borderRadius: 16, transform: "rotate(2deg)",
              }} />
            )}

            {/* Current card */}
            <motion.div
              drag="x"
              dragConstraints={{ left: -200, right: 200 }}
              style={{ x, rotate, opacity, cursor: "grab", position: "relative", zIndex: 2 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) accept();
                else if (info.offset.x < -80) skip();
                else x.set(0);
              }}
            >
              <BlitzCard bounty={bounty} />

              {/* Accept overlay */}
              <motion.div style={{
                opacity: acceptOpacity, position: "absolute", top: 12, right: 12,
                background: "#c8ff00", border: "2px solid #0a0a0a", borderRadius: 10,
                padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#0a0a0a",
                pointerEvents: "none",
              }}>
                ACCEPTERA ✓
              </motion.div>
              {/* Skip overlay */}
              <motion.div style={{
                opacity: skipOpacity, position: "absolute", top: 12, left: 12,
                background: "#ff2d8d", border: "2px solid #0a0a0a", borderRadius: 10,
                padding: "4px 10px", fontSize: 13, fontWeight: 700, color: "#fff",
                pointerEvents: "none",
              }}>
                HOPPA ✗
              </motion.div>
            </motion.div>

            {/* Feedback flash */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: "absolute", fontSize: "3rem", pointerEvents: "none", zIndex: 10 }}
                >
                  {feedback === "accept" ? "✅" : "❌"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button
              onClick={skip}
              style={{
                padding: "14px", background: "#1a0010",
                border: "3px solid #ff2d8d", borderRadius: 14,
                fontSize: 18, fontWeight: 700, color: "#ff2d8d", cursor: "pointer",
              }}
            >
              ✗ HOPPA
            </button>
            <button
              onClick={accept}
              style={{
                padding: "14px", background: "#0a1a00",
                border: "3px solid #c8ff00", borderRadius: 14,
                fontSize: 18, fontWeight: 700, color: "#c8ff00", cursor: "pointer",
              }}
            >
              ✓ ACCEPTERA
            </button>
          </div>

          <div style={{ textAlign: "center", color: "#c8ff00", fontSize: 15, fontWeight: 700 }}>
            ⚡ {totalXP} XP hittills
          </div>
        </>
      ) : phase === "on" ? (
        <div style={{ textAlign: "center", padding: 40, color: "#555" }}>
          Inga fler uppdrag! Väntar på timern...
        </div>
      ) : null}

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
            <div style={{
              background: "#001a1a", border: "3px solid #00e5ff",
              borderRadius: 16, padding: "14px 18px", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>🔍</div>
              <div style={{ color: "#00e5ff", fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
                VERIFIERA GENOMFÖRDA
              </div>
              <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                Har du faktiskt gjort dessa? Bara bekräftade räknas!
              </div>
              <div style={{ color: "#555", fontSize: 11, marginTop: 6 }}>
                Du accepterade {acceptedBounties.length} uppdrag
              </div>
            </div>

            {acceptedBounties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", padding: 20, color: "#555" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>😅</div>
                <div>Inget att verifiera!</div>
                <button
                  onClick={() => {
                    setFinalXP(0); setFinalKarma(0);
                    setPhase("over");
                    onEnd({ accepted: 0, skipped: skippedRef.current, xp: 0, combo: maxComboRef.current });
                  }}
                  style={{
                    marginTop: 14, padding: "10px 28px",
                    background: "#00e5ff", border: "3px solid #0a0a0a",
                    borderRadius: 12, fontSize: 14, fontWeight: 700,
                    color: "#0a0a0a", cursor: "pointer",
                  }}
                >
                  Se Resultat
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
                  style={{ position: "relative" }}
                >
                  {/* Verify feedback flash */}
                  <AnimatePresence>
                    {verifyFeedback && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          position: "absolute", fontSize: "3rem",
                          pointerEvents: "none", zIndex: 10,
                          left: "50%", top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {verifyFeedback === "confirm" ? "✅" : "❌"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <VerifyCard
                    bounty={currentVerifyBounty}
                    index={verifyIndex}
                    total={acceptedBounties.length}
                    socialFriend={socialFriendRef.current}
                    onConfirm={verifyConfirm}
                    onDeny={verifyDeny}
                  />
                </motion.div>
              </AnimatePresence>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── RESULTS PHASE ─── */}
      {phase === "over" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "#001a1a", border: "3px solid #00e5ff",
            borderRadius: 18, padding: 20, textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: 6 }}>💥</div>
          <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>BLITZ KLAR!</div>

          {/* Verified vs accepted */}
          <div style={{
            background: "#0a1a1a", border: "2px solid #1a3a3a",
            borderRadius: 12, padding: "10px 16px", margin: "12px 0 8px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <span style={{ color: "#c8ff00", fontSize: 18, fontWeight: 700 }}>{verifiedBounties.length}</span>
            <span style={{ color: "#555", fontSize: 12 }}>verifierade</span>
            <span style={{ color: "#333", fontSize: 18 }}>/</span>
            <span style={{ color: "#aaa", fontSize: 18, fontWeight: 700 }}>{accepted}</span>
            <span style={{ color: "#555", fontSize: 12 }}>accepterade</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "10px 0" }}>
            {([
              ["✅ Verifierade", verifiedBounties.length],
              ["✗ Ej gjorda", accepted - verifiedBounties.length + skipped],
              ["⚡ XP Intjänat", finalXP],
              ["🔥 Max Kombo", `×${maxComboRef.current}`],
            ] as [string, string | number][]).map(([label, val]) => (
              <div
                key={label}
                style={{
                  background: "#0a1a1a", border: "2px solid #1a3a3a",
                  borderRadius: 10, padding: "10px 6px",
                }}
              >
                <div style={{ color: "#00e5ff", fontSize: 20, fontWeight: 700 }}>{val}</div>
                <div style={{ color: "#555", fontSize: 11 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ color: "#c8ff00", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
            +{finalKarma} karma intjänat!
          </div>
          <button
            onClick={start}
            style={{
              padding: "10px 32px", background: "#00e5ff",
              border: "3px solid #0a0a0a", borderRadius: 12,
              fontSize: 14, fontWeight: 700, color: "#0a0a0a",
              cursor: "pointer", boxShadow: "3px 3px 0 #0a0a0a",
            }}
          >
            BLITZA IGEN
          </button>
        </motion.div>
      )}
    </div>
  );
}
