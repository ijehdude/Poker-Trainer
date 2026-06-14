/**
 * Verdict bucketing.
 *
 * Grades the action the player actually took by how much expected value
 * it gave up versus the best available action. EV loss is measured in big
 * blinds (a scale-free unit that works across stack sizes and streets).
 *
 * Thresholds are deliberately exported and centralized so the UI, the
 * coach, and the tests all agree on the boundaries.
 */

export type Verdict = 'optimal' | 'good' | 'questionable' | 'mistake' | 'blunder';

export const VERDICTS: readonly Verdict[] = [
  'optimal',
  'good',
  'questionable',
  'mistake',
  'blunder',
];

/** Upper bound (inclusive) of EV loss in big blinds for each non-blunder bucket. */
export const VERDICT_THRESHOLDS_BB: Record<Exclude<Verdict, 'blunder'>, number> = {
  optimal: 0.05,
  good: 0.3,
  questionable: 1.0,
  mistake: 3.0,
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  optimal: 'Optimal',
  good: 'Good',
  questionable: 'Questionable',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

/** Short, color-blind-safe glyph cue paired with each verdict (never color alone). */
export const VERDICT_GLYPH: Record<Verdict, string> = {
  optimal: '★',
  good: '✓',
  questionable: '≈',
  mistake: '!',
  blunder: '✕',
};

export interface VerdictResult {
  verdict: Verdict;
  label: string;
  /** EV given up vs the best action, in chips (≥ 0). */
  evLoss: number;
  /** EV given up vs the best action, in big blinds (≥ 0). */
  evLossBB: number;
}

/**
 * Bucket an action by its EV loss.
 *
 * @param chosenEV  EV of the action the player took (chips)
 * @param bestEV    EV of the best available action (chips)
 * @param bigBlind  size of one big blind (chips), for normalization
 */
export function gradeAction(chosenEV: number, bestEV: number, bigBlind: number): VerdictResult {
  const evLoss = Math.max(0, bestEV - chosenEV);
  const bb = bigBlind > 0 ? bigBlind : 1;
  const evLossBB = evLoss / bb;

  let verdict: Verdict;
  if (evLossBB <= VERDICT_THRESHOLDS_BB.optimal) verdict = 'optimal';
  else if (evLossBB <= VERDICT_THRESHOLDS_BB.good) verdict = 'good';
  else if (evLossBB <= VERDICT_THRESHOLDS_BB.questionable) verdict = 'questionable';
  else if (evLossBB <= VERDICT_THRESHOLDS_BB.mistake) verdict = 'mistake';
  else verdict = 'blunder';

  return { verdict, label: VERDICT_LABELS[verdict], evLoss, evLossBB };
}

/** Numeric severity 0–4 (optimal→blunder), handy for trends and sorting. */
export function verdictSeverity(verdict: Verdict): number {
  return VERDICTS.indexOf(verdict);
}
