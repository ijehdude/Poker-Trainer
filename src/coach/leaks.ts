/**
 * Local leak detection.
 *
 * Aggregates a player's graded decisions and surfaces recurring mistakes
 * ("you've over-folded the big blind in 9 of your last 12 spots"). Runs
 * entirely client-side — no API needed. Powers the Stats dashboard and the
 * coach's longer-term guidance.
 */

import type { Verdict } from '@/engine/verdict';
import type { RecordedDecision } from '@/store/gameStore';

export interface Leak {
  id: string;
  title: string;
  detail: string;
  count: number;
  /** How many relevant spots were considered (the denominator). */
  sampled: number;
  evLostBB: number;
  trend: 'worsening' | 'improving' | 'flat';
  severity: number; // 0..1 for ranking
}

export interface LeakReport {
  decisions: number;
  accuracy: number; // share of optimal/good decisions
  evLostBB: number;
  verdictCounts: Record<Verdict, number>;
  leaks: Leak[];
}

const isBad = (v: Verdict) => v === 'mistake' || v === 'blunder';

interface Pattern {
  id: string;
  title: string;
  detail: (count: number, sampled: number) => string;
  /** Whether a decision is in this pattern's denominator. */
  relevant: (d: RecordedDecision) => boolean;
  /** Whether a relevant decision is a hit (a leak instance). */
  hit: (d: RecordedDecision) => boolean;
}

const PATTERNS: Pattern[] = [
  {
    id: 'bb-overfold',
    title: 'Over-folding the big blind',
    detail: (c, s) =>
      `You folded the big blind in a spot the solver wanted you to defend in ${c} of ${s} BB situations. Getting a discount to call, the BB can profitably defend wide.`,
    relevant: (d) => d.factors.position === 'BB' && d.factors.potContext === 'facing-bet',
    hit: (d) => d.action.type === 'fold' && isBad(d.verdict.verdict),
  },
  {
    id: 'open-too-wide',
    title: 'Opening too many hands',
    detail: (c, s) =>
      `You opened a hand outside a standard range in ${c} of ${s} first-in spots. Tightening up from early position avoids dominated situations.`,
    relevant: (d) => d.street === 'preflop' && d.factors.potContext === 'unopened',
    hit: (d) => d.action.type === 'raise' && !d.factors.inOpeningRange && isBad(d.verdict.verdict),
  },
  {
    id: 'open-too-tight',
    title: 'Folding hands you should open',
    detail: (c, s) =>
      `You open-folded a hand that's a standard raise in ${c} of ${s} first-in spots — you're leaving value on the table, especially in late position.`,
    relevant: (d) => d.street === 'preflop' && d.factors.potContext === 'unopened',
    hit: (d) => d.action.type === 'fold' && d.factors.inOpeningRange && isBad(d.verdict.verdict),
  },
  {
    id: 'calling-station',
    title: 'Calling too light',
    detail: (c, s) =>
      `You called without the price or equity in ${c} of ${s} call spots. When the pot odds say fold, paying off costs you long-term.`,
    relevant: (d) => d.factors.potContext === 'facing-bet',
    hit: (d) => d.action.type === 'call' && isBad(d.verdict.verdict),
  },
  {
    id: 'spew',
    title: 'Over-aggression / spewing',
    detail: (c, s) =>
      `You bet or raised into a clearly bad spot in ${c} of ${s} aggressive actions. Bluffs need fold equity and good board coverage to profit.`,
    relevant: (d) => d.action.type === 'bet' || d.action.type === 'raise',
    hit: (d) =>
      (d.action.type === 'bet' || d.action.type === 'raise') && d.verdict.verdict === 'blunder',
  },
  {
    id: 'missed-value',
    title: 'Missing value & c-bets',
    detail: (c, s) =>
      `You checked when betting was better in ${c} of ${s} spots where you had initiative or a strong hand. Bet your value hands to build the pot.`,
    relevant: (d) => d.board.length >= 3 && d.toCall === 0,
    hit: (d) => d.action.type === 'check' && isBad(d.verdict.verdict),
  },
];

function trendOf(hits: boolean[]): Leak['trend'] {
  if (hits.length < 6) return 'flat';
  const mid = Math.floor(hits.length / 2);
  const firstRate = rate(hits.slice(0, mid));
  const lastRate = rate(hits.slice(mid));
  if (lastRate > firstRate + 0.12) return 'worsening';
  if (lastRate < firstRate - 0.12) return 'improving';
  return 'flat';
}

function rate(arr: boolean[]): number {
  if (arr.length === 0) return 0;
  return arr.filter(Boolean).length / arr.length;
}

const EMPTY_VERDICTS: Record<Verdict, number> = {
  optimal: 0,
  good: 0,
  questionable: 0,
  mistake: 0,
  blunder: 0,
};

export function analyzeLeaks(decisions: RecordedDecision[]): LeakReport {
  const verdictCounts = { ...EMPTY_VERDICTS };
  let evLostBB = 0;
  for (const d of decisions) {
    verdictCounts[d.verdict.verdict]++;
    evLostBB += d.verdict.verdict !== 'optimal' ? d.verdict.evLossBB : 0;
  }
  const good = verdictCounts.optimal + verdictCounts.good;
  const accuracy = decisions.length ? good / decisions.length : 0;

  const leaks: Leak[] = [];
  for (const p of PATTERNS) {
    const relevant = decisions.filter((d) => p.relevant(d));
    if (relevant.length < 2) continue;
    const hitFlags = relevant.map((d) => p.hit(d));
    const count = hitFlags.filter(Boolean).length;
    if (count < 2) continue;
    const evLost = relevant.filter((d) => p.hit(d)).reduce((sum, d) => sum + d.verdict.evLossBB, 0);
    const frequency = count / relevant.length;
    leaks.push({
      id: p.id,
      title: p.title,
      detail: p.detail(count, relevant.length),
      count,
      sampled: relevant.length,
      evLostBB: evLost,
      trend: trendOf(hitFlags),
      severity: Math.min(1, frequency * 0.6 + Math.min(evLost / 20, 0.4)),
    });
  }

  leaks.sort((a, b) => b.severity - a.severity || b.evLostBB - a.evLostBB);
  return { decisions: decisions.length, accuracy, evLostBB, verdictCounts, leaks };
}
