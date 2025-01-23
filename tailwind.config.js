/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    colors: {
      primary: '#8a5df4',
      purple: '#8a5df4',
      'purple-28': 'hsl(264, 58%, 16%)',
      dark: '#010101',
      'gray-900': '#161616',
      'gray-800': '#2c2c2c',
      'gray-700': '#3f3f3f',
      white: '#fff',
      current: 'currentColor',
      muted: '#4b4651',
    },
    fontFamily: {
      sans: ['Kanit', '-apple-system', 'sans-serif'],
      mono: ['monospace'],
    },
    extend: {
      borderRadius: {
        primary: '0.5rem',
      },
    },
  },
  plugins: [],
}
