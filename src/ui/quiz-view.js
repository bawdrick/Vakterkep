// Quiz screen: map + card with prompt, answer and actions for the current phase.
// data-key keeps focus across re-renders, data-autofocus marks where focus goes in each phase.

import { h } from './dom.js';
import { T } from './strings.js';
import { fillTemplate, percent } from '../engine/format.js';
import { currentItem } from '../engine/session.js';

const button = (label, onClick, cls, key, autofocus = false) =>
  h('button', { type: 'button', class: cls, 'data-key': key, 'data-autofocus': autofocus, onClick }, label);

function recallBody(session, item, actions) {
  if (session.phase === 'ask') return [button(T.reveal, actions.reveal, 'btn btn-primary', 'reveal', true)];
  return [
    h('p', { class: 'answer' }, item.name),
    h('p', { class: 'detail' }, item.detail),
    h('div', { class: 'actions two' }, [
      button(T.didntKnow, () => actions.grade(false), 'btn btn-wrong', 'didnt-know', true),
      button(T.knew, () => actions.grade(true), 'btn btn-ok', 'knew'),
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
      type: 'button', class: optionClass(id), disabled: Boolean(result), 'data-key': `choice-${id}`,
      'data-autofocus': !result && i === 0, onClick: () => actions.choose(id),
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
    h('div', { class: 'actions' }, [button(T.next, actions.next, 'btn btn-primary', 'next', true)]),
  ];
}

// Locate mode has no button while asking; the prompt takes focus so keyboard users stay in the card
function promptHeading(text, session) {
  const focusable = session.mode === 'locate' && session.phase === 'ask';
  return h('h2', { class: 'prompt', tabindex: focusable ? '-1' : null, 'data-autofocus': focusable }, text);
}

export function renderQuiz({ pack, deck, session, mastered, total, mapElement, actions }) {
  const item = currentItem(session);
  const prompt = fillTemplate(pack.kinds[item.kind].prompts[session.mode], item);
  const body = {
    recall: () => recallBody(session, item, actions),
    choice: () => choiceBody(session, item, actions),
    locate: () => locateBody(session, item, pack, actions),
  }[session.mode]();

  return h('main', { class: `screen quiz mode-${session.mode}` }, [
    h('header', { class: 'quiz-bar' }, [
      button(T.back, actions.home, 'btn-text back', 'back'),
      h('p', { class: 'quiz-title' }, deck.title),
      h('p', { class: 'quiz-score' }, session.stats.answered ? T.score(session.stats.correct, session.stats.answered) : ''),
    ]),
    h('div', {
      class: 'meter wide', role: 'progressbar', 'aria-valuenow': String(mastered), 'aria-valuemin': '0',
      'aria-valuemax': String(total), 'aria-label': T.mastered(mastered, total),
    }, h('span', { style: `width:${percent(mastered, total)}%` })),
    h('section', { class: 'map-panel' }, h('div', { class: 'paper' }, mapElement)),
    h('section', { class: 'card', 'aria-live': 'polite' }, [
      deck.kinds.length > 1 && h('p', { class: 'kind' }, pack.kinds[item.kind].label),
      promptHeading(prompt, session),
      ...body,
      h('p', { class: 'keys' }, T.keyboard),
    ]),
  ]);
}
