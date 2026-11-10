// Leitner-box spaced repetition: correct answers move a card up, mistakes reset it.
// Progress is plain JSON: { items: { [id]: { box, seen, correct } } }.

export const MAX_BOX = 5;
export const MASTERED_BOX = 3;

export const emptyProgress = () => ({ items: {} });

export const boxOf = (progress, id) => progress.items[id]?.box ?? 0;

export function recordAnswer(progress, id, isCorrect) {
  const prev = progress.items[id] ?? { box: 0, seen: 0, correct: 0 };
  const next = {
    box: isCorrect ? Math.min(prev.box + 1, MAX_BOX) : 1,
    seen: prev.seen + 1,
    correct: prev.correct + (isCorrect ? 1 : 0),
  };
  return { ...progress, items: { ...progress.items, [id]: next } };
}

// Lower boxes are exponentially more likely; new cards (box 0) come first-ish
export function cardWeight(box) {
  return 2 ** (MAX_BOX - box);
}

export function pickNext(progress, ids, rng, excludeId = null) {
  const pool = ids.length > 1 ? ids.filter((id) => id !== excludeId) : ids;
  const weights = pool.map((id) => cardWeight(boxOf(progress, id)));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool.at(-1);
}

export function masteredCount(progress, ids) {
  return ids.filter((id) => boxOf(progress, id) >= MASTERED_BOX).length;
}
