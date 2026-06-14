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

function randomStyles(): BotStyle[] {
  return Array.from(
    { length: 5 },
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
      tableStyles: ['nit', 'tag', 'lag', 'station', 'balanced'],
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
      version: 1,
    },
  ),
);
