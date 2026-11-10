import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, createManualTimers } from '../helpers/dom-env.js';
import { createApp } from '../../src/ui/app.js';
import { createMemoryStorage, createStore, SETTINGS_KEY } from '../../src/engine/progress-store.js';
import { recordAnswer, emptyProgress } from '../../src/engine/leitner.js';
import { createRng } from '../../src/engine/rng.js';
import { T } from '../../src/ui/strings.js';
import { runtimePack } from '../fixtures/runtime-pack.js';

const window = installDom();
let mounted = null;
afterEach(() => mounted?.app?.destroy());

function mount({ storage = createMemoryStorage(), packs = [runtimePack()], seed = 1 } = {}) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const timers = createManualTimers();
  const app = createApp({ root, packs, storage, rng: createRng(seed), timers });
  const byKey = (key) => root.querySelector(`[data-key="${key}"]`);
  mounted = { root, app, timers, storage, byKey, $: (sel) => root.querySelector(sel), $$: (sel) => [...root.querySelectorAll(sel)] };
  return mounted;
}

// A user activating a control: focus moves to it first, as with keyboard or most pointer clicks
const activate = (el) => {
  el.focus();
  el.click();
};
const focusedKey = () => document.activeElement?.getAttribute('data-key');
const keydown = (key) => document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

test('home: deck radios, mode radios and start button render from the pack', () => {
  const { $$, byKey } = mount();
  assert.equal($$('input[name="deck"]').length, 3);
  assert.deepEqual($$('input[name="mode"]').map((r) => [r.value, r.checked]), [['recall', true], ['choice', false], ['locate', false]]);
  assert.ok(byKey('start'));
});

// Regression: every re-render replaced the focused control, so keyboard users lost their place
test('selecting a mode keeps focus on the newly checked radio and saves it', () => {
  const { byKey, app, storage } = mount();
  activate(byKey('mode-locate'));
  assert.equal(app.getState().settings.mode, 'locate');
  assert.equal(byKey('mode-locate').checked, true);
  assert.equal(focusedKey(), 'mode-locate');
  assert.equal(JSON.parse(storage.getItem(SETTINGS_KEY)).mode, 'locate');
});

test('toggling hints keeps focus on the checkbox', () => {
  const { byKey, app } = mount();
  activate(byKey('hints'));
  assert.equal(app.getState().settings.showHints, true);
  assert.equal(focusedKey(), 'hints');
});

test('recall flow: focus follows the primary action, grading moves on at once', () => {
  const { byKey, app, $ } = mount();
  activate(byKey('start'));
  assert.equal(focusedKey(), 'reveal');
  const first = app.getState().session.current;
  activate(byKey('reveal'));
  assert.equal(focusedKey(), 'didnt-know');
  assert.ok($('.answer').textContent);
  activate(byKey('knew'));
  const { session } = app.getState();
  assert.equal(session.phase, 'ask', 'self-graded cards do not wait');
  assert.notEqual(session.current, first);
  assert.equal(session.progress.items[first].box, 1);
  assert.equal(focusedKey(), 'reveal');
});

test('choice: a correct answer advances after the pause, a wrong one waits for Tovább', () => {
  const { byKey, app, timers } = mount();
  activate(byKey('mode-choice'));
  activate(byKey('start'));
  assert.match(focusedKey(), /^choice-/, 'first option is focused');

  const { session } = app.getState();
  activate(byKey(`choice-${session.current}`));
  assert.equal(app.getState().session.phase, 'result');
  assert.equal(focusedKey(), 'next', 'disabled options hand focus to Tovább');
  assert.equal(timers.size, 1);
  timers.runAll();
  assert.equal(app.getState().session.phase, 'ask');

  const asked = app.getState().session;
  activate(byKey(`choice-${asked.choices.find((id) => id !== asked.current)}`));
  assert.equal(timers.size, 0, 'mistakes are not skipped automatically');
  activate(byKey('next'));
  assert.equal(app.getState().session.phase, 'ask');
});

test('locate: taps are graded within the tap radius, the prompt holds focus', () => {
  const { byKey, app, $ } = mount();
  activate(byKey('mode-locate'));
  activate(byKey('start'));
  assert.equal(document.activeElement, $('.prompt'));
  const target = app.getState().session.items.find((i) => i.id === app.getState().session.current);
  app.actions.tap({ x: target.x + 400, y: target.y + 400 }, 1);
  assert.equal(app.getState().session.missed, true);
  app.actions.tap({ x: target.x + 5, y: target.y }, 1);
  assert.equal(app.getState().session.result.correct, true);
});

test('keyboard: Escape returns home, Space reveals', () => {
  const { byKey, app } = mount();
  activate(byKey('start'));
  document.activeElement.blur();
  keydown(' ');
  assert.equal(app.getState().session.phase, 'revealed');
  keydown('Escape');
  assert.equal(app.getState().session, null);
});

// Regression: window.confirm is blocked in embedded viewers, so reset must not depend on it
test('reset asks inline and never calls window.confirm', () => {
  const storage = createMemoryStorage();
  createStore(storage).saveProgress('mini', 'recall', recordAnswer(emptyProgress(), 'A', true));
  window.confirm = () => { throw new Error('blocked'); };
  const { byKey, $ } = mount({ storage });
  activate(byKey('reset'));
  assert.ok($('.confirm'));
  assert.equal(focusedKey(), 'cancel-reset');
  activate(byKey('confirm-reset'));
  assert.equal($('.notice').textContent, T.resetDone);
  assert.deepEqual(createStore(storage).loadProgress('mini', 'recall'), emptyProgress());
});

test('home map and legend show progress with shapes and text, not colour alone', () => {
  const storage = createMemoryStorage();
  let progress = recordAnswer(emptyProgress(), 'B', true);
  for (let i = 0; i < 3; i++) progress = recordAnswer(progress, 'A', true);
  createStore(storage).saveProgress('mini', 'recall', progress);
  const { $, $$ } = mount({ storage });
  assert.equal($$('.map-overlay .map-check').length, 1, 'tick on the mastered marker');
  assert.ok($('.map-overlay .marker-ring.tone-learning').getAttribute('stroke-dasharray'), 'learning ring is dashed');
  const legend = $$('.legend li').map((li) => li.textContent);
  assert.deepEqual(legend, [T.legendItem(T.legend.idle, 2), T.legendItem(T.legend.learning, 1), T.legendItem(T.legend.mastered, 1)]);
});

test('stale stored settings are repaired instead of breaking the home screen', () => {
  const storage = createMemoryStorage();
  storage.setItem(SETTINGS_KEY, JSON.stringify({ packId: 'gone', mode: 'match', deckId: 'x' }));
  const { app, byKey } = mount({ storage });
  assert.deepEqual(app.getState().settings, { packId: 'mini', deckId: 'areas', mode: 'recall', showHints: false });
  assert.equal(byKey('deck-areas').checked, true);
});

test('no valid pack: an error message instead of a crash', () => {
  const { app, $ } = mount({ packs: [] });
  assert.equal(app, null);
  assert.equal($('[role="alert"]').textContent, T.noPacks);
});
