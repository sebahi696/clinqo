/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        ink: { 50: '#f5f7f7', 100: '#e8eded', 200: '#cdd8d8', 300: '#a3b5b5', 400: '#6f8888', 500: '#4e6767', 600: '#3a5050', 700: '#2b3d3d', 800: '#1c2a2a', 900: '#101a1a' },
        brand: { 50: '#eefaf7', 100: '#d4f2ea', 200: '#a9e4d5', 300: '#73cfb9', 400: '#3fb49a', 500: '#1f9880', 600: '#147a68', 700: '#136255', 800: '#134e45', 900: '#12413a' },
        coral: { 400: '#f08a6c', 500: '#e46a48', 600: '#c9512f' },
        sand: { 50: '#fbf8f3', 100: '#f4eee3' },
      },
    },
  },
  plugins: [],
};
