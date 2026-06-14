'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Denom = 'white' | 'red' | 'green' | 'blue' | 'black' | 'gold';

const CHIP_COLORS: Record<Denom, { base: string; edge: string }> = {
  white: { base: '#e9efec', edge: '#c7d0cb' },
  red: { base: '#e0556b', edge: '#a63347' },
  green: { base: '#2fae6a', edge: '#1c7a49' },
  blue: { base: '#4b8bf5', edge: '#2c5fb0' },
  black: { base: '#26302b', edge: '#0e1512' },
  gold: { base: '#e7c46a', edge: '#b8923f' },
};

/** Pick a chip color by value magnitude for a believable stack. */
function denomFor(value: number): Denom {
  if (value >= 100) return 'black';
  if (value >= 25) return 'green';
  if (value >= 10) return 'blue';
  if (value >= 5) return 'red';
  return 'white';
}

export function Chip({ denom, size = 22 }: { denom: Denom; size?: number }) {
  const c = CHIP_COLORS[denom];
  return (
    <div
      className="relative rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 35%, ${c.base}, ${c.edge})`,
        boxShadow: `0 1px 2px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.12)`,
      }}
    >
      <div
        className="absolute inset-[3px] rounded-full border-dashed"
        style={{ border: `1.5px dashed rgba(255,255,255,0.35)` }}
      />
    </div>
  );
}

/**
 * A small stack of chips representing an amount, with the numeric label.
 * Used for bets in front of seats and the central pot.
 */
export function ChipStack({
  amount,
  size = 20,
  className,
  animateKey,
}: {
  amount: number;
  size?: number;
  className?: string;
  animateKey?: string | number;
}) {
  if (amount <= 0) return null;
  const denom = denomFor(amount);
  const count = Math.min(5, Math.max(1, Math.round(Math.log10(amount + 1) + 1)));

  return (
    <motion.div
      key={animateKey}
      className={cn('flex items-center gap-1.5', className)}
      initial={{ scale: 0.6, opacity: 0, y: -6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      <div className="relative" style={{ width: size, height: size + (count - 1) * 3 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="absolute left-0" style={{ bottom: i * 3 }}>
            <Chip denom={denom} size={size} />
          </div>
        ))}
      </div>
      <span className="nums rounded-full bg-black/40 px-1.5 py-0.5 text-[11px] font-semibold text-ink">
        {formatAmount(amount)}
      </span>
    </motion.div>
  );
}

export function formatAmount(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return amount % 1 === 0 ? `${amount}` : amount.toFixed(1);
}
