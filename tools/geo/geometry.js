// Planar geometry helpers for GeoJSON-style coordinates.
// Polygon = [outerRing, ...holes]; Ring = [[x, y], ...] (closed or open).

export function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return sum / 2;
}

export function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(point, polygon) {
  const [outer, ...holes] = polygon;
  return pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole));
}

export function pointInMultiPolygon(point, multi) {
  return multi.some((polygon) => pointInPolygon(point, polygon));
}

// Ignores holes: true if the point lies within any outer ring (e.g. an enclave).
export function pointWithinOuterRings(point, multi) {
  return multi.some(([outer]) => pointInRing(point, outer));
}

export function largestPolygon(multi) {
  return multi.reduce((best, poly) =>
    Math.abs(ringArea(poly[0])) > Math.abs(ringArea(best[0])) ? poly : best
  );
}

export function* allPoints(multi) {
  for (const polygon of multi) for (const ring of polygon) yield* ring;
}

export function bounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function distance([ax, ay], [bx, by]) {
  return Math.hypot(ax - bx, ay - by);
}

export function mapMultiPolygon(multi, fn) {
  return multi.map((polygon) => polygon.map((ring) => ring.map(fn)));
}

export function toMultiPolygon(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}
