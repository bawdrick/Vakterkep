// Resolves a tap position to the nearest candidate item within a radius.

export function nearestItem(items, { x, y }, maxDistance = Infinity) {
  let best = null;
  let bestDist = maxDistance;
  for (const item of items) {
    const d = Math.hypot(item.x - x, item.y - y);
    if (d <= bestDist) [best, bestDist] = [item, d];
  }
  return best;
}
