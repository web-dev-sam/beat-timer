/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    colors: {
      primary: '#8a5df4',
      purple: '#8a5df4',
      'purple-28': 'hsl(264, 58%, 16%)',
      dark: '#010101',
      'gray-900': '#161616',
      'gray-800': '#2c2c2c',
      white: '#fff',
      current: 'currentColor',
      muted: 'hsla(0, 0%, 100%, 0.33)',
    },
    fontFamily: {
      sans: ['Kanit', '-apple-system', 'sans-serif'],
    },
    extend: {
      borderRadius: {
        primary: '0.5rem',
      },
    },
  },
  plugins: [],
}
