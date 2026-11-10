import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from '../helpers/dom-env.js';
import { createMapView, fitSide, penLoopPath } from '../../src/ui/map-view.js';
import { runtimePack } from '../fixtures/runtime-pack.js';

const window = installDom();
const pack = runtimePack();
const marker = (patch) => ({ id: 'A', x: 100, y: 100, marker: 'ring', tone: 'idle', ...patch });

function mountView() {
  const view = createMapView(pack);
  document.body.replaceChildren(view.element);
  return view;
}

test('fitSide keeps the side unless the label box leaves the map', () => {
  assert.equal(fitSide('start', { x: 900, width: 90 }, 1000), 'start');
  assert.equal(fitSide('start', { x: 920, width: 90 }, 1000), 'end');
  assert.equal(fitSide('end', { x: -5, width: 90 }, 1000), 'start');
  assert.equal(fitSide('end', undefined, 1000), 'end', 'unmeasurable labels stay put');
});

// Regression: labels of points near the edge were cut off by the map border
test('a label that would overflow is flipped to the other side', () => {
  const view = mountView();
  const proto = window.SVGGraphicsElement.prototype;
  const original = proto.getBBox;
  // happy-dom has no layout: measure a 120 unit wide label from its x and anchor
  proto.getBBox = function getBBox() {
    const x = Number(this.getAttribute('x'));
    const width = 120;
    return { x: this.getAttribute('text-anchor') === 'end' ? x - width : x, y: 0, width, height: 20 };
  };
  try {
    view.update({ markers: [], focus: null, labels: [{ id: 'D', x: 950, y: 300, text: 'Delta', tone: 'ok', anchor: 'start' }] });
    assert.equal(view.element.querySelector('.map-label').getAttribute('text-anchor'), 'end');
  } finally {
    proto.getBBox = original;
  }
});

test('markers follow the model: dashed learning ring, hollow-capable dot, tick when mastered', () => {
  const view = mountView();
  view.update({
    markers: [marker({ tone: 'learning' }), marker({ id: 'P', marker: 'dot', tone: 'mastered' }), marker({ id: 'C' })],
    focus: { id: 'C', x: 100, y: 100 }, labels: [],
  });
  const svg = view.element;
  assert.equal(svg.querySelectorAll('circle.marker').length, 3);
  assert.ok(svg.querySelector('.marker-ring.tone-learning').getAttribute('stroke-dasharray'));
  assert.equal(svg.querySelector('.marker-ring.tone-idle').getAttribute('stroke-dasharray'), null);
  assert.equal(svg.querySelectorAll('.map-check').length, 1);
  assert.match(svg.querySelector('.map-focus').getAttribute('class'), /is-drawing/);
  view.update({ markers: [], focus: { id: 'C', x: 100, y: 100 }, labels: [] });
  assert.doesNotMatch(svg.querySelector('.map-focus').getAttribute('class'), /is-drawing/, 'no replay for the same item');
});

test('hints and tap mode toggle classes on the map', () => {
  const view = mountView();
  view.setHints(true);
  assert.ok(view.element.querySelector('.map-hints').classList.contains('is-visible'));
  view.onTap(() => {});
  assert.ok(view.element.classList.contains('is-tappable'));
  view.onTap(null);
  assert.equal(view.element.classList.contains('is-tappable'), false);
});

test('penLoopPath is a single open path around the point', () => {
  const d = penLoopPath(50, 50, 10);
  assert.match(d, /^M[\d.]+ [\d.]+L/);
  const xs = [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.min(...xs) < 41 && Math.max(...xs) > 59, 'surrounds the point horizontally');
});
