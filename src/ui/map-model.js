// Pure view-model for the map: decides marker tones, the pen focus circle and labels.
// Keeps all display decisions testable without a DOM.

import { MASTERED_BOX, boxOf } from '../engine/leitner.js';

// Points right of this share of the map width get their label on the left
const LABEL_FLIP_AT = 0.68;

export const PROGRESS_TONES = ['idle', 'learning', 'mastered'];

const markerOf = (pack, item) => pack.kinds[item.kind].marker;
const markerModel = (pack, item, tone) => ({ id: item.id, x: item.x, y: item.y, marker: markerOf(pack, item), tone });

function label(pack, item, tone) {
  const [, , width] = pack.viewBox;
  return { id: item.id, x: item.x, y: item.y, text: item.name, tone, anchor: item.x > width * LABEL_FLIP_AT ? 'end' : 'start' };
}

export function progressTone(progress, id) {
  const box = boxOf(progress, id);
  if (box >= MASTERED_BOX) return 'mastered';
  return box > 0 ? 'learning' : 'idle';
}

// Home: markers show learning progress of the selected deck; counts back the legend with text
export function homeModel(pack, items, progress) {
  const markers = items.map((item) => markerModel(pack, item, progressTone(progress, item.id)));
  const counts = Object.fromEntries(PROGRESS_TONES.map((tone) => [tone, markers.filter((m) => m.tone === tone).length]));
  return { markers, focus: null, labels: [], counts };
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
    markers: session.items.map((item) => markerModel(pack, item, tone(item.id))),
    focus: showFocus ? { id: target.id, x: target.x, y: target.y } : null,
    labels,
  };
}
