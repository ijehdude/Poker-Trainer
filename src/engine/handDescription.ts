/**
 * Human-readable hand descriptions for the winning-hand callout.
 *
 * Presentation only: this calls the existing `evaluateCards` to get the
 * category + tiebreakers and formats them into a phrase like
 * "Two Pair (Kings & Nines)" or "a Flush (Ace-high)". It does NOT
 * reimplement or alter hand ranking.
 */

import type { Card, Rank } from './types';
import { HandCategory } from './types';
import { evaluateCards } from './evaluator';

const RANK_NAME: Record<Rank, string> = {
  14: 'Ace',
  13: 'King',
  12: 'Queen',
  11: 'Jack',
  10: 'Ten',
  9: 'Nine',
  8: 'Eight',
  7: 'Seven',
  6: 'Six',
  5: 'Five',
  4: 'Four',
  3: 'Three',
  2: 'Two',
};

function plural(rank: Rank): string {
  const n = RANK_NAME[rank];
  return rank === 6 ? 'Sixes' : `${n}s`;
}

/** A noun phrase describing the best 5-card hand in `cards` (≥5 cards). */
export function describeHand(cards: readonly Card[]): string {
  const { category, tiebreak } = evaluateCards(cards);
  const t = tiebreak as Rank[];
  switch (category) {
    case HandCategory.StraightFlush:
      return t[0] === 14 ? 'a Royal Flush' : `a Straight Flush (${RANK_NAME[t[0]!]}-high)`;
    case HandCategory.FourOfAKind:
      return `Four of a Kind (${plural(t[0]!)})`;
    case HandCategory.FullHouse:
      return `a Full House (${plural(t[0]!)} full of ${plural(t[1]!)})`;
    case HandCategory.Flush:
      return `a Flush (${RANK_NAME[t[0]!]}-high)`;
    case HandCategory.Straight:
      return `a Straight (${RANK_NAME[t[0]!]}-high)`;
    case HandCategory.ThreeOfAKind:
      return `Three of a Kind (${plural(t[0]!)})`;
    case HandCategory.TwoPair:
      return `Two Pair (${plural(t[0]!)} & ${plural(t[1]!)})`;
    case HandCategory.Pair:
      return `a Pair of ${plural(t[0]!)}`;
    case HandCategory.HighCard:
      return `${RANK_NAME[t[0]!]}-high`;
  }
}
