import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildChecked } from '../../tools/build-pack.js';
import { extractSubset } from '../../tools/fetch-sources.js';
import { renderPreview } from '../../tools/preview-pack.js';
import { fromRoot, isMain } from '../../tools/pack-io.js';
import { roundTo } from '../../tools/geo/round.js';
import { config, sources } from '../fixtures/mini-pack.js';

test('isMain matches the started script, including Windows paths', () => {
  const script = fromRoot('tools', 'preview-pack.js');
  assert.equal(isMain(pathToFileURL(script).href, ['node', script]), true);
  assert.equal(isMain(pathToFileURL(script).href, ['node', fromRoot('tools', 'build-site.js')]), false);
  assert.equal(isMain(pathToFileURL(script).href, ['node']), false);
});

// Regression: the old `file://${argv[1]}` check never matched on Windows, so the CLIs silently did nothing
test('preview CLI actually runs when started directly', () => {
  const out = execFileSync(process.execPath, [fromRoot('tools', 'preview-pack.js'), 'hu-megyek'], { encoding: 'utf8' });
  assert.match(out, /preview -> .*preview-hu-megyek\.svg/);
});

test('buildChecked reports items and size, or every validation error', () => {
  const ok = buildChecked(config, sources);
  assert.equal(ok.ok, true);
  assert.match(ok.message, /^test: 4 items, [\d.]+ KB/);
  const crowded = buildChecked({ ...config, minPointSpacing: 10000 }, sources);
  assert.equal(crowded.ok, false);
  assert.match(crowded.message, /test: 2 error\(s\)/);
  assert.equal(crowded.pack, undefined, 'nothing to write on failure');
});

test('extractSubset filters features, keeps listed properties, rounds to ~1 m', () => {
  const collection = { features: [
    { properties: { c: 'HUN', name: 'A', junk: 1 }, geometry: { type: 'Point', coordinates: [19.1234567, 47.7654321] } },
    { properties: { c: 'AUT', name: 'B' }, geometry: { type: 'Point', coordinates: [16, 48] } },
  ] };
  const subset = extractSubset(collection, { filter: { prop: 'c', equals: 'HUN' }, keep: ['name'] });
  assert.equal(subset.features.length, 1);
  assert.deepEqual(subset.features[0].properties, { name: 'A' });
  assert.deepEqual(subset.features[0].geometry.coordinates, [19.12346, 47.76543]);
});

test('renderPreview draws every marker with an escaped label', () => {
  const pack = { ...buildChecked(config, sources).pack };
  pack.items = pack.items.map((item, i) => (i === 0 ? { ...item, name: 'A & <B>' } : item));
  const svg = renderPreview(pack);
  assert.equal(svg.match(/<circle /g).length, pack.items.length);
  assert.match(svg, /A &amp; &lt;B&gt;/);
});

test('roundTo rounds to the given decimals', () => {
  assert.equal(roundTo(1.25, 1), 1.3);
  assert.equal(roundTo(-0.123456, 5), -0.12346);
  assert.equal(roundTo(7, 0), 7);
});
