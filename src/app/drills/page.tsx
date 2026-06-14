'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppHeader } from '@/components/layout/AppHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { PlayingCard } from '@/components/table/PlayingCard';
import { Board } from '@/components/table/Board';
import { EquityBar } from '@/components/coach/EquityBar';
import { getCategories, getDrills, scoreDrill, type DrillResult } from '@/drills/engine';
import { useDrills } from '@/store/drillStore';
import { parseCard } from '@/engine/cards';
import { POSITION_LABELS } from '@/engine/ranges';
import type { ActionType } from '@/engine/types';
import { cn } from '@/lib/cn';

const ACTION_LABEL: Record<ActionType, string> = {
  fold: 'Fold',
  check: 'Check',
  call: 'Call',
  bet: 'Bet',
  raise: 'Raise',
};

export default function DrillsPage() {
  const categories = getCategories();
  const { progress, accuracy } = useDrills();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {!active ? (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Drills</h1>
              <p className="mt-1 text-sm text-ink-secondary">
                One spot at a time. Answer, then get scored against the solver with the full
                rationale.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const p = progress[c.id];
                const acc = accuracy(c.id);
                const count = getDrills(c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className="hover:border-accent/40 group rounded-lg border border-panel-border bg-panel p-4 text-left transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold">{c.name}</h3>
                      <span className="text-xs text-ink-muted">{count} spots</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-secondary">{c.blurb}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-equity-track">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.round(acc * 100)}%` }}
                        />
                      </div>
                      <span className="nums text-[10px] text-ink-muted">
                        {p ? `${Math.round(acc * 100)}%` : 'new'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <DrillSession categoryId={active} onExit={() => setActive(null)} />
        )}
      </main>
    </div>
  );
}

function DrillSession({ categoryId, onExit }: { categoryId: string; onExit: () => void }) {
  const drills = useMemo(() => shuffle(getDrills(categoryId)), [categoryId]);
  const record = useDrills((s) => s.record);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<DrillResult | null>(null);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });

  const drill = drills[index];
  if (!drill) return null;

  const answer = (action: ActionType) => {
    if (result) return;
    const r = scoreDrill(drill, action);
    setResult(r);
    record(categoryId, r.correct);
    setSessionScore((s) => ({ correct: s.correct + (r.correct ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setResult(null);
    setIndex((i) => (i + 1) % drills.length);
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          ← Categories
        </Button>
        <span className="nums text-sm text-ink-secondary">
          {sessionScore.correct}/{sessionScore.total} correct
        </span>
      </div>

      <Panel className="overflow-hidden">
        {/* Scene */}
        <div className="bg-felt-radial p-5">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="rounded-full bg-black/40 px-2.5 py-1 font-medium text-accent">
              {POSITION_LABELS[drill.position]}
            </span>
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-ink-secondary">
              {drill.stackBB}bb · pot {drill.pot}
            </span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {drill.hole.map((c, i) => (
                <PlayingCard key={i} card={parseCard(c)} size="lg" />
              ))}
            </div>
            {drill.board.length > 0 && <Board cards={drill.board.map(parseCard)} size="sm" />}
          </div>
        </div>

        {/* Prompt + actions */}
        <div className="p-5">
          <p className="text-sm font-medium leading-relaxed text-ink">{drill.prompt}</p>

          <div
            className={cn(
              'mt-4 grid gap-2',
              drill.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
            )}
          >
            {drill.options.map((opt) => {
              const isAnswer = result && opt === result.answer;
              const isChosenWrong = result && opt === result.chosen && !result.correct;
              return (
                <button
                  key={opt}
                  onClick={() => answer(opt)}
                  disabled={!!result}
                  className={cn(
                    'rounded-md border py-3 text-sm font-semibold transition-all',
                    !result && 'hover:border-accent/50 border-panel-border hover:bg-panel-raised',
                    isAnswer && 'bg-accent/15 border-accent text-accent',
                    isChosenWrong && 'bg-danger/15 border-danger text-danger',
                    result && !isAnswer && !isChosenWrong && 'border-panel-border opacity-50',
                  )}
                >
                  {ACTION_LABEL[opt]}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 overflow-hidden"
              >
                <div
                  className={cn(
                    'rounded-lg border p-4',
                    result.correct
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-danger/40 bg-danger/10',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn('text-lg', result.correct ? 'text-accent' : 'text-danger')}>
                      {result.correct ? '★ Correct' : '✕ Not quite'}
                    </span>
                    {!result.correct && (
                      <span className="text-xs text-ink-secondary">
                        Best: {ACTION_LABEL[result.answer]}
                      </span>
                    )}
                  </div>
                  {result.equity !== null && (
                    <div className="mb-3">
                      <EquityBar equity={result.equity} label="Your equity (vs 1 random)" />
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-ink-secondary">{result.explain}</p>
                </div>
                <Button block className="mt-3" onClick={next}>
                  Next spot →
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Panel>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
