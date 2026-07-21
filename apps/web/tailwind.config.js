/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          foreground: '#ffffff',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        tertiary: '#FF9100',
        surface: {
          DEFAULT: '#000000',
          foreground: '#ffffff',
          hover: 'rgba(255, 255, 255, 0.02)',
        },
        background: '#000000',
        'on-surface': '#ffffff',
        neutral: {
          100: '#111111',
          200: '#222222',
          300: '#333333',
          400: '#666666',
          500: '#888888',
          600: '#999999',
          700: '#cccccc',
          800: '#eeeeee',
          900: '#ffffff',
        },
        error: {
          DEFAULT: '#FF453A',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#32D74B',
          foreground: '#FFFFFF',
        },
        border: 'rgba(255,255,255,0.1)',
        ring: 'rgba(255,255,255,0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      fontSize: {
        'display': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '0', fontWeight: '500' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', letterSpacing: '0', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },
      spacing: {
        xs: '12px',
        sm: '20px',
        md: '24px',
        lg: '28px',
        xl: '32px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        DEFAULT: '0 4px 12px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        md: '0 8px 24px 0 rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        glow: '0 0 20px 0 rgba(255, 145, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
