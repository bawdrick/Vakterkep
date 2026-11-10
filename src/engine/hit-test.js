// Resolves a tap position to the nearest candidate item within a radius.

import { itemDistance } from './distance.js';

export function nearestItem(items, { x, y }, maxDistance = Infinity) {
  let best = null;
  let bestDist = maxDistance;
  for (const item of items) {
    const d = itemDistance(item, { x, y });
    if (d <= bestDist) [best, bestDist] = [item, d];
  }
  return best;
}
