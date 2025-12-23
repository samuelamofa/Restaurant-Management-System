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
        primary: '#121212',
        secondary: '#1E1E1E',
        accent: '#C59D5F',
        success: '#2ECC71',
        danger: '#E74C3C',
        text: '#F5F5F5',
      },
    },
  },
  plugins: [],
};

