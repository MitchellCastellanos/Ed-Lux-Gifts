import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: { DEFAULT: '#06271E', dark: '#031B14', mid: '#174735', soft: '#E4EDE8' },
        gold: { DEFAULT: '#D4A64D', light: '#F4CE83', deep: '#8A6420', line: '#E4CFA0' },
        ivory: '#FAF5EC',
        champagne: '#F2E6D4',
        ink: '#18231D',
        muted: '#62645D',
        burgundy: '#8A1730',
        danger: '#9B1C1C',
      },
      fontFamily: {
        display: ['"Playfair Display Variable"', 'Georgia', 'serif'],
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        script: ['"Pinyon Script"', 'cursive'],
      },
      borderRadius: { DEFAULT: '4px', md: '6px', lg: '8px' },
      maxWidth: { page: '1240px' },
    },
  },
  plugins: [],
} satisfies Config;
