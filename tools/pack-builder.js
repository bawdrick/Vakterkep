// Builds a runtime map pack from a pack config and its extracted GeoJSON sources.
// Pure function: no file IO, so it can be tested and reused for any pack.

import polygonClipping from 'polygon-clipping';
import { allPoints, bounds, largestPolygon, mapMultiPolygon, toMultiPolygon } from './geo/geometry.js';
import { createProjection, centerOf, fitToCanvas } from './geo/projection.js';
import { simplifyMultiPolygon } from './geo/simplify.js';
import { polylabel } from './geo/polylabel.js';
import { multiPolygonToPath } from './geo/svg-path.js';
import { roundTo } from './geo/round.js';
import { fillTemplate } from '../src/engine/format.js';
import { SCHEMA_VERSION } from '../src/engine/pack-schema.js';

// Marker coordinates: 0.1 px is far below what a tap or the eye can resolve
const MARKER_DECIMALS = 1;
const roundPx = (n) => roundTo(n, MARKER_DECIMALS);

function indexFeatures(collection, idProp) {
  return new Map(collection.features.map((f) => [f.properties[idProp], f]));
}

function lookup(index, id, what) {
  const feature = index.get(id);
  if (!feature) throw new Error(`${what} not found in source: ${id}`);
  return feature;
}

function dissolve(index, partIds) {
  const parts = partIds.map((id) => toMultiPolygon(lookup(index, id, 'Area').geometry));
  return polygonClipping.union(...parts);
}

function buildItems(config, regions, placeIndex, project) {
  const items = [];
  for (const region of regions.filter((r) => r.quiz !== false)) {
    const values = { name: region.name, region: region.name, seat: region.seat ?? '' };
    const detail = (kind) => region.details?.[kind] ?? fillTemplate(config.kinds[kind].detail, values);

    // Area marker at the pole of inaccessibility of the largest polygon
    const [ax, ay] = polylabel(largestPolygon(region.px), 0.5);
    items.push({
      id: region.id, kind: 'area', group: region.id, name: region.name,
      detail: detail('area'),
      x: roundPx(ax), y: roundPx(ay),
    });

    // Seat marker from the populated places source
    if (!region.seat) continue;
    const [sx, sy] = project(lookup(placeIndex, region.seatRef ?? region.seat, 'Place').geometry.coordinates);
    items.push({
      id: `${region.id}/seat`, kind: 'place', group: region.id, name: region.seat,
      detail: detail('place'),
      x: roundPx(sx), y: roundPx(sy),
    });
  }
  return items;
}

export function buildPack(config, sources) {
  const areaIndex = indexFeatures(sources.areas, config.sources.areas.idProp);
  const placeIndex = indexFeatures(sources.places, config.sources.places.idProp);

  // Regions: explicit list, or generated from the sources (e.g. one region per country)
  const regionDefs = typeof config.regions === 'function' ? config.regions(sources) : config.regions;

  // Dissolve source units into regions, then the regions into the outline
  const regionsLonLat = regionDefs.map((r) => ({ ...r, lonLat: dissolve(areaIndex, r.parts) }));
  const outlineLonLat = polygonClipping.union(...regionsLonLat.map((r) => r.lonLat));

  // Fit the projection to the outline
  const rawProject = createProjection(config.projection, centerOf(bounds(allPoints(outlineLonLat))));
  const canvas = fitToCanvas(rawProject, allPoints(outlineLonLat), config.canvas);
  const toPx = (multi) => mapMultiPolygon(multi, canvas.project);
  const regions = regionsLonLat.map((r) => ({ ...r, px: toPx(r.lonLat) }));
  const outlinePx = toPx(outlineLonLat);

  // Simplified layers for display
  const tolerance = config.canvas.simplifyTolerance;
  const outline = multiPolygonToPath(simplifyMultiPolygon(outlinePx, tolerance));
  const hints = regions.map((r) => multiPolygonToPath(simplifyMultiPolygon(r.px, tolerance))).join('');

  const pack = {
    schemaVersion: SCHEMA_VERSION,
    id: config.id,
    title: config.title,
    shortTitle: config.shortTitle ?? config.title,
    lang: config.lang,
    hintsLabel: config.hintsLabel ?? 'Belső határok súgóként',
    attribution: 'Térképadat: Natural Earth (közkincs)',
    viewBox: [0, 0, canvas.width, canvas.height],
    outline,
    hints,
    kinds: config.kinds,
    decks: config.decks,
    items: buildItems(config, regions, placeIndex, canvas.project),
  };
  return { pack, geometry: { regions, outlinePx } };
}
