'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Panel } from '@/components/ui/Panel';
import { RangeGrid } from '@/components/charts/RangeGrid';
import { POSITIONS, POSITION_LABELS, RFI_PERCENT, type Position } from '@/engine/ranges';
import { cn } from '@/lib/cn';

export default function ChartsPage() {
  const [position, setPosition] = useState<Position>('BTN');
  const openable = POSITIONS.filter((p) => RFI_PERCENT[p] > 0);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Range Charts</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Raise-first-in opening ranges by position. Derived from a transparent hand-strength
            model — a study reference, not a live solver.
          </p>
        </div>

        {/* Position selector */}
        <div className="mb-5 flex flex-wrap gap-2">
          {openable.map((p) => (
            <button
              key={p}
              onClick={() => setPosition(p)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                position === p
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'hover:border-accent/40 border-panel-border text-ink-secondary',
              )}
            >
              {p}
              <span className="ml-1.5 text-xs opacity-70">{Math.round(RFI_PERCENT[p] * 100)}%</span>
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <Panel className="p-4">
            <RangeGrid position={position} />
          </Panel>

          <aside>
            <Panel className="p-4">
              <h3 className="font-display text-sm font-semibold">{POSITION_LABELS[position]}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
                {POSITION_NOTES[position]}
              </p>
              <div className="mt-4 space-y-2 text-xs text-ink-secondary">
                <Tip>The earlier your position, the tighter you should open.</Tip>
                <Tip>Suited hands play better than their offsuit twins — flushes and equity.</Tip>
                <Tip>These are opening (RFI) ranges; facing a raise tightens you considerably.</Tip>
              </div>
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </div>
  );
}

const POSITION_NOTES: Record<Position, string> = {
  UTG: 'First to act preflop. Open a tight, high-equity range — you have five players still to act behind you.',
  HJ: 'One off the cutoff. You can widen a little from UTG, adding more suited and connected hands.',
  CO: 'The cutoff steals frequently. Open a broad range of suited hands, connectors, and most aces.',
  BTN: 'The best seat. You act last on every postflop street, so you can open almost half your hands.',
  SB: 'You’ll be out of position postflop, but you only have the BB to get through — a wide raise-or-fold range works well.',
  BB: 'The big blind has no opening range; it’s the closer. You defend by calling or 3-betting versus a raise.',
};
