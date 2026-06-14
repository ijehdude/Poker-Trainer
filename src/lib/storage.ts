/**
 * Storage abstraction.
 *
 * All local persistence goes through this layer so the backing store can
 * be swapped (localStorage today; IndexedDB or a cloud sync later) without
 * touching callers. SSR-safe: every method no-ops gracefully when
 * `window` is unavailable.
 */

const PREFIX = 'pt:'; // poker-trainer namespace

export interface KeyValueStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  /** Raw string access — used by store-persistence middleware. */
  getString(key: string): string | null;
  setString(key: string, value: string): void;
}

class LocalStorageStore implements KeyValueStore {
  private available(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  get<T>(key: string, fallback: T): T {
    const raw = this.getString(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.setString(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or serialization error — fail silently.
    }
  }

  remove(key: string): void {
    this.available()?.removeItem(PREFIX + key);
  }

  getString(key: string): string | null {
    return this.available()?.getItem(PREFIX + key) ?? null;
  }

  setString(key: string, value: string): void {
    this.available()?.setItem(PREFIX + key, value);
  }
}

export const storage: KeyValueStore = new LocalStorageStore();

/** Storage keys, centralized to avoid typos and collisions. */
export const StorageKeys = {
  settings: 'settings',
  handHistory: 'hand-history',
  stats: 'stats',
  drillProgress: 'drill-progress',
} as const;
