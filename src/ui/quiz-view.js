// Quiz screen: map + card with prompt, answer and actions for the current phase.

import { h } from './dom.js';
import { T } from './strings.js';
import { fillTemplate } from '../engine/format.js';
import { currentItem } from '../engine/session.js';

const button = (label, onClick, cls = 'btn') => h('button', { type: 'button', class: cls, onClick }, label);

function recallBody(session, item, actions) {
  if (session.phase === 'ask') return [button(T.reveal, actions.reveal, 'btn btn-primary')];
  return [
    h('p', { class: 'answer' }, item.name),
    h('p', { class: 'detail' }, item.detail),
    h('div', { class: 'actions two' }, [
      button(T.didntKnow, () => actions.grade(false), 'btn btn-wrong'),
      button(T.knew, () => actions.grade(true), 'btn btn-ok'),
    ]),
  ];
}

function choiceBody(session, item, actions) {
  const result = session.phase === 'result' ? session.result : null;
  const optionClass = (id) => {
    if (!result) return 'btn option';
    if (id === item.id) return 'btn option is-correct';
    return id === result.chosenId ? 'btn option is-wrong' : 'btn option is-dim';
  };
  const options = session.choices.map((id, i) => {
    const option = session.items.find((it) => it.id === id);
    return h('button', {
      type: 'button', class: optionClass(id), disabled: Boolean(result), onClick: () => actions.choose(id),
    }, [h('span', { class: 'key', 'aria-hidden': 'true' }, String(i + 1)), option.name]);
  });
  return [h('div', { class: 'options' }, options), ...feedback(result, item, T.wrongChoice(item.name), actions)];
}

function locateBody(session, item, pack, actions) {
  const result = session.phase === 'result' ? session.result : null;
  if (!result) {
    const hint = session.missed ? T.missed : T.locateHint[pack.kinds[item.kind].marker];
    return [h('p', { class: `hint${session.missed ? ' is-missed' : ''}`, role: 'status' }, hint)];
  }
  const chosen = session.items.find((it) => it.id === result.chosenId);
  return feedback(result, item, T.wrongLocate(chosen?.name ?? ''), actions);
}

function feedback(result, item, wrongText, actions) {
  if (!result) return [];
  return [
    h('p', { class: `verdict ${result.correct ? 'is-ok' : 'is-wrong'}`, role: 'status' }, result.correct ? T.correct : wrongText),
    h('p', { class: 'detail' }, item.detail),
    h('div', { class: 'actions' }, [button(T.next, actions.next, 'btn btn-primary')]),
  ];
}

export function renderQuiz({ pack, deck, session, mastered, total, mapElement, actions }) {
  const item = currentItem(session);
  const prompt = fillTemplate(pack.kinds[item.kind].prompts[session.mode], item);
  const body = {
    recall: () => recallBody(session, item, actions),
    choice: () => choiceBody(session, item, actions),
    locate: () => locateBody(session, item, pack, actions),
  }[session.mode]();
  const pct = total ? Math.round((mastered / total) * 100) : 0;

  return h('main', { class: `screen quiz mode-${session.mode}` }, [
    h('header', { class: 'quiz-bar' }, [
      button(T.back, actions.home, 'btn-text back'),
      h('p', { class: 'quiz-title' }, deck.title),
      h('p', { class: 'quiz-score' }, session.stats.answered ? T.score(session.stats.correct, session.stats.answered) : ''),
    ]),
    h('div', { class: 'meter wide', role: 'progressbar', 'aria-valuenow': String(mastered), 'aria-valuemax': String(total), 'aria-label': T.mastered(mastered, total) },
      h('span', { style: `width:${pct}%` })),
    h('section', { class: 'map-panel' }, h('div', { class: 'paper' }, mapElement)),
    h('section', { class: 'card', 'aria-live': 'polite' }, [
      deck.kinds.length > 1 && h('p', { class: 'kind' }, pack.kinds[item.kind].label),
      h('h2', { class: 'prompt' }, prompt),
      ...body,
      h('p', { class: 'keys' }, T.keyboard),
    ]),
  ]);
}
