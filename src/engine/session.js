// Quiz session as a pure state machine: every action returns a new state.
// Modes: recall (flashcard, self-graded), choice (4 options), locate (tap on map).
// Phases: ask -> (revealed, recall only) -> result -> next() -> ask

import { pickNext, recordAnswer } from './leitner.js';
import { pickChoices } from './choices.js';
import { nearestItem } from './hit-test.js';

const byId = (items, id) => items.find((item) => item.id === id);

function ask(state, id, rng) {
  const target = byId(state.items, id);
  return {
    ...state,
    current: id,
    phase: 'ask',
    choices: state.mode === 'choice' ? pickChoices(target, state.items, rng).map((item) => item.id) : null,
    result: null,
    missed: false,
  };
}

function grade(state, isCorrect, chosenId, point = null) {
  return {
    ...state,
    phase: 'result',
    progress: recordAnswer(state.progress, state.current, isCorrect),
    result: { correct: isCorrect, chosenId, point },
    stats: { answered: state.stats.answered + 1, correct: state.stats.correct + (isCorrect ? 1 : 0) },
  };
}

export function startSession({ items, mode, progress, rng }) {
  const base = { mode, items, progress, stats: { answered: 0, correct: 0 } };
  return ask(base, pickNext(progress, items.map((item) => item.id), rng), rng);
}

export const currentItem = (state) => byId(state.items, state.current);

export function reveal(state) {
  return state.mode === 'recall' && state.phase === 'ask' ? { ...state, phase: 'revealed' } : state;
}

export function answerRecall(state, knew) {
  return state.phase === 'revealed' ? grade(state, knew, null) : state;
}

export function answerChoice(state, itemId) {
  if (state.phase !== 'ask' || !state.choices?.includes(itemId)) return state;
  return grade(state, itemId === state.current, itemId);
}

// Taps far from every candidate are ignored (flagged as missed), not graded
export function answerLocate(state, point, maxDistance) {
  if (state.phase !== 'ask') return state;
  const target = currentItem(state);
  const candidates = state.items.filter((item) => item.kind === target.kind);
  const hit = nearestItem(candidates, point, maxDistance);
  if (!hit) return { ...state, missed: true };
  return grade(state, hit.id === target.id, hit.id, point);
}

// What the shell does after a transition: recall moves on at once (the card was
// self-graded), a correct choice/locate answer after a short pause, a mistake waits for the user
export function autoAdvance(state) {
  if (state.phase !== 'result') return 'none';
  if (state.mode === 'recall') return 'now';
  return state.result.correct ? 'delay' : 'none';
}

export function next(state, rng) {
  if (state.phase !== 'result') return state;
  const ids = state.items.map((item) => item.id);
  return ask(state, pickNext(state.progress, ids, rng, state.current), rng);
}
