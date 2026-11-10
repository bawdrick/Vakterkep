// Pack config: Hungarian counties (megyék) and county seats (megyeszékhelyek).
// Source: Natural Earth 10m admin-1 + populated places (public domain).

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';

export default {
  id: 'hu-megyek',
  title: 'Magyarország megyéi és megyeszékhelyei',
  shortTitle: 'Magyar megyék',
  lang: 'hu',
  hintsLabel: 'Megyehatárok súgóként',

  sources: {
    areas: {
      url: `${NE}ne_10m_admin_1_states_provinces.geojson`,
      file: 'data/sources/hu/ne-admin1.geojson',
      filter: { prop: 'adm0_a3', equals: 'HUN' },
      keep: ['iso_3166_2', 'name_hu'],
      idProp: 'iso_3166_2',
    },
    places: {
      url: `${NE}ne_10m_populated_places.geojson`,
      file: 'data/sources/hu/ne-places.geojson',
      filter: { prop: 'ADM0_A3', equals: 'HUN' },
      keep: ['NAME', 'FEATURECLA'],
      idProp: 'NAME',
    },
  },

  projection: 'equirectangular',
  canvas: { width: 1000, padding: 24, simplifyTolerance: 0.6 },
  minPointSpacing: 40,

  kinds: {
    area: {
      label: 'Megye',
      marker: 'ring',
      detail: 'Székhely: {seat}',
      prompts: { recall: 'Melyik megye ez?', choice: 'Melyik megye ez?', locate: 'Hol van {name} megye?' },
    },
    place: {
      label: 'Megyeszékhely',
      marker: 'dot',
      detail: '{region} megye székhelye',
      prompts: { recall: 'Melyik megyeszékhely ez?', choice: 'Melyik megyeszékhely ez?', locate: 'Hol van {name}?' },
    },
  },

  decks: [
    { id: 'megyek', title: 'Megyék', kinds: ['area'] },
    { id: 'szekhelyek', title: 'Megyeszékhelyek', kinds: ['place'] },
    { id: 'vegyes', title: 'Megyék és székhelyek', kinds: ['area', 'place'] },
  ],

  // parts: Natural Earth admin-1 units merged into one county (cities with county rights are separate in NE)
  regions: [
    { id: 'HU-BA', name: 'Baranya', parts: ['HU-BA', 'HU-PS'], seat: 'Pécs' },
    { id: 'HU-BK', name: 'Bács-Kiskun', parts: ['HU-BK', 'HU-KM'], seat: 'Kecskemét' },
    { id: 'HU-BE', name: 'Békés', parts: ['HU-BE', 'HU-BC'], seat: 'Békéscsaba' },
    { id: 'HU-BZ', name: 'Borsod-Abaúj-Zemplén', parts: ['HU-BZ', 'HU-MI'], seat: 'Miskolc' },
    { id: 'HU-CS', name: 'Csongrád-Csanád', parts: ['HU-CS', 'HU-SD', 'HU-HV'], seat: 'Szeged' },
    { id: 'HU-FE', name: 'Fejér', parts: ['HU-FE', 'HU-SF', 'HU-DU'], seat: 'Székesfehérvár' },
    { id: 'HU-GS', name: 'Győr-Moson-Sopron', parts: ['HU-GS', 'HU-GY', 'HU-SN'], seat: 'Győr' },
    { id: 'HU-HB', name: 'Hajdú-Bihar', parts: ['HU-HB', 'HU-DE'], seat: 'Debrecen' },
    { id: 'HU-HE', name: 'Heves', parts: ['HU-HE', 'HU-EG'], seat: 'Eger' },
    { id: 'HU-JN', name: 'Jász-Nagykun-Szolnok', parts: ['HU-JN', 'HU-SK'], seat: 'Szolnok' },
    { id: 'HU-KE', name: 'Komárom-Esztergom', parts: ['HU-KE', 'HU-TB'], seat: 'Tatabánya' },
    { id: 'HU-NO', name: 'Nógrád', parts: ['HU-NO', 'HU-ST'], seat: 'Salgótarján' },
    {
      id: 'HU-PE', name: 'Pest', parts: ['HU-PE', 'HU-ED'], seat: 'Budapest',
      details: {
        area: 'Székhely: Budapest, bár a főváros nem része a megyének.',
        place: 'Pest megye székhelye, bár nem része a megyének.',
      },
    },
    { id: 'HU-SO', name: 'Somogy', parts: ['HU-SO', 'HU-KV'], seat: 'Kaposvár' },
    { id: 'HU-SZ', name: 'Szabolcs-Szatmár-Bereg', parts: ['HU-SZ', 'HU-NY'], seat: 'Nyíregyháza' },
    { id: 'HU-TO', name: 'Tolna', parts: ['HU-TO', 'HU-SS'], seat: 'Szekszárd' },
    { id: 'HU-VA', name: 'Vas', parts: ['HU-VA', 'HU-SH'], seat: 'Szombathely' },
    { id: 'HU-VE', name: 'Veszprém', parts: ['HU-VE', 'HU-VM'], seat: 'Veszprém' },
    { id: 'HU-ZA', name: 'Zala', parts: ['HU-ZA', 'HU-ZE', 'HU-NK'], seat: 'Zalaegerszeg' },
    // Geometry only: part of the outline and the hint layer, not quizzed
    { id: 'HU-BU', name: 'Budapest', parts: ['HU-BU'], quiz: false },
  ],
};
