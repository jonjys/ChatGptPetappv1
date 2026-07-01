"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

type MediaItem = { url: string; type: "image" | "video" };

type Msg = {
  id: string;
  user: string;
  emoji: string;
  text: string;
  ts: number;
  karma?: number;
  reactions: Record<string, number>;
  isMe?: boolean;
  media?: MediaItem;
};

const CHANNELS = [
  { id: "world",   label: "🌍 World",    desc: "All KARMA users" },
  { id: "local",   label: "📍 Lokalt",   desc: "Ditt område" },
  { id: "friends", label: "👥 Vänner",   desc: "Ditt gäng" },
];

const STARTERS: Msg[] = [
  { id: "1", user: "ZaraQ",   emoji: "💜", text: "Dags att grinda idag!! 🔥",                    ts: Date.now() - 240000, reactions: { "🔥": 4, "💪": 2 } },
  { id: "2", user: "AlexK",   emoji: "😎", text: "Precis fångat en Legendary fisk 🐉🎣",          ts: Date.now() - 180000, reactions: { "🎉": 6, "😮": 3 } },
  { id: "3", user: "MiaS",    emoji: "🌸", text: "Vem vill ha en dual streak? 🤝",                ts: Date.now() - 120000, reactions: { "✋": 5 } },
  { id: "4", user: "LeoV",    emoji: "⚡", text: "DNA Breaker level 47 done! Infinite grind 💀",  ts: Date.now() - 80000,  reactions: { "👑": 8, "🙌": 4 } },
  { id: "5", user: "NickF",   emoji: "🔥", text: "KARMA VILLE är sjuk, 28 karma/h passivt nu",   ts: Date.now() - 40000,  reactions: { "🏙️": 5, "💯": 3 } },
  { id: "6", user: "EvaP",    emoji: "🌟", text: "Daglig potten är 249kr idag! 💰💰",             ts: Date.now() - 15000,  reactions: { "💰": 12, "🙏": 6 } },
];

const QUICK_MSGS = ["🔥", "💯", "GG", "Lets go!", "Grind time!", "Ez clap", "🏆", "Ggs fr"];
const EMOJIS_REACT = ["🔥", "💯", "❤️", "😮", "🎉", "👑", "💪", "🙌", "💀", "🤣"];

function timeLabel(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just nu";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function ChatPage() {
  const { user, addKarma, showToast } = useApp();
  const [channel, setChannel]           = useState("world");
  const [msgs, setMsgs]                 = useState<Msg[]>(STARTERS);
  const [input, setInput]               = useState("");
  const [reactingOn, setReactingOn]     = useState<string | null>(null);
  const [karmaBoostTarget, setKarmaBoostTarget] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaItem | null>(null);
  const [showAttach, setShowAttach]     = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Simulate incoming messages
  useEffect(() => {
    const BOT_MSGS = [
      { user: "ZaraQ", emoji: "💜", text: "Who else is in the daily pot today? 👀" },
      { user: "AlexK", emoji: "😎", text: "Just hit level 15! Battle arena unlocked 🏟️" },
      { user: "EvaP",  emoji: "🌟", text: "Bounty Blitz gave me 400 karma lmaooo" },
      { user: "LeoV",  emoji: "⚡", text: "Anyone want to battle? My pet is LV 8 🐯" },
    ];
    const iv = setInterval(() => {
      if (Math.random() > 0.6) {
        const bot = BOT_MSGS[Math.floor(Math.random() * BOT_MSGS.length)];
        setMsgs(prev => [...prev, { id: String(Date.now()), user: bot.user, emoji: bot.emoji, text: bot.text, ts: Date.now(), reactions: {} }]);
      }
    }, 12000);
    return () => clearInterval(iv);
  }, []);

  const send = useCallback(() => {
    if (!input.trim() && !mediaPreview) return;
    const msg: Msg = {
      id: String(Date.now()),
      user: user.displayName,
      emoji: user.avatarEmoji,
      text: input.trim(),
      ts: Date.now(),
      reactions: {},
      isMe: true,
      media: mediaPreview ?? undefined,
    };
    setMsgs(prev => [...prev, msg]);
    setInput("");
    setMediaPreview(null);
    setShowAttach(false);
  }, [input, mediaPreview, user]);

  function addReaction(msgId: string, emoji: string) {
    setMsgs(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const r = { ...m.reactions };
      r[emoji] = (r[emoji] ?? 0) + 1;
      return { ...m, reactions: r };
    }));
    setReactingOn(null);
  }

  function sendKarmaBoost(u: string) {
    addKarma(-10, "Karma boost sent");
    showToast(`⚡ Skickade 10 karma till ${u}! 💸`, undefined, "#c8ff00", "⚡");
    setKarmaBoostTarget(null);
  }

  function sendQuick(text: string) {
    setMsgs(prev => [...prev, { id: String(Date.now()), user: user.displayName, emoji: user.avatarEmoji, text, ts: Date.now(), reactions: {}, isMe: true }]);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
    setMediaPreview({ url, type });
    setShowAttach(false);
    e.target.value = "";
  }

  return (
    <div style={{ background: "#0a0a0a", height: "100dvh", display: "flex", flexDirection: "column", color: "#fff" }}>

      {/* Header */}
      <div style={{
        background: "rgba(10,10,10,0.98)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "12px 16px 8px", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Link href="/feed" style={{ color: "#888", fontSize: 20, textDecoration: "none" }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.04em" }}>💬 KARMA CHAT</div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, overflowX: "auto", scrollbarWidth: "none" }}>
            {CHANNELS.map(ch => (
              <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
                background: channel === ch.id ? "#c8ff00" : "#111",
                border: `1.5px solid ${channel === ch.id ? "#c8ff00" : "#222"}`,
                borderRadius: 10, padding: "3px 10px",
                fontSize: 11, fontWeight: 700,
                color: channel === ch.id ? "#0a0a0a" : "#666",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{ch.label}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#4caf50" }}>● {137 + Math.floor(Math.random() * 20)} online</div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef}   type="file" accept="image/*,video/*"         style={{ display: "none" }} onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*"    capture="environment" style={{ display: "none" }} onChange={handleFile} />
      <input ref={videoRef}  type="file" accept="video/*"    capture="environment" style={{ display: "none" }} onChange={handleFile} />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", scrollbarWidth: "none" }}>
        {msgs.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: msg.isMe ? "row-reverse" : "row", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
            {!msg.isMe && (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a1a1a", border: "1.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{msg.emoji}</div>
            )}
            <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", alignItems: msg.isMe ? "flex-end" : "flex-start" }}>
              {!msg.isMe && <div style={{ fontSize: 9, color: "#555", fontWeight: 700, marginBottom: 2, paddingLeft: 4 }}>{msg.user}</div>}
              <div onDoubleClick={() => setReactingOn(msg.id)} style={{
                background: msg.isMe ? "#c8ff00" : "#1a1a1a",
                borderRadius: msg.isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                overflow: "hidden",
                cursor: "default",
              }}>
                {msg.media && (
                  msg.media.type === "image"
                    ? <img src={msg.media.url} alt="" style={{ width: "100%", maxWidth: 220, display: "block", borderRadius: msg.text ? "18px 18px 0 0" : "inherit" }} />
                    : <video src={msg.media.url} controls style={{ width: "100%", maxWidth: 220, display: "block" }} />
                )}
                {msg.text && (
                  <div style={{ padding: "9px 13px", fontSize: 14, color: msg.isMe ? "#0a0a0a" : "#fff" }}>
                    {msg.text}
                  </div>
                )}
              </div>
              {Object.keys(msg.reactions).length > 0 && (
                <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                  {Object.entries(msg.reactions).map(([emoji, count]) => (
                    <button key={emoji} onClick={() => addReaction(msg.id, emoji)} style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "2px 6px", fontSize: 11, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 3 }}>
                      {emoji} <span style={{ color: "#888" }}>{count}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 9, color: "#333", marginTop: 2, paddingLeft: msg.isMe ? 0 : 4 }}>{timeLabel(msg.ts)}</div>
            </div>
            {!msg.isMe && (
              <button onClick={() => setKarmaBoostTarget(msg.user)} style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", padding: "0 2px", opacity: 0.35 }}>⚡</button>
            )}
          </motion.div>
        ))}

        {/* Reaction picker */}
        <AnimatePresence>
          {reactingOn && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              style={{ position: "fixed", bottom: 130, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", border: "1.5px solid #333", borderRadius: 20, padding: "10px 14px", display: "flex", gap: 8, zIndex: 500, maxWidth: 520 }}>
              {EMOJIS_REACT.map(e => (
                <button key={e} onClick={() => addReaction(reactingOn, e)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer" }}>{e}</button>
              ))}
              <button onClick={() => setReactingOn(null)} style={{ background: "none", border: "none", color: "#555", fontSize: "0.9rem", cursor: "pointer" }}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Karma boost confirm */}
        <AnimatePresence>
          {karmaBoostTarget && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
              onClick={() => setKarmaBoostTarget(null)}>
              <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
                style={{ background: "#111", border: "2px solid #c8ff00", borderRadius: 20, padding: "24px 20px", textAlign: "center", maxWidth: 300, width: "100%" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⚡</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Skicka Karma Boost</div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Ge 10 ⚡ till <strong style={{ color: "#c8ff00" }}>{karmaBoostTarget}</strong></div>
                <button onClick={() => sendKarmaBoost(karmaBoostTarget!)}
                  style={{ width: "100%", padding: "14px", background: "#c8ff00", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 900, color: "#0a0a0a", cursor: "pointer" }}>
                  BOOST ⚡
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Attach sheet */}
      <AnimatePresence>
        {showAttach && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            style={{ background: "#111", borderTop: "1px solid #222", padding: "12px 16px 16px", flexShrink: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { icon: "📷", label: "Kamera", action: () => cameraRef.current?.click() },
                { icon: "🎥", label: "Video",  action: () => videoRef.current?.click() },
                { icon: "🖼️", label: "Galleri", action: () => fileRef.current?.click() },
                { icon: "🎵", label: "Ljud",   action: () => showToast("Snart! 🎵", undefined, "#a855f7", "🎵") },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: 14, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <span style={{ fontSize: "1.6rem" }}>{btn.icon}</span>
                  <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>{btn.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media preview */}
      <AnimatePresence>
        {mediaPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: "8px 16px 0", flexShrink: 0, position: "relative", display: "inline-block" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {mediaPreview.type === "image"
                ? <img src={mediaPreview.url} alt="" style={{ height: 80, borderRadius: 12, border: "2px solid #c8ff00" }} />
                : <video src={mediaPreview.url} style={{ height: 80, borderRadius: 12, border: "2px solid #c8ff00" }} />
              }
              <button onClick={() => setMediaPreview(null)}
                style={{ position: "absolute", top: -6, right: -6, background: "#ff4444", border: "none", borderRadius: "50%", width: 20, height: 20, color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick replies */}
      <div style={{ padding: "6px 14px 0", flexShrink: 0, display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {QUICK_MSGS.map(m => (
          <button key={m} onClick={() => sendQuick(m)}
            style={{ background: "#111", border: "1px solid #222", borderRadius: 20, padding: "5px 11px", fontSize: 12, fontWeight: 600, color: "#888", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {m}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ padding: "8px 12px calc(env(safe-area-inset-bottom) + 16px)", flexShrink: 0, display: "flex", gap: 8, alignItems: "flex-end", background: "#0a0a0a", borderTop: "1px solid #111" }}>
        <button onClick={() => setShowAttach(v => !v)}
          style={{ width: 40, height: 40, borderRadius: "50%", background: showAttach ? "#c8ff00" : "#111", border: "1.5px solid #222", flexShrink: 0, cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {showAttach ? "✕" : "+"}
        </button>
        <div style={{ flex: 1, position: "relative" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Skriv ett meddelande..." maxLength={200}
            style={{ width: "100%", padding: "11px 14px", background: "#111", border: "1.5px solid #222", borderRadius: 20, fontSize: 14, color: "#fff", outline: "none" }}
          />
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={send}
          style={{ width: 42, height: 42, borderRadius: "50%", background: (input.trim() || mediaPreview) ? "#c8ff00" : "#111", border: `1.5px solid ${(input.trim() || mediaPreview) ? "#c8ff00" : "#222"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
          {(input.trim() || mediaPreview) ? "↑" : "✨"}
        </motion.button>
      </div>
    </div>
  );
}
