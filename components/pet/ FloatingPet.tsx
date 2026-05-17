"use client";

import { motion } from "framer-motion";

export default function FloatingPet() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 2,
        repeat: Infinity
      }}
      className="fixed bottom-24 right-6 z-50"
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-[5px] border-black bg-pink-500 text-5xl shadow-[8px_8px_0px_#000]">
        👾
      </div>
    </motion.div>
  );
}
