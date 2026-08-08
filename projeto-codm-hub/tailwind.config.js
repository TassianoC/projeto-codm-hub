/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        viking: {
          gold: '#FFD700',
          dark: '#0D0F12',
          card: '#161920',
          accent: '#1F2430'
        }
      }
    },
  },
  plugins: [],
}