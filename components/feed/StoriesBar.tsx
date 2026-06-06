"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STORIES } from "@/lib/mock-data";
import type { Story } from "@/types/game";

export default function StoriesBar() {
  const [viewing, setViewing] = useState<Story | null>(null);
  const [stories, setStories] = useState(STORIES);

  function open(story: Story) {
    setViewing(story);
    setStories(s => s.map(st => st.id === story.id ? { ...st, seen: true } : st));
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto py-3 px-1" style={{ scrollbarWidth: "none" }}>
        {stories.map(story => (
          <button
            key={story.id}
            onClick={() => open(story)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{
              width: 54, height: 54,
              borderRadius: "50%",
              background: story.seen ? "#222" : story.bgColor,
              padding: 2.5,
              boxShadow: story.seen ? "none" : `0 0 0 2px ${story.bgColor}`,
            }}>
              <div style={{
                width: "100%", height: "100%",
                borderRadius: "50%",
                background: "#1a1a1a",
                border: "2px solid #0a0a0a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem",
              }}>
                {story.id === "st0" ? (
                  <span style={{ fontSize: "1.5rem", color: "#c8ff00", fontWeight: 700 }}>+</span>
                ) : (
                  story.avatarEmoji
                )}
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: story.seen ? 400 : 700, color: story.seen ? "#555" : "#ddd", maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {story.username === "You" ? "Your story" : story.username}
            </span>
          </button>
        ))}
      </div>

      {/* Story viewer */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewing(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.92)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "88%", maxWidth: 340,
                background: viewing.bgColor,
                borderRadius: 24,
                padding: 24,
                border: "3px solid #0a0a0a",
                boxShadow: "8px 8px 0px #0a0a0a",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 44, height: 44, background: "#0a0a0a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", border: "2px solid #0a0a0a" }}>
                  {viewing.avatarEmoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0a0a0a" }}>@{viewing.username}</div>
                  <div style={{ fontSize: 11, color: "#0a0a0a99" }}>Just now · Story</div>
                </div>
                <button onClick={() => setViewing(null)} style={{ marginLeft: "auto", background: "#0a0a0a22", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#0a0a0a" }}>×</button>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#0a0a0a", lineHeight: 1.5 }}>{viewing.content}</p>
              <div className="flex gap-2 mt-5">
                <button style={{ flex: 1, padding: "10px", background: "#0a0a0a", border: "none", borderRadius: 12, color: "#c8ff00", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>❤️ React</button>
                <button style={{ flex: 1, padding: "10px", background: "#0a0a0a22", border: "2px solid #0a0a0a", borderRadius: 12, color: "#0a0a0a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>💬 Reply</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
