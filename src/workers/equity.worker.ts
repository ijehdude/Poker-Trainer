/**
 * Equity Web Worker.
 *
 * Runs Monte Carlo / exact equity off the main thread so heavy simulation
 * never blocks the UI. Communicates via structured-clone-friendly plain
 * objects (cards are passed as compact "As" strings).
 */

import { parseCard } from '@/engine/cards';
import { estimateEquity, type HoleCards } from '@/engine/equity';
import type { Card } from '@/engine/types';

export interface EquityRequest {
  id: number;
  hero: [string, string];
  board: string[];
  /** One entry per opponent: 'random' or a list of "AsKh"-style combos. */
  opponents: ('random' | string[][])[];
  iterations?: number;
}

export interface EquityResponse {
  id: number;
  equity: number;
  win: number;
  tie: number;
  lose: number;
  samples: number;
  exact: boolean;
}

function toHole(pair: [string, string]): HoleCards {
  return [parseCard(pair[0]), parseCard(pair[1])] as HoleCards;
}

self.onmessage = (e: MessageEvent<EquityRequest>) => {
  const req = e.data;
  const hero = toHole(req.hero);
  const board: Card[] = req.board.map(parseCard);
  const opponents = req.opponents.map((o) =>
    o === 'random'
      ? ('random' as const)
      : { combos: o.map((c) => [parseCard(c[0]!), parseCard(c[1]!)] as HoleCards) },
  );

  const result = estimateEquity({ hero, board, opponents, iterations: req.iterations });

  const response: EquityResponse = { id: req.id, ...result };
  (self as unknown as Worker).postMessage(response);
};
