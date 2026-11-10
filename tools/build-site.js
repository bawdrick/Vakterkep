// Bundles the app with esbuild and inlines JS + CSS into one self-contained dist/index.html.
// Usage: node tools/build-site.js [--watch]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';
import { fromRoot } from './pack-io.js';

const OUT = fromRoot('dist/index.html');

export function inlineHtml(template, css, js) {
  const safeJs = js.replace(/<\/script/gi, '<\\/script');
  return template.replace('/* @inject css */', () => css).replace('/* @inject js */', () => safeJs);
}

const buildOptions = {
  entryPoints: [fromRoot('src/ui/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
};

export async function buildSite() {
  const result = await esbuild.build(buildOptions);
  const html = inlineHtml(
    readFileSync(fromRoot('src/ui/index.html'), 'utf8'),
    readFileSync(fromRoot('src/ui/styles.css'), 'utf8'),
    result.outputFiles[0].text
  );
  mkdirSync(fromRoot('dist'), { recursive: true });
  writeFileSync(OUT, html);
  return { path: OUT, bytes: Buffer.byteLength(html) };
}

async function main() {
  const { bytes } = await buildSite();
  console.log(`site -> dist/index.html (${(bytes / 1024).toFixed(1)} KB)`);
  if (!process.argv.includes('--watch')) return;

  // Rebuild on any change under src/ or data/packs/
  const { watch } = await import('node:fs');
  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => buildSite().then(({ bytes: b }) => console.log(`rebuilt (${(b / 1024).toFixed(1)} KB)`), console.error), 100);
  };
  for (const dir of ['src', 'data/packs']) watch(fromRoot(dir), { recursive: true }, rebuild);
  console.log('watching src/ and data/packs/ ...');
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
