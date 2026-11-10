// Serializes pixel-space multipolygons into compact SVG path data.

const round = (n, decimals) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export function ringToPath(ring, decimals = 1) {
  const pts = ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
  const coords = pts.map(([x, y]) => `${round(x, decimals)} ${round(y, decimals)}`);
  return `M${coords[0]}L${coords.slice(1).join(' ')}Z`;
}

export function multiPolygonToPath(multi, decimals = 1) {
  return multi.flatMap((polygon) => polygon.map((ring) => ringToPath(ring, decimals))).join('');
}
