// Browser entry point: validates bundled packs and starts the app.
// Falls back to in-memory storage when localStorage is blocked (progress then lasts one visit).

import { packs } from '../packs/index.js';
import { validatePack } from '../engine/pack-schema.js';
import { createRng } from '../engine/rng.js';
import { usableStorage } from '../engine/progress-store.js';
import { createApp } from './app.js';

const valid = packs.filter((pack) => {
  const errors = validatePack(pack);
  if (errors.length) console.error(errors);
  return errors.length === 0;
});

createApp({
  root: document.getElementById('app'),
  packs: valid,
  storage: usableStorage(() => window.localStorage),
  rng: createRng(),
});
