/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EBF3FF',
          100: '#D0E4FF',
          200: '#A8CAFF',
          300: '#75AAFF',
          400: '#4285F4',
          500: '#1B5BC6',
          600: '#1B3875',
          700: '#142D5E',
          800: '#0F2247',
          900: '#091530',
        },
        sidebar: '#0F2654',
        accent: {
          DEFAULT: '#E84B0F',
          light: '#FF6B3D',
          dark:  '#C43A08',
        },
        neft: {
          blue:   '#1B3875',
          navy:   '#0F2654',
          orange: '#E84B0F',
          light:  '#EBF3FF',
          gray:   '#F4F6FA',
        },
      },
      fontFamily: {
        sans: ['Sarabun', 'Noto Sans Thai', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
