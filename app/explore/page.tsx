"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, MapPin, Heart, Share2, MessageCircle, Radio } from "lucide-react";
import KarmaMap from "@/components/map/KarmaMap";
import { FEED_POSTS, FRIENDS, BOUNTIES } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import type { Post } from "@/types/post";

// ─── Extra posts ──────────────────────────────────────────────────────────────
const EXTRA_POSTS: Post[] = [
  {
    id: "exp1",
    authorId: "u7",
    authorUsername: "solarbear",
    authorEmoji: "🐻",
    authorLevel: 6,
    type: "bounty_complete",
    content: "Planterade tre träd i stadsparken idag 🌳🌳🌳 Naturen tackar oss! #DailyBounty",
    xpEarned: 200,
    likes: 73,
    comments: 9,
    liked: false,
    location: "Stadsparken",
    createdAt: "2026-06-14T06:30:00Z",
  },
  {
    id: "exp2",
    authorId: "u8",
    authorUsername: "zephyrkid",
    authorEmoji: "💨",
    authorLevel: 11,
    type: "level_up",
    content: "MIN HUSDJUR EVOLVERADE TILL LEGENDARY! 🏆 PetEvolution är verkligt, sluta inte grinda #PetEvolution #KarmaGrind",
    xpEarned: 350,
    likes: 218,
    comments: 41,
    liked: false,
    createdAt: "2026-06-14T05:10:00Z",
  },
  {
    id: "exp3",
    authorId: "u9",
    authorUsername: "moonhex",
    authorEmoji: "🌕",
    authorLevel: 9,
    type: "achievement",
    content: "100 dagars streak! 😤🔥 Varje dag räknas. Min karma är nu 4,200. #KarmaGrind",
    xpEarned: 500,
    likes: 332,
    comments: 67,
    liked: false,
    createdAt: "2026-06-14T04:00:00Z",
  },
  {
    id: "exp4",
    authorId: "u10",
    authorUsername: "prismcat",
    authorEmoji: "🐱",
    authorLevel: 4,
    type: "bounty_complete",
    content: "Hjälpte en granne bära matkassar, fick +80 XP! Snälla gärningar FTW 💜 #DailyBounty",
    xpEarned: 80,
    likes: 44,
    comments: 7,
    liked: false,
    createdAt: "2026-06-13T22:15:00Z",
  },
  {
    id: "exp5",
    authorId: "u11",
    authorUsername: "voltspike",
    authorEmoji: "⚡",
    authorLevel: 14,
    type: "story",
    content: "DNA Splice Lab WILD — min hybrid fick LEGENDARY rarity på första försöket 🧬 #PetEvolution",
    xpEarned: 150,
    likes: 189,
    comments: 28,
    liked: false,
    createdAt: "2026-06-13T20:00:00Z",
  },
];

const ALL_POSTS = [...FEED_POSTS, ...EXTRA_POSTS];

const TRENDING_TOPICS = ["#DailyBounty", "#PetEvolution", "#KarmaGrind"];

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:      "#44ff88",
  medium:    "#ffcc00",
  hard:      "#ff6b35",
  legendary: "#9933ff",
};

const LIVE_STREAMS = [
  { id: "l1", user: "karmasonic", emoji: "🦊", title: "KARMA SLOTS 🎰", watchers: 234, badge: "HOT" },
  { id: "l2", user: "ironforge",  emoji: "⚒️", title: "Bounty Blitz speedrun 💥", watchers: 87,  badge: null },
  { id: "l3", user: "neonmiku",   emoji: "✨", title: "DNA Splice reactions 🧬",  watchers: 156, badge: "NEW" },
];

// ─── Post card (explore version) ─────────────────────────────────────────────
function ExplorePostCard({ post }: { post: Post }) {
  const { showToast } = useApp();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);

  const toggleLike = () => {
    setLiked((v) => !v);
    setLikeCount((n) => liked ? n - 1 : n + 1);
  };

  const TYPE_EMOJI: Record<string, string> = {
    bounty_complete: "🎯",
    level_up:        "⭐",
    achievement:     "🏆",
    story:           "📖",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 18,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "#1a1a2e",
          border: "1.5px solid #8b5cf633",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem",
        }}>
          {post.authorEmoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              @{post.authorUsername}
            </span>
            <span style={{
              background: "#8b5cf622", border: "1px solid #8b5cf644",
              borderRadius: 6, padding: "1px 6px",
              fontSize: 9, fontWeight: 700, color: "#8b5cf6",
            }}>
              LV{post.authorLevel}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>
            {post.location ?? "Worldwide"} · {TYPE_EMOJI[post.type]} {post.type.replace(/_/g, " ")}
          </div>
        </div>
        {post.xpEarned != null && (
          <div style={{
            background: "#c8ff0022", border: "1px solid #c8ff0044",
            borderRadius: 8, padding: "3px 8px",
            fontSize: 10, fontWeight: 700, color: "#c8ff00",
          }}>
            +{post.xpEarned} XP
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "0 14px 12px" }}>
        <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, margin: 0 }}>{post.content}</p>
      </div>

      {/* Karma badge */}
      {(post.xpEarned ?? 0) >= 100 && (
        <div style={{ padding: "0 14px 10px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "linear-gradient(90deg, #8b5cf622, #ec489922)",
            border: "1px solid #8b5cf644",
            borderRadius: 8, padding: "3px 10px",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#8b5cf6", letterSpacing: "0.08em" }}>
              🧬 KARMA EARNED: +{post.xpEarned}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid #1a1a1a",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleLike}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <Heart
            size={16}
            color={liked ? "#ec4899" : "#555"}
            fill={liked ? "#ec4899" : "none"}
          />
          <span style={{ fontSize: 11, color: liked ? "#ec4899" : "#555", fontWeight: 600 }}>
            {likeCount}
          </span>
        </motion.button>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MessageCircle size={15} color="#555" />
          <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>{post.comments}</span>
        </div>

        <div style={{ flex: 1 }} />

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => showToast("Link kopierad!", undefined, "#8b5cf6", "🔗")}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <Share2 size={15} color="#555" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function TrendingTab({ search }: { search: string }) {
  const filtered = ALL_POSTS.filter((p) =>
    search === "" ||
    p.content.toLowerCase().includes(search.toLowerCase()) ||
    p.authorUsername.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "12px 14px 80px" }}>
      {/* Trending topic chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {TRENDING_TOPICS.map((topic) => (
          <motion.div
            key={topic}
            whileTap={{ scale: 0.94 }}
            style={{
              background: "linear-gradient(135deg, #8b5cf622, #ec489922)",
              border: "1px solid #8b5cf644",
              borderRadius: 20,
              padding: "5px 12px",
              fontSize: 11, fontWeight: 700, color: "#8b5cf6",
              cursor: "pointer",
            }}
          >
            {topic}
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#555" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13 }}>Inga resultat för &quot;{search}&quot;</div>
        </div>
      ) : (
        filtered.map((post) => (
          <ExplorePostCard key={post.id} post={post} />
        ))
      )}
    </div>
  );
}

function NearbyTab() {
  const { showToast } = useApp();
  const nearby = BOUNTIES.slice(0, 5);

  return (
    <div style={{ padding: "12px 14px 80px" }}>
      {/* Map */}
      <div style={{
        background: "#0d0d1a",
        border: "1px solid #8b5cf633",
        borderRadius: 18, padding: 14, marginBottom: 16,
        overflow: "hidden",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "monospace" }}>
          📍 KARTA NÄRA DIG
        </div>
        <KarmaMap />
      </div>

      {/* Bounty list */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 10 }}>
        BOUNTIES NÄRA DIG
      </div>

      {nearby.map((bounty, i) => (
        <motion.div
          key={bounty.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 16, padding: 14,
            marginBottom: 10,
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <div style={{
            width: 44, height: 44, flexShrink: 0,
            background: "#1a1a1a", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem",
          }}>
            {bounty.categoryEmoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ddd", marginBottom: 3 }}>
              {bounty.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin size={10} color="#555" />
                <span style={{ fontSize: 10, color: "#555" }}>{bounty.distance}</span>
              </div>
              <div style={{
                background: `${DIFFICULTY_COLOR[bounty.difficulty]}22`,
                border: `1px solid ${DIFFICULTY_COLOR[bounty.difficulty]}44`,
                borderRadius: 5, padding: "1px 6px",
                fontSize: 9, fontWeight: 700, color: DIFFICULTY_COLOR[bounty.difficulty],
                letterSpacing: "0.06em",
              }}>
                {bounty.difficulty.toUpperCase()}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c8ff00" }}>+{bounty.xpReward} XP</div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => showToast(`${bounty.title} claimed!`, bounty.karmaReward, "#8b5cf6", "🎯")}
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                border: "none", borderRadius: 8,
                padding: "5px 10px",
                fontSize: 10, fontWeight: 700, color: "#fff",
                cursor: "pointer", letterSpacing: "0.06em",
              }}
            >
              CLAIM
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FoljerTab() {
  const [following, setFollowing] = useState<Record<string, boolean>>({
    u2: true, u3: false, u5: false, u4: true, u6: false,
  });

  const toggleFollow = (id: string) => {
    setFollowing((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ padding: "12px 14px 80px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 14 }}>
        {FRIENDS.length} VÄNNER
      </div>

      {FRIENDS.map((friend, i) => (
        <motion.div
          key={friend.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          style={{
            background: "#111",
            border: "1px solid #222",
            borderRadius: 16, padding: 14,
            marginBottom: 10,
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          {/* Avatar + online dot */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 46, height: 46,
              background: "#1a1a2e",
              border: "1.5px solid #8b5cf633",
              borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem",
            }}>
              {friend.emoji}
            </div>
            {friend.online && (
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  position: "absolute", bottom: 1, right: 1,
                  width: 10, height: 10,
                  background: "#44ff88",
                  border: "2px solid #111",
                  borderRadius: "50%",
                }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ddd" }}>
                @{friend.username}
              </span>
              <span style={{ fontSize: 9, color: "#555" }}>LV{friend.level}</span>
            </div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
              {friend.petEmoji} {friend.petName} ·{" "}
              {friend.online ? (
                <span style={{ color: "#44ff88" }}>
                  {friend.currentGame ? `Spelar ${friend.currentGame}` : "Online"}
                </span>
              ) : (
                <span>{friend.lastActivity}</span>
              )}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleFollow(friend.id)}
            style={{
              background: following[friend.id]
                ? "transparent"
                : "linear-gradient(135deg, #8b5cf6, #ec4899)",
              border: following[friend.id] ? "1.5px solid #8b5cf644" : "none",
              borderRadius: 10,
              padding: "6px 12px",
              fontSize: 10, fontWeight: 700,
              color: following[friend.id] ? "#8b5cf6" : "#fff",
              cursor: "pointer", letterSpacing: "0.06em", flexShrink: 0,
            }}
          >
            {following[friend.id] ? "FÖLJER" : "FÖLJ"}
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}

function LiveTab() {
  const { showToast } = useApp();

  return (
    <div style={{ padding: "12px 14px 80px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.12em", fontFamily: "monospace", marginBottom: 14 }}>
        🔴 LIVE NU
      </div>

      {LIVE_STREAMS.map((stream, i) => (
        <motion.div
          key={stream.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => showToast("Öppnas snart 🔴", undefined, "#ff3333", "📺")}
          style={{
            background: "linear-gradient(135deg, #1a0a0a, #0d0000)",
            border: "1px solid #ff333333",
            borderRadius: 18, padding: 16,
            marginBottom: 12, cursor: "pointer",
            boxShadow: "0 0 20px #ff333311",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 52, height: 52,
                background: "#220000",
                border: "2px solid #ff333344",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem",
              }}>
                {stream.emoji}
              </div>
              {/* Pulsing live dot */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  position: "absolute", top: -3, right: -3,
                  width: 12, height: 12,
                  background: "#ff3333",
                  border: "2px solid #0a0a0a",
                  borderRadius: "50%",
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{
                  background: "#ff3333",
                  borderRadius: 5, padding: "1px 6px",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  letterSpacing: "0.1em",
                }}>
                  LIVE
                </span>
                {stream.badge && (
                  <span style={{
                    background: "#ec489922", border: "1px solid #ec4899",
                    borderRadius: 5, padding: "1px 6px",
                    fontSize: 9, fontWeight: 700, color: "#ec4899",
                    letterSpacing: "0.08em",
                  }}>
                    {stream.badge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ddd" }}>
                {stream.user} streams {stream.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Radio size={10} color="#ff6666" />
                <span style={{ fontSize: 10, color: "#ff6666" }}>{stream.watchers} watchers</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      <div style={{ textAlign: "center", padding: "20px 0", color: "#333", fontSize: 12 }}>
        Fler live-sändningar kommer snart 🎙️
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "trending", label: "TRENDING" },
  { id: "nearby",   label: "NEARBY" },
  { id: "foljer",   label: "FÖLJER" },
  { id: "live",     label: "LIVE" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabId>("trending");
  const [search, setSearch] = useState("");

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", color: "#fff" }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "#0a0a0a",
        borderBottom: "1px solid #1a1a1a",
        padding: "14px 14px 0",
      }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Compass size={20} color="#8b5cf6" />
          <h1 style={{
            fontSize: "1.2rem", fontWeight: 900, letterSpacing: "0.06em",
            background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "monospace",
          }}>
            🌍 UTFORSKA
          </h1>
        </div>

        {/* Search bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#111",
          border: "1px solid #8b5cf633",
          borderRadius: 12, padding: "9px 12px",
          marginBottom: 12,
        }}>
          <Search size={14} color="#666" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök inlägg, användare, bounties..."
            style={{
              background: "none", border: "none", outline: "none",
              flex: 1, fontSize: 13, color: "#ccc",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const isLive = tab.id === "live";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, background: "none", border: "none",
                  borderBottom: `2px solid ${active ? "#8b5cf6" : "transparent"}`,
                  padding: "8px 2px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {isLive && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff3333", flexShrink: 0 }}
                  />
                )}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: active ? "#8b5cf6" : "#555",
                  letterSpacing: "0.06em", fontFamily: "monospace",
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "trending" && <TrendingTab search={search} />}
          {activeTab === "nearby"   && <NearbyTab />}
          {activeTab === "foljer"   && <FoljerTab />}
          {activeTab === "live"     && <LiveTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
