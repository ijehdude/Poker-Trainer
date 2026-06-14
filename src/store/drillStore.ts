/**
 * Drill progress store — per-category attempts/accuracy, persisted locally.
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage, StorageKeys } from '@/lib/storage';

export interface CategoryProgress {
  attempts: number;
  correct: number;
  /** Last 20 results (true = correct), newest last — for streaks/trends. */
  recent: boolean[];
}

interface DrillStore {
  progress: Record<string, CategoryProgress>;
  record: (categoryId: string, correct: boolean) => void;
  reset: () => void;
  accuracy: (categoryId: string) => number;
}

const zustandStorage = createJSONStorage(() => ({
  getItem: (name: string) => storage.getString(name),
  setItem: (name: string, value: string) => storage.setString(name, value),
  removeItem: (name: string) => storage.remove(name),
}));

export const useDrills = create<DrillStore>()(
  persist(
    (set, get) => ({
      progress: {},
      record: (categoryId, correct) =>
        set((s) => {
          const prev = s.progress[categoryId] ?? { attempts: 0, correct: 0, recent: [] };
          const recent = [...prev.recent, correct].slice(-20);
          return {
            progress: {
              ...s.progress,
              [categoryId]: {
                attempts: prev.attempts + 1,
                correct: prev.correct + (correct ? 1 : 0),
                recent,
              },
            },
          };
        }),
      reset: () => set({ progress: {} }),
      accuracy: (categoryId) => {
        const p = get().progress[categoryId];
        return p && p.attempts > 0 ? p.correct / p.attempts : 0;
      },
    }),
    { name: StorageKeys.drillProgress, storage: zustandStorage, version: 1 },
  ),
);
