"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { usePet } from "@/hooks/usePet";
import { getPetEmoji } from "@/lib/pet-evolution";

export default function FloatingPet() {
  const { pet } = usePet();
  const path = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  const emoji = getPetEmoji(pet.evolution, pet.class);

  // Hide on pet detail page
  if (path === "/pet") return null;

  return (
    <div
      className="fixed z-50"
      style={{ bottom: 90, right: 16 }}
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            className="absolute neo-card-flat"
            style={{
              bottom: "calc(100% + 8px)",
              right: 0,
              padding: "8px 12px",
              whiteSpace: "nowrap",
              background: "#0a0a0a",
              border: "2px solid #0a0a0a",
              color: "#c8ff00",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 12,
            }}
          >
            {pet.name} · LV {pet.level}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        href="/pet"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        onHoverStart={() => setShowTooltip(true)}
        onHoverEnd={() => setShowTooltip(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          background: "#fff",
          border: "3px solid #0a0a0a",
          borderRadius: "50%",
          boxShadow: "4px 4px 0px #0a0a0a",
          fontSize: "1.8rem",
          cursor: "pointer",
          textDecoration: "none",
        }}
        whileTap={{ scale: 0.9 }}
      >
        {emoji}
      </motion.a>
    </div>
  );
}
