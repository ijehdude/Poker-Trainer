/**
 * GTO-approximate strategy engine.
 *
 * ⚠️ This is an *honest heuristic*, not a CFR solver. The equity and
 * pot-odds math underneath are exact; the action recommendation blends
 * that math with curated preflop ranges, position, board texture, and a
 * simple fold-equity model. It outputs, for a given decision:
 *
 *   - every legal action with an EV estimate (chips) and a play frequency
 *   - the recommended action(s)
 *   - the structured `factors` the coach turns into plain-language advice
 *
 * The verdict layer (`verdict.ts`) then grades whatever the player did by
 * its EV loss versus the best action here. Assumptions are documented in
 * the README under "Engine assumptions & limitations".
 */

import type { ActionType, Card, Street } from './types';
import type { HoleCards } from './equity';
import {
  comboToHandClass,
  handStrengthPercentile,
  isOpen,
  RFI_PERCENT,
  type Position,
} from './ranges';
import { analyzeBoard, type BoardTexture } from './boardTexture';
import { breakEvenEquity, evOfBet, evOfCall, evOfCheck, potOddsRatio } from './potodds';

/** Whether the pot is unopened (hero can open) or hero faces a bet/raise. */
export type PotContext = 'unopened' | 'facing-bet';

export interface DecisionContext {
  street: Street;
  heroHole: HoleCards;
  board: readonly Card[];
  position: Position;
  /** Chips in the pot before the hero acts (includes any bet to call). */
  pot: number;
  /** Chips the hero must add to call (0 ⇒ hero can check). */
  toCall: number;
  bigBlind: number;
  heroStack: number;
  /** Number of opponents still in the hand. */
  numOpponents: number;
  potContext: PotContext;
  /**
   * Hero equity vs the live field (0–1). Required postflop and when facing
   * a bet; for unopened preflop spots the range model is used instead and
   * this may be omitted.
   */
  equity?: number;
}

export interface ActionOption {
  type: ActionType;
  /** Total chips the action puts in on this street (0 for fold/check). */
  amount: number;
  /** Estimated EV in chips, on a common baseline (folding = 0 when facing a bet). */
  ev: number;
  /** Recommended play frequency for this action (0–1) under the approx strategy. */
  frequency: number;
  label: string;
}

export interface StrategyFactors {
  street: Street;
  position: Position;
  handClass: string;
  /** 0 strongest … 1 weakest (preflop percentile). */
  strengthPercentile: number;
  equity: number;
  breakEven: number;
  potOdds: string;
  potContext: PotContext;
  boardTexture: BoardTexture;
  /** Coarse range-advantage estimate for hero, −1 … +1. */
  rangeAdvantage: number;
  inOpeningRange: boolean;
}

export interface StrategySolution {
  actions: ActionOption[];
  recommended: ActionOption;
  bestEV: number;
  factors: StrategyFactors;
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/**
 * Estimate how often a single opponent folds to a bet of `bet` into `pot`,
 * scaled for multiway pots. Deliberately simple and slightly conservative.
 */
function foldEquity(bet: number, pot: number, numOpponents: number, texture: BoardTexture): number {
  const sizeRatio = pot > 0 ? bet / pot : 1;
  // Bigger bets fold out more; cap the marginal effect.
  let f = 0.28 + 0.32 * clamp(sizeRatio, 0, 1.5);
  // Wetter boards continue more (less folding).
  f -= texture.wetness * 0.12;
  // Each extra opponent shrinks total fold-through-everyone probability.
  f = Math.pow(clamp(f, 0.05, 0.85), Math.max(1, numOpponents));
  return clamp(f, 0, 0.9);
}

/** Coarse range-advantage proxy from hero strength and board height. */
function rangeAdvantage(strengthPct: number, texture: BoardTexture, position: Position): number {
  // Stronger hands + in-position + high boards favor the (raising) hero.
  const handTerm = (0.5 - strengthPct) * 1.4; // −0.7 … +0.7
  const ipBonus = position === 'BTN' || position === 'CO' ? 0.1 : 0;
  const boardTerm = texture.highCard >= 12 ? 0.1 : texture.highCard <= 8 ? -0.05 : 0;
  return clamp(handTerm + ipBonus + boardTerm, -1, 1);
}

/**
 * Preflop unopened (folded to hero): use the curated opening ranges.
 * EV is modeled from how deep the hand sits inside (or outside) the range,
 * which yields sensible verdicts (opening trash from UTG is a blunder;
 * opening a hand just off-range is only questionable).
 */
function solveUnopenedPreflop(ctx: DecisionContext, factors: StrategyFactors): StrategySolution {
  const bb = ctx.bigBlind;
  const cutoff = RFI_PERCENT[ctx.position];
  const margin = cutoff - factors.strengthPercentile; // >0 ⇒ inside range
  const open = isOpen(ctx.position, factors.handClass);

  // Scale margin into bb EV. ~8bb per unit of percentile margin, capped.
  const raiseEV = clamp(margin * 8, -6, 4) * bb;
  // Limping is generally dominated; mostly worse than the better of raise/fold.
  const limpEV = open ? raiseEV - 0.6 * bb : Math.min(0, raiseEV) - 0.2 * bb;
  const foldEV = 0;

  const raiseAmount = +(Math.max(2, 2.5) * bb).toFixed(2); // standard 2.5bb open
  const actions: ActionOption[] = [
    { type: 'fold', amount: 0, ev: foldEV, frequency: open ? 0 : 1, label: 'Fold' },
    { type: 'call', amount: bb, ev: limpEV, frequency: 0, label: 'Limp' },
    {
      type: 'raise',
      amount: raiseAmount,
      ev: raiseEV,
      frequency: open ? 1 : 0,
      label: `Raise ${(raiseAmount / bb).toFixed(1)}bb`,
    },
  ];
  return finalize(actions, factors);
}

/** Preflop facing a raise, or any postflop decision: equity + pot-odds driven. */
function solveWithEquity(ctx: DecisionContext, factors: StrategyFactors): StrategySolution {
  const { pot, toCall, bigBlind: bb, numOpponents } = ctx;
  const equity = factors.equity;
  const texture = factors.boardTexture;

  const actions: ActionOption[] = [];

  if (toCall > 0) {
    // Facing a bet: fold / call / raise. Baseline: fold = 0.
    const callEV = evOfCall(equity, pot, toCall);
    const raiseTo = Math.min(ctx.heroStack, Math.max(toCall * 3, pot * 0.75 + toCall));
    const betPortion = raiseTo - toCall; // extra chips beyond the call
    const raiseEV = evOfBet({
      pot: pot,
      bet: raiseTo,
      foldProb: foldEquity(betPortion, pot, numOpponents, texture),
      equityWhenCalled: clamp(equity - 0.05),
    });

    // Frequencies: value-raise strong equity, call medium, fold weak.
    const raiseFreq = equity > 0.62 ? 0.8 : equity > 0.5 && texture.wetness < 0.5 ? 0.25 : 0;
    const callFreq = callEV >= 0 && equity > factors.breakEven ? 1 - raiseFreq : 0;
    actions.push(
      {
        type: 'fold',
        amount: 0,
        ev: 0,
        frequency: callFreq + raiseFreq > 0 ? 0 : 1,
        label: 'Fold',
      },
      {
        type: 'call',
        amount: toCall,
        ev: callEV,
        frequency: callFreq,
        label: `Call ${toCall.toFixed(0)}`,
      },
      {
        type: 'raise',
        amount: +raiseTo.toFixed(2),
        ev: raiseEV,
        frequency: raiseFreq,
        label: `Raise to ${raiseTo.toFixed(0)}`,
      },
    );
  } else {
    // Checked to hero: check / bet.
    const checkEV = evOfCheck(equity, pot);
    const bet = Math.min(ctx.heroStack, Math.max(bb, pot * 0.66));
    const betEV = evOfBet({
      pot,
      bet,
      foldProb: foldEquity(bet, pot, numOpponents, texture),
      equityWhenCalled: clamp(equity - 0.04),
    });
    // Bet strong hands for value, plus some equity-denial / semi-bluffs.
    const betFreq =
      equity > 0.6
        ? 0.85
        : equity < 0.35 && texture.wetness < 0.5
          ? 0.35
          : equity < 0.5
            ? 0.2
            : 0.6;
    actions.push(
      { type: 'check', amount: 0, ev: checkEV, frequency: 1 - betFreq, label: 'Check' },
      {
        type: 'bet',
        amount: +bet.toFixed(2),
        ev: betEV,
        frequency: betFreq,
        label: `Bet ${bet.toFixed(0)}`,
      },
    );
  }

  return finalize(actions, factors);
}

function finalize(actions: ActionOption[], factors: StrategyFactors): StrategySolution {
  let best = actions[0]!;
  for (const a of actions) if (a.ev > best.ev) best = a;
  return { actions, recommended: best, bestEV: best.ev, factors };
}

/**
 * Main entry point: produce the approximate-optimal solution for a decision.
 */
export function evaluateDecision(ctx: DecisionContext): StrategySolution {
  const handClass = comboToHandClass(ctx.heroHole[0], ctx.heroHole[1]);
  const strengthPercentile = handStrengthPercentile(handClass);
  const boardTexture = analyzeBoard(ctx.board);
  const equity = ctx.equity ?? 0;
  const breakEven = breakEvenEquity(ctx.pot, ctx.toCall);

  const factors: StrategyFactors = {
    street: ctx.street,
    position: ctx.position,
    handClass,
    strengthPercentile,
    equity,
    breakEven,
    potOdds: potOddsRatio(ctx.pot, ctx.toCall),
    potContext: ctx.potContext,
    boardTexture,
    rangeAdvantage: rangeAdvantage(strengthPercentile, boardTexture, ctx.position),
    inOpeningRange: isOpen(ctx.position, handClass),
  };

  if (ctx.street === 'preflop' && ctx.potContext === 'unopened' && ctx.toCall <= ctx.bigBlind) {
    return solveUnopenedPreflop(ctx, factors);
  }
  return solveWithEquity(ctx, factors);
}

/**
 * Find the EV the player's chosen action achieved within a solution. Matches
 * by action type, and for sized actions picks the closest amount.
 */
export function evOfChosen(
  solution: StrategySolution,
  chosenType: ActionType,
  chosenAmount = 0,
): number {
  const sameType = solution.actions.filter((a) => a.type === chosenType);
  if (sameType.length === 0) {
    // Player took an action the model didn't enumerate (e.g. odd size):
    // approximate with the worst enumerated action as a floor.
    return Math.min(...solution.actions.map((a) => a.ev));
  }
  let best = sameType[0]!;
  let bestDelta = Math.abs(best.amount - chosenAmount);
  for (const a of sameType) {
    const d = Math.abs(a.amount - chosenAmount);
    if (d < bestDelta) {
      best = a;
      bestDelta = d;
    }
  }
  return best.ev;
}
