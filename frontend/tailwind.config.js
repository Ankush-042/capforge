export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F7F9',
        surface: { DEFAULT: '#FFFFFF', muted: '#FAFAFB', border: '#EDEDF1' },
        ink: { 900: '#161719', 700: '#3E4047', 500: '#6E7079', 300: '#A7A9B1' },
        violet: { 50: '#F1EEFE', 100: '#E4DEFD', 500: '#7C5CFC', 600: '#6845F0', 700: '#5636D6' },
        blue: { 50: '#EAF1FE', 500: '#4C86F9', 600: '#3B6FE0' },
        amber: { 50: '#FEF3E8', 500: '#F0A84E' },
        rose: { 50: '#FDEEF0', 500: '#EF6E85' },
        mint: { 50: '#EAF7F0', 500: '#3FB081' },
        signal: { critical: '#E15C4D', high: '#F0A84E', medium: '#E0C64B', low: '#3FB081' }
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      borderRadius: { lg: '16px', xl: '20px' },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,30,0.04), 0 1px 1px rgba(20,20,30,0.03)',
        elevated: '0 16px 40px rgba(20,20,30,0.08), 0 2px 8px rgba(20,20,30,0.04)'
      }
    }
  },
  plugins: []
};
