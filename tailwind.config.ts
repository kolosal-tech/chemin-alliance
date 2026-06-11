import type { Config } from "tailwindcss";

// Design tokens — Chemin d'Alliance (cf. maquette .dc.html)
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#131D33", // nuit profonde
        navy: "#1A2744", // bleu nuit
        gold: {
          DEFAULT: "#C9A84C",
          light: "#D8B860", // doré mode sombre
          deep: "#9A7B2E",
          ink: "#7A6020",
        },
        cream: "#F7F5F0", // blanc cassé chaud
        surface: "#FCFBF8",
        canvas: "#EFEBE2",
        warmgray: "#5A564E",
        ink: "#1C1A17",
        anthracite: {
          950: "#0B0C0E",
          900: "#17181B",
          850: "#1C1E22",
          800: "#1F2127",
          700: "#23262C",
          600: "#2C2E34",
        },
        sand: {
          100: "#F0ECE2",
          200: "#E8E3D8",
          300: "#E2DDD2",
          400: "#D4CDBE",
          500: "#A9A293",
          600: "#8B8579",
        },
        sage: "#3F6B50",
        amberink: "#B98A3E",
        danger: "#9B4A3E",
      },
      fontFamily: {
        display: ["var(--font-spectral)", "Georgia", "serif"],
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        mono: ["var(--font-spline-mono)", "monospace"],
      },
      borderRadius: {
        card: "16px",
        cardlg: "18px",
        screen: "36px",
        btn: "12px",
        btnsm: "11px",
        btnlg: "14px",
      },
      boxShadow: {
        phone: "0 30px 60px -30px rgba(19,29,51,.55)",
        cardfeat: "0 8px 24px -12px rgba(26,39,68,.18)",
        glass:
          "0 8px 32px -12px rgba(19,29,51,.25), inset 0 1px 0 rgba(255,255,255,.25)",
        glassdark:
          "0 8px 32px -12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)",
      },
      letterSpacing: {
        label: ".16em",
      },
    },
  },
  plugins: [],
};
export default config;
