import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#08080A",
        surface: "#0E0E12",
        raised: "#16161C",
        line: "rgba(255,255,255,0.08)",
        accent: { DEFAULT: "#7C3AED", glow: "#A855F7" },
        magenta: "#DB2777",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
        "accent-soft":
          "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(219,39,119,0.18) 100%)",
      },
      boxShadow: {
        glow: "0 10px 40px -10px rgba(124,58,237,0.45)",
        "glow-magenta": "0 10px 50px -8px rgba(219,39,119,0.5)",
        card: "0 8px 30px -12px rgba(0,0,0,0.7)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.4rem",
        "3xl": "1.8rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
