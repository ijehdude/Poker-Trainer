/**
 * Session store — the DURABLE table state that survives hand to hand and
 * across page refreshes (persisted to localStorage).
 *
 * Holds each player's carried-over stack, who's been eliminated, the dealer
 * button, hand count, and the end-of-session status. The transient in-hand
 * `GameState` lives in `gameStore` and is NOT persisted; this store is the
 * source of truth for stacks between hands.
 *
 * Resetting happens ONLY on "new game" (`startNewGame`), which also wipes the
 * session hand-history so leak tracking is per-session.
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, StorageKeys } from '@/lib/storage';
import { clearHands } from '@/lib/history';
import type { BotStyle } from '@/engine/bots';

export type SessionStatus = 'active' | 'table-won' | 'hero-busted';

export interface SessionPlayer {
  seat: number; // 0..5 (hero is 0)
  name: string;
  style: BotStyle | null;
  isHero: boolean;
  stack: number;
  eliminated: boolean;
}

export interface NewGameConfig {
  styles: BotStyle[]; // 5 villains
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
}

interface SessionStore {
  active: boolean;
  players: SessionPlayer[];
  buttonSeat: number;
  handsCompleted: number;
  status: SessionStatus;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  /** Name of the table winner once the session ends. */
  winnerName: string | null;

  startNewGame: (cfg: NewGameConfig) => void;
  /** Sync stacks from a completed hand, eliminate busts, advance the button. */
  recordResult: (seats: { seat: number; stack: number; isHero: boolean }[]) => void;
}

const STYLE_NAMES: Record<BotStyle, string[]> = {
  nit: ['Rocky', 'Stone', 'Vault'],
  tag: ['Ace', 'Sterling', 'Mason'],
  lag: ['Blaze', 'Maverick', 'Riot'],
  station: ['Sticky', 'Dax', 'Penny'],
  balanced: ['Nova', 'Sage', 'Pixel'],
};

function villainName(style: BotStyle, index: number): string {
  const pool = STYLE_NAMES[style];
  return pool[index % pool.length]!;
}

/** Next seat (clockwise) that still has chips and isn't eliminated. */
function nextLiveSeat(players: SessionPlayer[], from: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const seat = (from + i) % n;
    const p = players.find((x) => x.seat === seat);
    if (p && !p.eliminated && p.stack > 0) return seat;
  }
  return from;
}

const zustandStorage = createJSONStorage(() => ({
  getItem: (name: string) => storage.getString(name),
  setItem: (name: string, value: string) => storage.setString(name, value),
  removeItem: (name: string) => storage.remove(name),
}));

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
      active: false,
      players: [],
      buttonSeat: 0,
      handsCompleted: 0,
      status: 'active',
      startingStack: 200,
      smallBlind: 1,
      bigBlind: 2,
      winnerName: null,

      startNewGame: (cfg) => {
        const players: SessionPlayer[] = [
          {
            seat: 0,
            name: 'You',
            style: null,
            isHero: true,
            stack: cfg.startingStack,
            eliminated: false,
          },
          ...cfg.styles.map((style, i) => ({
            seat: i + 1,
            name: villainName(style, i),
            style,
            isHero: false,
            stack: cfg.startingStack,
            eliminated: false,
          })),
        ];
        // Per-session leak tracking: a new game starts a fresh history.
        clearHands();
        set({
          active: true,
          players,
          buttonSeat: 0,
          handsCompleted: 0,
          status: 'active',
          startingStack: cfg.startingStack,
          smallBlind: cfg.smallBlind,
          bigBlind: cfg.bigBlind,
          winnerName: null,
        });
      },

      recordResult: (seats) => {
        const prev = get();
        const stackBySeat = new Map(seats.map((s) => [s.seat, s.stack]));

        const players = prev.players.map((p) => {
          if (p.eliminated) return p;
          const stack = stackBySeat.get(p.seat) ?? p.stack;
          const eliminated = stack <= 0;
          return { ...p, stack, eliminated };
        });

        const live = players.filter((p) => !p.eliminated && p.stack > 0);
        const hero = players.find((p) => p.isHero);

        let status: SessionStatus = 'active';
        let winnerName: string | null = null;
        if (hero && hero.eliminated) {
          status = 'hero-busted';
        } else if (live.length <= 1) {
          status = 'table-won';
          winnerName = live[0]?.name ?? hero?.name ?? 'You';
        }

        const buttonSeat =
          status === 'active' ? nextLiveSeat(players, prev.buttonSeat) : prev.buttonSeat;

        set({
          players,
          buttonSeat,
          handsCompleted: prev.handsCompleted + 1,
          status,
          winnerName,
        });
      },
    }),
    { name: StorageKeys.session, storage: zustandStorage, version: 1 },
  ),
);
