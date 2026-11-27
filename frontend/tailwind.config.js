/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF8F2',
        ink: '#17140F',
        line: '#E7E1D6',
        pistachio: '#D5E5BE',
        strawberry: '#F3C6C8',
        lemon: '#F4E6A8',
        blueberry: '#C9D4EC',
        apricot: '#F6D3B4',
      },
      fontFamily: {
        display: ['"Clash Display"', 'Georgia', 'serif'],
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        scoop: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
