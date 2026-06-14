'use client';

import { motion } from 'framer-motion';
import type { Verdict } from '@/engine/verdict';
import { VERDICT_GLYPH, VERDICT_LABELS } from '@/engine/verdict';
import { cn } from '@/lib/cn';

const VERDICT_STYLE: Record<Verdict, string> = {
  optimal: 'bg-verdict-optimal/15 text-verdict-optimal border-verdict-optimal/40',
  good: 'bg-verdict-good/15 text-verdict-good border-verdict-good/40',
  questionable:
    'bg-verdict-questionable/15 text-verdict-questionable border-verdict-questionable/40',
  mistake: 'bg-verdict-mistake/15 text-verdict-mistake border-verdict-mistake/40',
  blunder: 'bg-verdict-blunder/15 text-verdict-blunder border-verdict-blunder/40',
};

/**
 * Colored verdict chip. Color-blind safe: each verdict pairs with a unique
 * glyph (★ ✓ ≈ ! ✕) and the spelled-out label.
 */
export function VerdictChip({
  verdict,
  size = 'md',
  evLossBB,
}: {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
  evLossBB?: number;
}) {
  const sizing =
    size === 'lg'
      ? 'text-sm px-3 py-1.5 gap-2'
      : size === 'sm'
        ? 'text-[10px] px-1.5 py-0.5 gap-1'
        : 'text-xs px-2.5 py-1 gap-1.5';
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className={cn(
        'inline-flex items-center rounded-full border font-bold uppercase tracking-wide',
        sizing,
        VERDICT_STYLE[verdict],
      )}
    >
      <span aria-hidden className="font-black">
        {VERDICT_GLYPH[verdict]}
      </span>
      {VERDICT_LABELS[verdict]}
      {evLossBB !== undefined && evLossBB > 0.01 && (
        <span className="nums font-medium opacity-80">−{evLossBB.toFixed(2)}bb</span>
      )}
    </motion.span>
  );
}
