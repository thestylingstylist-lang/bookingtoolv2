import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14201c",
        paper: "#f6f4ee",
        brass: "#9a7b3f",
        sage: "#5f7266",
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', 'Palatino', '"Palatino Linotype"', 'Georgia', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
