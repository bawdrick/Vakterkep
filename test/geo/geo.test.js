import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon, pointWithinOuterRings, ringArea } from '../../tools/geo/geometry.js';
import { createProjection, fitToCanvas } from '../../tools/geo/projection.js';
import { simplifyLine, simplifyRing } from '../../tools/geo/simplify.js';
import { polylabel } from '../../tools/geo/polylabel.js';
import { ringToPath } from '../../tools/geo/svg-path.js';

const square = (s, o = 0) => [[o, o], [o + s, o], [o + s, o + s], [o, o + s], [o, o]];
const donut = [square(10), square(4, 3)];

test('point in polygon honours holes; outer-ring check ignores them', () => {
  assert.equal(pointInPolygon([1, 1], donut), true);
  assert.equal(pointInPolygon([5, 5], donut), false);
  assert.equal(pointWithinOuterRings([5, 5], [donut]), true);
  assert.equal(Math.abs(ringArea(square(10))), 100);
});

test('equirectangular keeps the centre at origin and flips y', () => {
  const p = createProjection('equirectangular', [19, 47]);
  assert.deepEqual(p([19, 47]), [0, -0]);
  const [x, y] = p([20, 48]);
  assert.ok(Math.abs(x - Math.cos((47 * Math.PI) / 180)) < 1e-9);
  assert.equal(y, -1);
});

test('lambert azimuthal is identity-like near the centre', () => {
  const p = createProjection('lambert-azimuthal', [10, 50]);
  const [x, y] = p([10, 51]);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y + 1) < 0.01);
  assert.throws(() => createProjection('nope', [0, 0]));
});

test('fitToCanvas maps bounds to the padded canvas', () => {
  const fit = fitToCanvas(([x, y]) => [x, -y], [[0, 0], [10, 5]], { width: 120, padding: 10 });
  assert.deepEqual(fit.project([0, 5]), [10, 10]);
  assert.deepEqual(fit.project([10, 0]), [110, 60]);
  assert.equal(fit.height, 70);
});

test('simplify removes collinear points and drops tiny rings', () => {
  assert.deepEqual(simplifyLine([[0, 0], [1, 0.01], [2, 0]], 0.5), [[0, 0], [2, 0]]);
  const dense = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10], [0, 10], [0, 5], [0, 0]];
  assert.equal(simplifyRing(dense, 0.5).length, 5);
  assert.equal(simplifyRing(square(0.5), 1), null);
});

test('polylabel finds the visual centre, avoiding holes', () => {
  const [x, y] = polylabel([square(10)], 0.1);
  assert.ok(Math.abs(x - 5) < 0.2 && Math.abs(y - 5) < 0.2);
  const c = polylabel(donut, 0.1);
  assert.equal(pointInPolygon(c, donut), true);
});

test('ringToPath writes a closed compact path', () => {
  assert.equal(ringToPath([[0, 0], [1.26, 0], [1, 1], [0, 0]]), 'M0 0L1.3 0 1 1Z');
});
