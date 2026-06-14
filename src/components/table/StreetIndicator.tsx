'use client';

import type { Street } from '@/engine/types';
import { cn } from '@/lib/cn';

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const STREET_LABEL: Record<Street, string> = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
};

/**
 * Segmented street progress indicator (Preflop · F · T · R). Rendered in a
 * reserved strip — never on top of the felt — so it can't collide with a
 * seat's FOLDED label. The active street is fully spelled out.
 */
export function StreetIndicator({ street }: { street: Street }) {
  const activeIndex = STREETS.indexOf(street);
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-panel-border bg-black/55 px-1.5 py-1 backdrop-blur">
      {STREETS.map((s, i) => {
        const active = i === activeIndex;
        const done = i < activeIndex;
        return (
          <span
            key={s}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
              active
                ? 'bg-accent text-ink-inverse shadow-neon'
                : done
                  ? 'text-accent/70'
                  : 'text-ink-muted',
            )}
          >
            {active ? STREET_LABEL[s] : STREET_LABEL[s].slice(0, 1)}
          </span>
        );
      })}
    </div>
  );
}
