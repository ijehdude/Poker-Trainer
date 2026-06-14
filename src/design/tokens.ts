/**
 * Poker Trainer — Design Tokens
 * ------------------------------------------------------------------
 * Single typed source of truth for the visual language. These values
 * are mirrored as CSS custom properties in `globals.css` and surfaced
 * to Tailwind via `tailwind.config.ts`. Import these in TS/JS when you
 * need a raw value (e.g. Framer Motion, canvas, inline charts).
 *
 * Aesthetic: premium dark "felt" table, metallic + neon accents,
 * cinematic depth, high-contrast type.
 */

export const colors = {
  // Base / surfaces
  bg: '#0a0e0c', // near-black with a green undertone
  surface: '#11161300', // transparent placeholder; see surface scale below
  felt: {
    900: '#0b2018',
    800: '#0e2a1f',
    700: '#123528',
    600: '#16412f',
    light: '#1d5440',
  },
  panel: {
    base: '#111815',
    raised: '#16201b',
    border: '#22302a',
  },
  // Text
  text: {
    primary: '#f2f6f3',
    secondary: '#a9b8b0',
    muted: '#6f807a',
    inverse: '#06100b',
  },
  // Brand / accent — neon emerald + gold metallic
  accent: {
    neon: '#3ef2a1', // primary neon emerald
    neonDim: '#1fae72',
    glow: '#5dffba',
    gold: '#e7c46a',
    goldDim: '#b8923f',
  },
  // Verdict scale (color-blind-safe pairing: each also has an icon/shape cue)
  verdict: {
    optimal: '#3ef2a1', // emerald
    good: '#7fd4ff', // cyan-blue
    questionable: '#ffd166', // amber
    mistake: '#ff9f45', // orange
    blunder: '#ff5d6c', // red
  },
  // Functional
  equity: {
    high: '#3ef2a1',
    mid: '#ffd166',
    low: '#ff5d6c',
    track: '#1a241f',
  },
  chip: {
    white: '#f2f6f3',
    red: '#e0556b',
    green: '#2fae6a',
    black: '#1a1f1d',
    blue: '#4b8bf5',
    gold: '#e7c46a',
  },
  card: {
    face: '#f7f9f8',
    faceShadow: '#d7ded9',
    backA: '#123528',
    backB: '#0b2018',
    red: '#d23b4e',
    black: '#15211c',
  },
  state: {
    danger: '#ff5d6c',
    warning: '#ffd166',
    success: '#3ef2a1',
    info: '#7fd4ff',
  },
} as const;

export const radius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  pill: '999px',
} as const;

export const spacing = {
  px: '1px',
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.4)',
  md: '0 4px 16px rgba(0,0,0,0.45)',
  lg: '0 12px 40px rgba(0,0,0,0.55)',
  inset: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  neon: '0 0 0 1px rgba(62,242,161,0.35), 0 0 24px rgba(62,242,161,0.25)',
  gold: '0 0 0 1px rgba(231,196,106,0.35), 0 0 20px rgba(231,196,106,0.2)',
  card: '0 6px 18px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)',
} as const;

export const typography = {
  fontSans:
    "var(--font-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontDisplay: 'var(--font-display), var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  fontMono: "var(--font-mono), ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
  // type scale (rem)
  scale: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.375rem',
    '2xl': '1.75rem',
    '3xl': '2.25rem',
    '4xl': '3rem',
  },
} as const;

/**
 * Motion specs — consistent durations & easings for Framer Motion.
 * Components should reference these instead of hard-coding values so
 * `prefers-reduced-motion` can be honored centrally.
 */
export const motion = {
  duration: {
    instant: 0.08,
    fast: 0.16,
    base: 0.26,
    slow: 0.42,
    deal: 0.32,
  },
  ease: {
    out: [0.22, 1, 0.36, 1] as [number, number, number, number],
    inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
    spring: { type: 'spring', stiffness: 420, damping: 32 } as const,
    chip: { type: 'spring', stiffness: 320, damping: 30 } as const,
  },
} as const;

export const zIndex = {
  base: 0,
  table: 10,
  cards: 20,
  chips: 30,
  controls: 40,
  overlay: 50,
  modal: 60,
  toast: 70,
  tooltip: 80,
} as const;

export type VerdictKey = keyof typeof colors.verdict;
