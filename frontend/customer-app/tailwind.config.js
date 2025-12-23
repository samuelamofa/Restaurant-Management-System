/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F0F0F',
        secondary: '#1A1A1A',
        accent: '#D4A574',
        'accent-dark': '#B88D4F',
        'accent-light': '#E8C9A0',
        success: '#2ECC71',
        danger: '#E74C3C',
        text: '#F5F5F5',
        'text-muted': '#A0A0A0',
        'warm-bg': '#1C1612',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

