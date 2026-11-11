/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070F0D",
        charcoal: "#2C3531",
        teal: {
          DEFAULT: "#116466",
          dark: "#0C3C3D",
          light: "#188082",
        },
        tan: "#D9B08C",
        peach: "#FFCB9A",
        mint: {
          DEFAULT: "#D1E8E2",
          dim: "#A3C8BF",
        },
        decision: {
          green: "#2FD3A5",
          red: "#FF6A5C",
          amber: "#FFCB9A",
        },
      },
      fontFamily: {
        heading: ["'Raleway'", "'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        devanagari: ["'Noto Sans Devanagari'", "sans-serif"],
      },
      letterSpacing: {
        'deck-wide': '0.35em',
        'deck-widest': '0.5em',
      },
    },
  },
  plugins: [],
}
