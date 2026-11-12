/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          void: "#02030B",
          black: "#02030B",
          deep: "#050817",
          navy: "#050817",
          surface: "#0A1024",
          elevated: "#111B35",
          border: "#202D4D",
          blue: "#477FF5",
          cosmic: "#244DA8",
          violet: "#7655C9",
          cyan: "#62C9E8",
          starlight: "#A5C8FF",
          bronze: "#956B50",
          brown: "#956B50",
          gold: "#E5C18B",
          star: "#EAF0FF",
          secondary: "#A1AFCE",
          muted: "#647394",
        },
        decision: {
          green: "#2FD3A5",
          red: "#FF6A5C",
          amber: "#FFD166",
        },
      },
      fontFamily: {
        heading: ["'Raleway'", "sans-serif"],
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
