// Builds and validates map packs into data/packs/<id>.json.
// Usage: node tools/build-pack.js [--all | <pack-id> ...] [--report]

import { buildPack } from './pack-builder.js';
import { spacingReport, validateBuild } from './validate-pack.js';
import { configsFromArgs, isMain, loadSources, packFile, writeJson } from './pack-io.js';

// One pack: build + validate, no IO; the summary line is what the CLI prints
export function buildChecked(config, sources) {
  const build = buildPack(config, sources);
  const errors = validateBuild(build, config);
  if (errors.length) return { ok: false, errors, message: `${config.id}: ${errors.length} error(s)\n  ${errors.join('\n  ')}` };
  const kb = (JSON.stringify(build.pack).length / 1024).toFixed(1);
  return { ok: true, pack: build.pack, message: `${config.id}: ${build.pack.items.length} items, ${kb} KB -> data/packs/${config.id}.json` };
}

async function main() {
  const args = process.argv.slice(2);
  let failed = false;
  for (const config of await configsFromArgs(args)) {
    const result = buildChecked(config, loadSources(config));
    if (!result.ok) {
      failed = true;
      console.error(result.message);
      continue;
    }
    writeJson(packFile(config.id), result.pack);
    console.log(result.message);
    if (args.includes('--report')) console.log(JSON.stringify(spacingReport(result.pack), null, 1));
  }
  if (failed) process.exit(1);
}

if (isMain(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
