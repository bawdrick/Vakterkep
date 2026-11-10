# Új térképcsomag hozzáadása

Egy csomag = egy config fájl a `tools/pack-configs/`-ban. A pipeline ebből állítja elő a `data/packs/<id>.json`-t.
Minta: `tools/pack-configs/hu-megyek.js`.

## Lépések

1. **Config létrehozása**: `tools/pack-configs/<id>.js` (az `id` legyen a fájlnév).
2. **Források letöltése és kivágása**: `node tools/fetch-sources.js <id>`
3. **Építés és validálás**: `node tools/build-pack.js <id> --report`
   - Hibánál kiírja, melyik jelölő esik rossz helyre vagy melyik pár van túl közel.
4. **Vizuális ellenőrzés**: `node tools/preview-pack.js <id>`, majd `dist/preview-<id>.svg` megnyitása.
5. **Regisztrálás**: import + felvétel a `src/packs/index.js` listájába.
6. **Teszt és build**: `npm test && npm run build:site`. A `test/packs.test.js` automatikusan lefut az új csomagra is.

## Config mezők

| Mező | Jelentés |
|------|----------|
| `id`, `title`, `shortTitle`, `lang` | azonosító és megjelenített nevek |
| `hintsLabel` | a súgó réteg kapcsolójának felirata (pl. "Országhatárok súgóként") |
| `sources.<név>.url` | nyers GeoJSON URL (Natural Earth GitHub) |
| `sources.<név>.file` | a kivonat helye a `data/sources/` alatt |
| `sources.<név>.filter` | `{ prop, equals }`: mely feature-ök kellenek |
| `sources.<név>.keep` | megtartott tulajdonságok (méretcsökkentés) |
| `sources.<név>.idProp` | ezzel a mezővel hivatkozik a config a feature-re |
| `projection` | `equirectangular` (ország) vagy `lambert-azimuthal` (kontinens) |
| `canvas` | `{ width, padding, simplifyTolerance }`, pixelben |
| `minPointSpacing` | azonos típusú jelölők minimális távolsága pixelben |
| `kinds.area / kinds.place` | felirat, jelölő (`ring`/`dot`), `detail` sablon, `prompts` módonként |
| `decks` | `{ id, title, kinds }` |
| `regions` | lista vagy függvény `(sources) => lista`; elemei: `id`, `name`, `parts`, opcionálisan `seat`, `seatRef`, `details`, `quiz: false` |

Sablon változók a `detail` és `prompts` szövegekben: `{name}`, `{region}`, `{seat}`.
`seatRef`: ha a település a forrásban más kulccsal szerepel, mint a megjelenített neve (pl. országkód). Lásd ADR-014.
`details`: típusonkénti egyedi szöveg egy régióra (pl. Pest megye és Budapest).

## Példa: Európa országai és fővárosai (vázlat)

```js
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const SKIP = new Set(['RUS']); // túl nagy kiterjedés, külön kezelendő

export default {
  id: 'eu-orszagok',
  title: 'Európa országai és fővárosai',
  lang: 'hu',
  hintsLabel: 'Országhatárok súgóként',
  sources: {
    areas: {
      url: `${NE}ne_50m_admin_0_countries.geojson`,
      file: 'data/sources/eu/ne-admin0.geojson',
      filter: { prop: 'CONTINENT', equals: 'Europe' },
      keep: ['ADM0_A3', 'NAME_HU'],
      idProp: 'ADM0_A3',
    },
    places: {
      url: `${NE}ne_10m_populated_places.geojson`,
      file: 'data/sources/eu/ne-capitals.geojson',
      filter: { prop: 'FEATURECLA', equals: 'Admin-0 capital' },
      keep: ['ADM0_A3', 'NAME_HU'],
      idProp: 'ADM0_A3',
    },
  },
  projection: 'lambert-azimuthal',
  canvas: { width: 1000, padding: 24, simplifyTolerance: 0.8 },
  minPointSpacing: 10,
  kinds: { /* area = ország, place = főváros, promptokkal */ },
  decks: [ /* Országok, Fővárosok, Vegyes */ ],
  regions: ({ areas, places }) => areas.features
    .filter((f) => !SKIP.has(f.properties.ADM0_A3))
    .map((f) => {
      const code = f.properties.ADM0_A3;
      const capital = places.features.find((p) => p.properties.ADM0_A3 === code);
      return { id: code, name: f.properties.NAME_HU, parts: [code], seat: capital?.properties.NAME_HU, seatRef: code };
    }),
};
```

Ellenőrizd, hogy a NAME_HU mezők valóban léteznek-e a választott Natural Earth fájlban (`--report` és preview).

## Ismert buktatók kontinenseknél

- **Tengerentúli területek**: egyes országok geometriája távoli részeket is tartalmaz (pl. Francia Guyana),
  ami szétfeszíti a vásznat. Megoldás: bbox szerinti vágás a pipeline-ban (polygon-clipping `intersection`),
  ez **még nincs implementálva**, új `config.clip` mezőként érdemes bevezetni (ADR-rel).
- **Oroszország / Törökország**: kontinenshatáron átnyúlnak; döntsd el, mi kerül a térképre (kizárás vagy vágás).
- **Kis országok** (Vatikán, Monaco, San Marino, Liechtenstein, Andorra, Málta, Luxemburg): a távolság-validáció
  el fog bukni. Lehetőségek: kizárás külön pakliba, nagyítás funkció (backlog 2. pont), vagy kisebb `minPointSpacing`
  a nagyítás megléte után.
- **Régiók közepe**: többrészes országnál (szigetek) a legnagyobb rész közepére kerül a karika; ez szándékos.
- **Fővárosok**: a `FEATURECLA = Admin-0 capital` mellett vannak megosztott fővárosok is (pl. Hollandia);
  validáció után kézzel ellenőrizd a preview-t.
- **Méret**: kontinensnél a `ne_50m` felbontás és nagyobb `simplifyTolerance` tartja a pack-et 200 KB alatt.
