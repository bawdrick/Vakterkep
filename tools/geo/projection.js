// Map projections (lon/lat degrees -> planar units) and fitting into a pixel canvas.
// Planar output uses SVG orientation: x grows east, y grows south.

const RAD = Math.PI / 180;

const PROJECTIONS = {
  // Plate carrée scaled by cos(lat0): good enough for country-sized maps.
  equirectangular: ([lon0, lat0]) => {
    const k = Math.cos(lat0 * RAD);
    return ([lon, lat]) => [(lon - lon0) * k, -(lat - lat0)];
  },
  // Lambert azimuthal equal-area (spherical): suited for continent-sized maps.
  'lambert-azimuthal': ([lon0, lat0]) => {
    const phi0 = lat0 * RAD;
    return ([lon, lat]) => {
      const phi = lat * RAD;
      const dLambda = (lon - lon0) * RAD;
      const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda);
      const k = Math.sqrt(2 / (1 + cosC));
      const x = k * Math.cos(phi) * Math.sin(dLambda);
      const y = k * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLambda));
      return [x / RAD, -y / RAD];
    };
  },
};

export function createProjection(type, center) {
  const factory = PROJECTIONS[type];
  if (!factory) throw new Error(`Unknown projection: ${type}`);
  return factory(center);
}

export function centerOf({ minX, minY, maxX, maxY }) {
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

// Returns a projector into [0..width] x [0..height] pixels, keeping aspect ratio.
export function fitToCanvas(rawProject, lonLatPoints, { width, padding }) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of lonLatPoints) {
    const [x, y] = rawProject(p);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const scale = (width - 2 * padding) / (maxX - minX);
  const height = Math.ceil((maxY - minY) * scale + 2 * padding);
  const project = (p) => {
    const [x, y] = rawProject(p);
    return [(x - minX) * scale + padding, (y - minY) * scale + padding];
  };
  return { project, width, height, scale };
}
