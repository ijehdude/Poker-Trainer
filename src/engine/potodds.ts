/**
 * Pot-odds and expected-value math.
 *
 * All functions are pure and unit-tested. "Equity" here is the hero's
 * fractional chance of winning the pot (0–1). Amounts are in chips (or
 * big blinds — the unit is irrelevant as long as it is consistent).
 */

/**
 * Pot odds expressed as the break-even equity needed to call.
 *
 *   needed = callAmount / (potBeforeCall + callAmount)
 *
 * @param potBeforeCall chips already in the pot (including villain's bet)
 * @param callAmount    chips the hero must put in to call
 * @returns break-even equity in [0, 1]
 */
export function breakEvenEquity(potBeforeCall: number, callAmount: number): number {
  if (callAmount <= 0) return 0;
  return callAmount / (potBeforeCall + callAmount);
}

/** Pot odds as a ratio string, e.g. 3 (pot) : 1 (call) → "3.0 : 1". */
export function potOddsRatio(potBeforeCall: number, callAmount: number): string {
  if (callAmount <= 0) return '∞ : 1';
  const ratio = potBeforeCall / callAmount;
  return `${ratio.toFixed(1)} : 1`;
}

/**
 * EV of calling a bet, in chips, relative to folding (fold EV = 0).
 *
 *   EV_call = equity · (pot + call) − call
 *
 * `pot` is the pot before the hero's call (including villain's bet);
 * winning returns the whole pot plus the called amount.
 */
export function evOfCall(equity: number, pot: number, callAmount: number): number {
  return equity * (pot + callAmount) - callAmount;
}

/**
 * EV of a bet/raise using a simple fold-equity model:
 *
 *   EV_bet = foldProb · pot
 *          + (1 − foldProb) · [ equityWhenCalled · (pot + 2·bet) − bet ]
 *
 * When called, the final pot is the current pot plus both players' bets.
 * This is a teaching approximation (ignores future streets / raises) but
 * captures the core trade-off between fold equity and showdown equity.
 */
export function evOfBet(params: {
  pot: number;
  bet: number;
  foldProb: number;
  equityWhenCalled: number;
}): number {
  const { pot, bet, foldProb, equityWhenCalled } = params;
  const calledEV = equityWhenCalled * (pot + 2 * bet) - bet;
  return foldProb * pot + (1 - foldProb) * calledEV;
}

/** EV of checking: realize current equity over the current pot (no new money). */
export function evOfCheck(equity: number, pot: number): number {
  return equity * pot;
}

/**
 * Minimum fold frequency that makes a pure bluff break even:
 *   α = bet / (bet + pot)
 */
export function bluffBreakEven(pot: number, bet: number): number {
  if (bet <= 0) return 0;
  return bet / (bet + pot);
}

/** Convert an equity (0–1) to "X-to-1" odds against, for explanations. */
export function equityToOddsAgainst(equity: number): string {
  if (equity <= 0) return '∞ : 1';
  if (equity >= 1) return '0 : 1';
  const against = (1 - equity) / equity;
  return `${against.toFixed(1)} : 1`;
}
