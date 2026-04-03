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
      // ============================================
      // 响应式字体大小（使用 rem 单位）
      // 基于 16px 根字体大小计算
      // ============================================
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
      },
      // ============================================
      // 响应式间距（使用 rem 单位）
      // ============================================
      spacing: {
        '0': '0',
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '9': '2.25rem',     // 36px
        '10': '2.5rem',     // 40px
        '11': '2.75rem',    // 44px
        '12': '3rem',       // 48px
        '14': '3.5rem',     // 56px
        '16': '4rem',       // 64px
        '20': '5rem',       // 80px
        '24': '6rem',       // 96px
        '28': '7rem',       // 112px
        '32': '8rem',       // 128px
        '36': '9rem',       // 144px
        '40': '10rem',      // 160px
        '44': '11rem',      // 176px
        '48': '12rem',      // 192px
        '52': '13rem',      // 208px
        '56': '14rem',      // 224px
        '60': '15rem',      // 240px
        '64': '16rem',      // 256px
        '72': '18rem',      // 288px
        '80': '20rem',      // 320px
        '96': '24rem',      // 384px
      },
      // ============================================
      // 断点配置（Mobile First）
      // ============================================
      screens: {
        // 移动端（默认）
        'xs': '375px',   // 大屏手机
        'sm': '640px',   // 小屏平板
        // 平板
        'md': '768px',   // 标准平板
        'lg': '1024px',  // 大屏平板/小屏笔记本
        // 桌面
        'xl': '1280px',  // 标准桌面
        '2xl': '1536px', // 大屏桌面
        '3xl': '1920px', // 1080p
        '4xl': '2560px', // 2.5K/4K
      },
      // ============================================
      // 最大宽度限制（用于大屏优化）
      // ============================================
      maxWidth: {
        'screen-xs': '375px',
        'screen-sm': '640px',
        'screen-md': '768px',
        'screen-lg': '1024px',
        'screen-xl': '1280px',
        'screen-2xl': '1536px',
        'screen-3xl': '1920px',
        'screen-4xl': '2560px',
        // 内容容器最大宽度
        'content': '1440px',
        'content-narrow': '1200px',
      },
      // ============================================
      // 圆角（统一设计系统）
      // ============================================
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',   // 2px
        'DEFAULT': '0.25rem', // 4px
        'md': '0.375rem',   // 6px
        'lg': '0.5rem',     // 8px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px
        'full': '9999px',
      },
      // ============================================
      // 阴影（统一设计系统）
      // ============================================
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'none': 'none',
      },
    },
  },
  plugins: [
    // 添加自定义插件：响应式容器查询支持
    function({ addComponents, theme }) {
      addComponents({
        // 大屏限制容器：防止 2.5K/4K 屏幕 UI 无限放大
        '.container-optimized': {
          width: '100%',
          maxWidth: '1440px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          '@screen xl': {
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
          },
          '@screen 2xl': {
            paddingLeft: '2rem',
            paddingRight: '2rem',
          },
        },
        // 移动端优化：全宽无内边距
        '.container-mobile-full': {
          width: '100%',
          maxWidth: '100%',
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          '@screen sm': {
            paddingLeft: '1rem',
            paddingRight: '1rem',
          },
        },
        // 响应式字体类
        '.text-fluid-xs': {
          fontSize: 'clamp(0.625rem, 0.8vw, 0.75rem)',   // 10px - 12px
          lineHeight: '1.25',
        },
        '.text-fluid-sm': {
          fontSize: 'clamp(0.75rem, 0.9vw, 0.875rem)',  // 12px - 14px
          lineHeight: '1.4',
        },
        '.text-fluid-base': {
          fontSize: 'clamp(0.875rem, 1vw, 1rem)',        // 14px - 16px
          lineHeight: '1.5',
        },
        '.text-fluid-lg': {
          fontSize: 'clamp(1rem, 1.25vw, 1.125rem)',     // 16px - 18px
          lineHeight: '1.5',
        },
        '.text-fluid-xl': {
          fontSize: 'clamp(1.125rem, 1.5vw, 1.25rem)',   // 18px - 20px
          lineHeight: '1.4',
        },
        '.text-fluid-2xl': {
          fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',       // 20px - 24px
          lineHeight: '1.3',
        },
        '.text-fluid-3xl': {
          fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',    // 24px - 30px
          lineHeight: '1.2',
        },
        // 响应式间距类
        '.gap-fluid-sm': {
          gap: 'clamp(0.25rem, 0.5vw, 0.5rem)',
        },
        '.gap-fluid-md': {
          gap: 'clamp(0.5rem, 1vw, 1rem)',
        },
        '.gap-fluid-lg': {
          gap: 'clamp(1rem, 1.5vw, 1.5rem)',
        },
        // 响应式内边距类
        '.p-fluid-sm': {
          padding: 'clamp(0.25rem, 0.5vw, 0.5rem)',
        },
        '.p-fluid-md': {
          padding: 'clamp(0.5rem, 1vw, 1rem)',
        },
        '.p-fluid-lg': {
          padding: 'clamp(1rem, 1.5vw, 1.5rem)',
        },
      });
    },
  ],
}
