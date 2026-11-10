// Decimal rounding shared by the pipeline (coordinates, pack markers, SVG paths).

export function roundTo(n, decimals) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
