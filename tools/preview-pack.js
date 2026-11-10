// Writes a labeled SVG preview of each pack (dist/preview-<id>.svg) for visual review.
// Usage: node tools/preview-pack.js [--all | <pack-id> ...]

import { writeFileSync, mkdirSync } from 'node:fs';
import { configsFromArgs, fromRoot, packFile, readJson } from './pack-io.js';

const escapeXml = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

export function renderPreview(pack) {
  const [, , w, h] = pack.viewBox;
  const markers = pack.items.map((item) => {
    const shape = pack.kinds[item.kind].marker === 'ring'
      ? `<circle cx="${item.x}" cy="${item.y}" r="7" fill="none" stroke="#1d4e9e" stroke-width="2.5"/>`
      : `<circle cx="${item.x}" cy="${item.y}" r="4.5" fill="#c8282e"/>`;
    const dy = item.kind === 'area' ? -11 : 15;
    const label = `<text x="${item.x}" y="${item.y + dy}" text-anchor="middle" font-size="11" font-family="sans-serif">${escapeXml(item.name)}</text>`;
    return shape + label;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect width="100%" height="100%" fill="#fff"/>
<path d="${pack.hints}" fill="none" stroke="#9aa7b4" stroke-width="0.8"/>
<path d="${pack.outline}" fill="none" stroke="#283039" stroke-width="2" stroke-linejoin="round"/>
${markers.join('\n')}
</svg>`;
}

async function main() {
  mkdirSync(fromRoot('dist'), { recursive: true });
  for (const config of await configsFromArgs(process.argv.slice(2))) {
    const target = fromRoot('dist', `preview-${config.id}.svg`);
    writeFileSync(target, renderPreview(readJson(packFile(config.id))));
    console.log(`preview -> ${target}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
