// File IO for the pack pipeline: config discovery, source loading, pack output.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_DIR = join(ROOT, 'tools/pack-configs');

export const fromRoot = (...parts) => join(ROOT, ...parts);
export const packFile = (id) => fromRoot('data/packs', `${id}.json`);

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data, pretty = true) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, pretty ? 1 : 0) + '\n');
}

export function listConfigIds() {
  return readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
}

export async function loadConfig(id) {
  const module = await import(pathToFileURL(join(CONFIG_DIR, `${id}.js`)).href);
  return module.default;
}

export function loadSources(config) {
  return Object.fromEntries(
    Object.entries(config.sources).map(([name, source]) => [name, readJson(fromRoot(source.file))])
  );
}

// True when the module is the script node was started with (works with Windows paths too)
export function isMain(moduleUrl, argv = process.argv) {
  return Boolean(argv[1]) && pathToFileURL(resolve(argv[1])).href === moduleUrl;
}

// Resolves CLI args: --all or explicit pack ids
export async function configsFromArgs(args) {
  const ids = args.includes('--all') || args.length === 0 ? listConfigIds() : args.filter((a) => !a.startsWith('--'));
  return Promise.all(ids.map(loadConfig));
}
