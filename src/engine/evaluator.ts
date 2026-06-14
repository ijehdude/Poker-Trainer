/**
 * Hand evaluator.
 *
 * Given 5, 6, or 7 cards, finds the best 5-card poker hand and returns a
 * `HandValue` with a single comparable `score` (higher beats lower, equal
 * is a chop). The algorithm is the standard count-based approach:
 *   - tally rank and suit frequencies
 *   - detect flushes (a suit with ≥5 cards) and straights (incl. the wheel)
 *   - classify into one of the nine categories and build ordered tiebreakers
 *
 * The `score` packs the category and up to five tiebreak ranks into one
 * integer using base-16 (ranks are ≤ 14 < 16):
 *   score = category·16⁵ + t1·16⁴ + t2·16³ + t3·16² + t4·16 + t5
 * Tiebreak arrays are always padded to 5 slots so categories compare
 * correctly regardless of how many kickers a hand uses.
 *
 * Hold'em never deals more than 7 cards to evaluate, so brute-force
 * combination scanning is unnecessary; this runs in O(n) over the cards.
 */

import type { Card, Rank } from './types';
import { HandCategory } from './types';
import { cardToIndex } from './cards';

const SCORE_BASE = 16;
const TIEBREAK_SLOTS = 5;

function packScore(category: HandCategory, tiebreak: readonly number[]): number {
  let score = category;
  for (let i = 0; i < TIEBREAK_SLOTS; i++) {
    score = score * SCORE_BASE + (tiebreak[i] ?? 0);
  }
  return score;
}

/**
 * Find the high card of the best straight given a rank-presence map.
 * `present[r]` is true when rank r (2..14) is available. Returns the high
 * card rank (5 for the wheel A-2-3-4-5) or 0 if there is no straight.
 */
function straightHigh(present: readonly boolean[]): number {
  // Aces play low for the wheel: require A,5,4,3,2.
  if (present[14] && present[5] && present[4] && present[3] && present[2]) {
    // keep scanning for a higher straight first, but the wheel is the
    // lowest possible, so only return it if nothing higher is found.
  }
  for (let high = 14; high >= 5; high--) {
    if (
      present[high] &&
      present[high - 1] &&
      present[high - 2] &&
      present[high - 3] &&
      present[high - 4]
    ) {
      return high;
    }
  }
  if (present[14] && present[5] && present[4] && present[3] && present[2]) {
    return 5; // wheel
  }
  return 0;
}

/** Internal: evaluate from rank/suit arrays already extracted. */
function evaluateRanksSuits(
  ranks: number[],
  suits: number[],
): {
  category: HandCategory;
  tiebreak: number[];
} {
  // Rank frequency (index 2..14) and suit frequency (0..3).
  const rankCount = new Array<number>(15).fill(0);
  const suitCount = new Array<number>(4).fill(0);
  // Per-suit rank presence, for flush + straight-flush detection.
  const suitRanks: boolean[][] = [
    new Array<boolean>(15).fill(false),
    new Array<boolean>(15).fill(false),
    new Array<boolean>(15).fill(false),
    new Array<boolean>(15).fill(false),
  ];

  for (let i = 0; i < ranks.length; i++) {
    const r = ranks[i]!;
    const s = suits[i]!;
    rankCount[r]!++;
    suitCount[s]!++;
    suitRanks[s]![r] = true;
  }

  // Presence map across all suits for plain straights.
  const present = new Array<boolean>(15).fill(false);
  for (let r = 2; r <= 14; r++) present[r] = rankCount[r]! > 0;

  // Detect a flush suit (≥5 of one suit).
  let flushSuit = -1;
  for (let s = 0; s < 4; s++) {
    if (suitCount[s]! >= 5) {
      flushSuit = s;
      break;
    }
  }

  // Straight flush takes priority over everything.
  if (flushSuit >= 0) {
    const sfHigh = straightHigh(suitRanks[flushSuit]!);
    if (sfHigh > 0) {
      return { category: HandCategory.StraightFlush, tiebreak: [sfHigh] };
    }
  }

  // Group ranks by their multiplicity (descending count, then rank).
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 14; r >= 2; r--) {
    switch (rankCount[r]) {
      case 4:
        quads.push(r);
        break;
      case 3:
        trips.push(r);
        break;
      case 2:
        pairs.push(r);
        break;
      case 1:
        singles.push(r);
        break;
      default:
        break;
    }
  }

  // Four of a kind.
  if (quads.length > 0) {
    const quad = quads[0]!;
    // best kicker among remaining cards
    let kicker = 0;
    for (let r = 14; r >= 2; r--) {
      if (r !== quad && rankCount[r]! > 0) {
        kicker = r;
        break;
      }
    }
    return { category: HandCategory.FourOfAKind, tiebreak: [quad, kicker] };
  }

  // Full house: a trip plus a pair (or a second trip used as the pair).
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const tripRank = trips[0]!;
    const pairRank = trips.length > 1 ? trips[1]! : pairs[0]!;
    return { category: HandCategory.FullHouse, tiebreak: [tripRank, pairRank] };
  }

  // Flush (no straight flush): top 5 ranks of the flush suit.
  if (flushSuit >= 0) {
    const flushRanks: number[] = [];
    for (let r = 14; r >= 2 && flushRanks.length < 5; r--) {
      if (suitRanks[flushSuit]![r]) flushRanks.push(r);
    }
    return { category: HandCategory.Flush, tiebreak: flushRanks };
  }

  // Straight.
  const stHigh = straightHigh(present);
  if (stHigh > 0) {
    return { category: HandCategory.Straight, tiebreak: [stHigh] };
  }

  // Three of a kind.
  if (trips.length > 0) {
    const tripRank = trips[0]!;
    const kickers: number[] = [];
    for (let r = 14; r >= 2 && kickers.length < 2; r--) {
      if (r !== tripRank && rankCount[r]! > 0) kickers.push(r);
    }
    return { category: HandCategory.ThreeOfAKind, tiebreak: [tripRank, ...kickers] };
  }

  // Two pair.
  if (pairs.length >= 2) {
    const high = pairs[0]!;
    const low = pairs[1]!;
    let kicker = 0;
    for (let r = 14; r >= 2; r--) {
      if (r !== high && r !== low && rankCount[r]! > 0) {
        kicker = r;
        break;
      }
    }
    return { category: HandCategory.TwoPair, tiebreak: [high, low, kicker] };
  }

  // One pair.
  if (pairs.length === 1) {
    const pairRank = pairs[0]!;
    const kickers: number[] = [];
    for (let r = 14; r >= 2 && kickers.length < 3; r--) {
      if (r !== pairRank && rankCount[r]! > 0) kickers.push(r);
    }
    return { category: HandCategory.Pair, tiebreak: [pairRank, ...kickers] };
  }

  // High card: top 5 ranks.
  const high5: number[] = [];
  for (let r = 14; r >= 2 && high5.length < 5; r--) {
    if (rankCount[r]! > 0) high5.push(r);
  }
  return { category: HandCategory.HighCard, tiebreak: high5 };
}

/** Evaluate 5–7 `Card`s into a comparable `HandValue`. */
export function evaluateCards(cards: readonly Card[]): {
  category: HandCategory;
  score: number;
  tiebreak: Rank[];
} {
  if (cards.length < 5) {
    throw new Error(`evaluateCards needs at least 5 cards, got ${cards.length}`);
  }
  const ranks: number[] = [];
  const suits: number[] = [];
  for (const c of cards) {
    ranks.push(c.rank);
    suits.push(cardToIndex(c) % 4);
  }
  const { category, tiebreak } = evaluateRanksSuits(ranks, suits);
  return { category, score: packScore(category, tiebreak), tiebreak: tiebreak as Rank[] };
}

/**
 * Fast path for the equity simulator: evaluate 7 cards given as 0–51
 * integer indices. Returns just the comparable score (no allocations
 * beyond the small fixed arrays). Accepts any count ≥ 5.
 */
export function evaluateIndices(indices: readonly number[]): number {
  const ranks: number[] = [];
  const suits: number[] = [];
  for (const idx of indices) {
    ranks.push((idx >> 2) + 2); // floor(idx/4) + 2
    suits.push(idx & 3); // idx % 4
  }
  const { category, tiebreak } = evaluateRanksSuits(ranks, suits);
  return packScore(category, tiebreak);
}

/** Convenience: compare two card sets. >0 if a beats b, 0 tie, <0 b beats a. */
export function compareHands(a: readonly Card[], b: readonly Card[]): number {
  return evaluateCards(a).score - evaluateCards(b).score;
}
