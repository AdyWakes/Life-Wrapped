/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"LW Display"', 'system-ui', 'sans-serif'],
        sans: ['"LW Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'Noto Sans Devanagari', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
