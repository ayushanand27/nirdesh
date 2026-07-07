/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Off-white canvas, never stark white.
        canvas: "#F4F2EC",
        surface: "#FBFAF6",
        // Deep navy as the primary institutional accent.
        navy: {
          DEFAULT: "#16233F",
          700: "#1E304F",
          600: "#294066",
          400: "#5A6B87",
        },
        ink: "#1A1D24",
        muted: "#6B7079",
        hair: "#DAD6CB", // hairline borders
        // Compliance states — muted, consistent everywhere.
        compliant: {
          DEFAULT: "#3F7A5E",
          bg: "#E7EEE7",
          text: "#2C5A44",
        },
        breach: {
          DEFAULT: "#B4563C",
          bg: "#F3E3DD",
          text: "#8A3D28",
        },
        na: {
          DEFAULT: "#9A968C",
          bg: "#ECEAE3",
          text: "#6E6A61",
        },
        accent: "#B7935A", // brass/gold hairline accent for delta highlights
      },
      fontFamily: {
        serif: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 35, 63, 0.04), 0 4px 12px rgba(22, 35, 63, 0.06)",
        drawer: "-8px 0 32px rgba(22, 35, 63, 0.12)",
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
