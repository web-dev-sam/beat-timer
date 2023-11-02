/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    colors: {
      primary: '#8a5df4',
      purple: '#8a5df4'
    },
    fontFamily: {
      sans: ['Kanit', '-apple-system', 'sans-serif']
    },
    extend: {
      borderRadius: {
        primary: '0.5rem'
      }
    }
  },
  plugins: []
}
