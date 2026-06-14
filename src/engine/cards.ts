/**
 * Card utilities: deck construction, parsing/formatting, and a fast
 * integer index representation used by the equity simulator.
 *
 * Integer index: 0–51, computed as `(rank - 2) * 4 + suitIndex`.
 * This keeps hot loops in the equity calculator allocation-free.
 */

import type { Card, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['c', 'd', 'h', 's'];
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const SUIT_INDEX: Record<Suit, number> = { c: 0, d: 1, h: 2, s: 3 };

/** Rank → display token. 10 is rendered as "T". */
const RANK_TO_CHAR: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: 'T',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const CHAR_TO_RANK: Record<string, Rank> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const SUIT_SYMBOL: Record<Suit, string> = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
};

export const SUIT_COLOR: Record<Suit, 'red' | 'black'> = {
  c: 'black',
  s: 'black',
  d: 'red',
  h: 'red',
};

/** Build a fresh, ordered 52-card deck. */
export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Convert a card to its 0–51 integer index. */
export function cardToIndex(card: Card): number {
  return (card.rank - 2) * 4 + SUIT_INDEX[card.suit];
}

/** Convert a 0–51 integer index back to a Card. */
export function indexToCard(index: number): Card {
  const rank = (Math.floor(index / 4) + 2) as Rank;
  const suit = SUITS[index % 4]!;
  return { rank, suit };
}

/** Parse a token like "As", "Td", "9c" into a Card. Throws on bad input. */
export function parseCard(token: string): Card {
  const t = token.trim();
  // suit is the last char; the rest is the rank (handles "10c")
  const suitChar = t.slice(-1).toLowerCase() as Suit;
  const rankPart = t.slice(0, -1).toUpperCase();
  const rank = CHAR_TO_RANK[rankPart];
  if (rank === undefined || !(suitChar in SUIT_INDEX)) {
    throw new Error(`Invalid card token: "${token}"`);
  }
  return { rank, suit: suitChar };
}

/** Parse a space- or comma-separated list like "As Kh Qd". */
export function parseCards(input: string): Card[] {
  return input
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(parseCard);
}

/** Format a card as "As", "Td", etc. */
export function formatCard(card: Card): string {
  return `${RANK_TO_CHAR[card.rank]}${card.suit}`;
}

export function rankChar(rank: Rank): string {
  return RANK_TO_CHAR[rank];
}

export function formatCards(cards: readonly Card[]): string {
  return cards.map(formatCard).join(' ');
}

/** Stable string key for a set of cards (order-independent) — for dedupe/caching. */
export function cardsKey(cards: readonly Card[]): string {
  return cards
    .map(cardToIndex)
    .sort((a, b) => a - b)
    .join('-');
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Fisher–Yates shuffle (in place) using an injectable RNG for testability. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
