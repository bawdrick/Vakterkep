import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePack } from '../../src/engine/pack-schema.js';
import { runtimePack } from '../fixtures/runtime-pack.js';

const base = runtimePack();
const errorsOf = (patch) => validatePack(runtimePack(patch));
const withItem = (patch) => ({ items: [{ ...base.items[0], ...patch }, ...base.items.slice(1)] });
const withKind = (patch) => ({ kinds: { ...base.kinds, area: { ...base.kinds.area, ...patch } } });

test('a valid pack has no errors', () => {
  assert.deepEqual(validatePack(base), []);
});

test('header problems stop validation early', () => {
  assert.deepEqual(validatePack(null), [
    '?: schemaVersion must be 1', '?: missing id', '?: missing title', '?: missing lang', '?: missing outline',
    '?: viewBox must have 4 numbers',
  ]);
  assert.deepEqual(errorsOf({ schemaVersion: 2 }), ['mini: schemaVersion must be 1']);
  assert.deepEqual(errorsOf({ title: '' }), ['mini: missing title']);
  assert.deepEqual(errorsOf({ viewBox: [0, 0, 10] }), ['mini: viewBox must have 4 numbers']);
});

test('kinds need a label, a known marker and a prompt per mode', () => {
  assert.deepEqual(errorsOf(withKind({ label: '' })), ['mini: kind area: missing label']);
  assert.deepEqual(errorsOf(withKind({ marker: 'star' })), ['mini: kind area: marker must be ring or dot']);
  assert.deepEqual(errorsOf(withKind({ prompts: { recall: 'x', choice: 'y' } })), ['mini: kind area: missing prompt locate']);
});

test('items: unique ids, known kinds, names, coordinates inside the viewBox', () => {
  assert.deepEqual(errorsOf(withItem({ id: 'B' })), ['mini: duplicate item id B']);
  assert.deepEqual(errorsOf(withItem({ kind: 'river' })), ['mini: item A: unknown kind river']);
  assert.deepEqual(errorsOf(withItem({ name: '' })), ['mini: item A: missing name']);
  assert.deepEqual(errorsOf(withItem({ x: NaN })), ['mini: item A: bad coordinates']);
  assert.deepEqual(errorsOf(withItem({ y: '5' })), ['mini: item A: bad coordinates']);
  assert.deepEqual(errorsOf(withItem({ x: 1001 })), ['mini: item A: outside viewBox']);
  assert.deepEqual(errorsOf(withItem({ y: -1 })), ['mini: item A: outside viewBox']);
});

test('decks reference known kinds, have items, and at least one exists', () => {
  assert.deepEqual(errorsOf({ decks: [{ id: 'x', kinds: [] }] }), ['mini: deck x: bad kinds']);
  assert.deepEqual(errorsOf({ decks: [{ id: 'x', kinds: ['area', 'river'] }] }), ['mini: deck x: bad kinds']);
  const areasOnly = base.items.filter((i) => i.kind === 'area');
  assert.deepEqual(errorsOf({ items: areasOnly, decks: [{ id: 'p', kinds: ['place'] }] }), ['mini: deck p: no items']);
  assert.deepEqual(errorsOf({ decks: [] }), ['mini: no decks']);
});

// Regression: a pack without items used to throw a TypeError instead of reporting it
test('a pack without items is reported, not thrown', () => {
  const errors = errorsOf({ items: undefined });
  assert.ok(errors.includes('mini: no items'));
  assert.ok(errors.includes('mini: deck areas: no items'));
});
