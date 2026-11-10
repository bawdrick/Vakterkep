// Persists progress and settings through an injected Storage-like object.
// Never throws: storage can be missing, full or blocked in the viewer.

import { emptyProgress } from './leitner.js';

const PREFIX = 'vakterkep:v1';

// Progress is per item and mode, so decks sharing items share progress
export const progressKey = (packId, mode) => `${PREFIX}:progress:${packId}:${mode}`;
export const SETTINGS_KEY = `${PREFIX}:settings`;

export function createStore(storage) {
  const read = (key, fallback) => {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      storage?.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  return {
    loadProgress: (packId, mode) => read(progressKey(packId, mode), emptyProgress()),
    saveProgress: (packId, mode, progress) => write(progressKey(packId, mode), progress),
    loadSettings: (defaults) => ({ ...defaults, ...read(SETTINGS_KEY, {}) }),
    saveSettings: (settings) => write(SETTINGS_KEY, settings),
    clearPack(packId) {
      try {
        const keys = [];
        for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
        keys.filter((k) => k?.startsWith(`${PREFIX}:progress:${packId}:`)).forEach((k) => storage.removeItem(k));
        return true;
      } catch {
        return false;
      }
    },
  };
}

// In-memory Storage stand-in for tests and blocked environments
export function createMemoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
