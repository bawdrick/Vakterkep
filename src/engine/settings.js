// App settings: defaults and repair of stale values loaded from storage (old versions, removed packs).

import { MODES } from './pack-schema.js';

export function defaultSettings(packs) {
  return { packId: packs[0].id, deckId: packs[0].decks[0].id, mode: MODES[0], showHints: false, showAllMarkers: false };
}

export function normalizeSettings(raw, packs) {
  const defaults = defaultSettings(packs);
  const saved = raw && typeof raw === 'object' ? raw : {};
  const pack = packs.find((p) => p.id === saved.packId) ?? packs[0];
  return {
    packId: pack.id,
    deckId: pack.decks.some((d) => d.id === saved.deckId) ? saved.deckId : pack.decks[0].id,
    mode: MODES.includes(saved.mode) ? saved.mode : defaults.mode,
    showHints: saved.showHints === true,
    showAllMarkers: saved.showAllMarkers === true,
  };
}
