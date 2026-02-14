/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'terra-blue': '#0066CC',
        'terra-green': '#00CC66',
        'terra-red': '#CC0000',
        'terra-dark': '#1a1a2e',
      },
    },
  },
  plugins: [],
}
