/**
 * Board texture analysis — feeds both the strategy heuristics and the
 * coach's natural-language explanations.
 */

import type { Card } from './types';

export interface BoardTexture {
  /** 0 (dry) … 1 (very wet/coordinated). */
  wetness: number;
  paired: boolean;
  monotone: boolean; // all same suit
  twoTone: boolean; // exactly two of a suit (flush draw present)
  connected: boolean; // straighty
  highCard: number; // top board rank
  flushDraw: boolean;
  straightDraw: boolean;
  descriptor: string; // short human label, e.g. "wet, two-tone"
}

export function analyzeBoard(board: readonly Card[]): BoardTexture {
  if (board.length < 3) {
    return {
      wetness: 0,
      paired: false,
      monotone: false,
      twoTone: false,
      connected: false,
      highCard: board[0]?.rank ?? 0,
      flushDraw: false,
      straightDraw: false,
      descriptor: 'preflop',
    };
  }

  const ranks = board.map((c) => c.rank).sort((a, b) => b - a);
  const suitCounts = new Map<string, number>();
  for (const c of board) suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1);
  const maxSuit = Math.max(...suitCounts.values());

  const paired = new Set(ranks).size < ranks.length;
  const monotone = maxSuit === board.length;
  const twoTone = maxSuit === board.length - 1 && !monotone && board.length <= 4;
  const flushDraw = maxSuit >= 2 && maxSuit < board.length && board.length < 5;

  // Connectedness: span of the three highest distinct ranks.
  const distinct = Array.from(new Set(ranks)).sort((a, b) => b - a);
  let connected = false;
  let straightDraw = false;
  if (distinct.length >= 2) {
    const span = distinct[0]! - distinct[Math.min(2, distinct.length - 1)]!;
    connected = span <= 4 && distinct.length >= 3;
    straightDraw = span <= 4;
  }

  let wetness = 0;
  if (twoTone || flushDraw) wetness += 0.35;
  if (monotone) wetness += 0.55;
  if (connected) wetness += 0.35;
  if (straightDraw) wetness += 0.15;
  if (paired) wetness -= 0.1; // paired boards are a bit "safer" for made hands
  wetness = Math.max(0, Math.min(1, wetness));

  const parts: string[] = [];
  parts.push(wetness > 0.55 ? 'wet' : wetness > 0.3 ? 'semi-wet' : 'dry');
  if (paired) parts.push('paired');
  if (monotone) parts.push('monotone');
  else if (twoTone) parts.push('two-tone');
  if (connected) parts.push('connected');

  return {
    wetness,
    paired,
    monotone,
    twoTone,
    connected,
    highCard: ranks[0]!,
    flushDraw,
    straightDraw,
    descriptor: parts.join(', '),
  };
}
