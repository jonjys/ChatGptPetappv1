import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: { 400: "#c8ff00", 500: "#a8d600" },
        coral: { DEFAULT: "#ff6b35", dark: "#e55a26" },
        cyan: { neon: "#00e5ff" },
        pink: { hot: "#ff2d8d" },
        cream: "#faf7f2",
        ink: "#0a0a0a",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0px #0a0a0a",
        "brutal-lg": "6px 6px 0px #0a0a0a",
        "brutal-lime": "4px 4px 0px #c8ff00",
        "brutal-coral": "4px 4px 0px #ff6b35",
        "brutal-cyan": "4px 4px 0px #00e5ff",
        "brutal-pink": "4px 4px 0px #ff2d8d",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      animation: {
        "pet-bob": "petBob 2s ease-in-out infinite",
        "pet-wiggle": "petWiggle 0.4s ease-in-out",
        "xp-fill": "xpFill 1s ease-out forwards",
        "fade-up": "fadeUp 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-lime": "pulseLime 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        petBob: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        petWiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
        xpFill: {
          from: { width: "0%" },
          to: { width: "var(--xp-width)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulseLime: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(200, 255, 0, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(200, 255, 0, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
