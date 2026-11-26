import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16151a",
        paper: "#f4f3f1",
        brass: "#16151a",
        sage: "#6E56CF",
        ox: "#16151a",
        card: "#ffffff",
        // The client suite
        lxbg: "#F8F8F8",
        lxink: "#1F1E1C",
        lxsoft: "#67635C",
        lxgold: "#C2A46B",
        lxblue: "#D6E6EC",
        lxsage: "#B9C7AE",
        lxlav: "#D9D0E6",
        lxblush: "#EBC4C8",
        lxgolddeep: "#8C7040",
        lxhair: "rgba(31,30,28,0.09)",
        lxfill: "#F2F0ED",
      },
      fontFamily: {
        serif: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        lux: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
        luxsans: ['Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        sig: ['"Mrs Saint Delafield"', '"Brush Script MT"', 'cursive'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
