export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0B0D10', 900: '#12151A', 700: '#3A4048', 500: '#6B7280', 300: '#C4C9D0' },
        surface: { 0: '#FFFFFF', 50: '#FAFAF9', 100: '#F4F3F1', 200: '#EAE8E4' },
        accent: { 600: '#2F5D50', 500: '#3C7263', 100: '#E4EDE9' },
        signal: { critical: '#B3432B', high: '#C77B2E', medium: '#9A8237', low: '#5C6A5B', success: '#2F5D50' }
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      boxShadow: { subtle: '0 1px 2px rgba(15,15,15,0.04), 0 1px 1px rgba(15,15,15,0.03)', elevated: '0 8px 24px rgba(15,15,15,0.08)' },
      borderRadius: { md: '10px', lg: '14px' }
    }
  },
  plugins: []
};
