import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate, percent } from '../../src/engine/format.js';
import { nearestItem } from '../../src/engine/hit-test.js';
import { pickChoices } from '../../src/engine/choices.js';
import { createRng, shuffle } from '../../src/engine/rng.js';
import { createMemoryStorage, createStore, usableStorage } from '../../src/engine/progress-store.js';
import { recordAnswer, emptyProgress } from '../../src/engine/leitner.js';

test('fillTemplate replaces known keys and keeps unknown ones', () => {
  assert.equal(fillTemplate('Hol van {name}? {x}', { name: 'Pécs' }), 'Hol van Pécs? {x}');
});

test('nearestItem respects maxDistance', () => {
  const items = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }];
  assert.equal(nearestItem(items, { x: 7, y: 0 }).id, 'b');
  assert.equal(nearestItem(items, { x: 100, y: 0 }, 20), null);
});

test('pickChoices prefers neighbours and keeps the answer', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `i${i}`, kind: 'k', x: i * 10, y: 0 }));
  const choices = pickChoices(items[0], items, createRng(2));
  assert.equal(choices.length, 4);
  assert.ok(choices.includes(items[0]));
  assert.ok(choices.every((c) => c.x <= 60), 'distractors come from the 6 nearest');
});

test('shuffle is deterministic per seed and keeps elements', () => {
  const list = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(list, createRng(5)), shuffle(list, createRng(5)));
  assert.deepEqual(shuffle(list, createRng(5)).sort(), list);
});

test('store round-trips progress and clears only one pack', () => {
  const store = createStore(createMemoryStorage());
  const p = recordAnswer(emptyProgress(), 'a', true);
  store.saveProgress('pack1', 'recall', p);
  store.saveProgress('pack2', 'recall', p);
  assert.deepEqual(store.loadProgress('pack1', 'recall'), p);
  store.clearPack('pack1');
  assert.deepEqual(store.loadProgress('pack1', 'recall'), emptyProgress());
  assert.deepEqual(store.loadProgress('pack2', 'recall'), p);
});

test('store survives broken or missing storage', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  const store = createStore(broken);
  assert.deepEqual(store.loadSettings({ mode: 'recall' }), { mode: 'recall' });
  assert.equal(store.saveSettings({}), false);
  assert.deepEqual(createStore(undefined).loadProgress('a', 'b'), emptyProgress());
});

test('percent rounds and handles an empty total', () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(19, 19), 100);
  assert.equal(percent(0, 0), 0);
});

// Regression: blocked localStorage (file://, private mode) must fall back to memory, not crash the app
test('usableStorage falls back to memory when storage is blocked', () => {
  const real = createMemoryStorage();
  assert.equal(usableStorage(() => real), real);
  assert.equal(real.length, 0, 'the probe key is removed');
  const denied = usableStorage(() => { throw new Error('SecurityError'); });
  const full = usableStorage(() => ({ setItem() { throw new Error('QuotaExceeded'); } }));
  for (const fallback of [denied, full]) {
    fallback.setItem('k', 'v');
    assert.equal(fallback.getItem('k'), 'v');
  }
});
