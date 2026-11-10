// Pure view-model for the map: decides marker tones, the pen focus circle and labels.
// Keeps all display decisions testable without a DOM.

import { MASTERED_BOX, boxOf } from '../engine/leitner.js';

const markerOf = (pack, item) => pack.kinds[item.kind].marker;

function label(pack, item, tone) {
  const [, , width] = pack.viewBox;
  return { id: item.id, x: item.x, y: item.y, text: item.name, tone, anchor: item.x > width * 0.68 ? 'end' : 'start' };
}

// Home: markers show learning progress of the selected deck
export function homeModel(pack, items, progress) {
  const tone = (id) => {
    const box = boxOf(progress, id);
    return box >= MASTERED_BOX ? 'mastered' : box > 0 ? 'learning' : 'idle';
  };
  return {
    markers: items.map((item) => ({ id: item.id, x: item.x, y: item.y, marker: markerOf(pack, item), tone: tone(item.id) })),
    focus: null,
    labels: [],
  };
}

// Quiz: target focus for recall/choice, answer feedback after grading
export function quizModel(pack, session) {
  const target = session.items.find((item) => item.id === session.current);
  const result = session.phase === 'result' ? session.result : null;
  const wrongId = result && !result.correct ? result.chosenId : null;

  const tone = (id) => {
    if (result && id === target.id) return result.correct ? 'ok' : 'answer';
    if (id === wrongId) return 'wrong';
    return 'idle';
  };

  const labels = [];
  if (session.phase === 'revealed') labels.push(label(pack, target, 'answer'));
  if (result) {
    labels.push(label(pack, target, result.correct ? 'ok' : 'answer'));
    if (wrongId) labels.push(label(pack, session.items.find((item) => item.id === wrongId), 'wrong'));
  }

  const showFocus = session.mode !== 'locate' || Boolean(result);
  return {
    markers: session.items.map((item) => ({ id: item.id, x: item.x, y: item.y, marker: markerOf(pack, item), tone: tone(item.id) })),
    focus: showFocus ? { id: target.id, x: target.x, y: target.y } : null,
    labels,
  };
}
