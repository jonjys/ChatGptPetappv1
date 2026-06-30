"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, PawPrint, Gamepad2, Tv2, Users, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EVENT_INTERVAL = 30 * 60;
const EVENT_EMOJIS = ["⚡","🎯","🐾","⚔️","🎁"];
function getEventEmoji() {
  return EVENT_EMOJIS[Math.floor(Math.floor(Date.now() / 1000 / EVENT_INTERVAL) % EVENT_EMOJIS.length)];
}

export default function BottomNav() {
  const path = usePathname();
  const { pet, lang } = useApp();
  const [eventEmoji, setEventEmoji] = useState(getEventEmoji);
  const [petIsNew, setPetIsNew] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setEventEmoji(getEventEmoji()), 5000);
    return () => clearInterval(id);
  }, []);

  // Show blinking hint on PET tab for first-time users (until they visit the pet page)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const onboarded = localStorage.getItem("pet_onboarded_v2");
      const tapped = localStorage.getItem("pet_tapped_v1");
      const created = localStorage.getItem("pet_created_v1");
      if (created && !onboarded && !tapped) setPetIsNew(true);
    }
  }, []);

  // Clear the hint once user visits pet page
  useEffect(() => {
    if (path === "/pet" && petIsNew) setPetIsNew(false);
  }, [path, petIsNew]);

  const TABS = [
    { href: "/feed",     icon: Flame,    label: t(lang, "feed") },
    { href: "/pet",      icon: PawPrint, label: t(lang, "pet") },
    { href: "/games",    icon: Gamepad2, label: t(lang, "games"), special: true },
    { href: "/karma-tv", icon: Tv2,      label: "TV", tv: true },
    { href: "/social",   icon: Users,    label: t(lang, "social") },
    { href: "/profile",  icon: User,     label: t(lang, "me") },
  ];

  const isCritical = pet.needs.hunger < 25 || pet.needs.energy < 15;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        maxWidth: 560,
        margin: "0 auto",
        borderTop: "2px solid rgba(0,0,0,0.12)",
        background: "rgba(250,247,242,0.97)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {TABS.map(tab => {
          const active = path === tab.href || path.startsWith(tab.href + "/");
          const Icon = tab.icon;

          // ── GAMES (center special) ─────────────────────────────────────────
          if (tab.special) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center" style={{ position: "relative" }}>
                <motion.span
                  animate={{
                    boxShadow: [
                      "3px 3px 0px #c8ff00",
                      "3px 3px 0px #c8ff00, 0 0 18px #c8ff0088",
                      "3px 3px 0px #c8ff00",
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl active:scale-90"
                  style={{ background: "#0a0a0a", border: "3px solid #0a0a0a", transition: "transform 0.1s" }}
                >
                  <Icon size={24} color="#c8ff00" strokeWidth={2.5} />
                </motion.span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#0a0a0a", marginTop: 2, letterSpacing: "0.06em" }}>
                  GAMES
                </span>
                {/* Live event dot */}
                <Link href="/event" onClick={e => e.stopPropagation()}
                  style={{ position: "absolute", top: -3, right: -4, zIndex: 10, textDecoration: "none" }}>
                  <motion.div
                    animate={{ scale: [1, 1.35, 1] }}
                    transition={{ repeat: Infinity, duration: 1.1 }}
                    style={{
                      width: 19, height: 19, borderRadius: "50%",
                      background: "#ff2d8d", border: "2px solid rgba(250,247,242,0.97)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px", lineHeight: 1,
                    }}
                  >
                    {eventEmoji}
                  </motion.div>
                </Link>
              </Link>
            );
          }

          // ── TV ─────────────────────────────────────────────────────────────
          if ((tab as typeof tab & { tv?: boolean }).tv) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl active:scale-90"
                  style={{
                    background: active ? "#ff2d8d1a" : "transparent",
                    border: `2px solid ${active ? "#ff2d8d" : "transparent"}`,
                    boxShadow: active ? "0 0 12px #ff2d8d44" : "none",
                    transition: "all 0.15s",
                  }}>
                  <Icon size={20} color={active ? "#ff2d8d" : "#0a0a0a"} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span style={{ fontSize: "9px", fontWeight: active ? 700 : 500, color: active ? "#ff2d8d" : "#0a0a0a" }}>
                  TV
                </span>
              </Link>
            );
          }

          // ── PET tab — special handling with blinking new badge ──────────────
          const isPetTab = tab.href === "/pet";
          const showCriticalDot = isPetTab && isCritical && !petIsNew;
          const showNewBadge = isPetTab && petIsNew;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl relative active:scale-90"
              style={{
                background: active ? "#c8ff00" : "transparent",
                border: active ? "2px solid #0a0a0a" : "2px solid transparent",
                boxShadow: active ? "3px 3px 0px #0a0a0a" : "none",
                transition: "all 0.15s",
              }}
            >
              {/* Critical needs dot */}
              {showCriticalDot && (
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  style={{
                    position: "absolute", top: 2, right: 6,
                    width: 9, height: 9,
                    background: "#ff3333", borderRadius: "50%",
                    border: "1.5px solid rgba(250,247,242,0.97)",
                  }}
                />
              )}

              {/* New user blinking badge */}
              {showNewBadge && (
                <motion.span
                  animate={{ opacity: [1, 0.45, 1], scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  style={{
                    position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
                    background: "#c8ff00", color: "#000",
                    borderRadius: 10, padding: "2px 7px",
                    fontSize: 8, fontWeight: 900, whiteSpace: "nowrap",
                    letterSpacing: "0.06em",
                    boxShadow: "0 0 10px #c8ff0088",
                    border: "1.5px solid rgba(0,0,0,0.15)",
                  }}
                >
                  👆 TAP ME
                </motion.span>
              )}

              <motion.span
                animate={isPetTab && !active && isCritical ? { rotate: [-6, 6, -6, 6, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Icon
                  size={22}
                  color={showNewBadge ? "#c8ff00" : "#0a0a0a"}
                  strokeWidth={active ? 2.5 : 2}
                />
              </motion.span>
              <span style={{
                fontSize: "9px", fontWeight: active ? 700 : 500,
                color: showNewBadge ? "#c8ff00" : "#0a0a0a",
                letterSpacing: showNewBadge ? "0.04em" : "normal",
              }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
