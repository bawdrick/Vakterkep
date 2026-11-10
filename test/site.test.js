import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSite, inlineHtml } from '../tools/build-site.js';

const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

test('inlineHtml escapes closing script tags', () => {
  const html = inlineHtml('<style>/* @inject css */</style><script>/* @inject js */</script>', 'a{}', 'x="</script>"');
  assert.match(html, /x="<\\\/script>"/);
});

test('built site is one self-contained file', async () => {
  const { path, bytes } = await buildSite();
  const html = readFileSync(path, 'utf8');
  assert.ok(bytes < 1024 * 1024, 'stays small');
  assert.doesNotMatch(html, /<script[^>]+src=/, 'no external scripts');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /hu-megyek/);
  const hosts = [...html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]);
  const foreign = hosts.filter((h) => !ALLOWED_HOSTS.includes(h) && h !== 'www.w3.org');
  assert.deepEqual([...new Set(foreign)], []);
});
