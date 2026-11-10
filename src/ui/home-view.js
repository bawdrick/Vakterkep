// Home screen: deck and mode selection, progress map, settings.

import { h } from './dom.js';
import { T } from './strings.js';
import { MODES } from '../engine/pack-schema.js';
import { percent } from '../engine/format.js';
import { PROGRESS_TONES } from './map-model.js';
import { markerSwatch } from './map-view.js';

function deckRow({ deck, mastered, total }, selected, onSelect) {
  return h('label', { class: 'deck-row' }, [
    h('input', {
      type: 'radio', name: 'deck', value: deck.id, checked: selected, 'data-key': `deck-${deck.id}`,
      onChange: () => onSelect(deck.id),
    }),
    h('span', { class: 'deck-name' }, deck.title),
    h('span', { class: 'deck-count' }, T.mastered(mastered, total)),
    h('span', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: `width:${percent(mastered, total)}%` })),
  ]);
}

// Native radios: arrow keys, focus and screen reader roles come from the browser
function modePicker(mode, onSelect) {
  return h('div', { class: 'segmented' }, MODES.map((m) => h('label', { class: 'segment' }, [
    h('input', { type: 'radio', name: 'mode', value: m, checked: m === mode, 'data-key': `mode-${m}`, onChange: () => onSelect(m) }),
    h('span', {}, T.modes[m].title),
  ])));
}

// Swatches repeat the map shapes; counts give the same information as text
function legend(markers, counts) {
  return h('ul', { class: 'legend' }, PROGRESS_TONES.map((tone) => h('li', {}, [
    h('span', { class: 'swatches' }, markers.map((marker) => markerSwatch(marker, tone))),
    T.legendItem(T.legend[tone], counts[tone]),
  ])));
}

function toggle(key, checked, label, onToggle) {
  return h('label', { class: 'switch' }, [
    h('input', { type: 'checkbox', checked, 'data-key': key, onChange: (e) => onToggle(e.target.checked) }),
    h('span', {}, label),
  ]);
}

function resetControl(confirming, actions) {
  if (!confirming) return h('button', { type: 'button', class: 'btn-text', 'data-key': 'reset', onClick: actions.reset }, T.reset);
  return h('div', { class: 'confirm', role: 'group', 'aria-label': T.reset }, [
    h('p', {}, T.resetConfirm),
    h('div', { class: 'actions two' }, [
      h('button', { type: 'button', class: 'btn', 'data-key': 'cancel-reset', 'data-autofocus': true, onClick: actions.cancelReset }, T.cancel),
      h('button', { type: 'button', class: 'btn btn-wrong', 'data-key': 'confirm-reset', onClick: actions.confirmReset }, T.confirmReset),
    ]),
  ]);
}

export function renderHome({ pack, settings, deckStats, markers, counts, mapElement, notice, confirmingReset, actions }) {
  return h('main', { class: 'screen home' }, [
    h('header', { class: 'home-head' }, [
      h('h1', {}, T.appTitle),
      h('p', { class: 'pack-title' }, pack.title),
    ]),
    h('section', { class: 'map-panel' }, [h('div', { class: 'paper' }, mapElement), legend(markers, counts)]),
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
      toggle('hints', settings.showHints, pack.hintsLabel, actions.toggleHints),
      h('button', {
        type: 'button', class: 'btn btn-primary', 'data-key': 'start', 'data-autofocus': !confirmingReset, onClick: actions.start,
      }, T.start),
      resetControl(confirmingReset, actions),
      notice && h('p', { class: 'notice', role: 'status' }, notice),
    ]),
    h('footer', { class: 'attribution' }, pack.attribution),
  ]);
}

// Shown instead of the app when no bundled pack passed validation
export function renderNoPacks() {
  return h('main', { class: 'screen' }, [
    h('h1', {}, T.appTitle),
    h('p', { class: 'notice is-error', role: 'alert' }, T.noPacks),
  ]);
}
