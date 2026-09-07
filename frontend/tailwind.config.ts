import type { Config } from "tailwindcss";

/**
 * Dark-first intelligence palette.
 *
 * Surfaces run on zinc; alerts run on crimson and amber. Severity colours are
 * declared once here and referenced from both the map markers and the charts
 * so a Homicide pin and a Homicide bar are always the same red.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#09090b", // zinc-950 - page ground
          raised: "#18181b", // zinc-900 - cards
          overlay: "#27272a", // zinc-800 - popovers, inputs
          border: "#3f3f46", // zinc-700
        },
        severity: {
          critical: "#dc2626", // Homicide
          high: "#ea580c", // Robbery, Extortion
          medium: "#d97706", // Assault, Narcotics
          low: "#0891b2", // Theft, Fraud, Cybercrime
          unknown: "#71717a", // Other
        },
        trust: {
          official: "#22c55e",
          news: "#eab308",
          social: "#f97316",
        },
        accent: {
          DEFAULT: "#e11d48", // rose-600 - live indicators
          soft: "#fb7185",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
