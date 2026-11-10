// Writes a labeled SVG preview of each pack (dist/preview-<id>.svg) for visual review.
// Usage: node tools/preview-pack.js [--all | <pack-id> ...]

import { writeFileSync, mkdirSync } from 'node:fs';
import { configsFromArgs, fromRoot, isMain, packFile, readJson } from './pack-io.js';

// Preview drawing sizes in viewBox units (the preview is viewed at 1:1)
const STYLE = { ring: 7, ringStroke: 2.5, dot: 4.5, font: 11, areaLabelDy: -11, placeLabelDy: 15, hints: 0.8, outline: 2 };
const COLOR = { ring: '#1d4e9e', dot: '#c8282e', hints: '#9aa7b4', outline: '#283039' };

const escapeXml = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);

export function renderPreview(pack) {
  const [, , w, h] = pack.viewBox;
  const markers = pack.items.map((item) => {
    const shape = pack.kinds[item.kind].marker === 'ring'
      ? `<circle cx="${item.x}" cy="${item.y}" r="${STYLE.ring}" fill="none" stroke="${COLOR.ring}" stroke-width="${STYLE.ringStroke}"/>`
      : `<circle cx="${item.x}" cy="${item.y}" r="${STYLE.dot}" fill="${COLOR.dot}"/>`;
    const dy = item.kind === 'area' ? STYLE.areaLabelDy : STYLE.placeLabelDy;
    const label = `<text x="${item.x}" y="${item.y + dy}" text-anchor="middle" font-size="${STYLE.font}" font-family="sans-serif">${escapeXml(item.name)}</text>`;
    return shape + label;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<rect width="100%" height="100%" fill="#fff"/>
<path d="${pack.hints}" fill="none" stroke="${COLOR.hints}" stroke-width="${STYLE.hints}"/>
<path d="${pack.outline}" fill="none" stroke="${COLOR.outline}" stroke-width="${STYLE.outline}" stroke-linejoin="round"/>
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

if (isMain(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
