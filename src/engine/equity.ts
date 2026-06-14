/**
 * Equity calculator.
 *
 * Computes a hero hand's win / tie / lose probabilities and expected pot
 * share against one or more opponents at any street. Two strategies:
 *
 *  - Exact enumeration: when every opponent's exact two cards are known,
 *    we enumerate all remaining board run-outs. The card space is tiny
 *    (≤ C(45,2) ≈ 990 on the flop), so this is instant and exact.
 *  - Monte Carlo: for random opponents or range distributions, we sample
 *    many random completions. Variance ~ 1/√N; a few thousand samples is
 *    accurate to well under a percentage point for the live overlay.
 *
 * "Equity" is the hero's expected share of the pot: a sole win counts as
 * 1, a k-way chop including the hero counts as 1/k, a loss counts as 0.
 *
 * All hot loops operate on 0–51 integer card indices to stay fast.
 */

import type { Card } from './types';
import { cardToIndex, shuffle } from './cards';
import { evaluateIndices } from './evaluator';

export interface EquityResult {
  /** Hero's expected pot share in [0, 1]. */
  equity: number;
  /** Fraction of run-outs where the hero is the sole winner. */
  win: number;
  /** Fraction where the hero chops with one or more opponents. */
  tie: number;
  /** Fraction where the hero loses outright. */
  lose: number;
  /** Number of run-outs evaluated. */
  samples: number;
  /** True when the result is exact (full enumeration), false for Monte Carlo. */
  exact: boolean;
}

/** A concrete two-card opponent holding. */
export type HoleCards = readonly [Card, Card];

function fullDeckIndices(exclude: Set<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < 52; i++) if (!exclude.has(i)) out.push(i);
  return out;
}

/** Tally one finished board: update accumulators for the hero outcome. */
function scoreShowdown(
  heroCards: number[],
  oppHands: number[][],
  board: number[],
  acc: { winShare: number; win: number; tie: number; lose: number },
): void {
  const heroScore = evaluateIndices([...heroCards, ...board]);
  // Find the best opponent score and how many opponents match it.
  let bestOpp = -1;
  let bestOppCount = 0;
  for (const opp of oppHands) {
    const s = evaluateIndices([opp[0]!, opp[1]!, ...board]);
    if (s > bestOpp) {
      bestOpp = s;
      bestOppCount = 1;
    } else if (s === bestOpp) {
      bestOppCount++;
    }
  }
  const best = Math.max(heroScore, bestOpp);
  // Winners that share `best`: hero (if matching) plus any opponents at best.
  const winners = (heroScore === best ? 1 : 0) + (bestOpp === best ? bestOppCount : 0);

  if (heroScore === best) {
    if (winners === 1) {
      acc.win += 1;
      acc.winShare += 1;
    } else {
      acc.tie += 1;
      acc.winShare += 1 / winners;
    }
  } else {
    acc.lose += 1;
  }
}

/**
 * Exact equity by enumerating all board run-outs. Every opponent's two
 * cards must be known. Returns an exact result.
 */
export function enumerateEquity(
  hero: HoleCards,
  board: readonly Card[],
  opponents: readonly HoleCards[],
): EquityResult {
  const heroIdx = [cardToIndex(hero[0]), cardToIndex(hero[1])];
  const boardIdx = board.map(cardToIndex);
  const oppIdx = opponents.map((o) => [cardToIndex(o[0]), cardToIndex(o[1])]);

  const used = new Set<number>([...heroIdx, ...boardIdx, ...oppIdx.flat()]);
  const deck = fullDeckIndices(used);
  const needed = 5 - boardIdx.length;

  const acc = { winShare: 0, win: 0, tie: 0, lose: 0 };
  let samples = 0;

  // Enumerate combinations of `needed` cards from the deck.
  const n = deck.length;
  const pick: number[] = [];
  const recurse = (start: number, depth: number): void => {
    if (depth === needed) {
      scoreShowdown(heroIdx, oppIdx, [...boardIdx, ...pick], acc);
      samples++;
      return;
    }
    for (let i = start; i <= n - (needed - depth); i++) {
      pick.push(deck[i]!);
      recurse(i + 1, depth + 1);
      pick.pop();
    }
  };
  recurse(0, 0);

  return finalize(acc, samples, true);
}

/**
 * Monte Carlo equity. Opponents may be `'random'` (any two remaining
 * cards) or a weighted set of candidate holdings (`combos`). Colliding
 * draws are rejected and resampled.
 */
export function monteCarloEquity(
  hero: HoleCards,
  board: readonly Card[],
  opponents: readonly ('random' | { combos: readonly HoleCards[] })[],
  options: { iterations?: number; rng?: () => number } = {},
): EquityResult {
  const iterations = options.iterations ?? 6000;
  const rng = options.rng ?? Math.random;

  const heroIdx = [cardToIndex(hero[0]), cardToIndex(hero[1])];
  const boardIdx = board.map(cardToIndex);
  const baseUsed = new Set<number>([...heroIdx, ...boardIdx]);
  const needed = 5 - boardIdx.length;

  // Pre-index opponent combos.
  const oppCombos = opponents.map((o) =>
    o === 'random' ? null : o.combos.map((c) => [cardToIndex(c[0]), cardToIndex(c[1])]),
  );

  const acc = { winShare: 0, win: 0, tie: 0, lose: 0 };
  let samples = 0;

  const deckBase = fullDeckIndices(baseUsed);

  for (let iter = 0; iter < iterations; iter++) {
    const used = new Set(baseUsed);
    const oppHands: number[][] = [];
    let ok = true;

    // Assign opponent hands first (known-range opponents constrain the deck).
    for (const combos of oppCombos) {
      if (combos) {
        // sample a non-colliding combo (bounded attempts)
        let chosen: number[] | null = null;
        for (let a = 0; a < 12; a++) {
          const c = combos[Math.floor(rng() * combos.length)]!;
          if (!used.has(c[0]!) && !used.has(c[1]!)) {
            chosen = [c[0]!, c[1]!];
            break;
          }
        }
        if (!chosen) {
          ok = false;
          break;
        }
        used.add(chosen[0]!);
        used.add(chosen[1]!);
        oppHands.push(chosen);
      } else {
        oppHands.push([]); // fill after, from shuffled deck
      }
    }
    if (!ok) continue;

    // Draw remaining cards (random opponents + board completion) from a
    // freshly shuffled remaining deck.
    const remaining = deckBase.filter((c) => !used.has(c));
    shuffle(remaining, rng);
    let cursor = 0;
    for (const hand of oppHands) {
      if (hand.length === 0) {
        hand.push(remaining[cursor++]!, remaining[cursor++]!);
      }
    }
    const completion: number[] = [];
    for (let k = 0; k < needed; k++) completion.push(remaining[cursor++]!);

    scoreShowdown(heroIdx, oppHands, [...boardIdx, ...completion], acc);
    samples++;
  }

  return finalize(acc, samples, false);
}

function finalize(
  acc: { winShare: number; win: number; tie: number; lose: number },
  samples: number,
  exact: boolean,
): EquityResult {
  if (samples === 0) {
    return { equity: 0, win: 0, tie: 0, lose: 0, samples: 0, exact };
  }
  return {
    equity: acc.winShare / samples,
    win: acc.win / samples,
    tie: acc.tie / samples,
    lose: acc.lose / samples,
    samples,
    exact,
  };
}

/**
 * High-level entry point used by the app. Picks exact enumeration when
 * all opponents are concrete holdings and the run-out space is small,
 * otherwise falls back to Monte Carlo.
 */
export function estimateEquity(params: {
  hero: HoleCards;
  board?: readonly Card[];
  opponents: readonly ('random' | { combos: readonly HoleCards[] })[];
  iterations?: number;
  rng?: () => number;
}): EquityResult {
  const board = params.board ?? [];

  // If every opponent is a single concrete combo, enumerate exactly.
  const concrete: HoleCards[] = [];
  let allConcrete = true;
  for (const o of params.opponents) {
    if (o === 'random' || o.combos.length !== 1) {
      allConcrete = false;
      break;
    }
    concrete.push(o.combos[0]!);
  }
  if (allConcrete && concrete.length > 0) {
    return enumerateEquity(params.hero, board, concrete);
  }

  return monteCarloEquity(params.hero, board, params.opponents, {
    iterations: params.iterations,
    rng: params.rng,
  });
}
