/**
 * Bridges the game state machine and the strategy engine: builds a
 * `DecisionContext` for a given seat from the live `GameState`.
 */

import type { GameState } from './gameEngine';
import { currentPot, legalActions } from './gameEngine';
import type { DecisionContext, PotContext } from './strategy';
import type { HoleCards } from './equity';

/** Count opponents still contesting the pot (not folded, not the actor). */
export function opponentsInHand(game: GameState, seatId: number): number {
  return game.seats.filter((s) => s.id !== seatId && s.status !== 'folded' && s.status !== 'empty')
    .length;
}

/** Build a decision context for the seat currently to act (or a given seat). */
export function buildSeatContext(
  game: GameState,
  seatId: number,
  equity: number | undefined,
): DecisionContext {
  const seat = game.seats[seatId]!;
  const la = legalActions(game);
  const toCall = la.callAmount;
  const pot = currentPot(game);

  const potContext: PotContext =
    game.street === 'preflop' && game.currentBet <= game.bigBlind ? 'unopened' : 'facing-bet';

  return {
    street: game.street,
    heroHole: seat.holeCards as HoleCards,
    board: game.board,
    position: seat.position,
    pot,
    toCall,
    bigBlind: game.bigBlind,
    heroStack: seat.stack,
    numOpponents: opponentsInHand(game, seatId),
    potContext,
    equity,
  };
}
