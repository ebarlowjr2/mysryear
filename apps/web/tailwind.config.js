/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f8ff',
          100: '#dbeeff',
          200: '#bfe0ff',
          300: '#93caff',
          400: '#5da9ff',
          500: '#2a86ff',
          600: '#1966db',
          700: '#144fb1',
          800: '#124392',
          900: '#0f396f',
        },
        accent: {
          500: '#F59E0B',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  future: { hoverOnlyWhenSupported: true },
  plugins: [],
}
