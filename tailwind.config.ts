import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edfff8',
          100: '#d5ffee',
          200: '#aeffde',
          300: '#70ffc6',
          400: '#2bfda6',
          500: '#06d6a0',
          600: '#00b584',
          700: '#008e6b',
          800: '#067056',
          900: '#075c48',
          950: '#003427',
        },
        navy: {
          50: '#f0f4fd',
          100: '#e4eafb',
          200: '#ced8f6',
          300: '#b0bdef',
          400: '#8f9de5',
          500: '#7680da',
          600: '#5f5fca',
          700: '#504fb1',
          800: '#43438f',
          900: '#1a2236',
          950: '#0a0e17',
        },
        cyber: {
          blue: '#00b4d8',
          purple: '#7c3aed',
          pink: '#f72585',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.9)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 20px rgba(6,214,160,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(6,214,160,0.5)' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-20px)' } },
      },
    },
  },
  plugins: [],
};

export default config;
