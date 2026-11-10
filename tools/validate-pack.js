// Geographic sanity checks on a freshly built pack (runs in build and tests).

import { pointInMultiPolygon, pointWithinOuterRings } from './geo/geometry.js';
import { itemDistance } from '../src/engine/distance.js';
import { validatePack } from '../src/engine/pack-schema.js';

function checkPlacement(pack, geometry) {
  const errors = [];
  const regionById = new Map(geometry.regions.map((r) => [r.id, r]));
  for (const item of pack.items) {
    const point = [item.x, item.y];
    const region = regionById.get(item.group);

    // Area marker strictly inside its region; seat may sit in an enclave (Budapest in Pest)
    if (item.kind === 'area' && !pointInMultiPolygon(point, region.px)) {
      errors.push(`${item.id}: area marker outside its region`);
    }
    if (item.kind === 'place' && !pointWithinOuterRings(point, region.px)) {
      errors.push(`${item.id}: ${item.name} is not within ${region.name}`);
    }
    if (!pointInMultiPolygon(point, geometry.outlinePx)) errors.push(`${item.id}: outside the outline`);
  }
  return errors;
}

// Locate mode resolves taps among items of the target's kind, so spacing matters per kind
function closestPairs(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({ a: items[i].name, b: items[j].name, d: itemDistance(items[i], items[j]) });
    }
  }
  return pairs.sort((p, q) => p.d - q.d);
}

const itemsByKind = (pack) =>
  Object.keys(pack.kinds).map((kind) => ({ kind, items: pack.items.filter((item) => item.kind === kind) }));

function checkSpacing(pack, minSpacing) {
  return itemsByKind(pack).flatMap(({ kind, items }) =>
    closestPairs(items)
      .filter((p) => p.d < minSpacing)
      .map((p) => `kind ${kind}: ${p.a} and ${p.b} are ${p.d.toFixed(1)}px apart`)
  );
}

export function validateBuild({ pack, geometry }, config) {
  const schemaErrors = validatePack(pack);
  if (schemaErrors.length) return schemaErrors;
  return [...checkPlacement(pack, geometry), ...checkSpacing(pack, config.minPointSpacing)];
}

// Closest pairs per kind, for tuning minPointSpacing
export function spacingReport(pack, top = 3) {
  return itemsByKind(pack).map(({ kind, items }) => ({
    kind,
    closest: closestPairs(items).slice(0, top).map((p) => `${p.a} - ${p.b}: ${p.d.toFixed(1)}px`),
  }));
}
