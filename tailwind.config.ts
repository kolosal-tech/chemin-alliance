import type { Config } from "tailwindcss";

// Design tokens - Chemin d'Alliance (cf. maquette .dc.html)
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#131D33", // nuit profonde
        // ----- PRIMAIRE (bleu nuit) : actions principales -----
        navy: {
          DEFAULT: "#1A2744",
          foreground: "#FBF6E9", // texte sur fond navy plein
        },
        // ----- PROGRESSION (doré premium) -----
        gold: {
          DEFAULT: "#C9A84C",
          light: "#D8B860", // doré mode sombre
          deep: "#9A7B2E",
          ink: "#7A6020",
          surface: "#FBF6E9", // fond doré clair
          darkSurface: "#2C2818",
          darkInk: "#D8B860",
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
          100: "#E7DFD0",
          200: "#D8CDB9",
          300: "#E2DDD2",
          400: "#D4CDBE",
          500: "#A9A293",
          600: "#8B8579",
        },
        // ----- CONFIANCE / SÉCURITÉ (vert sauge) -----
        sage: {
          DEFAULT: "#3F6B50",
          surface: "#EAF0EB",
          ink: "#2E5440",
          border: "#B7C8BC",
          darkSurface: "#1B2A20",
          darkInk: "#9FC7AC",
          darkBorder: "#3C5A46",
        },
        // ----- INFO / MESSAGERIE (bleu glacier) -----
        info: {
          DEFAULT: "#5E7DB1",
          surface: "#EAEDF2",
          ink: "#2A3550",
          border: "#C4CBD8",
          darkSurface: "#1A2233",
          darkInk: "#B9C6E0",
          darkBorder: "#3D4A66",
        },
        // ----- AVERTISSEMENT non critique (ambre) -----
        warn: {
          DEFAULT: "#B98A3E",
          surface: "#FBF1DE",
          ink: "#8A6A1E",
          border: "#EAD9A8",
          darkSurface: "#272117",
          darkInk: "#E0C77A",
          darkBorder: "#463A1F",
        },
        amberink: "#B98A3E", // back-compat (= warn.DEFAULT)
        // ----- DESTRUCTIF (rouge brique) -----
        danger: {
          DEFAULT: "#9B4A3E",
          surface: "#FBEEEC",
          ink: "#9B4A3E",
          border: "#E7C3BD",
          darkSurface: "#2A1D1A",
          darkInk: "#E6A89C",
          darkBorder: "#5A3A34",
        },
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
