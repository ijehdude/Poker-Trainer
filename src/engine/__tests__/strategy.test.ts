import { describe, it, expect } from 'vitest';
import { breakEvenEquity, evOfCall, evOfCheck, bluffBreakEven } from '../potodds';
import { gradeAction, VERDICT_THRESHOLDS_BB } from '../verdict';
import {
  chenScore,
  handStrengthPercentile,
  isOpen,
  openingRange,
  handClassToCombos,
  comboToHandClass,
} from '../ranges';
import { evaluateDecision, evOfChosen } from '../strategy';
import { parseCards } from '../cards';
import type { HoleCards } from '../equity';

const h = (s: string): HoleCards => {
  const [a, b] = parseCards(s);
  return [a!, b!] as HoleCards;
};

describe('pot-odds & EV math', () => {
  it('break-even equity: call 50 into 100 → need 1/3', () => {
    expect(breakEvenEquity(100, 50)).toBeCloseTo(1 / 3, 6);
  });
  it('getting 3:1 means ~25% needed', () => {
    expect(breakEvenEquity(150, 50)).toBeCloseTo(0.25, 6);
  });
  it('EV of call is positive when equity beats the price', () => {
    // 38% equity, getting 3:1 (need 25%) → +EV
    expect(evOfCall(0.38, 150, 50)).toBeGreaterThan(0);
  });
  it('EV of call is negative when equity is below the price', () => {
    expect(evOfCall(0.2, 150, 50)).toBeLessThan(0);
  });
  it('EV of check realizes equity over the pot', () => {
    expect(evOfCheck(0.5, 80)).toBeCloseTo(40, 6);
  });
  it('bluff break-even: bet pot needs 50% folds', () => {
    expect(bluffBreakEven(100, 100)).toBeCloseTo(0.5, 6);
  });
});

describe('verdict bucketing', () => {
  const bb = 2;
  it('a near-best action is optimal', () => {
    expect(gradeAction(10, 10.05, bb).verdict).toBe('optimal');
  });
  it('boundary at the optimal threshold', () => {
    const loss = VERDICT_THRESHOLDS_BB.optimal * bb;
    expect(gradeAction(10 - loss, 10, bb).verdict).toBe('optimal');
  });
  it('small EV loss is good', () => {
    expect(gradeAction(10 - 0.2 * bb, 10, bb).verdict).toBe('good');
  });
  it('a clear error is a mistake', () => {
    expect(gradeAction(10 - 2 * bb, 10, bb).verdict).toBe('mistake');
  });
  it('a huge EV loss is a blunder', () => {
    expect(gradeAction(10 - 6 * bb, 10, bb).verdict).toBe('blunder');
  });
  it('reports EV loss in chips and bb', () => {
    const r = gradeAction(6, 10, bb);
    expect(r.evLoss).toBe(4);
    expect(r.evLossBB).toBe(2);
  });
});

describe('ranges — Chen ordering & opening ranges', () => {
  it('AA is the strongest hand', () => {
    expect(handStrengthPercentile('AA')).toBeLessThan(handStrengthPercentile('KK'));
    expect(handStrengthPercentile('AA')).toBeLessThan(0.01);
  });
  it('72o is among the weakest hands', () => {
    expect(handStrengthPercentile('72o')).toBeGreaterThan(0.95);
  });
  it('suited beats its offsuit counterpart', () => {
    expect(chenScore('AKs')).toBeGreaterThan(chenScore('AKo'));
    expect(handStrengthPercentile('JTs')).toBeLessThan(handStrengthPercentile('JTo'));
  });
  it('UTG opens tighter than the Button', () => {
    expect(openingRange('UTG').size).toBeLessThan(openingRange('BTN').size);
  });
  it('UTG opens AA but not 72o; BTN opens far wider', () => {
    expect(isOpen('UTG', 'AA')).toBe(true);
    expect(isOpen('UTG', '72o')).toBe(false);
    expect(isOpen('BTN', 'A2s')).toBe(true);
  });
  it('the BB has no first-in opening range', () => {
    expect(openingRange('BB').size).toBe(0);
  });
});

describe('ranges — combo expansion', () => {
  it('pairs have 6 combos, suited 4, offsuit 12', () => {
    expect(handClassToCombos('AA')).toHaveLength(6);
    expect(handClassToCombos('AKs')).toHaveLength(4);
    expect(handClassToCombos('AKo')).toHaveLength(12);
  });
  it('round-trips combo → class', () => {
    for (const combo of handClassToCombos('AKs')) {
      expect(comboToHandClass(combo[0], combo[1])).toBe('AKs');
    }
    for (const combo of handClassToCombos('72o')) {
      expect(comboToHandClass(combo[0], combo[1])).toBe('72o');
    }
  });
});

describe('strategy — recommendations', () => {
  it('opening AA UTG recommends a raise', () => {
    const sol = evaluateDecision({
      street: 'preflop',
      heroHole: h('Ac Ad'),
      board: [],
      position: 'UTG',
      pot: 1.5,
      toCall: 1,
      bigBlind: 1,
      heroStack: 100,
      numOpponents: 5,
      potContext: 'unopened',
    });
    expect(sol.recommended.type).toBe('raise');
  });

  it('opening 72o UTG recommends a fold (and grading a raise is a blunder)', () => {
    const sol = evaluateDecision({
      street: 'preflop',
      heroHole: h('7c 2d'),
      board: [],
      position: 'UTG',
      pot: 1.5,
      toCall: 1,
      bigBlind: 1,
      heroStack: 100,
      numOpponents: 5,
      potContext: 'unopened',
    });
    expect(sol.recommended.type).toBe('fold');
    const raiseEV = evOfChosen(sol, 'raise', 2.5);
    expect(gradeAction(raiseEV, sol.bestEV, 1).verdict).toBe('blunder');
  });

  it('facing a bet with a strong made hand prefers continuing over folding', () => {
    const sol = evaluateDecision({
      street: 'flop',
      heroHole: h('Ac Ad'),
      board: parseCards('Ah 7c 2d'),
      position: 'BTN',
      pot: 10,
      toCall: 5,
      bigBlind: 1,
      heroStack: 100,
      numOpponents: 1,
      potContext: 'facing-bet',
      equity: 0.9,
    });
    expect(sol.recommended.type).not.toBe('fold');
    expect(sol.bestEV).toBeGreaterThan(0);
  });

  it('facing a big bet with no equity prefers folding', () => {
    const sol = evaluateDecision({
      street: 'river',
      heroHole: h('7c 2d'),
      board: parseCards('Ah Kd Qc Js 9h'),
      position: 'BB',
      pot: 20,
      toCall: 18,
      bigBlind: 1,
      heroStack: 100,
      numOpponents: 1,
      potContext: 'facing-bet',
      equity: 0.03,
    });
    expect(sol.recommended.type).toBe('fold');
  });
});
