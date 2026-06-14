/**
 * Hand-history persistence.
 *
 * Each completed hand is stored locally as a sequence of trimmed game-state
 * frames (the deck is stripped) plus the hero's graded decisions, so a hand
 * can be replayed street by street with the coach's verdict on each hero
 * action. The list is capped to keep local storage small.
 */

import { storage, StorageKeys } from './storage';
import type { GameState } from '@/engine/gameEngine';
import type { RecordedDecision } from '@/store/gameStore';

/** A replay frame is a GameState snapshot with the deck removed. */
export type HandFrame = Omit<GameState, 'deck'> & { deck: [] };

export interface HandRecord {
  id: string;
  handNumber: number;
  timestamp: number;
  bigBlind: number;
  heroHole: [string, string] | null;
  /** Net chips won/lost by the hero this hand. */
  heroNet: number;
  /** True if it reached showdown (vs everyone folding). */
  showdown: boolean;
  frames: HandFrame[];
  decisions: RecordedDecision[];
}

const MAX_HANDS = 100;

export function loadHands(): HandRecord[] {
  return storage.get<HandRecord[]>(StorageKeys.handHistory, []);
}

export function saveHand(record: HandRecord): void {
  const all = loadHands();
  all.unshift(record);
  storage.set(StorageKeys.handHistory, all.slice(0, MAX_HANDS));
}

export function clearHands(): void {
  storage.remove(StorageKeys.handHistory);
}

/** Trim a live game state into a storable replay frame. */
export function toFrame(game: GameState): HandFrame {
  return JSON.parse(JSON.stringify({ ...game, deck: [] })) as HandFrame;
}

/** All hero decisions across history (for the stats dashboard). */
export function allDecisions(): RecordedDecision[] {
  return loadHands().flatMap((h) => h.decisions);
}
