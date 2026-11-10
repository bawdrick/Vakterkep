import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPack } from '../tools/pack-builder.js';
import { validateBuild } from '../tools/validate-pack.js';
import { validatePack } from '../src/engine/pack-schema.js';

import { config, sources } from './fixtures/mini-pack.js';

test('builder works from generated regions and passes all checks', () => {
  const build = buildPack(config, sources);
  assert.deepEqual(validatePack(build.pack), []);
  assert.deepEqual(validateBuild(build, config), []);
  assert.equal(build.pack.items.length, 4);
  const capital = build.pack.items.find((i) => i.id === 'BB/seat');
  assert.equal(capital.name, 'Főváros BB');
  assert.equal(capital.detail, 'Ország BB fővárosa');
  assert.equal(build.pack.viewBox[2], 500);
});

test('builder fails loudly on a missing source unit', () => {
  const broken = { ...config, regions: [{ id: 'X', name: 'X', parts: ['ZZ'] }] };
  assert.throws(() => buildPack(broken, sources), /Area not found in source: ZZ/);
});

test('validation catches a place outside its region', () => {
  const wrongSeat = { ...config, regions: (src) => config.regions(src).map((r) => ({ ...r, seatRef: r.id === 'AA' ? 'BB' : 'AA' })) };
  const errors = validateBuild(buildPack(wrongSeat, sources), wrongSeat);
  assert.equal(errors.filter((e) => e.includes('is not within')).length, 2);
});
