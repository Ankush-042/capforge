export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0A0A0B',
        surface: { 0: '#111113', 1: '#17181B', 2: '#1D1E21', border: '#26272B', 'border-soft': '#1C1D20' },
        text: { primary: '#EDEDEF', secondary: '#9A9BA1', tertiary: '#5F6066', disabled: '#3D3E43' },
        accent: { DEFAULT: '#5B8DEF', soft: '#1A2333', ring: 'rgba(91,141,239,0.35)' },
        signal: { critical: '#E5645A', high: '#E0985A', medium: '#D6C15B', low: '#6B9E78', success: '#5FB080' }
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      fontSize: { xs: '12px', sm: '13px', base: '14px', md: '15px', lg: '17px', xl: '20px', '2xl': '24px' },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '10px', lg: '12px' },
      boxShadow: { subtle: '0 1px 2px rgba(0,0,0,0.24)', elevated: '0 12px 32px rgba(0,0,0,0.45)' }
    }
  },
  plugins: []
};
