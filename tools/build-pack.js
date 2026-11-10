// Builds and validates map packs into data/packs/<id>.json.
// Usage: node tools/build-pack.js [--all | <pack-id> ...] [--report]

import { buildPack } from './pack-builder.js';
import { spacingReport, validateBuild } from './validate-pack.js';
import { configsFromArgs, loadSources, packFile, writeJson } from './pack-io.js';

async function main() {
  const args = process.argv.slice(2);
  let failed = false;
  for (const config of await configsFromArgs(args)) {
    const build = buildPack(config, loadSources(config));
    const errors = validateBuild(build, config);
    if (errors.length) {
      failed = true;
      console.error(`${config.id}: ${errors.length} error(s)\n  ${errors.join('\n  ')}`);
      continue;
    }
    writeJson(packFile(config.id), build.pack);
    const kb = (JSON.stringify(build.pack).length / 1024).toFixed(1);
    console.log(`${config.id}: ${build.pack.items.length} items, ${kb} KB -> data/packs/${config.id}.json`);
    if (args.includes('--report')) console.log(JSON.stringify(spacingReport(build.pack), null, 1));
  }
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
