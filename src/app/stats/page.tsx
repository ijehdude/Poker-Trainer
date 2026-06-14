'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Panel } from '@/components/ui/Panel';
import { Stat } from '@/components/ui/Stat';
import { loadHands, type HandRecord } from '@/lib/history';
import { computeStats } from '@/lib/stats';
import { analyzeLeaks } from '@/coach/leaks';
import { useDrills } from '@/store/drillStore';
import { getCategories } from '@/drills/engine';
import { VERDICT_LABELS, VERDICTS, type Verdict } from '@/engine/verdict';
import { cn } from '@/lib/cn';

const VERDICT_COLOR: Record<Verdict, string> = {
  optimal: 'var(--verdict-optimal)',
  good: 'var(--verdict-good)',
  questionable: 'var(--verdict-questionable)',
  mistake: 'var(--verdict-mistake)',
  blunder: 'var(--verdict-blunder)',
};

export default function StatsPage() {
  const [hands, setHands] = useState<HandRecord[] | null>(null);
  const { progress } = useDrills();

  useEffect(() => {
    setHands(loadHands());
  }, []);

  const stats = useMemo(() => (hands ? computeStats(hands) : null), [hands]);
  const report = useMemo(
    () => (hands ? analyzeLeaks(hands.flatMap((h) => h.decisions)) : null),
    [hands],
  );

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Stats & Leaks</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Everything is computed locally from your play and drills.
          </p>
        </div>

        {!stats || stats.hands === 0 ? (
          <Panel className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">📈</span>
            <h3 className="font-display text-lg font-semibold">No data yet</h3>
            <p className="max-w-sm text-sm text-ink-secondary">
              Play some hands — your VPIP/PFR, accuracy, EV lost, and top leaks will appear here.
            </p>
          </Panel>
        ) : (
          <div className="space-y-5">
            {/* Headline stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <Stat
                label="Win rate"
                value={`${stats.bbPer100 >= 0 ? '+' : ''}${stats.bbPer100.toFixed(1)}`}
                sub="bb / 100"
                accent={stats.bbPer100 >= 0 ? 'neon' : 'danger'}
              />
              <Stat label="Hands" value={stats.hands} />
              <Stat label="Accuracy" value={`${Math.round(stats.accuracy * 100)}%`} accent="neon" />
              <Stat
                label="Deviated"
                value={`${Math.round(stats.deviationRate * 100)}%`}
                sub="from best EV"
                accent={stats.deviationRate > 0.35 ? 'danger' : 'none'}
              />
              <Stat label="VPIP" value={`${Math.round(stats.vpip * 100)}%`} />
              <Stat label="PFR" value={`${Math.round(stats.pfr * 100)}%`} />
              <Stat
                label="EV lost"
                value={`${stats.evLostBB.toFixed(1)}`}
                sub="bb total"
                accent="gold"
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Verdict distribution */}
              <Panel className="p-4">
                <h3 className="mb-3 font-display text-sm font-semibold">Decision quality</h3>
                <div className="space-y-2">
                  {VERDICTS.map((v) => {
                    const count = stats.verdictCounts[v];
                    const frac = stats.decisions > 0 ? count / stats.decisions : 0;
                    return (
                      <div key={v} className="flex items-center gap-3">
                        <span className="w-24 text-xs text-ink-secondary">{VERDICT_LABELS[v]}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-equity-track">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${frac * 100}%`, background: VERDICT_COLOR[v] }}
                          />
                        </div>
                        <span className="nums w-8 text-right text-xs text-ink-muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {(['preflop', 'flop', 'turn', 'river'] as const).map((s) => {
                    const st = stats.byStreet[s];
                    const acc = st.total > 0 ? st.correct / st.total : 0;
                    return (
                      <div
                        key={s}
                        className="rounded-md border border-panel-border bg-panel-raised p-2 text-center"
                      >
                        <div className="text-[10px] uppercase text-ink-muted">{s}</div>
                        <div className="nums mt-0.5 text-sm font-bold">
                          {st.total > 0 ? `${Math.round(acc * 100)}%` : '—'}
                        </div>
                        <div className="text-[10px] text-ink-muted">{st.total} spots</div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* Top leaks */}
              <Panel className="p-4">
                <h3 className="mb-3 font-display text-sm font-semibold">Top leaks</h3>
                {report && report.leaks.length > 0 ? (
                  <ul className="space-y-3">
                    {report.leaks.slice(0, 5).map((leak) => (
                      <li key={leak.id} className="rounded-md border border-panel-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{leak.title}</span>
                          <TrendBadge trend={leak.trend} />
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                          {leak.detail}
                        </p>
                        <div className="mt-1.5 flex gap-3 text-[10px] text-ink-muted">
                          <span>
                            {leak.count}/{leak.sampled} spots
                          </span>
                          <span>−{leak.evLostBB.toFixed(1)}bb</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-secondary">
                    No recurring leaks detected yet — keep playing to build a sample.
                  </p>
                )}
              </Panel>
            </div>

            {/* Drill accuracy */}
            <Panel className="p-4">
              <h3 className="mb-3 font-display text-sm font-semibold">
                Drill accuracy by category
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {getCategories().map((c) => {
                  const p = progress[c.id];
                  const acc = p && p.attempts > 0 ? p.correct / p.attempts : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-ink-secondary">{c.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-equity-track">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${acc * 100}%` }}
                        />
                      </div>
                      <span className="nums w-12 text-right text-[10px] text-ink-muted">
                        {p ? `${p.correct}/${p.attempts}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'worsening' | 'improving' | 'flat' }) {
  const map = {
    worsening: { label: '↑ worsening', cls: 'text-danger' },
    improving: { label: '↓ improving', cls: 'text-accent' },
    flat: { label: '→ steady', cls: 'text-ink-muted' },
  } as const;
  const t = map[trend];
  return <span className={cn('text-[10px] font-semibold', t.cls)}>{t.label}</span>;
}
