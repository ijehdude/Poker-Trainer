/**
 * Player statistics derived from saved hand history.
 *
 * Pure functions over `HandRecord[]` so they're unit-testable. Produces
 * familiar poker metrics (VPIP/PFR), decision accuracy, EV lost, and a
 * win-rate in bb/100.
 */

import type { Street } from '@/engine/types';
import type { Verdict } from '@/engine/verdict';
import type { HandRecord } from '@/lib/history';

export interface PlayerStats {
  hands: number;
  decisions: number;
  /** Voluntarily put money in pot (%). */
  vpip: number;
  /** Preflop raise (%). */
  pfr: number;
  /** Share of optimal/good decisions. */
  accuracy: number;
  evLostBB: number;
  netBB: number;
  bbPer100: number;
  verdictCounts: Record<Verdict, number>;
  byStreet: Record<Street, { correct: number; total: number }>;
}

const EMPTY_VERDICTS = (): Record<Verdict, number> => ({
  optimal: 0,
  good: 0,
  questionable: 0,
  mistake: 0,
  blunder: 0,
});

const EMPTY_STREETS = (): Record<Street, { correct: number; total: number }> => ({
  preflop: { correct: 0, total: 0 },
  flop: { correct: 0, total: 0 },
  turn: { correct: 0, total: 0 },
  river: { correct: 0, total: 0 },
});

const isGood = (v: Verdict) => v === 'optimal' || v === 'good';

export function computeStats(hands: HandRecord[]): PlayerStats {
  const verdictCounts = EMPTY_VERDICTS();
  const byStreet = EMPTY_STREETS();
  let decisions = 0;
  let goodCount = 0;
  let evLostBB = 0;
  let netChips = 0;
  let bbSum = 0;
  let vpipHands = 0;
  let pfrHands = 0;

  for (const hand of hands) {
    netChips += hand.heroNet;
    bbSum += hand.bigBlind;

    // Preflop voluntary actions for VPIP/PFR.
    const preflop = hand.decisions.filter((d) => d.street === 'preflop');
    const voluntary = preflop.some(
      (d) => d.action.type === 'call' || d.action.type === 'bet' || d.action.type === 'raise',
    );
    const raised = preflop.some((d) => d.action.type === 'raise');
    if (voluntary) vpipHands++;
    if (raised) pfrHands++;

    for (const d of hand.decisions) {
      decisions++;
      verdictCounts[d.verdict.verdict]++;
      if (isGood(d.verdict.verdict)) goodCount++;
      else evLostBB += d.verdict.evLossBB;
      const s = byStreet[d.street];
      s.total++;
      if (isGood(d.verdict.verdict)) s.correct++;
    }
  }

  const hc = hands.length;
  // Average big blind across hands, to express net in bb.
  const avgBB = hc > 0 ? bbSum / hc : 1;
  const netBB = avgBB > 0 ? netChips / avgBB : 0;

  return {
    hands: hc,
    decisions,
    vpip: hc > 0 ? vpipHands / hc : 0,
    pfr: hc > 0 ? pfrHands / hc : 0,
    accuracy: decisions > 0 ? goodCount / decisions : 0,
    evLostBB,
    netBB,
    bbPer100: hc > 0 ? (netBB / hc) * 100 : 0,
    verdictCounts,
    byStreet,
  };
}
