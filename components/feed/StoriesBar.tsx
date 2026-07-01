"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STORIES } from "@/lib/mock-data";
import type { Story } from "@/types/game";

const STORY_DURATION = 5000;

export default function StoriesBar() {
  const [stories, setStories] = useState(STORIES);
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const viewing = viewingIdx !== null ? stories[viewingIdx] : null;

  const close = useCallback(() => {
    setViewingIdx(null);
    setProgress(0);
    setReactionOpen(false);
    setReplyText("");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const goNext = useCallback(() => {
    if (viewingIdx === null) return;
    if (viewingIdx < stories.length - 1) {
      const next = viewingIdx + 1;
      setViewingIdx(next);
      setStories(s => s.map((st, i) => i === next ? { ...st, seen: true } : st));
      setProgress(0);
    } else {
      close();
    }
  }, [viewingIdx, stories.length, close]);

  const goPrev = useCallback(() => {
    if (viewingIdx === null) return;
    if (viewingIdx > 0) {
      setViewingIdx(viewingIdx - 1);
      setProgress(0);
    }
  }, [viewingIdx]);

  // Auto-advance timer
  useEffect(() => {
    if (viewingIdx === null) return;
    if (reactionOpen) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    startRef.current = Date.now();
    setProgress(0);
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= STORY_DURATION) {
        goNext();
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [viewingIdx, reactionOpen, goNext]);

  function open(idx: number) {
    if (stories[idx].id === "st0") return; // "Add story" — no viewer
    setViewingIdx(idx);
    setStories(s => s.map((st, i) => i === idx ? { ...st, seen: true } : st));
    setProgress(0);
    setReactionOpen(false);
  }

  function react(emoji: string) {
    setSentReaction(emoji);
    setTimeout(() => { setSentReaction(null); setReactionOpen(false); }, 1200);
  }

  function sendReply() {
    if (!replyText.trim()) return;
    setSentReaction("💬");
    setReplyText("");
    setTimeout(() => { setSentReaction(null); setReactionOpen(false); }, 1200);
  }

  return (
    <>
      {/* Stories row */}
      <div className="flex gap-3 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
        {stories.map((story, idx) => (
          <button
            key={story.id}
            onClick={() => story.id === "st0" ? null : open(idx)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: story.seen ? "transparent" : `conic-gradient(${story.bgColor} 0%, ${story.bgColor} 70%, transparent 70%)`,
              padding: 2.5,
              boxShadow: story.seen ? "none" : `0 0 12px ${story.bgColor}66`,
              border: story.seen ? "2px solid #333" : "none",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "#111",
                border: "2px solid #000",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem",
              }}>
                {story.id === "st0"
                  ? <span style={{ fontSize: "1.5rem", color: "#c8ff00", fontWeight: 700 }}>+</span>
                  : story.avatarEmoji}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: story.seen ? 400 : 700,
              color: story.seen ? "#555" : "#ddd",
              maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {story.username === "You" ? "Your story" : story.username}
            </span>
          </button>
        ))}
      </div>

      {/* Full-screen story viewer */}
      <AnimatePresence>
        {viewing && viewingIdx !== null && (
          <motion.div
            key="story-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: viewing.bgColor,
              display: "flex", flexDirection: "column",
              maxWidth: 560, margin: "0 auto",
              left: "50%", transform: "translateX(-50%)",
              width: "100%",
            }}
          >
            {/* Progress bars */}
            <div style={{ display: "flex", gap: 3, padding: "12px 12px 0" }}>
              {stories.filter(s => s.id !== "st0").map((s, i) => {
                const realIdx = stories.indexOf(s);
                const isCurrent = realIdx === viewingIdx;
                const isDone = realIdx < viewingIdx;
                return (
                  <div key={s.id} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: "rgba(0,0,0,0.25)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      background: "rgba(0,0,0,0.75)",
                      width: isCurrent ? `${progress}%` : isDone ? "100%" : "0%",
                      transition: isCurrent ? "none" : "none",
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 0" }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", border: "2px solid rgba(0,0,0,0.4)",
              }}>
                {viewing.avatarEmoji}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#000", lineHeight: 1.1 }}>@{viewing.username}</div>
                <div style={{ fontSize: 11, color: "rgba(0,0,0,0.55)" }}>Just now</div>
              </div>
              <button onClick={close} style={{
                marginLeft: "auto", background: "rgba(0,0,0,0.25)", border: "none",
                borderRadius: "50%", width: 32, height: 32,
                cursor: "pointer", fontSize: 18, color: "#000",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            {/* Story content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px", position: "relative" }}>
              {/* Tap zones */}
              <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                <div style={{ flex: 1 }} onClick={goPrev} />
                <div style={{ flex: 1 }} onClick={goNext} />
              </div>

              <motion.div
                key={viewing.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", position: "relative", zIndex: 1 }}
              >
                <div style={{ fontSize: "4rem", marginBottom: 16, filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.3))" }}>
                  {viewing.avatarEmoji}
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#000", lineHeight: 1.4, marginBottom: 12 }}>
                  {viewing.content}
                </p>
                <div style={{
                  display: "inline-block", background: "rgba(0,0,0,0.15)",
                  borderRadius: 20, padding: "6px 16px",
                  fontSize: 12, fontWeight: 700, color: "#000",
                }}>
                  {viewing.username} · Karma Story
                </div>
              </motion.div>
            </div>

            {/* Bottom actions */}
            <div style={{ padding: "0 16px 32px" }}>
              <AnimatePresence>
                {sentReaction && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      textAlign: "center", marginBottom: 12,
                      fontSize: 32, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
                    }}
                  >
                    {sentReaction === "💬" ? "✅ Sent!" : sentReaction}
                  </motion.div>
                )}
              </AnimatePresence>

              {reactionOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: "rgba(0,0,0,0.12)", borderRadius: 20, padding: 14 }}
                >
                  {/* Quick reacts */}
                  <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
                    {["❤️", "🔥", "😂", "😮", "🎉", "💯"].map(e => (
                      <button key={e} onClick={() => react(e)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 28, lineHeight: 1,
                        transform: "scale(1)", transition: "transform 0.1s",
                      }}>{e}</button>
                    ))}
                  </div>
                  {/* Reply input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendReply()}
                      placeholder="Send a reply..."
                      style={{
                        flex: 1, background: "rgba(0,0,0,0.2)", border: "none",
                        borderRadius: 20, padding: "10px 16px",
                        fontSize: 14, color: "#000", outline: "none",
                      }}
                    />
                    <button onClick={sendReply} style={{
                      background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%",
                      width: 40, height: 40, cursor: "pointer", color: "#fff", fontSize: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>↑</button>
                  </div>
                </motion.div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { setReactionOpen(true); }}
                    style={{
                      flex: 1, padding: "13px", background: "rgba(0,0,0,0.2)",
                      border: "2px solid rgba(0,0,0,0.3)", borderRadius: 16,
                      fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#000",
                    }}
                  >
                    💬 Reply
                  </button>
                  <button
                    onClick={() => react("❤️")}
                    style={{
                      padding: "13px 18px", background: "rgba(0,0,0,0.7)",
                      border: "none", borderRadius: 16,
                      fontWeight: 700, fontSize: 18, cursor: "pointer", color: "#fff",
                    }}
                  >
                    ❤️
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
