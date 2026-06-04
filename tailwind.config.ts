import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0D",
        panel: "#141416",
        line: "#252529",
        paper: "#F3F3F3",
        muted: "#B8B8B8",
        copper: "#C47A3A",
        good: "#22C55E",
        danger: "#EF4444",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
