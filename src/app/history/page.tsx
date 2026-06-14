'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { PokerTable } from '@/components/table/PokerTable';
import { VerdictChip } from '@/components/coach/VerdictChip';
import { PlayingCard } from '@/components/table/PlayingCard';
import { formatAmount } from '@/components/table/Chip';
import { loadHands, clearHands, type HandRecord } from '@/lib/history';
import { parseCard } from '@/engine/cards';
import { cn } from '@/lib/cn';

export default function HistoryPage() {
  const [hands, setHands] = useState<HandRecord[] | null>(null);
  const [selected, setSelected] = useState<HandRecord | null>(null);

  useEffect(() => {
    setHands(loadHands());
  }, []);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Hand History</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Replay any hand street by street with the verdict on every decision.
            </p>
          </div>
          {hands && hands.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearHands();
                setHands([]);
                setSelected(null);
              }}
            >
              Clear all
            </Button>
          )}
        </div>

        {hands === null ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : hands.length === 0 ? (
          <EmptyHistory />
        ) : selected ? (
          <Replay hand={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="space-y-2">
            {hands.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h)}
                className="hover:border-accent/40 flex w-full items-center gap-4 rounded-lg border border-panel-border bg-panel p-3 text-left transition-colors"
              >
                <div className="flex gap-1">
                  {h.heroHole ? (
                    h.heroHole.map((c, i) => <PlayingCard key={i} card={parseCard(c)} size="xs" />)
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Hand #{h.handNumber}</div>
                  <div className="text-xs text-ink-muted">
                    {h.decisions.length} decision{h.decisions.length === 1 ? '' : 's'} ·{' '}
                    {h.showdown ? 'Showdown' : 'No showdown'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {worstVerdict(h) && <VerdictChip verdict={worstVerdict(h)!} size="sm" />}
                  <span
                    className={cn(
                      'nums w-16 text-right text-sm font-bold',
                      h.heroNet > 0
                        ? 'text-accent'
                        : h.heroNet < 0
                          ? 'text-danger'
                          : 'text-ink-muted',
                    )}
                  >
                    {h.heroNet > 0 ? '+' : ''}
                    {formatAmount(h.heroNet)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Replay({ hand, onBack }: { hand: HandRecord; onBack: () => void }) {
  const [i, setI] = useState(0);
  const frame = hand.frames[i]!;
  const last = hand.frames.length - 1;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← All hands
        </Button>
        <span className="text-sm text-ink-secondary">
          Hand #{hand.handNumber} · {hand.showdown ? 'Showdown' : 'No showdown'}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel className="p-4">
          <PokerTable game={{ ...frame, deck: [] }} compact />
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setI((x) => Math.max(0, x - 1))}
              disabled={i === 0}
            >
              ◀ Prev
            </Button>
            <input
              type="range"
              min={0}
              max={last}
              value={i}
              onChange={(e) => setI(Number(e.target.value))}
              className="flex-1 accent-[var(--accent-neon)]"
              aria-label="Replay step"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setI((x) => Math.min(last, x + 1))}
              disabled={i === last}
            >
              Next ▶
            </Button>
          </div>
          <div className="mt-2 text-center text-xs uppercase tracking-wider text-ink-muted">
            {frame.street} · step {i + 1}/{hand.frames.length}
          </div>
        </Panel>

        <aside>
          <Panel className="p-4">
            <h3 className="mb-3 font-display text-sm font-semibold">Your decisions</h3>
            {hand.decisions.length === 0 ? (
              <p className="text-xs text-ink-muted">You folded preflop or weren’t dealt in.</p>
            ) : (
              <ul className="space-y-3">
                {hand.decisions.map((d) => (
                  <li key={d.id} className="border-l-2 border-panel-border pl-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold capitalize text-ink">
                        {d.street}: {d.action.type}
                        {d.action.amount > 0 ? ` ${formatAmount(d.action.amount)}` : ''}
                      </span>
                      <VerdictChip
                        verdict={d.verdict.verdict}
                        size="sm"
                        evLossBB={d.verdict.evLossBB}
                      />
                    </div>
                    <p className="text-[11px] text-ink-muted">
                      <span className="capitalize text-ink-secondary">You {d.action.type}</span> →{' '}
                      <span className="capitalize text-accent">
                        best: {d.recommended.type}
                        {d.recommended.amount > 0 ? ` ${formatAmount(d.recommended.amount)}` : ''}
                      </span>
                      {' · '}
                      {Math.round(d.equity * 100)}% equity
                      {d.verdict.evLossBB > 0.01 ? (
                        <span className="font-semibold text-danger">
                          {' · '}
                          EV −{d.verdict.evLossBB.toFixed(2)}bb
                        </span>
                      ) : (
                        <span className="font-semibold text-accent">{' · '}EV optimal</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function worstVerdict(h: HandRecord) {
  const order = ['optimal', 'good', 'questionable', 'mistake', 'blunder'] as const;
  let worst: (typeof order)[number] | null = null;
  for (const d of h.decisions) {
    if (!worst || order.indexOf(d.verdict.verdict) > order.indexOf(worst))
      worst = d.verdict.verdict;
  }
  return worst;
}

function EmptyHistory() {
  return (
    <Panel className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-4xl">🗂️</span>
      <h3 className="font-display text-lg font-semibold">No hands yet</h3>
      <p className="max-w-sm text-sm text-ink-secondary">
        Play some hands and they’ll be saved here automatically — replay each one with full
        coaching.
      </p>
      <Button onClick={() => (window.location.href = '/play')}>Go play →</Button>
    </Panel>
  );
}
