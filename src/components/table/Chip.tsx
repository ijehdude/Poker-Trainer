'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Denom = 'white' | 'red' | 'blue' | 'green' | 'black' | 'gold';

/**
 * Casino-standard chip colors. Each denomination carries a base fill, a
 * darker rim, the light "edge spot" color around the rim, and a contrasting
 * inner ring + face text color. Rendered as crisp SVG (no image assets).
 */
const CHIP_COLORS: Record<
  Denom,
  { base: string; edge: string; spot: string; ring: string; text: string }
> = {
  white: {
    base: '#f2f4f3',
    edge: '#cfd6d1',
    spot: '#ffffff',
    ring: 'rgba(21,33,28,0.35)',
    text: '#15211c',
  },
  red: {
    base: '#e0556b',
    edge: '#9e2740',
    spot: '#ffd9df',
    ring: 'rgba(255,255,255,0.85)',
    text: '#ffffff',
  },
  blue: {
    base: '#4b8bf5',
    edge: '#27559f',
    spot: '#d6e6ff',
    ring: 'rgba(255,255,255,0.85)',
    text: '#ffffff',
  },
  green: {
    base: '#2fae6a',
    edge: '#176a41',
    spot: '#c9f4dd',
    ring: 'rgba(255,255,255,0.85)',
    text: '#ffffff',
  },
  black: {
    base: '#2c332f',
    edge: '#0c100e',
    spot: '#9fb3a8',
    ring: 'rgba(255,255,255,0.8)',
    text: '#ffffff',
  },
  gold: {
    base: '#e7c46a',
    edge: '#a87f2e',
    spot: '#fff1c9',
    ring: 'rgba(58,44,0,0.4)',
    text: '#3a2c00',
  },
};

/** Standard denominations, largest first, for building realistic stacks. */
const DENOMS: { value: number; denom: Denom }[] = [
  { value: 100, denom: 'black' },
  { value: 25, denom: 'green' },
  { value: 10, denom: 'blue' },
  { value: 5, denom: 'red' },
  { value: 1, denom: 'white' },
];

/**
 * Break an amount into chips using standard denominations (greedy), capped
 * so the stack stays readable. Returns chips ordered largest→smallest, which
 * the stack renders bottom→top. The exact amount is always shown as a label.
 */
function chipBreakdown(amount: number): Denom[] {
  let rem = Math.round(amount);
  const chips: Denom[] = [];
  for (const { value, denom } of DENOMS) {
    let q = Math.floor(rem / value);
    rem -= q * value;
    q = Math.min(q, 4); // cap per denomination
    for (let i = 0; i < q; i++) chips.push(denom);
  }
  if (chips.length === 0) chips.push('white');
  return chips.slice(0, 8);
}

/** A single, crisp SVG poker chip with rim edge-spots and a contrasting inner ring. */
export function Chip({ denom, size = 24 }: { denom: Denom; size?: number }) {
  const c = CHIP_COLORS[denom];
  const spots = 6;
  const gid = `cg-${denom}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))' }}
      aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.edge} />
        </radialGradient>
      </defs>
      {/* Rim */}
      <circle cx="50" cy="50" r="49" fill={c.edge} />
      {/* Edge spots around the rim */}
      {Array.from({ length: spots }).map((_, i) => (
        <rect
          key={i}
          x="43.5"
          y="1.5"
          width="13"
          height="15"
          rx="3"
          fill={c.spot}
          transform={`rotate(${(360 / spots) * i} 50 50)`}
        />
      ))}
      {/* Face */}
      <circle cx="50" cy="50" r="37" fill={`url(#${gid})`} />
      {/* Contrasting inner ring */}
      <circle cx="50" cy="50" r="37" fill="none" stroke={c.ring} strokeWidth="3" />
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke={c.ring}
        strokeWidth="1.5"
        strokeDasharray="2 4"
        opacity="0.7"
      />
      {/* Soft top highlight for a 3D feel */}
      <ellipse cx="50" cy="34" rx="22" ry="11" fill="#ffffff" opacity="0.12" />
    </svg>
  );
}

/**
 * A stack of chips representing an amount, colored by denomination and
 * offset vertically. Used for player bets and the central pot. A compact
 * numeric label sits beside the stack.
 */
export function ChipStack({
  amount,
  size = 22,
  className,
  animateKey,
}: {
  amount: number;
  size?: number;
  className?: string;
  animateKey?: string | number;
}) {
  if (amount <= 0) return null;
  const chips = chipBreakdown(amount);
  const offset = Math.max(3, Math.round(size * 0.2));
  const stackHeight = size + (chips.length - 1) * offset;

  return (
    <motion.div
      key={animateKey}
      className={cn('flex items-center gap-1.5', className)}
      initial={{ scale: 0.6, opacity: 0, y: -6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      <div className="relative" style={{ width: size, height: stackHeight }}>
        {chips.map((denom, i) => (
          <div key={i} className="absolute left-0" style={{ bottom: i * offset }}>
            <Chip denom={denom} size={size} />
          </div>
        ))}
      </div>
      <span className="nums rounded-full bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold text-ink ring-1 ring-white/10">
        {formatAmount(amount)}
      </span>
    </motion.div>
  );
}

export function formatAmount(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return amount % 1 === 0 ? `${amount}` : amount.toFixed(1);
}
