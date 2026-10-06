/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#232323',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#E6E2D8',
          foreground: '#232323',
          border: 'rgba(0, 0, 0, 0.08)',
        },
        tertiary: '#FF9100',
        surface: {
          DEFAULT: '#F1EEE7',
          foreground: '#232323',
          hover: 'rgba(35, 35, 35, 0.05)',
          card: '#F8F6F1',
        },
        background: '#F1EEE7',
        'on-surface': '#232323',
        neutral: {
          100: '#F8F6F1',
          200: '#E6E2D8',
          300: '#DEDEDE',
          400: '#8A8984',
          500: '#5B5A56',
          600: '#4A4945',
          700: '#3A3936',
          800: '#2D2C2A',
          900: '#232323',
        },
        error: {
          DEFAULT: '#D92D20',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#12915A',
          foreground: '#FFFFFF',
        },
        border: 'rgba(35,35,35,0.14)',
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
