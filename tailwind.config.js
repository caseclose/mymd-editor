/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        shell: {
          light: '#f5f5f5',
          dark: '#1e1e1e'
        }
      }
    }
  },
  plugins: []
}
