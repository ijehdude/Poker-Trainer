'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Live win-probability bar. Color is a secondary cue only — the bar is fully
 * readable without hue thanks to: the always-visible numeric %, a text tier
 * label ("Ahead / Coinflip / Behind"), a direction glyph (▲ ≈ ▼), and a
 * diagonal stripe texture on the fill. An optional break-even tick shows the
 * equity you need to continue. This makes it color-blind safe.
 */
function tierOf(eq: number): { label: string; glyph: string } {
  if (eq >= 0.7) return { label: 'Crushing', glyph: '▲▲' };
  if (eq >= 0.55) return { label: 'Ahead', glyph: '▲' };
  if (eq >= 0.45) return { label: 'Coinflip', glyph: '≈' };
  if (eq >= 0.3) return { label: 'Behind', glyph: '▼' };
  return { label: 'Trailing', glyph: '▼▼' };
}

export function EquityBar({
  equity,
  loading,
  win,
  tie,
  breakEven,
  label = 'Win probability',
}: {
  equity: number;
  loading?: boolean;
  win?: number;
  tie?: number;
  /** Optional equity needed to continue — renders a tick marker. */
  breakEven?: number;
  label?: string;
}) {
  const pct = Math.round(equity * 1000) / 10;
  const color =
    equity >= 0.55
      ? 'var(--equity-high)'
      : equity >= 0.4
        ? 'var(--equity-mid)'
        : 'var(--equity-low)';
  const tier = tierOf(equity);
  const showTick = breakEven !== undefined && breakEven > 0 && breakEven < 1 && !loading;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-secondary">{label}</span>
        <span className="flex items-center gap-1.5">
          {!loading && (
            <span
              className="rounded-full border px-1.5 py-px text-[10px] font-bold uppercase tracking-wide"
              style={{ color, borderColor: 'currentColor' }}
            >
              <span aria-hidden>{tier.glyph}</span> {tier.label}
            </span>
          )}
          <span className="nums font-display text-sm font-bold" style={{ color }}>
            {loading ? '…' : `${pct.toFixed(1)}%`}
          </span>
        </span>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-full bg-equity-track">
        <motion.div
          className={cn('relative h-full rounded-full', loading && 'skeleton')}
          style={{
            background: loading
              ? undefined
              : `linear-gradient(90deg, ${color}, var(--accent-glow))`,
          }}
          initial={false}
          animate={{ width: loading ? '40%' : `${Math.max(2, pct)}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        >
          {/* Diagonal stripe texture — a non-color cue on the fill. */}
          {!loading && (
            <span
              className="absolute inset-0 rounded-full opacity-25"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0 3px, transparent 3px 7px)',
              }}
              aria-hidden
            />
          )}
        </motion.div>
        {/* Break-even tick: the equity you need to continue. */}
        {showTick && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/80"
            style={{ left: `${Math.min(100, breakEven! * 100)}%` }}
            title={`Need ~${Math.round(breakEven! * 100)}% to continue`}
            aria-hidden
          />
        )}
      </div>
      <div className="nums mt-1 flex justify-between text-[10px] text-ink-muted">
        <span>
          {win !== undefined && !loading ? `Win ${Math.round(win * 100)}%` : ''}
          {tie !== undefined && tie > 0.001 && !loading ? ` · Tie ${Math.round(tie * 100)}%` : ''}
        </span>
        {showTick && <span>Need {Math.round(breakEven! * 100)}% ▏</span>}
      </div>
    </div>
  );
}
