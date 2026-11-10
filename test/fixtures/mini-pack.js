// Two-country test pack: tiny sources and a config with generated regions, shared by pipeline tests.

const square = (x, y) => [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]];
const feature = (props, geometry) => ({ type: 'Feature', properties: props, geometry });

export const sources = {
  areas: { features: [
    feature({ code: 'AA' }, { type: 'Polygon', coordinates: square(10, 50) }),
    feature({ code: 'BB' }, { type: 'Polygon', coordinates: square(11, 50) }),
  ] },
  places: { features: [
    feature({ ref: 'AA' }, { type: 'Point', coordinates: [10.3, 50.5] }),
    feature({ ref: 'BB' }, { type: 'Point', coordinates: [11.7, 50.5] }),
  ] },
};

const prompts = { recall: 'Mi ez?', choice: 'Mi ez?', locate: 'Hol van {name}?' };

export const config = {
  id: 'test', title: 'Teszt', lang: 'hu',
  sources: { areas: { idProp: 'code' }, places: { idProp: 'ref' } },
  projection: 'equirectangular',
  canvas: { width: 500, padding: 10, simplifyTolerance: 0.5 },
  minPointSpacing: 20,
  kinds: {
    area: { label: 'Ország', marker: 'ring', detail: 'Főváros: {seat}', prompts },
    place: { label: 'Főváros', marker: 'dot', detail: '{region} fővárosa', prompts },
  },
  decks: [{ id: 'all', title: 'Mind', kinds: ['area', 'place'] }],
  // Generated regions: one per source feature, capital looked up by seatRef
  regions: (src) => src.areas.features.map((f) => ({
    id: f.properties.code, name: `Ország ${f.properties.code}`, parts: [f.properties.code],
    seat: `Főváros ${f.properties.code}`, seatRef: f.properties.code,
  })),
};
