/**
 * No-Limit Texas Hold'em hand state machine.
 *
 * Pure, framework-free functions that take a `GameState` plus an action
 * and return the next `GameState`. Handles blinds, betting rounds, the
 * minimum-raise rule, dealer-button rotation, all-ins, correct side pots,
 * and showdown. The React/Zustand layer drives this and never mutates
 * state directly.
 *
 * Conventions:
 *  - `streetCommitted` = chips a seat has put in on the current street.
 *  - `committed`       = chips a seat has put in across the whole hand.
 *  - `currentBet`      = the highest `streetCommitted` this street.
 *  - To call = `currentBet − seat.streetCommitted`.
 */

import type { ActionType, Card, Street } from './types';
import { makeDeck, shuffle } from './cards';
import { evaluateCards } from './evaluator';
import { type Position } from './ranges';
import type { BotStyle } from './bots';

export type SeatStatus = 'active' | 'folded' | 'allin' | 'empty';

export interface Seat {
  id: number;
  name: string;
  isHero: boolean;
  style: BotStyle | null;
  stack: number;
  holeCards: readonly [Card, Card] | null;
  status: SeatStatus;
  streetCommitted: number;
  committed: number;
  hasActed: boolean;
  position: Position;
  lastAction: { type: ActionType; amount: number } | null;
}

export interface Pot {
  amount: number;
  /** Seat ids eligible to win this pot (contributed and not folded). */
  eligible: number[];
}

export interface ActionLogEntry {
  seatId: number;
  street: Street;
  type: ActionType;
  amount: number;
  potAfter: number;
}

export interface ShowdownShare {
  seatId: number;
  amount: number;
  potIndex: number;
}

export interface GameState {
  seats: Seat[];
  buttonIndex: number;
  street: Street;
  board: Card[];
  deck: Card[];
  currentBet: number;
  lastRaiseSize: number;
  toAct: number; // seat id, or -1 when no one is to act
  status: 'betting' | 'showdown' | 'complete';
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  log: ActionLogEntry[];
  pots: Pot[];
  winners: ShowdownShare[];
  /** Seat ids revealed at showdown (for the UI). */
  revealed: number[];
}

export interface SeatConfig {
  name: string;
  isHero: boolean;
  style: BotStyle | null;
  stack: number;
}

export interface HandConfig {
  seats: SeatConfig[];
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  rng?: () => number;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  /** Minimum total street commitment for a legal raise/bet. */
  minRaiseTo: number;
  /** Maximum (all-in) total street commitment. */
  maxRaiseTo: number;
  isBet: boolean; // true when there is no bet yet (so a raise is really a "bet")
}

// ── Helpers ─────────────────────────────────────────────────────────

function totalPot(seats: Seat[]): number {
  return seats.reduce((sum, s) => sum + s.committed, 0);
}

function nonFolded(seats: Seat[]): Seat[] {
  return seats.filter((s) => s.status !== 'folded' && s.status !== 'empty');
}

/** Seats that can still make a betting decision. */
function canActSeats(seats: Seat[]): Seat[] {
  return seats.filter((s) => s.status === 'active' && s.stack > 0);
}

/**
 * Per-hand seating setup computed over LIVE seats only (stack > 0), so
 * eliminated/empty seats are skipped for the button, blinds, positions, and
 * first-to-act. Handles 3–6 handed and the heads-up special case.
 */
interface HandSetup {
  /** Live seat ids, clockwise starting from the (effective) button. */
  order: number[];
  positions: Record<number, Position>;
  sbId: number;
  bbId: number;
  /** Seat id that acts first preflop. */
  preflopFirst: number;
  /** The effective button seat (always a live seat). */
  button: number;
}

/** Live seat ids in clockwise order starting at `from`. */
function liveOrder(seats: Seat[], from: number): number[] {
  const n = seats.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const idx = (from + i) % n;
    if (seats[idx]!.stack > 0) out.push(idx);
  }
  return out;
}

function assignPositions(order: number[]): Record<number, Position> {
  const pos: Record<number, Position> = {};
  const N = order.length;
  if (N === 2) {
    // Heads-up: the button is the small blind.
    pos[order[0]!] = 'BTN';
    pos[order[1]!] = 'BB';
    return pos;
  }
  pos[order[0]!] = 'BTN';
  pos[order[1]!] = 'SB';
  pos[order[2]!] = 'BB';
  const tail: Position[] = ['UTG', 'HJ', 'CO'];
  for (let i = 3; i < N; i++) pos[order[i]!] = tail[i - 3] ?? 'CO';
  return pos;
}

/** Build the seating setup. The button snaps to the next live seat. */
function buildSetup(seats: Seat[], buttonIndex: number): HandSetup {
  const order = liveOrder(seats, buttonIndex);
  const N = order.length;
  const positions = assignPositions(order);
  const button = order[0]!;
  if (N === 2) {
    return { order, positions, sbId: order[0]!, bbId: order[1]!, preflopFirst: order[0]!, button };
  }
  return {
    order,
    positions,
    sbId: order[1]!,
    bbId: order[2]!,
    preflopFirst: order[3 % N]!,
    button,
  };
}

// ── Hand setup ──────────────────────────────────────────────────────

/** Create and deal a fresh hand: shuffle, assign positions, post blinds. */
export function createHand(config: HandConfig): GameState {
  const rng = config.rng ?? Math.random;
  const deck = shuffle(makeDeck(), rng);

  const seats: Seat[] = config.seats.map((sc, i) => ({
    id: i,
    name: sc.name,
    isHero: sc.isHero,
    style: sc.style,
    stack: sc.stack,
    holeCards: null,
    status: sc.stack > 0 ? 'active' : 'empty',
    streetCommitted: 0,
    committed: 0,
    hasActed: false,
    position: 'BTN',
    lastAction: null,
  }));

  // Compute the seating setup over LIVE seats (skips eliminated/empty seats).
  const setup = buildSetup(seats, config.buttonIndex);
  for (const seat of seats) {
    const p = setup.positions[seat.id];
    if (p) seat.position = p;
  }

  // Deal two hole cards to each live seat.
  for (const seat of seats) {
    if (seat.status === 'active') {
      seat.holeCards = [deck.pop()!, deck.pop()!];
    }
  }

  const state: GameState = {
    seats,
    buttonIndex: setup.button,
    street: 'preflop',
    board: [],
    deck,
    currentBet: 0,
    lastRaiseSize: config.bigBlind,
    toAct: -1,
    status: 'betting',
    handNumber: config.handNumber,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    log: [],
    pots: [],
    winners: [],
    revealed: [],
  };

  postBlinds(state, setup);
  return state;
}

function postBlind(seat: Seat, amount: number): void {
  const post = Math.min(amount, seat.stack);
  seat.stack -= post;
  seat.streetCommitted += post;
  seat.committed += post;
  if (seat.stack === 0) seat.status = 'allin';
}

function postBlinds(state: GameState, setup: HandSetup): void {
  postBlind(state.seats[setup.sbId]!, state.smallBlind);
  postBlind(state.seats[setup.bbId]!, state.bigBlind);
  state.currentBet = state.bigBlind;
  state.lastRaiseSize = state.bigBlind;
  // Preflop first-to-act per the live-seat setup (UTG, or the button heads-up).
  state.toAct = nextToActFrom(state, setup.preflopFirst);
}

// ── Turn order ──────────────────────────────────────────────────────

/** First seat starting at `start` (inclusive) that must act, or -1. */
function nextToActFrom(state: GameState, start: number): number {
  const n = state.seats.length;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % n;
    const seat = state.seats[idx]!;
    if (seat.status === 'active' && seat.stack > 0 && needsToAct(state, seat)) {
      return idx;
    }
  }
  return -1;
}

function needsToAct(state: GameState, seat: Seat): boolean {
  if (seat.status !== 'active') return false;
  if (!seat.hasActed) return true;
  return seat.streetCommitted < state.currentBet;
}

// ── Legal actions ───────────────────────────────────────────────────

export function legalActions(state: GameState): LegalActions {
  const seat = state.seats[state.toAct];
  if (!seat || state.status !== 'betting') {
    return {
      canFold: false,
      canCheck: false,
      canCall: false,
      callAmount: 0,
      canRaise: false,
      minRaiseTo: 0,
      maxRaiseTo: 0,
      isBet: false,
    };
  }
  const callAmount = Math.max(0, state.currentBet - seat.streetCommitted);
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && seat.stack > 0;
  const maxRaiseTo = seat.streetCommitted + seat.stack;
  const minRaiseTo = Math.min(maxRaiseTo, state.currentBet + state.lastRaiseSize);
  // A raise/bet is legal as long as the seat has more chips than a pure call.
  const canRaise = seat.stack > callAmount;
  const isBet = state.currentBet === 0;

  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount: Math.min(callAmount, seat.stack),
    canRaise,
    minRaiseTo,
    maxRaiseTo,
    isBet,
  };
}

// ── Applying actions ────────────────────────────────────────────────

export interface Action {
  type: ActionType;
  /** For raise/bet: the TOTAL street commitment to raise TO. Ignored otherwise. */
  amount?: number;
}

/**
 * Apply an action for the seat currently to act, then advance the hand
 * (next actor, next street, or showdown) until the next decision point or
 * completion. Returns a new state; the input is not mutated.
 */
export function applyAction(prev: GameState, action: Action): GameState {
  const state = cloneState(prev);
  const seat = state.seats[state.toAct];
  if (!seat || state.status !== 'betting') return state;

  const legal = legalActions(prev);

  switch (action.type) {
    case 'fold': {
      seat.status = 'folded';
      seat.hasActed = true;
      seat.lastAction = { type: 'fold', amount: 0 };
      break;
    }
    case 'check': {
      if (!legal.canCheck) return state; // illegal, ignore
      seat.hasActed = true;
      seat.lastAction = { type: 'check', amount: 0 };
      break;
    }
    case 'call': {
      const amount = Math.min(legal.callAmount, seat.stack);
      commit(seat, amount);
      seat.hasActed = true;
      seat.lastAction = { type: 'call', amount };
      break;
    }
    case 'bet':
    case 'raise': {
      const requested = action.amount ?? legal.minRaiseTo;
      const raiseTo = Math.max(legal.minRaiseTo, Math.min(requested, legal.maxRaiseTo));
      const added = raiseTo - seat.streetCommitted;
      const prevBet = state.currentBet;
      commit(seat, added);
      // Update the raise size only if this was a full (legal) raise, not a
      // short all-in below the minimum.
      const raiseSize = raiseTo - prevBet;
      if (raiseSize >= state.lastRaiseSize) {
        state.lastRaiseSize = raiseSize;
      }
      state.currentBet = Math.max(state.currentBet, raiseTo);
      seat.hasActed = true;
      seat.lastAction = {
        type: state.currentBet > prevBet && prevBet === 0 ? 'bet' : 'raise',
        amount: raiseTo,
      };
      // A raise reopens the action: everyone else must act again.
      for (const s of state.seats) {
        if (s.id !== seat.id && s.status === 'active') s.hasActed = false;
      }
      break;
    }
    default:
      return state;
  }

  state.log.push({
    seatId: seat.id,
    street: state.street,
    type: seat.lastAction?.type ?? action.type,
    amount: seat.lastAction?.amount ?? 0,
    potAfter: totalPot(state.seats),
  });

  progress(state);
  return state;
}

function commit(seat: Seat, amount: number): void {
  const amt = Math.min(amount, seat.stack);
  seat.stack -= amt;
  seat.streetCommitted += amt;
  seat.committed += amt;
  if (seat.stack === 0) seat.status = 'allin';
}

/** Advance the hand: end-of-hand, next street, or next actor. */
function progress(state: GameState): void {
  // Only one non-folded seat left → award immediately, no showdown.
  const live = nonFolded(state.seats);
  if (live.length === 1) {
    awardUncontested(state, live[0]!);
    return;
  }

  // Is the betting round closed?
  const nextActor = nextToActFrom(state, (state.toAct + 1) % state.seats.length);
  const canAct = canActSeats(state.seats);

  if (nextActor !== -1 && canAct.length >= 1 && bettingStillOpen(state)) {
    state.toAct = nextActor;
    return;
  }

  // Betting round complete. Move money to pots and go to the next street.
  advanceStreet(state);
}

/**
 * The round is still open if at least one seat that can act has not yet
 * matched the current bet or has not acted this street.
 */
function bettingStillOpen(state: GameState): boolean {
  return canActSeats(state.seats).some((s) => needsToAct(state, s));
}

function advanceStreet(state: GameState): void {
  // Reset per-street betting fields.
  for (const s of state.seats) {
    s.streetCommitted = 0;
    s.hasActed = false;
    if (s.status === 'active') s.lastAction = null;
  }
  state.currentBet = 0;
  state.lastRaiseSize = state.bigBlind;

  // If at most one seat can still act, run the board out to showdown.
  const canAct = canActSeats(state.seats);
  const live = nonFolded(state.seats);

  const dealNext = (): boolean => {
    switch (state.street) {
      case 'preflop':
        state.board.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!);
        state.street = 'flop';
        return true;
      case 'flop':
        state.board.push(state.deck.pop()!);
        state.street = 'turn';
        return true;
      case 'turn':
        state.board.push(state.deck.pop()!);
        state.street = 'river';
        return true;
      case 'river':
        return false;
    }
  };

  // No more betting possible (everyone all-in or only one can act): deal
  // every remaining street, then showdown.
  if (canAct.length < 2 && live.length >= 2) {
    while (state.street !== 'river') dealNext();
    showdown(state);
    return;
  }

  if (!dealNext()) {
    // We were on the river and betting closed → showdown.
    showdown(state);
    return;
  }

  // New street: first to act is the first live seat left of the button.
  state.toAct = nextToActFrom(state, (state.buttonIndex + 1) % state.seats.length);
  if (state.toAct === -1) {
    // Nobody can act on this street (all all-in) → keep dealing.
    advanceStreet(state);
  }
}

// ── Pots & showdown ─────────────────────────────────────────────────

/** Build main + side pots from each seat's total contribution. */
export function buildPots(seats: Seat[]): Pot[] {
  const contributors = seats.filter((s) => s.committed > 0);
  const levels = Array.from(new Set(contributors.map((s) => s.committed))).sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const layer = level - prev;
    const contributingSeats = seats.filter((s) => s.committed >= level);
    const amount = layer * contributingSeats.length;
    const eligible = contributingSeats.filter((s) => s.status !== 'folded').map((s) => s.id);
    if (amount > 0) {
      // Merge consecutive layers that share the same eligible set.
      const last = pots[pots.length - 1];
      if (last && sameSet(last.eligible, eligible)) {
        last.amount += amount;
      } else {
        pots.push({ amount, eligible });
      }
    }
    prev = level;
  }
  return pots;
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function awardUncontested(state: GameState, winner: Seat): void {
  const pot = totalPot(state.seats);
  winner.stack += pot;
  state.pots = [{ amount: pot, eligible: [winner.id] }];
  state.winners = [{ seatId: winner.id, amount: pot, potIndex: 0 }];
  clearCommitted(state);
  state.status = 'complete';
  state.toAct = -1;
}

/** Once a hand is awarded, chips have moved from the table into stacks. */
function clearCommitted(state: GameState): void {
  for (const s of state.seats) {
    s.committed = 0;
    s.streetCommitted = 0;
  }
}

function showdown(state: GameState): void {
  state.pots = buildPots(state.seats);
  state.status = 'showdown';
  state.toAct = -1;

  const contenders = nonFolded(state.seats);
  state.revealed = contenders.map((s) => s.id);

  // Best 7-card score per contender.
  const scores = new Map<number, number>();
  for (const s of contenders) {
    if (!s.holeCards) continue;
    scores.set(s.id, evaluateCards([...s.holeCards, ...state.board]).score);
  }

  const shares: ShowdownShare[] = [];
  state.pots.forEach((pot, potIndex) => {
    const eligible = pot.eligible.filter((id) => scores.has(id));
    if (eligible.length === 0) return;
    let best = -1;
    for (const id of eligible) best = Math.max(best, scores.get(id)!);
    const winners = eligible.filter((id) => scores.get(id) === best);

    // Split, distributing odd chips to the earliest seats left of button.
    const base = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - base * winners.length;
    const ordered = orderLeftOfButton(state, winners);
    for (const id of ordered) {
      let amt = base;
      if (remainder > 0) {
        amt += 1;
        remainder -= 1;
      }
      const seat = state.seats[id]!;
      seat.stack += amt;
      shares.push({ seatId: id, amount: amt, potIndex });
    }
  });

  state.winners = shares;
  clearCommitted(state);
  state.status = 'complete';
}

function orderLeftOfButton(state: GameState, ids: number[]): number[] {
  const n = state.seats.length;
  return [...ids].sort((a, b) => {
    const oa = (a - state.buttonIndex + n) % n;
    const ob = (b - state.buttonIndex + n) % n;
    return oa - ob;
  });
}

// ── Misc ────────────────────────────────────────────────────────────

export function currentPot(state: GameState): number {
  return totalPot(state.seats);
}

export function heroSeat(state: GameState): Seat | undefined {
  return state.seats.find((s) => s.isHero);
}

export function isHeroTurn(state: GameState): boolean {
  const seat = state.seats[state.toAct];
  return !!seat && seat.isHero && state.status === 'betting';
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    seats: state.seats.map((s) => ({ ...s, holeCards: s.holeCards, lastAction: s.lastAction })),
    board: [...state.board],
    deck: [...state.deck],
    log: [...state.log],
    pots: state.pots.map((p) => ({ amount: p.amount, eligible: [...p.eligible] })),
    winners: [...state.winners],
    revealed: [...state.revealed],
  };
}
