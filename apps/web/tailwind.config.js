/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#171717',
        secondary: '#E5E7EB',
        tertiary: '#FF9100',
        neutral: '#FFFFFF',
        surface: '#FFFFFF',
        'on-surface': '#171717',
        error: '#D92D20',
        'primary-contrast': '#FFFFFF',
        'border-subtle': 'rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      fontSize: {
        'display': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '500' }],
        'headline-lg': ['21px', { lineHeight: '25px', letterSpacing: '0', fontWeight: '500' }],
        'headline-md': ['18px', { lineHeight: '22px', letterSpacing: '0', fontWeight: '500' }],
        'headline-sm': ['16px', { lineHeight: '19px', letterSpacing: '0', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '21px', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', letterSpacing: '0', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '21px', letterSpacing: '0', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
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
      },
    },
  },
  plugins: [],
};
