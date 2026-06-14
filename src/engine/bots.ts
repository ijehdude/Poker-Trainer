/**
 * AI opponent profiles.
 *
 * Bots make decisions through the SAME equity/strategy engine the coach
 * uses, then bias the result by a style profile. Each style nudges three
 * levers: how wide they play (looseness), how often they bet/raise
 * (aggression), and how sticky they are facing bets (calling tendency).
 * The result is plausible, recognizably different opponents — not random.
 */

import type { ActionType } from './types';
import { evaluateDecision, type DecisionContext } from './strategy';
import { handStrengthPercentile, RFI_PERCENT, comboToHandClass } from './ranges';
import { breakEvenEquity } from './potodds';

export type BotStyle = 'nit' | 'tag' | 'lag' | 'station' | 'balanced';

export interface BotProfile {
  id: BotStyle;
  name: string;
  blurb: string;
  /** Multiplier on opening/continuing width. >1 looser, <1 tighter. */
  looseness: number;
  /** 0 passive … 1 hyper-aggressive (bet/raise propensity). */
  aggression: number;
  /** Probability of firing a pure bluff when checked to with weak equity. */
  bluff: number;
  /** Extra equity slack when calling (stations call with worse odds). */
  callSlack: number;
}

export const BOT_PROFILES: Record<BotStyle, BotProfile> = {
  nit: {
    id: 'nit',
    name: 'The Nit',
    blurb: 'Tight & passive. Folds a lot, only puts chips in with strong hands.',
    looseness: 0.6,
    aggression: 0.2,
    bluff: 0.03,
    callSlack: -0.03,
  },
  tag: {
    id: 'tag',
    name: 'TAG',
    blurb: 'Tight-aggressive. Solid ranges, bets and raises with the lead.',
    looseness: 0.9,
    aggression: 0.6,
    bluff: 0.12,
    callSlack: 0,
  },
  lag: {
    id: 'lag',
    name: 'LAG',
    blurb: 'Loose-aggressive. Wide ranges, relentless pressure and bluffs.',
    looseness: 1.5,
    aggression: 0.85,
    bluff: 0.3,
    callSlack: 0.02,
  },
  station: {
    id: 'station',
    name: 'Calling Station',
    blurb: 'Loose-passive. Calls far too much, rarely folds, seldom raises.',
    looseness: 1.6,
    aggression: 0.18,
    bluff: 0.04,
    callSlack: 0.12,
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    blurb: 'GTO-ish. Mixes value and bluffs at sensible frequencies.',
    looseness: 1.0,
    aggression: 0.55,
    bluff: 0.18,
    callSlack: 0,
  },
};

export interface BotDecision {
  type: ActionType;
  amount: number;
}

/**
 * Decide a bot's action. `ctx.equity` should be supplied (a fast Monte
 * Carlo estimate is fine) for postflop / facing-bet spots.
 */
export function decideBotAction(
  ctx: DecisionContext,
  style: BotStyle,
  rng: () => number = Math.random,
): BotDecision {
  const profile = BOT_PROFILES[style];

  // Preflop, unopened: open by a style-adjusted range cutoff.
  if (ctx.street === 'preflop' && ctx.potContext === 'unopened' && ctx.toCall <= ctx.bigBlind) {
    const handClass = comboToHandClass(ctx.heroHole[0], ctx.heroHole[1]);
    const pct = handStrengthPercentile(handClass);
    const cutoff = Math.min(0.92, RFI_PERCENT[ctx.position] * profile.looseness);
    if (pct <= cutoff) {
      // Mostly raise; passive styles sometimes limp.
      const wantsRaise = rng() < 0.55 + profile.aggression * 0.4;
      if (wantsRaise) return { type: 'raise', amount: +(2.5 * ctx.bigBlind).toFixed(2) };
      return { type: 'call', amount: ctx.bigBlind };
    }
    return { type: 'fold', amount: 0 };
  }

  const equity = ctx.equity ?? 0;
  const breakEven = breakEvenEquity(ctx.pot, ctx.toCall);
  const solution = evaluateDecision(ctx);

  if (ctx.toCall > 0) {
    // Facing a bet. Continue if equity beats a style-adjusted threshold.
    const threshold = breakEven - profile.callSlack;
    if (equity < threshold && rng() > profile.bluff * 0.3) {
      return { type: 'fold', amount: 0 };
    }
    // Raise sometimes when strong & aggressive, or as an occasional bluff.
    const raise = solution.actions.find((a) => a.type === 'raise');
    const wantRaise =
      raise &&
      ((equity > 0.6 && rng() < profile.aggression) || (equity < 0.4 && rng() < profile.bluff));
    if (wantRaise && raise) return { type: 'raise', amount: raise.amount };
    return { type: 'call', amount: ctx.toCall };
  }

  // Checked to the bot: bet for value / as a bluff, else check.
  const bet = solution.actions.find((a) => a.type === 'bet');
  const valueBet = equity > 0.58 && rng() < 0.4 + profile.aggression * 0.6;
  const bluffBet = equity < 0.4 && rng() < profile.bluff;
  if (bet && (valueBet || bluffBet)) return { type: 'bet', amount: bet.amount };
  return { type: 'check', amount: 0 };
}
