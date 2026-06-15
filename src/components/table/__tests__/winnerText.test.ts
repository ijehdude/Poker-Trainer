import { describe, it, expect } from 'vitest';
import { describeWinner } from '../winnerText';
import { parseCards } from '@/engine/cards';
import type { Card } from '@/engine/types';
import type { GameState, Seat, ShowdownShare } from '@/engine/gameEngine';

/**
 * describeWinner only reads status / winners / seats / board / revealed, so we
 * build a minimal completed-hand fixture rather than driving the whole engine.
 */
function seat(id: number, name: string, hole: string): Seat {
  const [a, b] = parseCards(hole);
  return {
    id,
    name,
    isHero: false,
    style: 'tag',
    stack: 0,
    holeCards: [a!, b!] as readonly [Card, Card],
    status: 'active',
    streetCommitted: 0,
    committed: 0,
    hasActed: true,
    position: 'BTN',
    lastAction: null,
  };
}

function completedHand(winners: ShowdownShare[]): GameState {
  return {
    seats: [seat(0, 'Nova', 'As 3c'), seat(1, 'Riot', 'Kc Th')],
    board: parseCards('Ah Ad 2c Tc Jc'),
    status: 'complete',
    revealed: [0, 1],
    winners,
  } as unknown as GameState;
}

describe('describeWinner — side pots are not a split', () => {
  it('main-pot + side-pot to different seats is NOT labeled a split', () => {
    // Repro: Nova wins the main pot (trips), Riot takes a side pot (+9).
    const text = describeWinner(
      completedHand([
        { seatId: 0, amount: 74, potIndex: 0 },
        { seatId: 1, amount: 9, potIndex: 1 },
      ]),
    );
    expect(text).not.toMatch(/split/i);
    expect(text).toContain('Nova');
    expect(text).toContain('Three of a Kind');
    expect(text).toContain('side pot to Riot');
  });

  it('a single pot won by two seats IS a split pot', () => {
    const text = describeWinner(
      completedHand([
        { seatId: 0, amount: 40, potIndex: 0 },
        { seatId: 1, amount: 40, potIndex: 0 },
      ]),
    );
    expect(text).toBe('Split pot — Nova & Riot');
  });

  it('a lone showdown winner is described with their hand', () => {
    const text = describeWinner(completedHand([{ seatId: 0, amount: 83, potIndex: 0 }]));
    expect(text).toBe('Nova wins with Three of a Kind (Aces)');
  });
});
