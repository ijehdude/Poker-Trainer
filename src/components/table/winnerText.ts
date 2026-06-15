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

  // Uncontested (everyone folded): the engine reveals nobody.
  const wentToShowdown = game.revealed.length >= 2;

  // Group winning seats by which pot they won. A genuine SPLIT is one pot
  // shared by 2+ seats (identical hands). Different seats winning different
  // (side) pots is NOT a split — that's normal all-in side-pot distribution,
  // e.g. the main-pot winner plus whoever takes a side pot they alone contest.
  const winnersByPot = new Map<number, number[]>();
  for (const w of game.winners) {
    const ids = winnersByPot.get(w.potIndex) ?? [];
    if (!ids.includes(w.seatId)) ids.push(w.seatId);
    winnersByPot.set(w.potIndex, ids);
  }

  // Main pot = lowest potIndex (built first; includes the most players).
  const mainIdx = Math.min(...winnersByPot.keys());
  const mainWinners = winnersByPot.get(mainIdx)!;

  // Genuine chop of the main pot.
  if (mainWinners.length > 1) {
    const names = mainWinners.map((id) => seatName(game, id).name);
    return `Split pot — ${names.join(' & ')}`;
  }

  const id = mainWinners[0]!;
  const { name, isHero } = seatName(game, id);
  const verb = isHero ? 'win' : 'wins';
  const seat = game.seats[id];

  if (!wentToShowdown || !seat?.holeCards) {
    return `${name} ${verb} — others folded`;
  }

  const hand = describeHand([...seat.holeCards, ...game.board]);

  // Note any side pot that went to a different player (correct all-in math,
  // not a split of the main pot).
  const sideWinners = Array.from(
    new Set(
      game.winners
        .filter((w) => w.potIndex !== mainIdx && w.seatId !== id)
        .map((w) => w.seatId),
    ),
  );
  if (sideWinners.length > 0) {
    const sideNames = sideWinners.map((sid) => seatName(game, sid).name).join(' & ');
    return `${name} ${verb} with ${hand} · side pot to ${sideNames}`;
  }

  return `${name} ${verb} with ${hand}`;
}
