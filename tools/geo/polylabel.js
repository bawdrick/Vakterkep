// Pole of inaccessibility: the interior point farthest from the polygon edge.
// Adapted from the Mapbox polylabel algorithm (grid cells + best-first search).

import { pointInPolygon } from './geometry.js';

function segmentDistanceSq(px, py, [ax, ay], [bx, by]) {
  let x = ax, y = ay;
  let dx = bx - x, dy = by - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) [x, y] = [bx, by];
    else if (t > 0) [x, y] = [x + dx * t, y + dy * t];
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

// Signed distance: positive inside the polygon, negative outside
function signedDistance(x, y, polygon) {
  let minSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      minSq = Math.min(minSq, segmentDistanceSq(x, y, ring[i], ring[j]));
    }
  }
  const sign = pointInPolygon([x, y], polygon) ? 1 : -1;
  return sign * Math.sqrt(minSq);
}

function makeCell(x, y, half, polygon) {
  const d = signedDistance(x, y, polygon);
  return { x, y, half, d, max: d + half * Math.SQRT2 };
}

export function polylabel(polygon, precision = 1) {
  const outer = polygon[0];
  const xs = outer.map((p) => p[0]);
  const ys = outer.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cellSize = Math.min(maxX - minX, maxY - minY);
  if (cellSize === 0) return [minX, minY];

  // Seed the queue with a coarse grid over the bounding box
  const queue = [];
  const half = cellSize / 2;
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) queue.push(makeCell(x + half, y + half, half, polygon));
  }
  let best = makeCell((minX + maxX) / 2, (minY + maxY) / 2, 0, polygon);

  // Best-first refinement: split cells that could still beat the current best
  while (queue.length) {
    queue.sort((a, b) => a.max - b.max);
    const cell = queue.pop();
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= precision) continue;
    const h = cell.half / 2;
    queue.push(
      makeCell(cell.x - h, cell.y - h, h, polygon),
      makeCell(cell.x + h, cell.y - h, h, polygon),
      makeCell(cell.x - h, cell.y + h, h, polygon),
      makeCell(cell.x + h, cell.y + h, h, polygon)
    );
  }
  return [best.x, best.y];
}
