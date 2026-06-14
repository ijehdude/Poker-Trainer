/**
 * Settings store — user preferences persisted to local storage.
 *
 * Includes the coach mode toggle (Offline vs Cloud/DeepSeek), sound,
 * motion preference, and the default table composition for Play mode.
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, StorageKeys } from '@/lib/storage';
import type { BotStyle } from '@/engine/bots';

export type CoachMode = 'offline' | 'cloud';
export type MotionPref = 'system' | 'on' | 'off';

export interface SettingsState {
  coachMode: CoachMode;
  soundEnabled: boolean;
  motion: MotionPref;
  /** Default opponent styles for the 5 villain seats in Play mode. */
  tableStyles: BotStyle[];
  startingStackBB: number;
  showEquityOverlay: boolean;

  setCoachMode: (mode: CoachMode) => void;
  toggleSound: () => void;
  setMotion: (m: MotionPref) => void;
  setTableStyles: (styles: BotStyle[]) => void;
  randomizeTable: () => void;
  setStartingStack: (bb: number) => void;
  toggleEquityOverlay: () => void;
}

const ALL_STYLES: BotStyle[] = ['nit', 'tag', 'lag', 'station', 'balanced'];

// Four opponents → a 5-handed table (hero + 4).
const OPPONENT_COUNT = 4;

function randomStyles(): BotStyle[] {
  return Array.from(
    { length: OPPONENT_COUNT },
    () => ALL_STYLES[Math.floor(Math.random() * ALL_STYLES.length)]!,
  );
}

// Adapt our KeyValueStore to the Web Storage interface zustand expects.
const zustandStorage = createJSONStorage(() => ({
  getItem: (name: string) => storage.getString(name),
  setItem: (name: string, value: string) => storage.setString(name, value),
  removeItem: (name: string) => storage.remove(name),
}));

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      coachMode: 'offline',
      soundEnabled: false,
      motion: 'system',
      tableStyles: ['nit', 'tag', 'lag', 'balanced'],
      startingStackBB: 100,
      showEquityOverlay: true,

      setCoachMode: (coachMode) => set({ coachMode }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setMotion: (motion) => set({ motion }),
      setTableStyles: (tableStyles) => set({ tableStyles }),
      randomizeTable: () => set({ tableStyles: randomStyles() }),
      setStartingStack: (startingStackBB) => set({ startingStackBB }),
      toggleEquityOverlay: () => set((s) => ({ showEquityOverlay: !s.showEquityOverlay })),
    }),
    {
      name: StorageKeys.settings,
      storage: zustandStorage,
      version: 2,
      // v2 moved the default table from 6-handed (5 opponents) to 5-handed
      // (4 opponents). Trim any persisted 5-opponent table while preserving
      // the user's other preferences.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<SettingsState>;
        if (
          version < 2 &&
          Array.isArray(s.tableStyles) &&
          s.tableStyles.length !== OPPONENT_COUNT
        ) {
          s.tableStyles = s.tableStyles.slice(0, OPPONENT_COUNT);
          while (s.tableStyles.length < OPPONENT_COUNT) s.tableStyles.push('balanced');
        }
        return s as SettingsState;
      },
    },
  ),
);
