/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Bebas Neue'", 'sans-serif'],
        sans: ["'Syne'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'SFMono-Regular'],
      },
      colors: {
        bg: '#080c10',
        surface1: '#0e1318',
        surface2: '#141b22',
        surface3: '#1c252f',
        accent: '#00e5ff',
        greenish: '#39d98a',
        orangeish: '#ff8c42',
        yellowish: '#ffd166',
      },
    },
  },
  plugins: [],
}
