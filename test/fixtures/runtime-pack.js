// Minimal valid runtime pack (what data/packs/*.json looks like) for engine and UI tests.

const prompts = { recall: 'Melyik ez?', choice: 'Melyik ez?', locate: 'Hol van {name}?' };

export function runtimePack(patch = {}) {
  return {
    schemaVersion: 1,
    id: 'mini',
    title: 'Mini térkép',
    shortTitle: 'Mini',
    lang: 'hu',
    hintsLabel: 'Határok súgóként',
    attribution: 'Teszt',
    viewBox: [0, 0, 1000, 600],
    outline: 'M10 10L990 10 990 590 10 590Z',
    hints: 'M500 10L500 590',
    kinds: {
      area: { label: 'Megye', marker: 'ring', detail: 'Székhely: {seat}', prompts },
      place: { label: 'Székhely', marker: 'dot', detail: '{region} székhelye', prompts },
    },
    decks: [
      { id: 'areas', title: 'Megyék', kinds: ['area'] },
      { id: 'places', title: 'Székhelyek', kinds: ['place'] },
      { id: 'mixed', title: 'Vegyes', kinds: ['area', 'place'] },
    ],
    items: [
      { id: 'A', kind: 'area', group: 'A', name: 'Alfa', detail: 'Székhely: Alfaváros', x: 100, y: 100 },
      { id: 'B', kind: 'area', group: 'B', name: 'Béta', detail: 'Székhely: Bétaváros', x: 300, y: 100 },
      { id: 'C', kind: 'area', group: 'C', name: 'Gamma', detail: 'Székhely: Gammaváros', x: 500, y: 300 },
      { id: 'D', kind: 'area', group: 'D', name: 'Delta', detail: 'Székhely: Deltaváros', x: 900, y: 500 },
      { id: 'A/seat', kind: 'place', group: 'A', name: 'Alfaváros', detail: 'Alfa székhelye', x: 120, y: 130 },
      { id: 'B/seat', kind: 'place', group: 'B', name: 'Bétaváros', detail: 'Béta székhelye', x: 320, y: 130 },
    ],
    ...patch,
  };
}
