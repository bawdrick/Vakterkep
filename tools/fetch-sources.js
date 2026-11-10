// Downloads raw source datasets and extracts the per-pack subsets into data/sources/.
// Usage: node tools/fetch-sources.js [--all | <pack-id> ...]

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { configsFromArgs, fromRoot, readJson, writeJson } from './pack-io.js';

const round5 = (n) => Math.round(n * 1e5) / 1e5;
const roundCoords = (c) => (typeof c[0] === 'number' ? c.map(round5) : c.map(roundCoords));

async function download(url) {
  const target = fromRoot('data/raw', basename(url));
  if (existsSync(target)) return target;
  mkdirSync(fromRoot('data/raw'), { recursive: true });
  console.log(`download ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

// Keeps only matching features, selected properties and ~1 m coordinate precision
export function extractSubset(collection, { filter, keep }) {
  const features = collection.features
    .filter((f) => f.properties[filter.prop] === filter.equals)
    .map((f) => ({
      type: 'Feature',
      properties: Object.fromEntries(keep.map((k) => [k, f.properties[k]])),
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
    }));
  return { type: 'FeatureCollection', features };
}

async function main() {
  for (const config of await configsFromArgs(process.argv.slice(2))) {
    for (const [name, source] of Object.entries(config.sources)) {
      const subset = extractSubset(readJson(await download(source.url)), source);
      writeJson(fromRoot(source.file), subset, false);
      console.log(`${config.id}/${name}: ${subset.features.length} features -> ${source.file}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
