import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckItems, findDeck } from '../../src/engine/deck.js';
import { defaultSettings, normalizeSettings } from '../../src/engine/settings.js';
import { runtimePack } from '../fixtures/runtime-pack.js';

const pack = runtimePack();
const other = runtimePack({ id: 'other', decks: [{ id: 'all', title: 'Mind', kinds: ['area', 'place'] }] });

test('findDeck falls back to the first deck for unknown ids', () => {
  assert.equal(findDeck(pack, 'places').id, 'places');
  assert.equal(findDeck(pack, 'nope').id, 'areas');
  assert.equal(findDeck(pack, null).id, 'areas');
});

test('deckItems keeps only the deck kinds, in pack order', () => {
  assert.deepEqual(deckItems(pack, findDeck(pack, 'places')).map((i) => i.id), ['A/seat', 'B/seat']);
  assert.equal(deckItems(pack, findDeck(pack, 'mixed')).length, pack.items.length);
});

test('settings default to the first pack, deck and mode', () => {
  assert.deepEqual(defaultSettings([pack]), { packId: 'mini', deckId: 'areas', mode: 'recall', showHints: false });
  assert.deepEqual(normalizeSettings(null, [pack]), defaultSettings([pack]));
});

test('settings keep valid saved values', () => {
  const saved = { packId: 'other', deckId: 'all', mode: 'locate', showHints: true };
  assert.deepEqual(normalizeSettings(saved, [pack, other]), saved);
});

test('settings repair stale or foreign values', () => {
  const stale = { packId: 'removed', deckId: 'all', mode: 'match', showHints: 'yes', junk: 1 };
  assert.deepEqual(normalizeSettings(stale, [pack, other]), { packId: 'mini', deckId: 'areas', mode: 'recall', showHints: false });
  assert.equal(normalizeSettings({ packId: 'other', deckId: 'areas' }, [pack, other]).deckId, 'all', 'deck must exist in the chosen pack');
});
