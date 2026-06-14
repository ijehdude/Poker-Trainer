import { describe, it, expect } from 'vitest';
import { computeStats } from '../stats';
import type { HandRecord } from '../history';
import type { RecordedDecision } from '@/store/gameStore';
import type { ActionType, Street } from '@/engine/types';
import type { Verdict } from '@/engine/verdict';

/** Minimal decision builder — only the fields computeStats reads. */
function dec(street: Street, type: ActionType, verdict: Verdict, evLossBB = 0): RecordedDecision {
  return {
    street,
    action: { type, amount: 0 },
    verdict: { verdict, label: verdict, evLoss: evLossBB, evLossBB },
  } as unknown as RecordedDecision;
}

function hand(heroNet: number, decisions: RecordedDecision[]): HandRecord {
  return {
    id: 'x',
    handNumber: 1,
    timestamp: 0,
    bigBlind: 2,
    heroHole: null,
    heroNet,
    showdown: false,
    frames: [],
    decisions,
  };
}

describe('computeStats', () => {
  it('returns zeros for no hands', () => {
    const s = computeStats([]);
    expect(s.hands).toBe(0);
    expect(s.vpip).toBe(0);
    expect(s.accuracy).toBe(0);
  });

  it('counts VPIP and PFR per hand', () => {
    const hands: HandRecord[] = [
      hand(0, [dec('preflop', 'raise', 'optimal')]), // VPIP + PFR
      hand(0, [dec('preflop', 'call', 'good')]), // VPIP only
      hand(0, [dec('preflop', 'fold', 'optimal')]), // neither
      hand(0, [dec('preflop', 'fold', 'optimal')]), // neither
    ];
    const s = computeStats(hands);
    expect(s.hands).toBe(4);
    expect(s.vpip).toBeCloseTo(2 / 4, 6);
    expect(s.pfr).toBeCloseTo(1 / 4, 6);
  });

  it('computes accuracy and accumulates EV lost on bad decisions', () => {
    const s = computeStats([
      hand(0, [
        dec('preflop', 'raise', 'optimal'),
        dec('flop', 'bet', 'good'),
        dec('turn', 'call', 'mistake', 1.5),
        dec('river', 'call', 'blunder', 4),
      ]),
    ]);
    expect(s.decisions).toBe(4);
    expect(s.accuracy).toBeCloseTo(2 / 4, 6);
    expect(s.evLostBB).toBeCloseTo(5.5, 6);
    expect(s.byStreet.turn.total).toBe(1);
    expect(s.byStreet.turn.correct).toBe(0);
    expect(s.byStreet.preflop.correct).toBe(1);
  });

  it('expresses win rate in bb/100', () => {
    // Net +20 chips over 2 hands at bb=2 → +10bb → 500 bb/100.
    const s = computeStats([hand(12, []), hand(8, [])]);
    expect(s.netBB).toBeCloseTo(10, 6);
    expect(s.bbPer100).toBeCloseTo(500, 6);
  });
});
