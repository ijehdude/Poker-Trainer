/**
 * Coach abstraction.
 *
 * Both the Offline coach (deterministic, template-driven) and the Cloud
 * coach (DeepSeek) implement `CoachProvider`, consuming the SAME
 * structured solver output (`CoachInput`). This keeps the two
 * interchangeable and lets the app fall back to offline at any time.
 */

import type { ActionType, Street } from '@/engine/types';
import type { Position } from '@/engine/ranges';
import type { BoardTexture } from '@/engine/boardTexture';
import type { Verdict } from '@/engine/verdict';

/** Structured description of a single decision — the coach's input. */
export interface CoachInput {
  street: Street;
  position: Position;
  handClass: string;
  holeCards: [string, string];
  board: string[];
  equity: number;
  breakEven: number;
  potOdds: string;
  potContext: 'unopened' | 'facing-bet';
  boardTexture: BoardTexture;
  rangeAdvantage: number;
  inOpeningRange: boolean;
  strengthPercentile: number;
  action: { type: ActionType; amount: number };
  recommended: { type: ActionType; amount: number };
  verdict: Verdict;
  evLossBB: number;
  bigBlind: number;
  toCall: number;
  pot: number;
}

export interface CoachFeedback {
  /** One-line summary of the decision. */
  headline: string;
  /** Ordered rationale points in plain language. */
  detail: string[];
  /** Named strategic concept, if one applies (e.g. "Pot odds"). */
  concept?: string;
  /** Which provider produced this. */
  source: 'offline' | 'cloud';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CoachProvider {
  id: 'offline' | 'cloud';
  label: string;
  explain(input: CoachInput): Promise<CoachFeedback>;
  /** Open-ended Q&A. Offline provides a limited heuristic answer. */
  chat(messages: ChatMessage[], context?: CoachInput): Promise<string>;
}
