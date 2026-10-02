/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#111111',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f1f1f3',
          foreground: '#111111',
          border: 'rgba(0, 0, 0, 0.08)',
        },
        tertiary: '#F08300',
        surface: {
          DEFAULT: '#ffffff',
          foreground: '#111111',
          hover: 'rgba(0, 0, 0, 0.025)',
        },
        background: '#ffffff',
        'on-surface': '#111111',
        neutral: {
          100: '#f7f7f8',
          200: '#ececee',
          300: '#d9d9dd',
          400: '#7a7a85',
          500: '#62626c',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#111111',
        },
        error: {
          DEFAULT: '#D92D20',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#12915A',
          foreground: '#FFFFFF',
        },
        border: 'rgba(0,0,0,0.1)',
        ring: 'rgba(0,0,0,0.25)',
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
        sm: '0 1px 2px 0 rgba(16, 16, 20, 0.05)',
        DEFAULT: '0 4px 16px 0 rgba(16, 16, 20, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        md: '0 12px 32px 0 rgba(16, 16, 20, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        glow: '0 6px 20px 0 rgba(0, 0, 0, 0.14)',
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
