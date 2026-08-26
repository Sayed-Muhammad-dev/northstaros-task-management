/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07111f",
          900: "#0b1020",
          800: "#11182b",
        },
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          500: "#4f7cff",
          600: "#395fe5",
          700: "#2d49bf",
        },
        mint: "#57d6b7",
        amber: "#f4b56a",
        rose: "#fb7185",
      },
      boxShadow: {
        luxe: "0 24px 80px rgba(15, 23, 42, 0.16)",
        panel: "0 20px 50px rgba(2, 6, 23, 0.12)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top, rgba(79,124,255,0.22), transparent 32%), linear-gradient(135deg, rgba(11,16,32,1) 0%, rgba(22,34,59,1) 55%, rgba(8,13,26,1) 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseLine: {
          "0%": { opacity: "0.35", transform: "translateX(-10%)" },
          "100%": { opacity: "1", transform: "translateX(10%)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        rise: "rise 0.6s ease-out forwards",
        pulseLine: "pulseLine 1.2s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
