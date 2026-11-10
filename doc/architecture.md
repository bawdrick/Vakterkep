# Architektúra

## Áttekintés

Két, egymástól független részből áll:

1. **Build idejű adat-pipeline** (`tools/`, Node): nyers földrajzi adatból kész, vetített, egyszerűsített
   **map pack** JSON-t állít elő, és geográfiailag validálja.
2. **Futásidejű app** (`src/`, böngésző): a pack-et megjeleníti és tanulókártyás logikát futtat rajta.
   Geometriai számítást nem végez, csak pixelkoordinátákkal dolgozik.

A két rész közötti szerződés a **pack séma** (`src/engine/pack-schema.js`).

```
Natural Earth (GitHub)
   | fetch-sources.js (szűrés, mezők, ~1 m kerekítés)
   v
data/sources/<csomag>/*.geojson          (verziózott kivonat)
   | build-pack.js = pack-builder.js + validate-pack.js
   |   1. összevonás (polygon-clipping union): config.regions[].parts -> régió
   |   2. körvonal = minden régió uniója
   |   3. vetítés + illesztés a vásznra (projection.js)
   |   4. Douglas-Peucker egyszerűsítés (simplify.js) -> SVG path
   |   5. jelölők: régió közepe = polylabel, település = populated places koordináta
   |   6. validálás: séma + jelölők helyzete + távolságok
   v
data/packs/<id>.json                     (generált, verziózott)
   | src/packs/index.js (registry, JSON import)
   | build-site.js: esbuild IIFE bundle + CSS -> inline
   v
dist/index.html                          (egyetlen önálló fájl)
```

## Futásidejű rétegek

```
src/ui/main.js        belépési pont: pack validálás, storage (usableStorage) + rng létrehozása, createApp
   |
src/ui/app.js         vezérlő: UI állapot, akciók, renderelés; nem dönt, az engine és a modell döntését alkalmazza
   |-- home-view.js / quiz-view.js     állapot -> DOM (renderelés + callbackek, data-key / data-autofocus)
   |-- keymap.js                       TISZTA: billentyű + session -> akció
   |-- map-model.js                    TISZTA: állapot -> jelölők tónusa, fókusz, feliratok, jelmagyarázat számai
   |-- map-view.js                     SVG: alaprétegek egyszer, overlay a modellből; tap -> viewBox koordináta
   |-- dom.js                          elemkészítés, fókusz megőrzése újrarajzoláskor (ADR-016)
   v
src/engine/           TISZTA, DOM nélkül, unit tesztelt
   session.js         állapotgép: ask -> (revealed) -> result -> next; autoAdvance: mi jön a válasz után
   leitner.js         ismétlés: doboz 0..5, súly 2^(5-doboz), hiba -> 1-es doboz
   choices.js         4 opció: cél + közeli azonos típusú szomszédok
   hit-test.js        legközelebbi jelölő sugáron belül
   deck.js            pakli -> elemek
   settings.js        beállítások alapértéke, a tárolt (régi, hibás) értékek javítása
   distance.js        két elem távolsága (choices, hit-test és a build validáció közös)
   progress-store.js  mentés injektált Storage-on át, sosem dob kivételt
   pack-schema.js     séma validálás (build, teszt és app közös)
   rng.js, format.js  seedelhető véletlen, sablonkitöltés
```

Elv: **funkcionális mag, imperatív héj**. Minden döntés (mi a következő kártya, mi helyes, mi látszik a térképen)
tiszta függvényben van; a DOM réteg csak kirajzol és eseményt továbbít.

## Pack séma (v1)

```json
{
  "schemaVersion": 1,
  "id": "hu-megyek",
  "title": "...", "shortTitle": "...", "lang": "hu",
  "hintsLabel": "Megyehatárok súgóként",
  "attribution": "Térképadat: Natural Earth (közkincs)",
  "viewBox": [0, 0, 1000, 632],
  "outline": "M...Z",
  "hints": "M...Z",
  "kinds": {
    "area":  { "label": "Megye", "marker": "ring", "detail": "...", "prompts": { "recall": "...", "choice": "...", "locate": "Hol van {name} megye?" } },
    "place": { "label": "Megyeszékhely", "marker": "dot", "...": "..." }
  },
  "decks": [ { "id": "megyek", "title": "Megyék", "kinds": ["area"] } ],
  "items": [ { "id": "HU-BA", "kind": "area", "group": "HU-BA", "name": "Baranya", "detail": "Székhely: Pécs", "x": 247.8, "y": 523.6 } ]
}
```

- `kind`: a jelölő típusa; a promptok és a jelölő alakja típushoz kötött, így vegyes pakli is működik.
- `group`: összetartozó elemek (megye és székhelye). Validáláshoz és későbbi párosítás módhoz.
- Koordináták a `viewBox` pixelterében. A vetítés kizárólag build időben történik.

## Állapot és tárolás

- `settings`: kiválasztott csomag, pakli, mód, megyehatár súgó, minden jelölő látszik-e. Kulcs: `vakterkep:v1:settings`. Betöltéskor a
  `normalizeSettings` javítja az ismeretlen vagy elavult értékeket (pl. törölt csomag, régi mód).
- Haladás: `vakterkep:v1:progress:<packId>:<mode>` -> `{ items: { [itemId]: { box, seen, correct } } }`.
  Módonként külön (felidézés és helymegtalálás más tudás), paklik között közös (ugyanaz az elem).
- A session nem perzisztens; újraindításkor a mentett haladásból indul.
- Ha a localStorage nem elérhető, memória-tároló fut (a haladás a látogatás végéig él).
- Ha egyetlen beépített csomag sem érvényes, az app hibaüzenetet mutat, nem omlik össze.

## Megjelenítés

- Jelölők és feliratok mérete képernyő-pixelben van megadva, `ResizeObserver` számolja át viewBox egységre.
- A körvonal `vector-effect: non-scaling-stroke`, így minden méretben azonos vastagságú.
- Kvízben alapból csak a kérdezett jelölő látszik ("Keresd" módban csak a bökés után), a többi a "Minden karika és
  pont látszik" kapcsolóval jelenik meg (ADR-017). A döntés a `quizModel`-ben van.
- A "Keresd" módban látható jelölőknél a koppintás sugara 30 képernyő-pixel, távolabbi koppintás nem számít válasznak;
  rejtett jelölőknél a kérdezett típus legközelebbi eleme számít (`locateRadius`).
- Téma: CSS változók; világos = kockás füzet, sötét = iskolai tábla. Az egyetlen animáció a piros tollkarika.
  A sötét tokenek kétszer szerepelnek (rendszerbeállítás és `data-theme`); a `test/ui/styles.test.js` őrzi az egyezést.
- A haladás a kezdőtérképen nem csak színnel látszik: tanulod = szaggatott karika / üres pont, megy = pipa;
  a jelmagyarázat számokkal is kiírja.
- Fókusz: újrarajzolás után ugyanarra a vezérlőre kerül vissza (`data-key`), vagy a fázis alapértelmezésére.

## Kiterjesztési pontok

| Igény | Hol |
|-------|-----|
| Új csomag | `tools/pack-configs/<id>.js` + `src/packs/index.js` |
| Új vetítés | `PROJECTIONS` a `tools/geo/projection.js`-ben |
| Új forrás típus | `config.sources` (url, szűrő, megtartott mezők) |
| Új tanulási mód | `session.js` + `MODES` + configok `prompts` + `quiz-view.js` |
| Más ismétlési algoritmus | `leitner.js` interfésze mögött |
| Új nyelv | `strings.js` + csomag `lang` |
