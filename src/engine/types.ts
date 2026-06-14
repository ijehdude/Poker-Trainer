/**
 * Poker Trainer — core engine types.
 *
 * These types are intentionally framework-free (no React, no DOM) so the
 * whole engine is portable and unit-testable. Texas Hold'em is the only
 * variant implemented, but the card / evaluator layer is generic enough
 * that a board+hole abstraction could support Omaha later.
 */

/** Suit, stored as a single lowercase letter. */
export type Suit = 'c' | 'd' | 'h' | 's';

/** Rank as a number: 2–10 face value, J=11, Q=12, K=13, A=14. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/** A playing card. */
export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

/** Betting streets in order. */
export type Street = 'preflop' | 'flop' | 'turn' | 'river';

/** A discrete poker action. */
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';

/** The nine canonical 5-card hand categories, ordered weakest→strongest. */
export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export const HAND_CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'High Card',
  [HandCategory.Pair]: 'Pair',
  [HandCategory.TwoPair]: 'Two Pair',
  [HandCategory.ThreeOfAKind]: 'Three of a Kind',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full House',
  [HandCategory.FourOfAKind]: 'Four of a Kind',
  [HandCategory.StraightFlush]: 'Straight Flush',
};

/**
 * The evaluated value of a (best) 5-card hand.
 *
 * `score` is a single comparable integer: higher always beats lower, and
 * equal scores mean an exact tie (chop). `tiebreak` holds the ordered
 * kicker ranks used to build the score, useful for explanations.
 */
export interface HandValue {
  readonly category: HandCategory;
  readonly score: number;
  readonly tiebreak: readonly Rank[];
}
