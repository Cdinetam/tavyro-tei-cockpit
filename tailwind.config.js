/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050D1B',
          900: '#0A192F',
          800: '#0F2340',
          700: '#152C4F',
          600: '#1D3860',
          500: '#2A4876',
          400: '#3E5C8C',
        },
        line: {
          DEFAULT: '#2C3B54',
          soft: '#1E2A3E',
          strong: '#44567A',
        },
        paper: {
          DEFAULT: '#EDEEF0',
          dim: '#B7BCC4',
          faint: '#7C8391',
        },
        brass: {
          DEFAULT: '#B08C4F',
          light: '#D3B378',
          dim: '#7A6640',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        widest2: '0.28em',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
