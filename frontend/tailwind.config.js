/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral black/charcoal stack — premium, no blue cast.
        canvas: "#0A0A0A", // page base
        surface: "#141414", // cards
        elevated: "#1F1F1F", // hover / raised
        navy: {
          DEFAULT: "#161616",
          700: "#222222",
          600: "#2E2E2E",
          400: "#8A8A8A",
        },
        ink: "#F0F0F0",
        muted: "#8F8F8F",
        hair: "#2A2A2A",
        // Compliance states — functional only; unchanged semantics.
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
          DEFAULT: "#8A8A8A",
          bg: "#262626",
          text: "#C8C8C8",
        },
        gold: {
          DEFAULT: "#C9A227",
          400: "#E0BC4A",
          700: "#8A6D1F",
        },
        accent: {
          DEFAULT: "#C9A227",
          600: "#E0BC4A",
        },
      },
      fontFamily: {
        serif: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.40), 0 2px 10px rgba(0, 0, 0, 0.35)",
        drawer: "-16px 0 48px rgba(0, 0, 0, 0.70)",
      },
      borderRadius: {
        card: "6px",
      },
      transitionTimingFunction: {
        precise: "cubic-bezier(0.4, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
