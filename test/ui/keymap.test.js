import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyCommand } from '../../src/ui/keymap.js';

const press = (session, key, extra = {}) => keyCommand(session, { key, ...extra });
const recall = (phase) => ({ mode: 'recall', phase });

test('no session or modifier keys: nothing happens', () => {
  assert.equal(press(null, 'Escape'), null);
  assert.equal(press(recall('ask'), ' ', { ctrlKey: true }), null);
  assert.equal(press(recall('ask'), 'Escape', { altKey: true }), null);
});

test('Escape goes home from any phase', () => {
  assert.deepEqual(press(recall('revealed'), 'Escape'), ['home']);
});

test('Space/Enter reveal and move on, but leave focused buttons alone', () => {
  assert.deepEqual(press(recall('ask'), ' '), ['reveal']);
  assert.deepEqual(press({ mode: 'choice', phase: 'result' }, 'Enter'), ['next']);
  assert.equal(press({ mode: 'choice', phase: 'ask' }, 'Enter'), null);
  assert.equal(press(recall('ask'), 'Enter', { onButton: true }), null);
});

test('arrows grade a revealed card', () => {
  assert.deepEqual(press(recall('revealed'), 'ArrowRight'), ['grade', true]);
  assert.deepEqual(press(recall('revealed'), 'ArrowLeft'), ['grade', false]);
  assert.equal(press(recall('ask'), 'ArrowLeft'), null);
});

test('digits pick an existing option while asking', () => {
  const choice = { mode: 'choice', phase: 'ask', choices: ['a', 'b', 'c', 'd'] };
  assert.deepEqual(press(choice, '3'), ['choose', 'c']);
  assert.equal(press({ ...choice, choices: ['a', 'b'] }, '4'), null);
  assert.equal(press({ ...choice, phase: 'result' }, '1'), null);
});
