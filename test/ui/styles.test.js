import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fromRoot } from '../../tools/pack-io.js';

const css = readFileSync(fromRoot('src/ui/styles.css'), 'utf8');

const tokensIn = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const blockAfter = (selector) => {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `missing ${selector}`);
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
};

// The dark palette is written twice (system preference and explicit data-theme); this keeps them identical
test('both dark theme blocks define the same tokens', () => {
  const systemDark = tokensIn(blockAfter(':root:not([data-theme="light"])'));
  const explicitDark = tokensIn(blockAfter(':root[data-theme="dark"]'));
  assert.deepEqual(explicitDark, systemDark);
});

test('every colour token has a dark theme value', () => {
  const light = tokensIn(blockAfter(':root {'));
  const dark = tokensIn(blockAfter(':root[data-theme="dark"]'));
  const colours = Object.keys(light).filter((name) => light[name].startsWith('#'));
  assert.deepEqual(colours.filter((name) => !(name in dark)), []);
});
