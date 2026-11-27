/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coal: '#181817',
        bone: '#EDE9DA',
        card: '#222220',
        elevated: '#242422',
        studio: '#1C1C1B',
        glass: '#2C2C2A',
        muted: '#B5B1A4',
        sage: '#9BC2A0',
        ochre: '#E5B96C',
        terracotta: '#F0887D',
      },
      fontFamily: {
        slab: ['Bevan', 'Arvo', 'serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      letterSpacing: {
        editorial: '0.28em',
      },
    },
  },
  plugins: [],
}
