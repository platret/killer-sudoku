import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          panel: 'rgb(var(--bg-panel) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)'
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line) / <alpha-value>)'
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          dim: 'rgb(var(--ink-dim) / <alpha-value>)'
        },
        accent: {
          DEFAULT: '#f4a72c',
          hover: '#ffb845',
          deep: '#1a1206',
          foreground: '#1a1206'
        },
        cyan: {
          glow: '#d97757'
        },
        magenta: {
          glow: '#c97d4a'
        },
        danger: '#e5484d',
        success: '#4cae6a',
        warning: '#f4a72c'
      },
      fontFamily: {
        sans: ['SoraVariable', 'Sora', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk Variable', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      boxShadow: {
        glow: '0 0 32px rgba(244, 167, 44, 0.35)',
        glowCyan: '0 0 32px rgba(217, 119, 87, 0.35)',
        glowPink: '0 0 32px rgba(201, 125, 74, 0.35)',
        elev: '0 12px 32px rgba(0,0,0,0.65)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 16px 40px rgba(0,0,0,0.4)'
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #7a3e12 0%, #b5651d 50%, #f4a72c 100%)',
        'hero-gradient':
          'linear-gradient(120deg, #ffb845 0%, #f4a72c 35%, rgb(var(--ink)) 100%)',
        'card-sheen':
          'linear-gradient(160deg, rgba(244,167,44,0.10) 0%, rgba(244,167,44,0) 60%)',
        'dot-grid':
          'radial-gradient(circle at 1px 1px, rgba(244,167,44,0.12) 1px, transparent 0)'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '75%': { transform: 'translateX(3px)' }
        },
        floatPulse: {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.4' },
          '50%': { transform: 'translateY(-6px) scale(1.04)', opacity: '0.7' }
        }
      },
      animation: {
        shake: 'shake 0.3s ease-in-out',
        floatPulse: 'floatPulse 6s ease-in-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
