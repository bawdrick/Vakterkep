import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPack } from '../tools/pack-builder.js';
import { validateBuild } from '../tools/validate-pack.js';
import { listConfigIds, loadConfig, loadSources, packFile, readJson } from '../tools/pack-io.js';

for (const id of listConfigIds()) {
  test(`pack ${id}: builds, passes geo checks, committed JSON is up to date`, async () => {
    const config = await loadConfig(id);
    const build = buildPack(config, loadSources(config));
    assert.deepEqual(validateBuild(build, config), []);
    assert.deepEqual(readJson(packFile(id)), build.pack, 'run npm run build:packs');
  });
}

test('hu-megyek: 19 counties, 19 seats, Budapest is the seat of Pest', async () => {
  const pack = readJson(packFile('hu-megyek'));
  const kinds = pack.items.map((i) => i.kind);
  assert.equal(kinds.filter((k) => k === 'area').length, 19);
  assert.equal(kinds.filter((k) => k === 'place').length, 19);
  const budapest = pack.items.find((i) => i.name === 'Budapest');
  assert.equal(budapest.group, 'HU-PE');
  assert.match(budapest.detail, /nem része a megyének/);
});
