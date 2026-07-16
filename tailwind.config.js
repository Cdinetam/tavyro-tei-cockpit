/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090B',
          900: '#0B0D10',
          800: '#111419',
          700: '#161A21',
          600: '#1C212A',
          500: '#262C37',
          400: '#333B49',
        },
        line: {
          DEFAULT: '#252B34',
          soft: '#1A1F27',
          strong: '#3A4250',
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
