// Home screen: deck and mode selection, progress map, settings.

import { h } from './dom.js';
import { T } from './strings.js';
import { MODES } from '../engine/pack-schema.js';

function deckRow({ deck, mastered, total }, selected, onSelect) {
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  return h('label', { class: 'deck-row' }, [
    h('input', { type: 'radio', name: 'deck', value: deck.id, checked: selected, onChange: () => onSelect(deck.id) }),
    h('span', { class: 'deck-name' }, deck.title),
    h('span', { class: 'deck-count' }, T.mastered(mastered, total)),
    h('span', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: `width:${pct}%` })),
  ]);
}

function modePicker(mode, onSelect) {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': T.modeHeading },
    MODES.map((m) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(m === mode), class: 'segment',
      onClick: () => onSelect(m),
    }, T.modes[m].title)));
}

function legend() {
  return h('ul', { class: 'legend' }, ['idle', 'learning', 'mastered'].map((tone) =>
    h('li', {}, [h('span', { class: `swatch tone-${tone}`, 'aria-hidden': 'true' }), T.legend[tone]])));
}

function resetControl(confirming, actions) {
  if (!confirming) return h('button', { type: 'button', class: 'btn-text', onClick: actions.reset }, T.reset);
  return h('div', { class: 'confirm', role: 'group' }, [
    h('p', {}, T.resetConfirm),
    h('div', { class: 'actions two' }, [
      h('button', { type: 'button', class: 'btn', onClick: actions.cancelReset }, T.cancel),
      h('button', { type: 'button', class: 'btn btn-wrong', onClick: actions.confirmReset }, T.confirmReset),
    ]),
  ]);
}

export function renderHome({ pack, settings, deckStats, mapElement, notice, confirmingReset, actions }) {
  return h('main', { class: 'screen home' }, [
    h('header', { class: 'home-head' }, [
      h('h1', {}, T.appTitle),
      h('p', { class: 'pack-title' }, pack.title),
    ]),
    h('section', { class: 'map-panel' }, [h('div', { class: 'paper' }, mapElement), legend()]),
    h('section', { class: 'controls' }, [
      h('fieldset', {}, [
        h('legend', {}, T.deckHeading),
        ...deckStats.map((stat) => deckRow(stat, stat.deck.id === settings.deckId, actions.selectDeck)),
      ]),
      h('fieldset', {}, [
        h('legend', {}, T.modeHeading),
        modePicker(settings.mode, actions.selectMode),
        h('p', { class: 'mode-hint' }, T.modes[settings.mode].hint),
      ]),
      h('label', { class: 'switch' }, [
        h('input', { type: 'checkbox', checked: settings.showHints, onChange: (e) => actions.toggleHints(e.target.checked) }),
        h('span', {}, pack.hintsLabel),
      ]),
      h('button', { type: 'button', class: 'btn btn-primary', onClick: actions.start }, T.start),
      resetControl(confirmingReset, actions),
      notice && h('p', { class: 'notice', role: 'status' }, notice),
    ]),
    h('footer', { class: 'attribution' }, pack.attribution),
  ]);
}
