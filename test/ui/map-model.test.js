import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAP_RADIUS_PX, homeModel, locateRadius, quizModel } from '../../src/ui/map-model.js';
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
const all = { showAll: true };
const toneOf = (model, id) => model.markers.find((m) => m.id === id).tone;
const shownIds = (model) => model.markers.map((m) => m.id);

test('home markers reflect learning progress, with counts per tone', () => {
  let progress = recordAnswer(emptyProgress(), 'a', true);
  for (let i = 0; i < 3; i++) progress = recordAnswer(progress, 'b', true);
  const model = homeModel(pack, items, progress);
  assert.deepEqual(model.markers.map((m) => m.tone), ['learning', 'mastered', 'idle']);
  assert.deepEqual(model.markers.map((m) => m.marker), ['ring', 'ring', 'dot']);
  assert.deepEqual(model.counts, { idle: 1, learning: 1, mastered: 1 });
});

test('recall: focus on target, label only after reveal', () => {
  assert.equal(quizModel(pack, session(), all).labels.length, 0);
  assert.equal(quizModel(pack, session(), all).focus.id, 'b');
  const revealed = quizModel(pack, session({ phase: 'revealed' }), all);
  assert.equal(revealed.labels[0].text, 'B');
  assert.equal(revealed.labels[0].anchor, 'end', 'right-side points label to the left');
});

test('locate: no focus while asking (it would give the answer away)', () => {
  assert.equal(quizModel(pack, session({ mode: 'locate' }), all).focus, null);
});

test('show all: a wrong answer marks both the chosen and the correct item', () => {
  const model = quizModel(pack, session({ mode: 'locate', phase: 'result', result: { correct: false, chosenId: 'a', point: { x: 1, y: 1 } } }), all);
  assert.equal(toneOf(model, 'b'), 'answer');
  assert.equal(toneOf(model, 'a'), 'wrong');
  assert.deepEqual(model.labels.map((l) => [l.text, l.tone]), [['B', 'answer'], ['A', 'wrong']]);
  assert.equal(model.focus.id, 'b');
  assert.equal(model.tapMark, null, 'the wrong marker itself shows where the tap went');
});

test('correct answer is green and labelled', () => {
  const model = quizModel(pack, session({ mode: 'choice', phase: 'result', result: { correct: true, chosenId: 'b' } }), all);
  assert.equal(toneOf(model, 'b'), 'ok');
  assert.deepEqual(model.labels.map((l) => l.tone), ['ok']);
});

test('only the asked marker: recall and choice show just the target', () => {
  assert.deepEqual(shownIds(quizModel(pack, session())), ['b']);
  const wrongChoice = quizModel(pack, session({ mode: 'choice', phase: 'result', result: { correct: false, chosenId: 'a' } }));
  assert.deepEqual(shownIds(wrongChoice), ['b']);
  assert.deepEqual(wrongChoice.labels.map((l) => [l.text, l.tone]), [['B', 'answer']]);
});

test('only the asked marker: locate shows nothing before the tap, then the answer and the tap', () => {
  const asking = quizModel(pack, session({ mode: 'locate' }));
  assert.deepEqual(shownIds(asking), []);
  assert.equal(asking.focus, null);
  const wrong = quizModel(pack, session({ mode: 'locate', phase: 'result', result: { correct: false, chosenId: 'a', point: { x: 120, y: 90 } } }));
  assert.deepEqual(shownIds(wrong), ['b']);
  assert.deepEqual(wrong.tapMark, { x: 120, y: 90 });
  const right = quizModel(pack, session({ mode: 'locate', phase: 'result', result: { correct: true, chosenId: 'b', point: { x: 890, y: 100 } } }));
  assert.equal(right.tapMark, null);
});

test('locate radius: screen-pixel radius with visible markers, unlimited without', () => {
  assert.equal(locateRadius(true, 2), TAP_RADIUS_PX * 2);
  assert.equal(locateRadius(false, 2), Infinity);
});
