import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../src/engine/session.js';
import { emptyProgress } from '../../src/engine/leitner.js';
import { createRng } from '../../src/engine/rng.js';

const items = [
  { id: 'a1', kind: 'area', name: 'A1', x: 0, y: 0 },
  { id: 'a2', kind: 'area', name: 'A2', x: 100, y: 0 },
  { id: 'a3', kind: 'area', name: 'A3', x: 200, y: 0 },
  { id: 'a4', kind: 'area', name: 'A4', x: 300, y: 0 },
  { id: 'p1', kind: 'place', name: 'P1', x: 5, y: 0 },
];
const start = (mode, seed = 3) => S.startSession({ items, mode, progress: emptyProgress(), rng: createRng(seed) });

test('recall: reveal, self-grade, then next card differs', () => {
  const rng = createRng(9);
  let s = start('recall');
  assert.equal(s.phase, 'ask');
  assert.equal(S.answerRecall(s, true), s, 'cannot grade before reveal');
  s = S.answerRecall(S.reveal(s), false);
  assert.equal(s.phase, 'result');
  assert.deepEqual(s.stats, { answered: 1, correct: 0 });
  assert.equal(s.progress.items[s.current].box, 1);
  const prev = s.current;
  s = S.next(s, rng);
  assert.equal(s.phase, 'ask');
  assert.notEqual(s.current, prev);
});

test('choice: four options of the same kind, including the answer', () => {
  for (let seed = 1; seed < 30; seed++) {
    const s = start('choice', seed);
    const target = S.currentItem(s);
    assert.ok(s.choices.includes(target.id));
    assert.equal(new Set(s.choices).size, s.choices.length);
    const kinds = s.choices.map((id) => items.find((i) => i.id === id).kind);
    assert.ok(kinds.every((k) => k === target.kind));
  }
});

test('choice: grading and ignoring foreign ids', () => {
  let s = start('choice');
  assert.equal(S.answerChoice(s, 'nope'), s);
  const wrong = s.choices.find((id) => id !== s.current);
  const graded = S.answerChoice(s, wrong ?? s.current);
  assert.equal(graded.result.correct, wrong === undefined);
});

test('locate: resolves taps among the target kind only', () => {
  let s = start('locate');
  s = { ...s, current: 'a1' };
  const graded = S.answerLocate(s, { x: 4, y: 0 }, 50);
  assert.equal(graded.result.chosenId, 'a1', 'p1 is closer but has another kind');
  assert.equal(graded.result.correct, true);
});

test('locate: far taps are flagged, not graded', () => {
  const s = { ...start('locate'), current: 'a1' };
  const missed = S.answerLocate(s, { x: 50, y: 500 }, 50);
  assert.equal(missed.missed, true);
  assert.equal(missed.phase, 'ask');
  assert.equal(missed.stats.answered, 0);
});
