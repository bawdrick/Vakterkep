import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homeModel, quizModel } from '../../src/ui/map-model.js';
import { emptyProgress, recordAnswer } from '../../src/engine/leitner.js';

const pack = {
  viewBox: [0, 0, 1000, 600],
  kinds: { area: { marker: 'ring' }, place: { marker: 'dot' } },
};
const items = [
  { id: 'a', kind: 'area', name: 'A', x: 100, y: 100 },
  { id: 'b', kind: 'area', name: 'B', x: 900, y: 100 },
  { id: 'p', kind: 'place', name: 'P', x: 500, y: 300 },
];
const session = (patch) => ({ mode: 'recall', items, current: 'b', phase: 'ask', result: null, ...patch });
const toneOf = (model, id) => model.markers.find((m) => m.id === id).tone;

test('home markers reflect learning progress', () => {
  let progress = recordAnswer(emptyProgress(), 'a', true);
  for (let i = 0; i < 3; i++) progress = recordAnswer(progress, 'b', true);
  const model = homeModel(pack, items, progress);
  assert.deepEqual(model.markers.map((m) => m.tone), ['learning', 'mastered', 'idle']);
  assert.deepEqual(model.markers.map((m) => m.marker), ['ring', 'ring', 'dot']);
});

test('recall: focus on target, label only after reveal', () => {
  assert.equal(quizModel(pack, session()).labels.length, 0);
  assert.equal(quizModel(pack, session()).focus.id, 'b');
  const revealed = quizModel(pack, session({ phase: 'revealed' }));
  assert.equal(revealed.labels[0].text, 'B');
  assert.equal(revealed.labels[0].anchor, 'end', 'right-side points label to the left');
});

test('locate: no focus while asking (it would give the answer away)', () => {
  assert.equal(quizModel(pack, session({ mode: 'locate' })).focus, null);
});

test('wrong answer marks both the chosen and the correct item', () => {
  const model = quizModel(pack, session({ mode: 'locate', phase: 'result', result: { correct: false, chosenId: 'a' } }));
  assert.equal(toneOf(model, 'b'), 'answer');
  assert.equal(toneOf(model, 'a'), 'wrong');
  assert.deepEqual(model.labels.map((l) => [l.text, l.tone]), [['B', 'answer'], ['A', 'wrong']]);
  assert.equal(model.focus.id, 'b');
});

test('correct answer is green and labelled', () => {
  const model = quizModel(pack, session({ mode: 'choice', phase: 'result', result: { correct: true, chosenId: 'b' } }));
  assert.equal(toneOf(model, 'b'), 'ok');
  assert.deepEqual(model.labels.map((l) => l.tone), ['ok']);
});
