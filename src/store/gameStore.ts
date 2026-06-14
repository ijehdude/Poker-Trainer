/**
 * Play-mode game store.
 *
 * Wraps the pure `gameEngine` state machine and orchestrates:
 *  - dealing new hands from the configured table
 *  - hero actions (graded against the strategy engine → a verdict)
 *  - bot actions (driven by the same engine, weighted by style)
 *  - hero equity for the live overlay (computed off-thread)
 *
 * The store performs ONE step at a time (`botStep`) so the UI can pace
 * bot actions with animations. All poker logic stays in the engine; this
 * file is the conductor.
 */

'use client';

import { create } from 'zustand';
import {
  createHand,
  applyAction,
  legalActions,
  currentPot,
  type GameState,
  type Action,
  type SeatConfig,
  type LegalActions,
} from '@/engine/gameEngine';
import { decideBotAction } from '@/engine/bots';
import { evaluateDecision, evOfChosen, type StrategyFactors } from '@/engine/strategy';
import { gradeAction, type VerdictResult } from '@/engine/verdict';
import { buildSeatContext, opponentsInHand } from '@/engine/decision';
import { estimateEquity, type EquityResult } from '@/engine/equity';
import { createEquityClient, type EquityClient } from '@/engine/equityClient';
import { formatCard } from '@/engine/cards';
import { toFrame, saveHand, type HandFrame, type HandRecord } from '@/lib/history';
import { useSession } from './sessionStore';
import type { ActionType, Card, Street } from '@/engine/types';
import type { Position } from '@/engine/ranges';
import type { BotStyle } from '@/engine/bots';

export interface RecordedDecision {
  id: string;
  handNumber: number;
  street: Street;
  position: Position;
  holeCards: [string, string];
  board: string[];
  action: { type: ActionType; amount: number };
  equity: number;
  bestEV: number;
  chosenEV: number;
  verdict: VerdictResult;
  factors: StrategyFactors;
  recommended: { type: ActionType; amount: number };
  /** Amount to call faced at decision time (0 ⇒ could check). */
  toCall: number;
  /** Pot before the action. */
  pot: number;
  bigBlind: number;
}

export interface TableConfig {
  styles: BotStyle[]; // 5 villains
  startingStack: number; // in chips
  smallBlind: number;
  bigBlind: number;
}

export type GamePhase = 'idle' | 'playing' | 'complete';

interface GameStore {
  game: GameState | null;
  phase: GamePhase;

  /** Live hero equity for the overlay (async). */
  heroEquity: EquityResult | null;
  equityLoading: boolean;

  /** Hero decisions made in the current hand (most recent last). */
  decisions: RecordedDecision[];
  /** The most recent verdict, surfaced as a toast/chip. */
  lastVerdict: RecordedDecision | null;
  /** Flash message describing the latest bot action (for the log/sound). */
  lastBotAction: { seatId: number; type: ActionType; amount: number } | null;

  /** Replay frames for the current hand. */
  frames: HandFrame[];

  /** Reset the session to fresh stacks and deal hand 1. */
  startSession: (table: TableConfig) => void;
  /** Deal the next hand using carried-over session stacks. */
  dealHand: () => void;
  heroAct: (action: Action) => void;
  botStep: () => { acted: boolean; complete: boolean };
  legal: () => LegalActions;
  reset: () => void;
}

let equityClient: EquityClient | null = null;
function getEquityClient(): EquityClient {
  if (!equityClient) equityClient = createEquityClient();
  return equityClient;
}

let decisionSeq = 0;

/** Fast inline equity for bots / synchronous hero grading. */
function quickEquity(
  hero: readonly [Card, Card],
  board: readonly Card[],
  opponents: number,
  iterations: number,
): number {
  if (opponents <= 0) return 1;
  const result = estimateEquity({
    hero: hero as [Card, Card],
    board,
    opponents: Array.from({ length: opponents }, () => 'random' as const),
    iterations,
  });
  return result.equity;
}

export const useGame = create<GameStore>((set, get) => ({
  game: null,
  phase: 'idle',
  heroEquity: null,
  equityLoading: false,
  decisions: [],
  lastVerdict: null,
  lastBotAction: null,
  frames: [],

  startSession: (table) => {
    useSession.getState().startNewGame({
      styles: table.styles,
      startingStack: table.startingStack,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
    });
    dealFromSession(get, set);
  },

  dealHand: () => dealFromSession(get, set),

  heroAct: (action) => {
    const { game } = get();
    if (!game || game.status !== 'betting') return;
    const seat = game.seats[game.toAct];
    if (!seat || !seat.isHero || !seat.holeCards) return;

    // Grade the action synchronously so a verdict is always available.
    const equity =
      get().heroEquity?.equity ??
      quickEquity(seat.holeCards, game.board, opponentsInHand(game, seat.id), 2500);
    const ctx = buildSeatContext(game, seat.id, equity);
    const solution = evaluateDecision(ctx);
    const chosenEV = evOfChosen(solution, action.type, action.amount ?? 0);
    const verdict = gradeAction(chosenEV, solution.bestEV, game.bigBlind);

    const decision: RecordedDecision = {
      id: `d${++decisionSeq}`,
      handNumber: game.handNumber,
      street: game.street,
      position: seat.position,
      holeCards: [formatCard(seat.holeCards[0]), formatCard(seat.holeCards[1])],
      board: game.board.map(formatCard),
      action: { type: action.type, amount: action.amount ?? 0 },
      equity,
      bestEV: solution.bestEV,
      chosenEV,
      verdict,
      factors: solution.factors,
      recommended: { type: solution.recommended.type, amount: solution.recommended.amount },
      toCall: ctx.toCall,
      pot: ctx.pot,
      bigBlind: game.bigBlind,
    };

    const next = applyAction(game, action);
    set((s) => ({
      game: next,
      decisions: [...s.decisions, decision],
      lastVerdict: decision,
      phase: next.status === 'betting' ? 'playing' : 'complete',
      heroEquity: null,
      frames: [...s.frames, toFrame(next)],
    }));

    if (next.status === 'betting') maybeComputeHeroEquity(get, set);
    else {
      persistHand(get);
      recordSession(next);
    }
  },

  botStep: () => {
    const { game } = get();
    if (!game || game.status !== 'betting') {
      return { acted: false, complete: !!game && game.status !== 'betting' };
    }
    const seat = game.seats[game.toAct];
    if (!seat || seat.isHero || !seat.holeCards) {
      return { acted: false, complete: false };
    }

    const opp = opponentsInHand(game, seat.id);
    const equity = quickEquity(seat.holeCards, game.board, opp, 800);
    const ctx = buildSeatContext(game, seat.id, equity);
    const decision = decideBotAction(ctx, seat.style ?? 'tag');
    const next = applyAction(game, { type: decision.type, amount: decision.amount });

    set((s) => ({
      game: next,
      phase: next.status === 'betting' ? 'playing' : 'complete',
      lastBotAction: { seatId: seat.id, type: decision.type, amount: decision.amount },
      frames: [...s.frames, toFrame(next)],
    }));

    if (next.status === 'betting' && next.seats[next.toAct]?.isHero) {
      maybeComputeHeroEquity(get, set);
    } else if (next.status !== 'betting') {
      persistHand(get);
      recordSession(next);
    }
    return { acted: true, complete: next.status !== 'betting' };
  },

  legal: () => {
    const { game } = get();
    if (!game) {
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
    return legalActions(game);
  },

  reset: () =>
    set({ game: null, phase: 'idle', decisions: [], heroEquity: null, lastVerdict: null }),
}));

/** Deal a hand from the durable session: carried-over stacks, skip busts. */
function dealFromSession(get: () => GameStore, set: (partial: Partial<GameStore>) => void): void {
  const session = useSession.getState();
  if (!session.active || session.status !== 'active' || session.players.length === 0) return;

  const seats: SeatConfig[] = session.players.map((p) => ({
    name: p.name,
    isHero: p.isHero,
    style: p.style,
    // Eliminated players are seated with 0 chips → the engine marks them empty.
    stack: p.eliminated ? 0 : p.stack,
  }));

  const game = createHand({
    seats,
    buttonIndex: session.buttonSeat,
    smallBlind: session.smallBlind,
    bigBlind: session.bigBlind,
    handNumber: session.handsCompleted + 1,
  });

  set({
    game,
    phase: 'playing',
    decisions: [],
    lastVerdict: null,
    lastBotAction: null,
    heroEquity: null,
    frames: [toFrame(game)],
  });

  maybeComputeHeroEquity(get, set);
}

/** Push a finished hand's final stacks into the session (eliminations, button). */
function recordSession(game: GameState): void {
  useSession
    .getState()
    .recordResult(game.seats.map((s) => ({ seat: s.id, stack: s.stack, isHero: s.isHero })));
}

/** Kick off an async hero-equity computation if it's the hero's turn. */
function maybeComputeHeroEquity(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
): void {
  const { game } = get();
  if (!game || game.status !== 'betting') return;
  const seat = game.seats[game.toAct];
  if (!seat || !seat.isHero || !seat.holeCards) return;

  const opp = opponentsInHand(game, seat.id);
  if (opp <= 0) {
    set({ heroEquity: { equity: 1, win: 1, tie: 0, lose: 0, samples: 0, exact: true } });
    return;
  }

  set({ equityLoading: true });
  const hole = seat.holeCards;
  const board = [...game.board];
  const handNumber = game.handNumber;
  const street = game.street;

  getEquityClient()
    .estimate({
      hero: hole,
      board,
      opponents: Array.from({ length: opp }, () => 'random' as const),
      iterations: 8000,
    })
    .then((res) => {
      // Ignore stale results if the situation changed.
      const g = get().game;
      if (!g || g.handNumber !== handNumber || g.street !== street || !g.seats[g.toAct]?.isHero) {
        set({ equityLoading: false });
        return;
      }
      set({ heroEquity: res, equityLoading: false });
    })
    .catch(() => set({ equityLoading: false }));
}

/** Assemble and persist the completed hand to local history. */
function persistHand(get: () => GameStore): void {
  const { game, frames, decisions } = get();
  if (!game || game.status !== 'complete' || frames.length === 0) return;

  const heroSeatModel = game.seats.find((s) => s.isHero);
  const first = frames[0]!;
  const heroFirst = first.seats.find((s) => s.isHero);
  // Hero total at deal (stack + posted blinds) is the starting stack.
  const startTotal = heroFirst ? heroFirst.stack + heroFirst.committed : 0;
  const heroNet = heroSeatModel ? heroSeatModel.stack - startTotal : 0;

  const record: HandRecord = {
    id: `h${game.handNumber}-${Date.now()}`,
    handNumber: game.handNumber,
    timestamp: Date.now(),
    bigBlind: game.bigBlind,
    heroHole: heroSeatModel?.holeCards
      ? [formatCard(heroSeatModel.holeCards[0]), formatCard(heroSeatModel.holeCards[1])]
      : null,
    heroNet,
    showdown: game.revealed.length > 1,
    frames,
    decisions,
  };
  saveHand(record);
}

export { currentPot };
