/**
 * Drill engine.
 *
 * Loads the data-driven drill library and scores answers. Each drill has a
 * curated correct answer; we additionally run the live strategy/equity
 * engine so the same coaching surfaces (equity, pot odds, EV) appear in
 * drill mode as in play mode.
 */

import drillData from '@/data/drills.json';
import type { ActionType } from '@/engine/types';
import type { Position } from '@/engine/ranges';
import { parseCard } from '@/engine/cards';
import { estimateEquity, type HoleCards } from '@/engine/equity';
import { evaluateDecision, type DecisionContext, type StrategySolution } from '@/engine/strategy';

export interface DrillCategory {
  id: string;
  name: string;
  blurb: string;
}

export interface Drill {
  id: string;
  category: string;
  difficulty: number;
  position: Position;
  hole: [string, string];
  board: string[];
  potContext: 'unopened' | 'facing-bet';
  pot: number;
  toCall: number;
  stackBB: number;
  prompt: string;
  answer: ActionType;
  options: ActionType[];
  explain: string;
}

interface DrillFile {
  categories: DrillCategory[];
  drills: Drill[];
}

const data = drillData as DrillFile;

export function getCategories(): DrillCategory[] {
  return data.categories;
}

export function getDrills(categoryId?: string): Drill[] {
  const all = data.drills;
  return categoryId ? all.filter((d) => d.category === categoryId) : all;
}

export function getCategory(id: string): DrillCategory | undefined {
  return data.categories.find((c) => c.id === id);
}

export interface DrillResult {
  correct: boolean;
  chosen: ActionType;
  answer: ActionType;
  explain: string;
  equity: number | null;
  solution: StrategySolution;
}

/** Score a chosen action for a drill, computing live equity where relevant. */
export function scoreDrill(drill: Drill, chosen: ActionType): DrillResult {
  const hole: HoleCards = [parseCard(drill.hole[0]), parseCard(drill.hole[1])];
  const board = drill.board.map(parseCard);

  let equity: number | null = null;
  if (board.length > 0 || drill.potContext === 'facing-bet') {
    equity = estimateEquity({
      hero: hole,
      board,
      opponents: ['random'],
      iterations: 4000,
    }).equity;
  }

  const ctx: DecisionContext = {
    street: streetFor(board.length),
    heroHole: hole,
    board,
    position: drill.position,
    pot: drill.pot,
    toCall: drill.toCall,
    bigBlind: 1,
    heroStack: drill.stackBB,
    numOpponents: 1,
    potContext: drill.potContext,
    equity: equity ?? undefined,
  };
  const solution = evaluateDecision(ctx);

  return {
    correct: chosen === drill.answer,
    chosen,
    answer: drill.answer,
    explain: drill.explain,
    equity,
    solution,
  };
}

function streetFor(boardLen: number): DecisionContext['street'] {
  if (boardLen === 0) return 'preflop';
  if (boardLen === 3) return 'flop';
  if (boardLen === 4) return 'turn';
  return 'river';
}
