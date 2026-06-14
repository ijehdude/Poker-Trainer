'use client';

import { useMemo, useState } from 'react';
import {
  gridCell,
  isOpen,
  handStrengthPercentile,
  comboCount,
  type Position,
} from '@/engine/ranges';
import { cn } from '@/lib/cn';

/**
 * Interactive 13×13 starting-hand grid. Pairs sit on the diagonal, suited
 * combos above it, offsuit below. Cells in the position's opening range are
 * tinted by hand strength; tapping a cell shows its detail.
 */
export function RangeGrid({ position }: { position: Position }) {
  const [active, setActive] = useState<string | null>(null);

  const { count, combos } = useMemo(() => {
    let c = 0;
    let n = 0;
    for (let r = 0; r < 13; r++) {
      for (let col = 0; col < 13; col++) {
        const hc = gridCell(r, col);
        if (isOpen(position, hc)) {
          c++;
          n += comboCount(hc);
        }
      }
    }
    return { count: c, combos: n };
  }, [position]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-ink-secondary">
        <span>
          <span className="font-semibold text-accent">{count}</span> hand classes ·{' '}
          <span className="font-semibold text-accent">{Math.round((combos / 1326) * 100)}%</span> of
          combos
        </span>
        <span className="text-ink-muted">Tap a hand</span>
      </div>

      <div
        className="grid w-full select-none gap-[2px]"
        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
      >
        {Array.from({ length: 13 }).map((_, row) =>
          Array.from({ length: 13 }).map((_, col) => {
            const hc = gridCell(row, col);
            const open = isOpen(position, hc);
            const strength = handStrengthPercentile(hc);
            const isPair = row === col;
            // Opacity heat: stronger hands → more saturated.
            const alpha = open ? Math.max(0.22, 1 - strength * 1.6) : 0;
            return (
              <button
                key={`${row}-${col}`}
                onClick={() => setActive(hc)}
                title={hc}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-[3px] text-[8px] font-semibold transition-transform sm:text-[10px]',
                  open ? 'text-ink-inverse' : 'text-ink-muted',
                  isPair && 'ring-1 ring-inset ring-black/30',
                  active === hc && 'scale-110 ring-2 ring-accent',
                )}
                style={{
                  background: open ? `rgba(62, 242, 161, ${alpha})` : 'var(--panel-raised)',
                }}
              >
                {hc}
              </button>
            );
          }),
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-muted">
        <span>Weaker</span>
        <div
          className="h-2 flex-1 rounded-full"
          style={{
            background: 'linear-gradient(90deg, rgba(62,242,161,0.22), rgba(62,242,161,1))',
          }}
        />
        <span>Stronger</span>
      </div>

      {active && <CellDetail handClass={active} position={position} />}
    </div>
  );
}

function CellDetail({ handClass, position }: { handClass: string; position: Position }) {
  const open = isOpen(position, handClass);
  const pct = handStrengthPercentile(handClass);
  return (
    <div className="mt-3 rounded-md border border-panel-border bg-panel-raised p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-bold">{prettyHand(handClass)}</span>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            open ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger',
          )}
        >
          {open ? 'Open / Raise' : 'Fold'}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-ink-secondary">
        Roughly a top-{Math.round(pct * 100)}% starting hand ({comboCount(handClass)} combos).{' '}
        {open
          ? `Inside the standard ${position} opening range.`
          : `Outside a disciplined ${position} opening range.`}
      </p>
    </div>
  );
}

function prettyHand(hc: string): string {
  const suffix = hc.length === 3 ? (hc[2] === 's' ? ' suited' : ' offsuit') : ' (pair)';
  return `${hc.slice(0, 2)}${suffix}`;
}
