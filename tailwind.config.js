/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          light: '#6366f1',
          dark: '#4338ca',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#64748b',
      },
      fontFamily: {
        sans: ['Nunito', 'Quicksand', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '4px 4px 0px rgba(0, 0, 0, 1)',
        'brutal-hover': '6px 6px 0px rgba(0, 0, 0, 1)',
        'brutal-active': '2px 2px 0px rgba(0, 0, 0, 1)',
        'brutal-sm': '2px 2px 0px rgba(0, 0, 0, 1)',
        'brutal-lg': '8px 8px 0px rgba(0, 0, 0, 1)',
      },
      borderRadius: {
        'brutal': '0px',
      },
    },
  },
  plugins: [],
}
