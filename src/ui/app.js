// App controller: owns state, wires engine + storage + views, re-renders on change.

import { createStore } from '../engine/progress-store.js';
import { deckItems, findDeck } from '../engine/deck.js';
import { masteredCount } from '../engine/leitner.js';
import * as Session from '../engine/session.js';
import { createMapView } from './map-view.js';
import { homeModel, quizModel } from './map-model.js';
import { renderHome } from './home-view.js';
import { renderQuiz } from './quiz-view.js';
import { T } from './strings.js';

const TAP_RADIUS_PX = 30;
const AUTO_NEXT_MS = 1000;

export function createApp({ root, packs, storage, rng }) {
  const store = createStore(storage);
  const mapViews = new Map();
  let settings = store.loadSettings({ packId: packs[0].id, deckId: null, mode: 'recall', showHints: false });
  let session = null;
  let notice = null;
  let confirmingReset = false;
  let autoNext = null;

  const pack = () => packs.find((p) => p.id === settings.packId) ?? packs[0];
  const deck = () => findDeck(pack(), settings.deckId);
  const mapView = () => {
    if (!mapViews.has(pack().id)) mapViews.set(pack().id, createMapView(pack()));
    return mapViews.get(pack().id);
  };
  const ids = (items) => items.map((item) => item.id);

  function updateSettings(patch) {
    settings = { ...settings, ...patch };
    store.saveSettings(settings);
    notice = null;
    confirmingReset = false;
    render();
  }

  // Session transitions persist progress and schedule auto-advance on correct answers
  function setSession(next) {
    clearTimeout(autoNext);
    if (next.progress !== session?.progress) store.saveProgress(pack().id, next.mode, next.progress);
    session = next;
    if (session.phase === 'result' && session.result.correct && session.mode !== 'recall') {
      autoNext = setTimeout(() => setSession(Session.next(session, rng)), AUTO_NEXT_MS);
    }
    if (session.phase === 'result' && session.mode === 'recall') session = Session.next(session, rng);
    render();
  }

  const actions = {
    selectDeck: (deckId) => updateSettings({ deckId }),
    selectMode: (mode) => updateSettings({ mode }),
    toggleHints: (showHints) => updateSettings({ showHints }),
    // Two-step reset with an inline confirmation (dialogs may be blocked when embedded)
    reset() {
      confirmingReset = true;
      render();
    },
    confirmReset() {
      store.clearPack(pack().id);
      confirmingReset = false;
      notice = T.resetDone;
      render();
    },
    cancelReset() {
      confirmingReset = false;
      render();
    },
    start() {
      const progress = store.loadProgress(pack().id, settings.mode);
      session = Session.startSession({ items: deckItems(pack(), deck()), mode: settings.mode, progress, rng });
      render();
    },
    home() {
      clearTimeout(autoNext);
      session = null;
      render();
    },
    reveal: () => setSession(Session.reveal(session)),
    grade: (knew) => setSession(Session.answerRecall(session, knew)),
    choose: (id) => setSession(Session.answerChoice(session, id)),
    next: () => setSession(Session.next(session, rng)),
    tap: (point, unitsPerPx) => setSession(Session.answerLocate(session, point, TAP_RADIUS_PX * unitsPerPx)),
  };

  function render() {
    const view = mapView();
    view.setHints(settings.showHints);
    let screen;
    if (session) {
      const items = session.items;
      view.onTap(session.mode === 'locate' && session.phase === 'ask' ? actions.tap : null);
      screen = renderQuiz({
        pack: pack(), deck: deck(), session, mapElement: view.element, actions,
        mastered: masteredCount(session.progress, ids(items)), total: items.length,
      });
      root.replaceChildren(screen);
      view.update(quizModel(pack(), session));
    } else {
      view.onTap(null);
      const progress = store.loadProgress(pack().id, settings.mode);
      const deckStats = pack().decks.map((d) => {
        const items = deckItems(pack(), d);
        return { deck: d, mastered: masteredCount(progress, ids(items)), total: items.length };
      });
      screen = renderHome({ pack: pack(), settings: { ...settings, deckId: deck().id }, deckStats, mapElement: view.element, notice, confirmingReset, actions });
      root.replaceChildren(screen);
      view.update(homeModel(pack(), deckItems(pack(), deck()), progress));
    }
  }

  // Keyboard shortcuts for desktop use
  function onKey(event) {
    if (!session || event.altKey || event.ctrlKey || event.metaKey) return;
    const { mode, phase } = session;
    const key = event.key;
    if ((key === ' ' || key === 'Enter') && event.target.tagName !== 'BUTTON') {
      if (mode === 'recall' && phase === 'ask') actions.reveal();
      else if (phase === 'result') actions.next();
      else return;
    } else if (mode === 'recall' && phase === 'revealed' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      actions.grade(key === 'ArrowRight');
    } else if (mode === 'choice' && phase === 'ask' && /^[1-9]$/.test(key) && session.choices[Number(key) - 1]) {
      actions.choose(session.choices[Number(key) - 1]);
    } else if (key === 'Escape') {
      actions.home();
    } else return;
    event.preventDefault();
  }

  root.ownerDocument.addEventListener('keydown', onKey);
  render();
  return { actions, getState: () => ({ settings, session }) };
}
