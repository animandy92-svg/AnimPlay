/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'animplay': {
          'purple': '#46178F',
          'purple-dark': '#2D0A5E',
          'purple-light': '#6B3FA0',
          'blue': '#1368CE',
          'red': '#E21B3C',
          'yellow': '#D89E00',
          'green': '#26890C',
          'orange': '#FF6B35',
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
