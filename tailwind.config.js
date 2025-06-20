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
        'brand-single': '#1A5276',
        'brand-throw': '#6B8F71',
        'brand-marketing': '#6E6F71',
      },
    },
  },
  plugins: [],
}
