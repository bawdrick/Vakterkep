// Douglas-Peucker simplification for closed rings in pixel space.

import { distance, ringArea } from './geometry.js';

function segmentDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function simplifyLine(points, tolerance) {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  // Iterative split on the farthest point above tolerance
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last]);
      if (d > maxDist) [maxDist, index] = [d, i];
    }
    if (maxDist > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Simplifies a closed ring; returns null if it collapses below minArea.
export function simplifyRing(ring, tolerance, minArea = tolerance * tolerance) {
  const open = ring.slice(0, -1);
  if (open.length < 3) return null;

  // Split at the point farthest from the start so both halves keep their shape
  let far = 1;
  let farDist = 0;
  open.forEach((p, i) => {
    const d = distance(p, open[0]);
    if (d > farDist) [farDist, far] = [d, i];
  });
  const left = simplifyLine(open.slice(0, far + 1), tolerance);
  const right = simplifyLine([...open.slice(far), open[0]], tolerance);
  const result = [...left, ...right.slice(1)];

  if (result.length < 4 || Math.abs(ringArea(result)) < minArea) return null;
  return result;
}

export function simplifyMultiPolygon(multi, tolerance) {
  return multi
    .map((polygon) => {
      const [outer, ...holes] = polygon.map((ring) => simplifyRing(ring, tolerance));
      return outer ? [outer, ...holes.filter(Boolean)] : null;
    })
    .filter(Boolean);
}
