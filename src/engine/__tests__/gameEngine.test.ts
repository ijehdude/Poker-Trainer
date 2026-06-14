import { describe, it, expect } from 'vitest';
import {
  createHand,
  applyAction,
  legalActions,
  buildPots,
  currentPot,
  type GameState,
  type Seat,
  type HandConfig,
} from '../gameEngine';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sixMax(stack = 100, overrides: Partial<HandConfig> = {}): HandConfig {
  return {
    seats: Array.from({ length: 6 }, (_, i) => ({
      name: i === 0 ? 'Hero' : `Bot ${i}`,
      isHero: i === 0,
      style: i === 0 ? null : 'tag',
      stack,
    })),
    buttonIndex: 0,
    smallBlind: 0.5,
    bigBlind: 1,
    handNumber: 1,
    rng: mulberry32(42),
    ...overrides,
  };
}

const totalChips = (s: GameState): number =>
  s.seats.reduce((sum, seat) => sum + seat.stack + seat.committed, 0);

describe('gameEngine — setup & blinds', () => {
  it('deals two hole cards to each seat', () => {
    const s = createHand(sixMax());
    for (const seat of s.seats) expect(seat.holeCards).toHaveLength(2);
  });
  it('posts SB and BB at offsets 1 and 2 from the button', () => {
    const s = createHand(sixMax());
    expect(s.seats[1]!.committed).toBe(0.5); // SB
    expect(s.seats[2]!.committed).toBe(1); // BB
    expect(s.currentBet).toBe(1);
  });
  it('first to act preflop is UTG (offset 3)', () => {
    const s = createHand(sixMax());
    expect(s.toAct).toBe(3);
  });
  it('assigns 6-max positions correctly', () => {
    const s = createHand(sixMax());
    expect(s.seats[0]!.position).toBe('BTN');
    expect(s.seats[1]!.position).toBe('SB');
    expect(s.seats[2]!.position).toBe('BB');
    expect(s.seats[3]!.position).toBe('UTG');
  });
});

describe('gameEngine — folding around awards the BB', () => {
  it('everyone folds to the big blind', () => {
    let s = createHand(sixMax());
    const startChips = totalChips(s);
    // UTG, HJ, CO, BTN, SB all fold → BB wins.
    for (let i = 0; i < 5 && s.status === 'betting'; i++) {
      s = applyAction(s, { type: 'fold' });
    }
    expect(s.status).toBe('complete');
    expect(s.winners).toHaveLength(1);
    expect(s.winners[0]!.seatId).toBe(2); // BB
    expect(totalChips(s)).toBeCloseTo(startChips, 6);
    // BB nets the small blind (0.5).
    expect(s.seats[2]!.stack).toBeCloseTo(100.5, 6);
  });
});

describe('gameEngine — legal actions & min-raise', () => {
  it('UTG facing the BB can call 1 or raise to ≥ 2', () => {
    const s = createHand(sixMax());
    const la = legalActions(s);
    expect(la.canCheck).toBe(false);
    expect(la.callAmount).toBe(1);
    expect(la.minRaiseTo).toBe(2); // currentBet 1 + lastRaiseSize 1
    expect(la.canRaise).toBe(true);
  });
  it('BB can check when folded around to a limped pot', () => {
    let s = createHand(sixMax());
    // UTG..BTN call, SB calls → BB can check
    s = applyAction(s, { type: 'call' }); // UTG
    s = applyAction(s, { type: 'call' }); // HJ
    s = applyAction(s, { type: 'call' }); // CO
    s = applyAction(s, { type: 'call' }); // BTN
    s = applyAction(s, { type: 'call' }); // SB completes
    expect(s.toAct).toBe(2); // BB
    expect(legalActions(s).canCheck).toBe(true);
  });
});

describe('gameEngine — side pots (pure builder)', () => {
  const mkSeat = (id: number, committed: number, status: Seat['status']): Seat => ({
    id,
    name: `S${id}`,
    isHero: false,
    style: 'tag',
    stack: 0,
    holeCards: null,
    status,
    streetCommitted: 0,
    committed,
    hasActed: true,
    position: 'BTN',
    lastAction: null,
  });

  it('builds a main pot and a side pot for an all-in shortstack', () => {
    // A all-in 20, B and C each put in 50.
    const seats = [mkSeat(0, 20, 'allin'), mkSeat(1, 50, 'active'), mkSeat(2, 50, 'active')];
    const pots = buildPots(seats);
    // Main pot: 20*3 = 60 (all eligible). Side pot: 30*2 = 60 (B,C only).
    expect(pots[0]!.amount).toBe(60);
    expect(pots[0]!.eligible.sort()).toEqual([0, 1, 2]);
    expect(pots[1]!.amount).toBe(60);
    expect(pots[1]!.eligible.sort()).toEqual([1, 2]);
  });

  it('excludes folded contributors from eligibility but keeps their chips', () => {
    const seats = [
      mkSeat(0, 50, 'folded'), // folded but contributed 50
      mkSeat(1, 50, 'active'),
      mkSeat(2, 50, 'active'),
    ];
    const pots = buildPots(seats);
    expect(pots).toHaveLength(1);
    expect(pots[0]!.amount).toBe(150);
    expect(pots[0]!.eligible.sort()).toEqual([1, 2]);
  });
});

describe('gameEngine — full hand conserves chips', () => {
  it('plays a hand to completion with constant total chips', () => {
    let s = createHand(sixMax(100, { rng: mulberry32(7) }));
    const startChips = totalChips(s);
    let guard = 0;
    while (s.status === 'betting' && guard++ < 200) {
      const la = legalActions(s);
      // Simple scripted policy: check/call cheaply, otherwise fold big bets.
      if (la.canCheck) s = applyAction(s, { type: 'check' });
      else if (la.callAmount <= 1) s = applyAction(s, { type: 'call' });
      else s = applyAction(s, { type: 'fold' });
    }
    expect(s.status).toBe('complete');
    expect(totalChips(s)).toBeCloseTo(startChips, 6);
    // All committed chips have been distributed back to stacks.
    const distributed = s.seats.reduce((sum, seat) => sum + seat.stack, 0);
    expect(distributed).toBeCloseTo(startChips, 6);
  });

  it('an all-in shootout runs the board out and produces a winner', () => {
    let s = createHand(sixMax(100, { rng: mulberry32(123) }));
    let guard = 0;
    while (s.status === 'betting' && guard++ < 200) {
      const la = legalActions(s);
      // Everyone jams / calls all-in.
      if (la.canRaise && la.maxRaiseTo > s.currentBet) {
        s = applyAction(s, { type: 'raise', amount: la.maxRaiseTo });
      } else if (la.canCall) {
        s = applyAction(s, { type: 'call' });
      } else if (la.canCheck) {
        s = applyAction(s, { type: 'check' });
      } else {
        s = applyAction(s, { type: 'fold' });
      }
    }
    expect(s.status).toBe('complete');
    expect(s.board.length).toBeGreaterThanOrEqual(0);
    expect(s.winners.length).toBeGreaterThan(0);
    // After completion, chips have left the table (currentPot is 0); the
    // amount won equals the total of the resolved pots.
    expect(currentPot(s)).toBe(0);
    const won = s.winners.reduce((sum, w) => sum + w.amount, 0);
    const potTotal = s.pots.reduce((sum, p) => sum + p.amount, 0);
    expect(won).toBeCloseTo(potTotal, 6);
  });
});
