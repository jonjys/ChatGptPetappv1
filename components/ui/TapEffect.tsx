"use client";

import { useEffect } from "react";

const COLORS = ["#c8ff00", "#ff2d8d", "#00e5ff", "#ffde00", "#ff6b35", "#8b5cf6"];
const EMOJIS = ["✨", "⚡", "💥", "🌟", "💎", "🔥"];

export default function TapEffect() {
  useEffect(() => {
    function burst(x: number, y: number) {
      const container = document.createElement("div");
      container.style.cssText = [
        "position:fixed",
        `left:${x}px`,
        `top:${y}px`,
        "pointer-events:none",
        "z-index:99999",
        "transform:translate(-50%,-50%)",
      ].join(";");

      // Expanding ring
      const ring = document.createElement("div");
      ring.className = "tap-ring";
      container.appendChild(ring);

      // 8 dot particles radiating out
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 22 + Math.random() * 14;
        const p = document.createElement("div");
        p.className = "tap-dot";
        p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
        p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
        p.style.background = COLORS[i % COLORS.length];
        p.style.width = `${4 + Math.random() * 3}px`;
        p.style.height = p.style.width;
        container.appendChild(p);
      }

      // Single floating emoji
      const em = document.createElement("div");
      em.className = "tap-emoji";
      em.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      container.appendChild(em);

      document.body.appendChild(container);
      setTimeout(() => container.remove(), 650);
    }

    let lastTouch = 0;

    function onTouch(e: TouchEvent) {
      lastTouch = Date.now();
      const t = e.changedTouches[0];
      if (t) burst(t.clientX, t.clientY);
    }

    function onClick(e: MouseEvent) {
      // Skip if the click came from a touch (already handled above)
      if (Date.now() - lastTouch < 400) return;
      burst(e.clientX, e.clientY);
    }

    document.addEventListener("touchend", onTouch, { passive: true });
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("touchend", onTouch);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
