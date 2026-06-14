import { describe, it, expect } from 'vitest';
import { parseCards } from '../cards';
import { enumerateEquity, monteCarloEquity, type HoleCards } from '../equity';

/** Deterministic PRNG (mulberry32) so Monte Carlo tests are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const h = (s: string): HoleCards => {
  const [a, b] = parseCards(s);
  return [a!, b!] as HoleCards;
};

describe('equity — exact enumeration vs known references', () => {
  it('AA vs KK preflop ≈ 82% / 17% with a small tie share', () => {
    const r = enumerateEquity(h('Ac Ad'), [], [h('Kc Kd')]);
    expect(r.exact).toBe(true);
    // canonical figures: ~82.6% win, ~17% lose, ~0.5% tie
    expect(r.win).toBeGreaterThan(0.81);
    expect(r.win).toBeLessThan(0.84);
    expect(r.equity).toBeGreaterThan(0.81);
    expect(r.equity).toBeLessThan(0.84);
  });

  it('AKs vs 22 is a near coinflip (race)', () => {
    const r = enumerateEquity(h('As Ks'), [], [h('2c 2d')]);
    // 22 is a small favourite, ~50–53%; hero AKs ~47–50%
    expect(r.equity).toBeGreaterThan(0.44);
    expect(r.equity).toBeLessThan(0.52);
  });

  it('dominated: AK vs AQ heavily favours AK', () => {
    const r = enumerateEquity(h('Ac Kc'), [], [h('Ad Qd')]);
    expect(r.equity).toBeGreaterThan(0.7);
  });

  it('probabilities sum to 1', () => {
    const r = enumerateEquity(h('Ac Ad'), [], [h('Kc Kd')]);
    expect(r.win + r.tie + r.lose).toBeCloseTo(1, 6);
  });

  it('a completed board with a guaranteed chop returns tie = 1', () => {
    // Both play the board's royal flush in hearts → chop.
    const board = parseCards('Ah Kh Qh Jh Th');
    const r = enumerateEquity(h('2c 3d'), board, [h('2s 4d')]);
    expect(r.tie).toBe(1);
    expect(r.equity).toBeCloseTo(0.5, 6);
  });

  it('made hand on a finished board wins outright', () => {
    const board = parseCards('Ah Kd 7c 2s 9h');
    const r = enumerateEquity(h('As Ad'), board, [h('Kc Qd')]); // set of aces vs pair of kings
    expect(r.win).toBe(1);
    expect(r.equity).toBe(1);
  });
});

describe('equity — Monte Carlo', () => {
  it('AA vs one random opponent ≈ 85% (seeded)', () => {
    const r = monteCarloEquity(h('Ac Ad'), [], ['random'], {
      iterations: 12000,
      rng: mulberry32(12345),
    });
    expect(r.exact).toBe(false);
    expect(r.equity).toBeGreaterThan(0.83);
    expect(r.equity).toBeLessThan(0.87);
  });

  it('Monte Carlo approximates exact AA vs KK within tolerance', () => {
    const exact = enumerateEquity(h('Ac Ad'), [], [h('Kc Kd')]);
    const mc = monteCarloEquity(h('Ac Ad'), [], [{ combos: [h('Kc Kd')] }], {
      iterations: 15000,
      rng: mulberry32(99),
    });
    expect(Math.abs(mc.equity - exact.equity)).toBeLessThan(0.02);
  });

  it('equity drops as the field grows (AA vs 1 vs 4 opponents)', () => {
    const one = monteCarloEquity(h('Ac Ad'), [], ['random'], {
      iterations: 8000,
      rng: mulberry32(7),
    });
    const four = monteCarloEquity(h('Ac Ad'), [], ['random', 'random', 'random', 'random'], {
      iterations: 8000,
      rng: mulberry32(7),
    });
    expect(four.equity).toBeLessThan(one.equity);
    expect(four.equity).toBeGreaterThan(0.5); // still best preflop hand
  });

  it('never deals a card already on the board or in a hand', () => {
    // Sanity: run a sim and ensure equity is a valid probability.
    const r = monteCarloEquity(h('As Ks'), parseCards('Qs Js Ts'), ['random'], {
      iterations: 3000,
      rng: mulberry32(3),
    });
    expect(r.equity).toBeGreaterThanOrEqual(0);
    expect(r.equity).toBeLessThanOrEqual(1);
    // We flopped a royal flush — unbeatable, equity must be 1.
    expect(r.equity).toBe(1);
  });
});
