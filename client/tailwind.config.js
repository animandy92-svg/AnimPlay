/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'animplay': {
          'brand': '#0F766E',
          'brand-dark': '#042F2E',
          'brand-light': '#2DD4BF',
          'purple': '#7C3AED',
          'purple-dark': '#5B21B6',
          'nav': '#134E4A',
          'accent': '#F97316',
          'accent-dark': '#C2410C',
          'blue': '#1368CE',
          'red': '#E21B3C',
          'yellow': '#D89E00',
          'green': '#26890C',
          'orange': '#FF6B35',
          'slate': '#1E293B',
        },
      },
      fontFamily: {
        'display': ['"Fredoka One"', '"Comic Neue"', 'cursive'],
        'body': ['"Nunito"', '"Comic Neue"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
