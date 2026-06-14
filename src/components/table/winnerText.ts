/**
 * Builds the winning-hand callout string for a completed hand, using the
 * existing showdown result (no re-ranking). Covers showdown wins,
 * everyone-folds wins, and split pots.
 */

import type { GameState } from '@/engine/gameEngine';
import { describeHand } from '@/engine/handDescription';

function seatName(game: GameState, seatId: number): { name: string; isHero: boolean } {
  const seat = game.seats[seatId];
  const isHero = !!seat?.isHero;
  return { name: isHero ? 'You' : (seat?.name ?? 'Player'), isHero };
}

export function describeWinner(game: GameState): string | null {
  if (game.status !== 'complete' || game.winners.length === 0) return null;

  // Unique winning seats (a split pot lists more than one).
  const seatIds = Array.from(new Set(game.winners.map((w) => w.seatId)));

  if (seatIds.length > 1) {
    const names = seatIds.map((id) => seatName(game, id).name);
    return `Split pot — ${names.join(' & ')}`;
  }

  const id = seatIds[0]!;
  const { name, isHero } = seatName(game, id);
  const verb = isHero ? 'win' : 'wins';

  // Uncontested (everyone folded): the engine reveals nobody.
  const wentToShowdown = game.revealed.length >= 2;
  const seat = game.seats[id];
  if (!wentToShowdown || !seat?.holeCards) {
    return `${name} ${verb} — others folded`;
  }

  const hand = describeHand([...seat.holeCards, ...game.board]);
  return `${name} ${verb} with ${hand}`;
}
