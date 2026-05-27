import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0612',
          panel: '#15102a',
          surface: '#1a1535',
          elevated: '#221c44'
        },
        line: {
          DEFAULT: '#2a2444',
          strong: '#3a3458'
        },
        ink: {
          DEFAULT: '#fafafa',
          muted: '#a8a4c4',
          dim: '#6b6790'
        },
        accent: {
          DEFAULT: '#a855f7',
          hover: '#c084fc',
          deep: '#581c87'
        },
        cyan: {
          glow: '#06b6d4'
        },
        magenta: {
          glow: '#ec4899'
        },
        danger: '#f43f5e',
        success: '#34d399',
        warning: '#fbbf24'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      boxShadow: {
        glow: '0 0 32px rgba(168, 85, 247, 0.35)',
        glowCyan: '0 0 32px rgba(6, 182, 212, 0.3)',
        glowPink: '0 0 32px rgba(236, 72, 153, 0.3)',
        elev: '0 12px 32px rgba(0,0,0,0.65)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 16px 40px rgba(0,0,0,0.4)'
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)',
        'hero-gradient': 'linear-gradient(120deg, #c084fc 0%, #f0abfc 35%, #67e8f9 100%)',
        'card-sheen': 'linear-gradient(160deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0) 60%)',
        'dot-grid': 'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.18) 1px, transparent 0)'
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
