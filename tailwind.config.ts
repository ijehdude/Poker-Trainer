import type { Config } from 'tailwindcss';

/**
 * Tailwind maps semantic names onto CSS custom properties declared in
 * `globals.css`, which mirror `src/design/tokens.ts`. Editing tokens →
 * update both the CSS variables and (if you add new ones) this file.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        felt: {
          900: 'var(--felt-900)',
          800: 'var(--felt-800)',
          700: 'var(--felt-700)',
          600: 'var(--felt-600)',
          light: 'var(--felt-light)',
        },
        panel: {
          DEFAULT: 'var(--panel-base)',
          raised: 'var(--panel-raised)',
          border: 'var(--panel-border)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--accent-neon)',
          neon: 'var(--accent-neon)',
          dim: 'var(--accent-neon-dim)',
          glow: 'var(--accent-glow)',
          gold: 'var(--accent-gold)',
          'gold-dim': 'var(--accent-gold-dim)',
        },
        verdict: {
          optimal: 'var(--verdict-optimal)',
          good: 'var(--verdict-good)',
          questionable: 'var(--verdict-questionable)',
          mistake: 'var(--verdict-mistake)',
          blunder: 'var(--verdict-blunder)',
        },
        equity: {
          high: 'var(--equity-high)',
          mid: 'var(--equity-mid)',
          low: 'var(--equity-low)',
          track: 'var(--equity-track)',
        },
        danger: 'var(--state-danger)',
        warning: 'var(--state-warning)',
        success: 'var(--state-success)',
        info: 'var(--state-info)',
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 4px 16px rgba(0,0,0,0.45)',
        deep: '0 12px 40px rgba(0,0,0,0.55)',
        neon: '0 0 0 1px rgba(62,242,161,0.35), 0 0 24px rgba(62,242,161,0.25)',
        gold: '0 0 0 1px rgba(231,196,106,0.35), 0 0 20px rgba(231,196,106,0.2)',
        card: '0 6px 18px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-lg': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      backgroundImage: {
        'felt-radial':
          'radial-gradient(ellipse 120% 90% at 50% 38%, var(--felt-600) 0%, var(--felt-800) 55%, var(--felt-900) 100%)',
        'neon-sheen':
          'linear-gradient(120deg, transparent 30%, rgba(93,255,186,0.12) 50%, transparent 70%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(62,242,161,0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgba(62,242,161,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(62,242,161,0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
