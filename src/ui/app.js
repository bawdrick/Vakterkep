// App controller: owns the UI state, wires engine + storage + views, re-renders on change.
// Decisions live in the engine and the map model; this file only applies them.

import { createStore } from '../engine/progress-store.js';
import { deckItems, findDeck } from '../engine/deck.js';
import { masteredCount } from '../engine/leitner.js';
import { normalizeSettings } from '../engine/settings.js';
import * as Session from '../engine/session.js';
import { focusedKey, restoreFocus } from './dom.js';
import { keyCommand } from './keymap.js';
import { createMapView } from './map-view.js';
import { homeModel, locateRadius, quizModel } from './map-model.js';
import { renderHome, renderNoPacks } from './home-view.js';
import { renderQuiz } from './quiz-view.js';
import { T } from './strings.js';

const AUTO_NEXT_MS = 1000;

const ids = (items) => items.map((item) => item.id);
const packOf = (ctx) => ctx.packs.find((p) => p.id === ctx.state.settings.packId) ?? ctx.packs[0];
const deckOf = (ctx) => findDeck(packOf(ctx), ctx.state.settings.deckId);

function mapViewOf(ctx) {
  const pack = packOf(ctx);
  if (!ctx.mapViews.has(pack.id)) ctx.mapViews.set(pack.id, createMapView(pack));
  return ctx.mapViews.get(pack.id);
}

function setState(ctx, patch) {
  ctx.state = { ...ctx.state, ...patch };
  ctx.render();
}

function updateSettings(ctx, patch) {
  const settings = { ...ctx.state.settings, ...patch };
  ctx.store.saveSettings(settings);
  setState(ctx, { settings, notice: null, confirmingReset: false });
}

// Session transitions persist progress, then follow the engine's auto-advance policy
function setSession(ctx, next) {
  ctx.timers.clearTimeout(ctx.autoNext);
  if (next.progress !== ctx.state.session?.progress) ctx.store.saveProgress(packOf(ctx).id, next.mode, next.progress);
  const step = Session.autoAdvance(next);
  if (step === 'delay') {
    ctx.autoNext = ctx.timers.setTimeout(() => setSession(ctx, Session.next(ctx.state.session, ctx.rng)), AUTO_NEXT_MS);
  }
  setState(ctx, { session: step === 'now' ? Session.next(next, ctx.rng) : next });
}

function startSession(ctx) {
  const { mode } = ctx.state.settings;
  const progress = ctx.store.loadProgress(packOf(ctx).id, mode);
  const session = Session.startSession({ items: deckItems(packOf(ctx), deckOf(ctx)), mode, progress, rng: ctx.rng });
  setState(ctx, { session, notice: null, confirmingReset: false });
}

function createActions(ctx) {
  const session = () => ctx.state.session;
  return {
    selectDeck: (deckId) => updateSettings(ctx, { deckId }),
    selectMode: (mode) => updateSettings(ctx, { mode }),
    toggleHints: (showHints) => updateSettings(ctx, { showHints }),
    toggleAllMarkers: (showAllMarkers) => updateSettings(ctx, { showAllMarkers }),
    // Two-step reset with an inline confirmation: window.confirm may be blocked when embedded
    reset: () => setState(ctx, { confirmingReset: true, notice: null }),
    cancelReset: () => setState(ctx, { confirmingReset: false }),
    confirmReset() {
      ctx.store.clearPack(packOf(ctx).id);
      setState(ctx, { confirmingReset: false, notice: T.resetDone });
    },
    start: () => startSession(ctx),
    home() {
      ctx.timers.clearTimeout(ctx.autoNext);
      setState(ctx, { session: null });
    },
    reveal: () => setSession(ctx, Session.reveal(session())),
    grade: (knew) => setSession(ctx, Session.answerRecall(session(), knew)),
    choose: (id) => setSession(ctx, Session.answerChoice(session(), id)),
    next: () => setSession(ctx, Session.next(session(), ctx.rng)),
    tap(point, unitsPerPx) {
      const radius = locateRadius(ctx.state.settings.showAllMarkers, unitsPerPx);
      setSession(ctx, Session.answerLocate(session(), point, radius));
    },
  };
}

function homeScreen(ctx, view) {
  const pack = packOf(ctx);
  const deck = deckOf(ctx);
  const progress = ctx.store.loadProgress(pack.id, ctx.state.settings.mode);
  const deckStats = pack.decks.map((d) => {
    const items = deckItems(pack, d);
    return { deck: d, mastered: masteredCount(progress, ids(items)), total: items.length };
  });
  const model = homeModel(pack, deckItems(pack, deck), progress);
  const markers = [...new Set(deck.kinds.map((kind) => pack.kinds[kind].marker))];
  const screen = renderHome({
    ...ctx.state, pack, deckStats, markers, counts: model.counts, mapElement: view.element, actions: ctx.actions,
  });
  return { screen, model, tap: null };
}

function quizScreen(ctx, view) {
  const { session, settings } = ctx.state;
  const showAll = settings.showAllMarkers;
  const screen = renderQuiz({
    pack: packOf(ctx), deck: deckOf(ctx), session, showAll, mapElement: view.element, actions: ctx.actions,
    mastered: masteredCount(session.progress, ids(session.items)), total: session.items.length,
  });
  const tap = session.mode === 'locate' && session.phase === 'ask' ? ctx.actions.tap : null;
  return { screen, model: quizModel(packOf(ctx), session, { showAll }), tap };
}

function render(ctx) {
  const view = mapViewOf(ctx);
  const key = focusedKey(ctx.root);
  const { screen, model, tap } = ctx.state.session ? quizScreen(ctx, view) : homeScreen(ctx, view);
  view.setHints(ctx.state.settings.showHints);
  view.onTap(tap);
  ctx.root.replaceChildren(screen);
  view.update(model);
  restoreFocus(ctx.root, key);
}

function onKey(ctx, event) {
  const command = keyCommand(ctx.state.session, {
    key: event.key, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
    onButton: event.target?.tagName === 'BUTTON',
  });
  if (!command) return;
  event.preventDefault();
  const [name, arg] = command;
  ctx.actions[name](arg);
}

export function createApp({ root, packs, storage, rng, timers = globalThis }) {
  if (!packs.length) {
    root.replaceChildren(renderNoPacks());
    return null;
  }
  const store = createStore(storage);
  const ctx = {
    root, packs, rng, timers, store, mapViews: new Map(), autoNext: null,
    state: { settings: normalizeSettings(store.loadSettings({}), packs), session: null, notice: null, confirmingReset: false },
  };
  ctx.render = () => render(ctx);
  ctx.actions = createActions(ctx);

  const keyListener = (event) => onKey(ctx, event);
  root.ownerDocument.addEventListener('keydown', keyListener);
  ctx.render();
  return {
    actions: ctx.actions,
    getState: () => ctx.state,
    destroy() {
      timers.clearTimeout(ctx.autoNext);
      root.ownerDocument.removeEventListener('keydown', keyListener);
    },
  };
}
