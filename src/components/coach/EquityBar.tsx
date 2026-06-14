'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Live win-probability bar. Color shifts green→amber→red with equity and
 * is never conveyed by color alone (the numeric % is always shown).
 */
export function EquityBar({
  equity,
  loading,
  win,
  tie,
  label = 'Win probability',
}: {
  equity: number;
  loading?: boolean;
  win?: number;
  tie?: number;
  label?: string;
}) {
  const pct = Math.round(equity * 1000) / 10;
  const color =
    equity >= 0.55
      ? 'var(--equity-high)'
      : equity >= 0.4
        ? 'var(--equity-mid)'
        : 'var(--equity-low)';

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-secondary">{label}</span>
        <span className="nums font-display text-sm font-bold" style={{ color }}>
          {loading ? '…' : `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-equity-track">
        <motion.div
          className={cn('h-full rounded-full', loading && 'skeleton')}
          style={{
            background: loading
              ? undefined
              : `linear-gradient(90deg, ${color}, var(--accent-glow))`,
          }}
          initial={false}
          animate={{ width: loading ? '40%' : `${Math.max(2, pct)}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        />
        {/* break-even marker handled by caller overlay if needed */}
      </div>
      {(win !== undefined || tie !== undefined) && !loading && (
        <div className="nums mt-1 flex justify-between text-[10px] text-ink-muted">
          <span>Win {Math.round((win ?? 0) * 100)}%</span>
          {tie !== undefined && tie > 0.001 && <span>Tie {Math.round(tie * 100)}%</span>}
        </div>
      )}
    </div>
  );
}
