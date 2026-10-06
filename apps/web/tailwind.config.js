/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ECE9E2',
          foreground: '#0A0A0A',
        },
        secondary: {
          DEFAULT: '#1C1C1C',
          foreground: '#ECE9E2',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        tertiary: '#FF9100',
        surface: {
          DEFAULT: '#0A0A0A',
          foreground: '#ECE9E2',
          hover: 'rgba(255, 255, 255, 0.06)',
          card: '#141414',
        },
        background: '#0A0A0A',
        'on-surface': '#ECE9E2',
        neutral: {
          100: '#141414',
          200: '#1C1C1C',
          300: '#2A2A2A',
          400: '#8F8D88',
          500: '#A8A6A0',
          600: '#BDBBB5',
          700: '#D0CEC8',
          800: '#E2E0DA',
          900: '#F1EEE7',
        },
        error: {
          DEFAULT: '#F04438',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#12915A',
          foreground: '#FFFFFF',
        },
        border: 'rgba(255,255,255,0.14)',
        ring: 'rgba(255,145,0,0.55)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
        lg: '8px',
        xl: '12px',
        '2xl': '12px',
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
        sm: 'none',
        DEFAULT: 'none',
        md: '0 1px 0 0 rgba(35,35,35,0.06)',
        glow: 'none',
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
