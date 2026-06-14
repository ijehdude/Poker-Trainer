/**
 * Equity client — a thin promise-based wrapper around the equity Web
 * Worker, with a synchronous main-thread fallback when workers aren't
 * available (SSR, tests, or older browsers).
 *
 * Requests are coalesced by id; the latest request for a given "slot" can
 * be awaited without blocking the UI thread on the simulation itself.
 */

import { formatCard, formatCards } from './cards';
import { estimateEquity } from './equity';
import type { Card } from './types';
import type { HoleCards } from './equity';
import type { EquityRequest, EquityResponse } from '@/workers/equity.worker';

export type OpponentSpec = 'random' | HoleCards[];

export interface EquityQuery {
  hero: HoleCards;
  board: readonly Card[];
  opponents: OpponentSpec[];
  iterations?: number;
}

export interface EquityClient {
  estimate(query: EquityQuery): Promise<EquityResponse>;
  dispose(): void;
}

function serialize(query: EquityQuery, id: number): EquityRequest {
  return {
    id,
    hero: [formatCard(query.hero[0]), formatCard(query.hero[1])],
    board: query.board.map(formatCard),
    opponents: query.opponents.map((o) =>
      o === 'random' ? 'random' : o.map((c) => formatCards(c).split(' ') as [string, string]),
    ),
    iterations: query.iterations,
  };
}

/** Main-thread fallback (used in tests/SSR). Runs synchronously. */
function runInline(query: EquityQuery, id: number): EquityResponse {
  const result = estimateEquity({
    hero: query.hero,
    board: query.board,
    opponents: query.opponents.map((o) => (o === 'random' ? 'random' : { combos: o })),
    iterations: query.iterations,
  });
  return { id, ...result };
}

class WorkerEquityClient implements EquityClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, (r: EquityResponse) => void>();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (e: MessageEvent<EquityResponse>) => {
      const resolve = this.pending.get(e.data.id);
      if (resolve) {
        this.pending.delete(e.data.id);
        resolve(e.data);
      }
    };
  }

  estimate(query: EquityQuery): Promise<EquityResponse> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker.postMessage(serialize(query, id));
    });
  }

  dispose(): void {
    this.worker.terminate();
    this.pending.clear();
  }
}

class InlineEquityClient implements EquityClient {
  private nextId = 1;
  estimate(query: EquityQuery): Promise<EquityResponse> {
    return Promise.resolve(runInline(query, this.nextId++));
  }
  dispose(): void {}
}

/**
 * Create an equity client. Spawns a Web Worker in the browser; otherwise
 * returns the synchronous inline client. Safe to call once and reuse.
 */
export function createEquityClient(): EquityClient {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('../workers/equity.worker.ts', import.meta.url), {
        type: 'module',
      });
      return new WorkerEquityClient(worker);
    } catch {
      // Fall through to inline if worker construction fails.
    }
  }
  return new InlineEquityClient();
}
