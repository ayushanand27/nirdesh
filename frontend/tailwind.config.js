/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark-first surface stack (base -> card -> raised/hover).
        // Near-black navy, never pure black, so card elevation stays visible.
        canvas: "#090F1C", // base page background (darkest)
        surface: "#111A2E", // card background
        elevated: "#1C2740", // hover / active / raised surfaces
        // Deep navy retained as a brand surface tone (logo chip, circular band).
        navy: {
          DEFAULT: "#16213B",
          700: "#1F2D4D",
          600: "#2A3B60",
          400: "#6B7BA0",
        },
        ink: "#E6EAF2", // primary text, near-white on dark
        muted: "#8B94A7", // secondary text
        hair: "#232E45", // hairline borders (visible on dark)
        // Compliance states — functional only, brighter/warmer fills tuned for dark.
        compliant: {
          DEFAULT: "#3DD68C",
          bg: "#1C5238",
          text: "#8BF0BD",
        },
        breach: {
          DEFAULT: "#FF7A5C",
          bg: "#7A2E22",
          text: "#FFB4A2",
        },
        na: {
          DEFAULT: "#8A93A8",
          bg: "#2A3348",
          text: "#C3CADA",
        },
        // Single accent: brightened ink-blue, electric against dark surfaces.
        accent: {
          DEFAULT: "#4C8DFF",
          600: "#3B7DF0",
        },
      },
      fontFamily: {
        serif: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Subtle depth — dark UIs read as premium through surface tone, not shadow.
        card: "0 1px 2px rgba(0, 0, 0, 0.30), 0 2px 8px rgba(0, 0, 0, 0.22)",
        drawer: "-16px 0 48px rgba(0, 0, 0, 0.55)",
      },
      borderRadius: {
        card: "6px",
      },
      transitionTimingFunction: {
        // Deliberate, non-bouncy easing for the "system recalculated" feel.
        precise: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
