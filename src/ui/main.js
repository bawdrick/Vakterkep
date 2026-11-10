// Browser entry point: validates bundled packs and starts the app.
// Falls back to in-memory storage when localStorage is blocked (progress then lasts one visit).

import { packs } from '../packs/index.js';
import { validatePack } from '../engine/pack-schema.js';
import { createRng } from '../engine/rng.js';
import { createApp } from './app.js';
import { createMemoryStorage } from '../engine/progress-store.js';

function safeStorage() {
  try {
    const probe = '__vakterkep_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}

const valid = packs.filter((pack) => {
  const errors = validatePack(pack);
  if (errors.length) console.error(errors);
  return errors.length === 0;
});

createApp({
  root: document.getElementById('app'),
  packs: valid,
  storage: safeStorage(),
  rng: createRng(),
});
