/**
 * Coach factory + adapters.
 *
 * `getCoach(mode)` returns the active provider. The Cloud coach gracefully
 * degrades to Offline whenever it can't produce a result, so callers never
 * need to special-case missing keys or network failures.
 */

import type { CoachProvider, CoachInput } from './types';
import { offlineCoach } from './offline';
import { cloudCoach } from './cloud';
import type { RecordedDecision } from '@/store/gameStore';

export type { CoachProvider, CoachInput, CoachFeedback, ChatMessage } from './types';
export { offlineCoach } from './offline';
export { analyzeLeaks } from './leaks';
export type { Leak, LeakReport } from './leaks';

export function getCoach(mode: 'offline' | 'cloud'): CoachProvider {
  return mode === 'cloud' ? cloudCoach : offlineCoach;
}

/** Convert a recorded hero decision into the coach's structured input. */
export function decisionToCoachInput(d: RecordedDecision): CoachInput {
  return {
    street: d.street,
    position: d.factors.position,
    handClass: d.factors.handClass,
    holeCards: d.holeCards,
    board: d.board,
    equity: d.factors.equity,
    breakEven: d.factors.breakEven,
    potOdds: d.factors.potOdds,
    potContext: d.factors.potContext,
    boardTexture: d.factors.boardTexture,
    rangeAdvantage: d.factors.rangeAdvantage,
    inOpeningRange: d.factors.inOpeningRange,
    strengthPercentile: d.factors.strengthPercentile,
    action: d.action,
    recommended: d.recommended,
    verdict: d.verdict.verdict,
    evLossBB: d.verdict.evLossBB,
    bigBlind: d.bigBlind,
    toCall: d.toCall,
    pot: d.pot,
  };
}
