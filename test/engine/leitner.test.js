import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BOX, boxOf, emptyProgress, masteredCount, pickNext, recordAnswer } from '../../src/engine/leitner.js';
import { createRng } from '../../src/engine/rng.js';

test('correct answers move up to MAX_BOX, mistakes reset to box 1', () => {
  let p = emptyProgress();
  for (let i = 0; i < MAX_BOX + 2; i++) p = recordAnswer(p, 'a', true);
  assert.equal(boxOf(p, 'a'), MAX_BOX);
  p = recordAnswer(p, 'a', false);
  assert.equal(boxOf(p, 'a'), 1);
  assert.deepEqual(p.items.a, { box: 1, seen: MAX_BOX + 3, correct: MAX_BOX + 2 });
});

test('recordAnswer does not mutate the input', () => {
  const p = emptyProgress();
  recordAnswer(p, 'a', true);
  assert.deepEqual(p, emptyProgress());
});

test('pickNext never repeats the excluded card when others exist', () => {
  const rng = createRng(1);
  for (let i = 0; i < 200; i++) assert.notEqual(pickNext(emptyProgress(), ['a', 'b'], rng, 'a'), 'a');
  assert.equal(pickNext(emptyProgress(), ['a'], rng, 'a'), 'a');
});

test('pickNext favours low boxes', () => {
  let p = emptyProgress();
  for (let i = 0; i < MAX_BOX; i++) p = recordAnswer(p, 'known', true);
  const rng = createRng(7);
  const counts = { known: 0, fresh: 0 };
  for (let i = 0; i < 2000; i++) counts[pickNext(p, ['known', 'fresh'], rng)]++;
  assert.ok(counts.fresh > counts.known * 10, JSON.stringify(counts));
});

test('masteredCount counts cards in box 3 or higher', () => {
  let p = emptyProgress();
  for (let i = 0; i < 3; i++) p = recordAnswer(p, 'a', true);
  p = recordAnswer(p, 'b', true);
  assert.equal(masteredCount(p, ['a', 'b', 'c']), 1);
});
