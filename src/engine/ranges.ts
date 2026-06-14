/**
 * Preflop ranges & the 169-hand grid.
 *
 * The 169 distinct starting hands (13 pairs + 78 suited + 78 offsuit) are
 * ranked by the **Chen formula** — a well-known, transparent preflop
 * heuristic — and position opening ranges are derived by taking the
 * strongest X% of combinations. This is intentionally an *approximation*
 * (documented in the README), not a solver output: it is deterministic,
 * explainable, and good enough to coach opening decisions. The grids are
 * also what the Range Charts page renders.
 *
 * Notation: "AA", "AKs" (suited), "AKo" (offsuit).
 */

import type { Card, Rank, Suit } from './types';
import { rankChar, SUITS } from './cards';
import type { HoleCards } from './equity';

export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export const POSITIONS: readonly Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export const POSITION_LABELS: Record<Position, string> = {
  UTG: 'Under the Gun',
  HJ: 'Hijack',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small Blind',
  BB: 'Big Blind',
};

// Ranks high→low for grid construction.
const GRID_RANKS: readonly Rank[] = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

/** Number of card combinations for a hand-class type. */
export function comboCount(handClass: string): number {
  if (handClass.length === 2) return 6; // pair
  return handClass.endsWith('s') ? 4 : 12;
}

/** All 169 hand classes in a canonical order (pairs first along the diagonal). */
export function allHandClasses(): string[] {
  const out: string[] = [];
  for (let i = 0; i < GRID_RANKS.length; i++) {
    for (let j = 0; j < GRID_RANKS.length; j++) {
      out.push(gridCell(i, j));
    }
  }
  return out;
}

/**
 * The hand class at grid position (row, col) using the standard convention:
 * pairs on the diagonal, suited above it (col > row), offsuit below.
 */
export function gridCell(row: number, col: number): string {
  const hi = GRID_RANKS[Math.min(row, col)]!;
  const lo = GRID_RANKS[Math.max(row, col)]!;
  if (row === col) return `${rankChar(hi)}${rankChar(lo)}`;
  const suited = col > row;
  return `${rankChar(hi)}${rankChar(lo)}${suited ? 's' : 'o'}`;
}

export { GRID_RANKS };

/** Map two concrete cards to their hand-class string. */
export function comboToHandClass(a: Card, b: Card): string {
  const hi = a.rank >= b.rank ? a : b;
  const lo = a.rank >= b.rank ? b : a;
  if (hi.rank === lo.rank) return `${rankChar(hi.rank)}${rankChar(lo.rank)}`;
  const suited = hi.suit === lo.suit;
  return `${rankChar(hi.rank)}${rankChar(lo.rank)}${suited ? 's' : 'o'}`;
}

const CHAR_RANK: Record<string, Rank> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
};

/** Expand a hand class into all concrete two-card combinations. */
export function handClassToCombos(handClass: string): HoleCards[] {
  const r1 = CHAR_RANK[handClass[0]!]!;
  const r2 = CHAR_RANK[handClass[1]!]!;
  const kind = handClass.length === 3 ? handClass[2] : 'pair';
  const combos: HoleCards[] = [];

  if (kind === 'pair') {
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = i + 1; j < SUITS.length; j++) {
        combos.push([
          { rank: r1, suit: SUITS[i]! },
          { rank: r1, suit: SUITS[j]! },
        ]);
      }
    }
  } else if (kind === 's') {
    for (const s of SUITS) {
      combos.push([
        { rank: r1, suit: s },
        { rank: r2, suit: s },
      ]);
    }
  } else {
    for (const s1 of SUITS) {
      for (const s2 of SUITS) {
        if (s1 !== s2) {
          combos.push([
            { rank: r1, suit: s1 as Suit },
            { rank: r2, suit: s2 as Suit },
          ]);
        }
      }
    }
  }
  return combos;
}

/**
 * Chen formula score for a hand class. Higher is stronger.
 * Reference: Bill Chen's preflop hand-strength heuristic.
 */
export function chenScore(handClass: string): number {
  const r1 = CHAR_RANK[handClass[0]!]!;
  const r2 = CHAR_RANK[handClass[1]!]!;
  const isPair = handClass.length === 2;
  const suited = handClass.endsWith('s');

  const highCardPoints = (r: Rank): number => {
    if (r === 14) return 10;
    if (r === 13) return 8;
    if (r === 12) return 7;
    if (r === 11) return 6;
    return r / 2; // 2..10
  };

  const high = Math.max(r1, r2);
  let score = highCardPoints(high as Rank);

  if (isPair) {
    score = Math.max(highCardPoints(r1 as Rank) * 2, 5);
    return Math.round(score);
  }

  if (suited) score += 2;

  const gap = Math.abs(r1 - r2) - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;

  // Straight bonus: 0/1 gap connectors, both below Q.
  if (gap <= 1 && high < 12) score += 1;

  return Math.round(Math.max(0, score));
}

/** Percentile rank (0 = strongest, 1 = weakest) of each hand class, combo-weighted. */
function buildStrengthPercentiles(): Map<string, number> {
  const classes = allHandClasses();
  // Dedupe (grid lists each off/suited cell once already, but pairs once).
  const unique = Array.from(new Set(classes));
  unique.sort((a, b) => chenScore(b) - chenScore(a) || tieBreak(b) - tieBreak(a));

  const total = 1326;
  const pct = new Map<string, number>();
  let cumulative = 0;
  for (const hc of unique) {
    const weight = comboCount(hc);
    // Use the midpoint of this hand's combo span as its percentile.
    pct.set(hc, (cumulative + weight / 2) / total);
    cumulative += weight;
  }
  return pct;
}

/** Secondary ordering: prefer higher cards / suitedness when Chen ties. */
function tieBreak(handClass: string): number {
  const r1 = CHAR_RANK[handClass[0]!]!;
  const r2 = CHAR_RANK[handClass[1]!]!;
  const suited = handClass.endsWith('s') ? 1 : 0;
  return r1 * 15 + r2 + suited * 0.5;
}

const STRENGTH_PCT = buildStrengthPercentiles();

/** Hero hand strength as a percentile (0 strongest … 1 weakest). */
export function handStrengthPercentile(handClass: string): number {
  return STRENGTH_PCT.get(handClass) ?? 1;
}

/**
 * Target raise-first-in frequency (% of all hands) per position at 100bb.
 * These mirror commonly taught 6-max opening sizes. The BB has no RFI
 * range (it is the closer and is handled by the defend logic).
 */
export const RFI_PERCENT: Record<Position, number> = {
  UTG: 0.16,
  HJ: 0.2,
  CO: 0.27,
  BTN: 0.46,
  SB: 0.42,
  BB: 0,
};

/** Build the set of hand classes a position opens (RFI), derived by percentile. */
export function openingRange(position: Position): Set<string> {
  const cutoff = RFI_PERCENT[position];
  const set = new Set<string>();
  if (cutoff <= 0) return set;
  for (const hc of allHandClasses()) {
    if (handStrengthPercentile(hc) <= cutoff) set.add(hc);
  }
  return set;
}

/** Does `position` open this hand class as a first-in raise? */
export function isOpen(position: Position, handClass: string): boolean {
  return handStrengthPercentile(handClass) <= RFI_PERCENT[position];
}

/**
 * One-line, learner-friendly note describing what range the recommended
 * first-in action represents from a position (e.g. "Standard CO open — top
 * ~27% of hands"). Returns null when there's no opening range (the BB).
 */
export function openingRangeNote(position: Position, handClass: string): string | null {
  const pctOpen = Math.round(RFI_PERCENT[position] * 100);
  if (pctOpen === 0) return null;
  if (isOpen(position, handClass)) {
    return `Standard ${position} open — ${handClass} is in the top ~${pctOpen}% of hands you raise first-in.`;
  }
  return `Below a standard ${position} opening range (top ~${pctOpen}%) — a first-in fold.`;
}
