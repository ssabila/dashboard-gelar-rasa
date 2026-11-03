/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0D0630',
        surface:  '#18314F',
        elevated: '#384E77',
        muted:    '#8BBEB2',
        accent:   '#E6F9AF',

        text: {
          primary:   '#F0F4FF',
          secondary: '#8BBEB2',
          disabled:  '#4A6480',
        },

        ispu: {
          baik:       '#4ADE80',
          sedang:     '#FACC15',
          'tidak-sehat': '#FB923C',
          'sangat-tidak': '#F87171',
          berbahaya:  '#C026D3',
        },
      },

      fontFamily: {
        body:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'metric': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1', fontWeight: '700' }],
      },

      borderRadius: {
        card:  '0.75rem',
        badge: '0.375rem',
      },

      borderColor: {
        DEFAULT: 'rgba(139, 190, 178, 0.18)',
        strong:  'rgba(139, 190, 178, 0.35)',
      },

      boxShadow: {
        card:  '0 4px 24px rgba(0, 0, 0, 0.3)',
        popup: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },

      spacing: {
        navbar: '3.5rem',
      },

      transitionDuration: {
        fast: '150ms',
        base: '250ms',
      },
    },
  },
  plugins: [],
}
