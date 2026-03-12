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
          DEFAULT: '#262626', /* 主色：商务黑 */
          'light-1': '#3b3b3b',
          'light-2': '#525252',
          'light-3': '#6b6b6b', /* 悬停色 */
          'light-4': '#858585',
          'light-5': '#9e9e9e', /* 禁用/次要色 */
          'light-6': '#b8b8b8',
          'light-7': '#d1d1d1',
          'light-8': '#ebebeb',
          'light-9': '#f5f5f5', /* 极浅背景色 */
          'dark-2': '#141414', /* 按下/激活色 */
        },
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#6b7280',
      },
      fontFamily: {
        sans: ['Nunito', 'Quicksand', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
