import type { Config } from "tailwindcss";

/** Single source for color, type, and radius. SVG and map code import `palette`. */
export const palette = {
  canvas: "#0b0f14",
  card: "#111827",
  line: "#1f2937",
  ink: "#f3f4f6",
  muted: "#9ca3af",
  faint: "#6b7280",
  accent: "#3b82f6",
  nominal: "#22c55e",
  caution: "#f59e0b",
  critical: "#ef4444",
} as const;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: palette,
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        body: ["13px", "18px"],
        value: ["15px", "20px"],
        score: ["48px", "48px"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
} satisfies Config;
