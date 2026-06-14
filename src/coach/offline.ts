/**
 * Offline coach — a deterministic, rule-and-template explanation engine.
 *
 * This is the DEFAULT coach and is designed to stand entirely on its own
 * with zero API access. It consumes the structured solver output and
 * produces specific, varied feedback that cites the actual numbers: pot
 * odds vs equity, position, board texture, range advantage, and the EV
 * gap between what you did and the best line. It also names the strategic
 * concept at play so the feedback teaches, not just grades.
 */

import type { CoachProvider, CoachInput, CoachFeedback, ChatMessage } from './types';
import { POSITION_LABELS } from '@/engine/ranges';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const verb: Record<string, string> = {
  fold: 'folding',
  check: 'checking',
  call: 'calling',
  bet: 'betting',
  raise: 'raising',
};
const noun: Record<string, string> = {
  fold: 'a fold',
  check: 'a check',
  call: 'a call',
  bet: 'a bet',
  raise: 'a raise',
};

/** Deterministic small hash → pick a template variant (keeps feedback varied). */
function pick<T>(seed: string, options: T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return options[Math.abs(h) % options.length]!;
}

function headline(input: CoachInput): string {
  const a = verb[input.action.type] ?? input.action.type;
  const rec = noun[input.recommended.type] ?? input.recommended.type;
  const same = input.action.type === input.recommended.type;
  const seed = input.handClass + input.street + input.action.type;

  switch (input.verdict) {
    case 'optimal':
      return pick(seed, [
        `Textbook — ${a} is the best play here.`,
        `Nailed it. ${cap(a)} is exactly right.`,
        `Optimal line. ${cap(a)} tops the chart here.`,
      ]);
    case 'good':
      return same
        ? pick(seed, [
            `Solid — ${a} is right, just off the very top size.`,
            `Good. ${cap(a)} is the line.`,
          ])
        : `Good — ${a} is fine, though ${rec} edges it slightly.`;
    case 'questionable':
      return `Marginal — ${a} is defensible, but ${rec} is the stronger play.`;
    case 'mistake':
      return `${cap(a)} is a leak here — ${rec} is clearly better.`;
    case 'blunder':
      return `Costly — ${a} gives up about ${input.evLossBB.toFixed(1)}bb versus ${rec}.`;
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function potOddsLine(input: CoachInput): string | null {
  if (input.toCall <= 0) return null;
  const need = pct(input.breakEven);
  const have = pct(input.equity);
  const enough = input.equity >= input.breakEven;
  const margin = Math.abs(input.equity - input.breakEven);
  const closeness = margin < 0.04 ? 'a borderline' : enough ? 'a clear' : 'a clear';
  if (enough) {
    return `You're getting ${input.potOdds}, so you need about ${need} equity to continue — your hand has ~${have}. That's ${closeness} call by the math.`;
  }
  return `You're getting ${input.potOdds}, which needs ~${need} equity. You only have ~${have}, so the price isn't there — ${closeness} fold spot.`;
}

function preflopRangeLine(input: CoachInput): string | null {
  if (input.street !== 'preflop' || input.potContext !== 'unopened') return null;
  const posName = POSITION_LABELS[input.position];
  const widthPct = pct(input.strengthPercentile);
  if (input.inOpeningRange) {
    return `From the ${posName}, ${input.handClass} is comfortably inside a standard opening range — it's roughly a top-${widthPct} hand, so raising first in is automatic.`;
  }
  return `From the ${posName}, ${input.handClass} sits outside a disciplined opening range (around a top-${widthPct} hand). Open-folding keeps you out of dominated spots.`;
}

function boardLine(input: CoachInput): string | null {
  if (input.board.length < 3) return null;
  const t = input.boardTexture;
  const bits: string[] = [];
  if (t.monotone) bits.push('all one suit');
  else if (t.twoTone) bits.push('two-tone with a flush draw out');
  if (t.connected) bits.push('connected, so straights are live');
  if (t.paired) bits.push('paired, which caps a lot of one-pair hands');
  const texture = t.wetness > 0.55 ? 'wet' : t.wetness > 0.3 ? 'semi-wet' : 'dry';
  const detail = bits.length ? ` (${bits.join('; ')})` : '';
  if (texture === 'dry') {
    return `The board is dry${detail} — ranges don't shift much, so small, high-frequency bets do the work.`;
  }
  return `The board is ${texture}${detail} — equities run closer together, so be more selective and size up with your strong hands.`;
}

function rangeAdvLine(input: CoachInput): string | null {
  if (input.board.length < 3) return null;
  if (input.rangeAdvantage > 0.25)
    return `You hold the range advantage here, which supports applying pressure.`;
  if (input.rangeAdvantage < -0.25)
    return `Your range is at a disadvantage on this texture — lean toward checking and calling rather than betting.`;
  return null;
}

function evLine(input: CoachInput): string | null {
  if (input.action.type === input.recommended.type && input.evLossBB < 0.05) return null;
  if (input.evLossBB < 0.05) return `EV-wise this is a wash — multiple lines are basically equal.`;
  const rec = noun[input.recommended.type] ?? input.recommended.type;
  return `In EV terms, ${rec} is worth about ${input.evLossBB.toFixed(2)}bb more than what you did.`;
}

function conceptFor(input: CoachInput): string | undefined {
  if (input.toCall > 0) return 'Pot odds & equity';
  if (input.street === 'preflop') return 'Preflop ranges & position';
  if (input.boardTexture.wetness > 0.5) return 'Board texture & sizing';
  return 'Range advantage & aggression';
}

function explainOffline(input: CoachInput): CoachFeedback {
  const detail = [
    preflopRangeLine(input),
    potOddsLine(input),
    boardLine(input),
    rangeAdvLine(input),
    evLine(input),
  ].filter((x): x is string => Boolean(x));

  // Always give at least one substantive line.
  if (detail.length === 0) {
    detail.push(
      `With ~${pct(input.equity)} equity ${input.toCall > 0 ? 'facing this bet' : 'here'}, ${verb[input.recommended.type]} keeps your strategy balanced.`,
    );
  }

  return {
    headline: headline(input),
    detail,
    concept: conceptFor(input),
    source: 'offline',
  };
}

/** A bounded, heuristic Q&A for the offline coach (no network). */
function offlineChat(messages: ChatMessage[], context?: CoachInput): string {
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? '';
  if (!context) {
    return "I coach from the last decision you made. Play or replay a hand, then ask me about it — I'll explain the pot odds, ranges, and EV. (Switch on the Cloud coach for open-ended questions.)";
  }
  if (last.includes('odds') || last.includes('equity')) {
    return potOddsLine(context) ?? `You had about ${pct(context.equity)} equity in that spot.`;
  }
  if (last.includes('position')) {
    return `You were in the ${POSITION_LABELS[context.position]}. Position lets you act last on later streets, so you can play more hands and control the pot size.`;
  }
  if (last.includes('board') || last.includes('texture')) {
    return boardLine(context) ?? 'Preflop — no board yet.';
  }
  if (last.includes('why')) {
    return explainOffline(context).detail.join(' ');
  }
  return `For ${context.handClass} from the ${POSITION_LABELS[context.position]}, the recommended line was ${verb[context.recommended.type]}. ${explainOffline(context).headline} Turn on the Cloud coach for deeper, open-ended discussion.`;
}

export const offlineCoach: CoachProvider = {
  id: 'offline',
  label: 'Offline',
  explain: (input) => Promise.resolve(explainOffline(input)),
  chat: (messages, context) => Promise.resolve(offlineChat(messages, context)),
};

export { explainOffline, potOddsLine };
