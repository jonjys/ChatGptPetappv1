"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

type PostType = "bounty" | "story" | "achievement";

const CATEGORIES = [
  { id: "community", emoji: "🤝", label: "Community" },
  { id: "fitness", emoji: "🏃", label: "Fitness" },
  { id: "learning", emoji: "🧠", label: "Learning" },
  { id: "creative", emoji: "🎨", label: "Creative" },
  { id: "social", emoji: "💬", label: "Social" },
  { id: "eco", emoji: "♻️", label: "Eco" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy", xp: 50, color: "#d4f5c0", text: "#1b5e20" },
  { id: "medium", label: "Medium", xp: 120, color: "#fff3c4", text: "#e65100" },
  { id: "hard", label: "Hard", xp: 250, color: "#ffd0d0", text: "#b71c1c" },
  { id: "legendary", label: "Legendary", xp: 400, color: "#e8d5ff", text: "#4c1d95" },
];

export default function CreatePage() {
  const { addXP } = useApp();
  const [type, setType] = useState<PostType>("bounty");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("community");
  const [difficulty, setDifficulty] = useState("medium");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedDiff = DIFFICULTIES.find((d) => d.id === difficulty)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    addXP(30);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTitle("");
      setDescription("");
    }, 2500);
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: "var(--bg)", borderBottom: "3px solid #0a0a0a" }}
      >
        <Link href="/feed">
          <div
            style={{
              width: 38,
              height: 38,
              background: "#fff",
              border: "2.5px solid #0a0a0a",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "2px 2px 0px #0a0a0a",
            }}
          >
            <ChevronLeft size={20} />
          </div>
        </Link>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
            CREATE
          </h1>
          <p style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>
            EARN +30 XP FOR POSTING
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Success toast */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="neo-card p-4 text-center"
              style={{ background: "#c8ff00" }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 4 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Posted! +30 XP earned!</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                Your {type} is now live on the feed.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Type selector */}
        <div className="neo-card p-4">
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: "#555" }}>
            TYPE
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["bounty", "story", "achievement"] as PostType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="py-3 rounded-xl"
                style={{
                  background: type === t ? "#0a0a0a" : "#faf7f2",
                  border: "2.5px solid #0a0a0a",
                  fontSize: 12,
                  fontWeight: 700,
                  color: type === t ? "#c8ff00" : "#0a0a0a",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>
                  {t === "bounty" ? "🎯" : t === "story" ? "📖" : "🏆"}
                </span>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="neo-card p-4">
            <label
              style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: "#555" }}
            >
              {type === "bounty" ? "BOUNTY TITLE" : type === "story" ? "WHAT HAPPENED?" : "ACHIEVEMENT TITLE"}
            </label>
            <input
              className="input-brutal"
              placeholder={
                type === "bounty"
                  ? "e.g. Pick up trash at the park..."
                  : type === "story"
                  ? "Tell your story..."
                  : "Name your achievement..."
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="neo-card p-4">
            <label
              style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: "#555" }}
            >
              DESCRIPTION
            </label>
            <textarea
              className="textarea-brutal"
              rows={4}
              placeholder={
                type === "bounty"
                  ? "Describe what needs to be done and how to prove completion..."
                  : "Add more details..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="neo-card p-4">
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: "#555" }}>
              CATEGORY
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className="py-2.5 rounded-xl"
                  style={{
                    background: category === cat.id ? "#0a0a0a" : "#faf7f2",
                    border: "2px solid #0a0a0a",
                    fontSize: 12,
                    fontWeight: 700,
                    color: category === cat.id ? "#c8ff00" : "#0a0a0a",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span style={{ fontSize: 10 }}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty (bounty only) */}
          {type === "bounty" && (
            <div className="neo-card p-4">
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: "#555" }}>
                DIFFICULTY & XP REWARD
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setDifficulty(diff.id)}
                    className="p-3 rounded-xl"
                    style={{
                      background: difficulty === diff.id ? diff.color : "#faf7f2",
                      border: `2.5px solid ${difficulty === diff.id ? "#0a0a0a" : "#ddd"}`,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: difficulty === diff.id ? diff.text : "#555",
                      }}
                    >
                      {diff.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: difficulty === diff.id ? diff.text : "#aaa",
                        marginTop: 2,
                      }}
                    >
                      +{diff.xp} XP reward
                    </div>
                  </button>
                ))}
              </div>

              {/* XP preview */}
              <div
                className="flex items-center justify-between mt-3 p-3"
                style={{ background: "#faf7f2", border: "2px solid #e8e3d8", borderRadius: 12 }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
                  Completors will earn:
                </span>
                <span
                  style={{
                    background: "#c8ff00",
                    border: "2px solid #0a0a0a",
                    borderRadius: 8,
                    padding: "3px 10px",
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  +{selectedDiff.xp} XP
                </span>
              </div>
            </div>
          )}

          {/* Location toggle */}
          <div className="neo-card p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIncludeLocation(!includeLocation)}
            >
              <div className="flex items-center gap-2">
                <MapPin size={16} color="#666" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Add Location</span>
              </div>
              <div
                style={{
                  width: 44,
                  height: 24,
                  background: includeLocation ? "#c8ff00" : "#e8e3d8",
                  border: "2px solid #0a0a0a",
                  borderRadius: 12,
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: includeLocation ? 20 : 2,
                    width: 16,
                    height: 16,
                    background: "#0a0a0a",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </div>
            {includeLocation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3"
              >
                <input
                  className="input-brutal"
                  placeholder="Enter location or use GPS..."
                  style={{ fontSize: 14 }}
                />
              </motion.div>
            )}
          </div>

          {/* Achievement badge (achievement type only) */}
          {type === "achievement" && (
            <div className="neo-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} color="#ff9800" />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: "#555" }}>
                  BADGE NAME (optional)
                </span>
              </div>
              <input
                className="input-brutal"
                placeholder="e.g. 5K Champion, Community Hero..."
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary w-full py-4"
            style={{
              fontSize: 16,
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Send size={18} />
            POST {type.toUpperCase()}
          </button>
        </form>
      </div>
    </div>
  );
}
