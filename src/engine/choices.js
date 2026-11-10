// Multiple-choice options: the answer plus nearby same-kind distractors (harder, more useful).

import { shuffle } from './rng.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function pickChoices(target, items, rng, count = 4) {
  const neighbours = items
    .filter((item) => item.kind === target.kind && item.id !== target.id)
    .sort((a, b) => dist(a, target) - dist(b, target))
    .slice(0, count + 2);
  const distractors = shuffle(neighbours, rng).slice(0, count - 1);
  return shuffle([target, ...distractors], rng);
}
