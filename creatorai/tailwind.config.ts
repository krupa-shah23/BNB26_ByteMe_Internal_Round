import type { Config } from "tailwindcss";

const token = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        sunken: token("sunken"),
        text: token("text"),
        muted: token("muted"),
        line: token("line"),
        brand: token("brand"),
        "brand-ink": token("brand-ink"),
        "brand-2": token("brand-2"),
        accent: token("accent"),
        tan: token("tan"),
        sage: token("sage"),
        ok: token("ok"),
        warn: token("warn"),
        bad: token("bad"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-text)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { pill: "999px" },
      boxShadow: { soft: "var(--shadow)" },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
    },
  },
  plugins: [],
};
export default config;
