"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, PawPrint, Gamepad2, Tv2, Users, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";

export default function BottomNav() {
  const path = usePathname();
  const { pet, worldId, lang } = useApp();

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
    <nav className="fixed bottom-0 left-0 right-0 z-40" style={{ borderTop: "3px solid #0a0a0a", background: "#faf7f2" }}>
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(tab => {
          const active = path === tab.href || path.startsWith(tab.href + "/");
          const Icon = tab.icon;

          if (tab.special) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center">
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl transition-transform active:scale-90"
                  style={{ background: "#0a0a0a", border: "3px solid #0a0a0a", boxShadow: "3px 3px 0px #c8ff00" }}>
                  <Icon size={24} color="#c8ff00" strokeWidth={2.5} />
                </span>
              </Link>
            );
          }

          if ((tab as typeof tab & { tv?: boolean }).tv) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl transition-transform active:scale-90"
                  style={{
                    background: active ? "#ff2d8d22" : "transparent",
                    border: `2px solid ${active ? "#ff2d8d" : "transparent"}`,
                    boxShadow: active ? "0 0 12px #ff2d8d55" : "none",
                  }}>
                  <Icon size={20} color={active ? "#ff2d8d" : "#0a0a0a"} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: active ? "#ff2d8d" : "#0a0a0a" }}>TV</span>
              </Link>
            );
          }

          const showDot = tab.href === "/pet" && isCritical;

          return (
            <Link key={tab.href} href={tab.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all relative"
              style={{
                background: active ? "#c8ff00" : "transparent",
                border: active ? "2px solid #0a0a0a" : "2px solid transparent",
                boxShadow: active ? "3px 3px 0px #0a0a0a" : "none",
              }}>
              {showDot && (
                <span style={{ position: "absolute", top: 4, right: 8, width: 8, height: 8, background: "#ff3333", borderRadius: "50%", border: "1.5px solid #faf7f2" }} />
              )}
              <Icon size={22} color="#0a0a0a" strokeWidth={active ? 2.5 : 2} />
              <span style={{ fontSize: "10px", fontWeight: active ? 700 : 500, color: "#0a0a0a" }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
