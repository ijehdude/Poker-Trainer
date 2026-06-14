'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { EquityBar } from './EquityBar';
import { VerdictChip } from './VerdictChip';
import { CoachChat } from './CoachChat';
import { useGame } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { evaluateDecision, type StrategySolution } from '@/engine/strategy';
import { buildSeatContext } from '@/engine/decision';
import { openingRangeNote } from '@/engine/ranges';
import { getCoach, decisionToCoachInput, type CoachFeedback } from '@/coach';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatAmount } from '@/components/table/Chip';
import { cn } from '@/lib/cn';

/**
 * A short, plain-language reason the recommended action is best — written
 * for a learner so "27% win" and "Raise = best" don't read as a
 * contradiction. Highlights fold equity / initiative when equity is low.
 */
function recommendedWhy(solution: StrategySolution): string {
  const f = solution.factors;
  const rec = solution.recommended.type;
  const eqPct = Math.round(f.equity * 100);
  const needPct = Math.round(f.breakEven * 100);
  const facingBet = needPct > 0;

  if (rec === 'fold') {
    return `Your ~${eqPct}% equity is below the ~${needPct}% the price demands, so folding loses the least.`;
  }
  if (rec === 'call') {
    return `At ~${eqPct}% equity you clear the ~${needPct}% you need, so calling realizes a profit.`;
  }
  if (rec === 'bet' || rec === 'raise') {
    if (f.equity < 0.45) {
      return `Even with only ~${eqPct}% showdown equity, ${rec === 'bet' ? 'betting' : 'raising'} is best: fold equity and initiative win the pot often enough to be +EV.`;
    }
    if (facingBet) {
      return `With ~${eqPct}% equity plus fold equity, raising for value/protection beats just calling.`;
    }
    return `Strong equity (~${eqPct}%) on a ${f.boardTexture.descriptor} board — bet to build the pot and deny equity.`;
  }
  if (rec === 'check') {
    return `Checking realizes your ~${eqPct}% equity without bloating the pot when betting gains little.`;
  }
  return '';
}

/**
 * The coaching side-panel. While it's the hero's turn it shows the live
 * equity / pot-odds / per-action EV overlay; after an action it shows the
 * verdict and the coach's rationale; a chat box answers follow-ups.
 */
export function CoachPanel() {
  const { game, heroEquity, equityLoading, decisions } = useGame();
  const { coachMode, setCoachMode } = useSettings();

  const heroTurn = !!game && game.status === 'betting' && !!game.seats[game.toAct]?.isHero;
  const lastDecision = decisions[decisions.length - 1] ?? null;

  // Live solution for the current hero decision (per-action EV overlay).
  const liveSolution = useMemo(() => {
    if (!game || !heroTurn) return null;
    const seat = game.seats[game.toAct];
    if (!seat?.holeCards) return null;
    const ctx = buildSeatContext(game, seat.id, heroEquity?.equity ?? 0);
    return evaluateDecision(ctx);
  }, [game, heroTurn, heroEquity]);

  return (
    <div className="flex h-full flex-col gap-2 lg:overflow-hidden">
      {/* Coach toggle */}
      <Panel className="flex items-center justify-between p-2.5">
        <span className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Coach
        </span>
        <div className="flex rounded-full bg-panel-raised p-0.5">
          {(['offline', 'cloud'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCoachMode(m)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                coachMode === m ? 'bg-accent text-ink-inverse' : 'text-ink-secondary',
              )}
            >
              {m === 'offline' ? 'Offline' : 'DeepSeek'}
            </button>
          ))}
        </div>
      </Panel>

      {/* Live decision overlay */}
      {heroTurn && (
        <Panel className="space-y-2 p-3">
          <div>
            <EquityBar
              equity={heroEquity?.equity ?? 0}
              loading={equityLoading && !heroEquity}
              win={heroEquity?.win}
              tie={heroEquity?.tie}
              breakEven={liveSolution?.factors.breakEven}
            />
            <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-ink-muted">
              <Tooltip
                content="Win % is your raw equity vs the opponents' range — how often you'd win at showdown. The Action EV list below also includes fold equity (how often they fold), which is why a low-equity hand can still be a +EV bet or raise."
                side="bottom"
              >
                <span className="cursor-help font-bold text-accent">ⓘ</span>
              </Tooltip>
              <span>Win % is equity vs the field; Action EV below also counts fold equity.</span>
            </p>
          </div>
          {liveSolution && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Readout label="Pot odds" value={liveSolution.factors.potOdds} />
                <Readout
                  label="Need / Have"
                  value={`${Math.round(liveSolution.factors.breakEven * 100)}% / ${Math.round(
                    liveSolution.factors.equity * 100,
                  )}%`}
                  accent={
                    liveSolution.factors.equity >= liveSolution.factors.breakEven ? 'good' : 'bad'
                  }
                />
              </div>
              <ActionEVTable
                solution={liveSolution}
                bigBlind={game!.bigBlind}
                why={recommendedWhy(liveSolution)}
              />
              {liveSolution.factors.street === 'preflop' &&
                liveSolution.factors.potContext === 'unopened' && (
                  <RangeContext
                    note={openingRangeNote(
                      liveSolution.factors.position,
                      liveSolution.factors.handClass,
                    )}
                  />
                )}
            </>
          )}
        </Panel>
      )}

      {/* Post-action feedback */}
      {!heroTurn && lastDecision && <FeedbackCard key={lastDecision.id} />}

      {/* Chat */}
      <CoachChat context={lastDecision ? decisionToCoachInput(lastDecision) : undefined} />
    </div>
  );
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'good' | 'bad';
}) {
  return (
    <div className="rounded-md border border-panel-border bg-panel-raised px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div
        className={cn(
          'nums mt-0.5 text-sm font-bold',
          accent === 'good' ? 'text-accent' : accent === 'bad' ? 'text-danger' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ActionEVTable({
  solution,
  bigBlind,
  why,
}: {
  solution: ReturnType<typeof evaluateDecision>;
  bigBlind: number;
  why?: string;
}) {
  const best = solution.bestEV;
  const sorted = [...solution.actions].sort((a, b) => b.ev - a.ev);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        <span>Action EV</span>
        <span className="text-ink-muted/70 normal-case">relative to best</span>
      </div>
      <div className="space-y-1">
        {sorted.map((a) => {
          const delta = (a.ev - best) / bigBlind;
          const isBest = Math.abs(a.ev - best) < 1e-6;
          return (
            <div key={a.type + a.amount}>
              <div
                className={cn(
                  'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs',
                  isBest ? 'bg-accent/15 ring-accent/40 ring-1' : 'bg-panel-raised',
                )}
              >
                <span className="font-semibold capitalize">
                  {a.label}
                  {isBest && <span className="ml-1.5 text-[10px] text-accent">best</span>}
                </span>
                <span
                  className={cn('nums font-medium', isBest ? 'text-accent' : 'text-ink-secondary')}
                >
                  {isBest ? `${formatAmount(a.ev / bigBlind)}bb` : `${delta.toFixed(2)}bb`}
                </span>
              </div>
              {/* Inline plain-language "why" directly under the best action */}
              {isBest && why && (
                <p className="mt-1 px-1 text-[11px] leading-snug text-ink-secondary">
                  <span className="font-semibold text-accent">Why: </span>
                  {why}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RangeContext({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <div className="flex items-start gap-1.5 rounded-md border border-panel-border bg-panel-raised px-2.5 py-1.5 text-[11px] leading-snug text-ink-secondary">
      <span className="text-accent-gold">◆</span>
      <span>{note}</span>
    </div>
  );
}

function FeedbackCard() {
  const { decisions } = useGame();
  const { coachMode } = useSettings();
  const decision = decisions[decisions.length - 1]!;
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const input = decisionToCoachInput(decision);
    getCoach(coachMode)
      .explain(input)
      .then((fb) => {
        if (reqId.current === id) {
          setFeedback(fb);
          setLoading(false);
        }
      })
      .catch(() => {
        if (reqId.current === id) setLoading(false);
      });
  }, [decision, coachMode]);

  return (
    <Panel className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <VerdictChip
          verdict={decision.verdict.verdict}
          size="lg"
          evLossBB={decision.verdict.evLossBB}
        />
        {feedback?.source === 'cloud' && (
          <span className="bg-info/15 rounded-full px-2 py-0.5 text-[10px] font-semibold text-info">
            DeepSeek
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
        </div>
      ) : feedback ? (
        <>
          <p className="text-sm font-semibold leading-snug text-ink">{feedback.headline}</p>
          <ul className="space-y-1.5">
            {feedback.detail.map((d, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-secondary">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {d}
              </li>
            ))}
          </ul>
          {feedback.concept && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-panel-border bg-panel-raised px-2.5 py-1 text-[10px] font-medium text-ink-secondary">
              <span className="text-accent">◆</span> {feedback.concept}
            </div>
          )}
        </>
      ) : null}
    </Panel>
  );
}
