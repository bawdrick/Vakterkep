# CLAUDE.md - Vaktérkép

Utasítások a projektmappát megnyitó agentnek. Olvasd el ezt, majd a `doc/` mappát, mielőtt módosítasz.

## Cél

Mobilon is jól használható web app, amellyel **vaktérképen** lehet földrajzi neveket tanulni tanulókártyás módszerrel.
A térképen csak az országhatár (vagy kontinens körvonala) látszik, és jelölők: **karika** = terület közepe (pl. megye),
**pont** = település (pl. megyeszékhely). Nincs Balaton, folyó, domborzat.

Első adatcsomag: Magyarország 19 megyéje és megyeszékhelye (`hu-megyek`).
Fő továbbfejlesztési irány: **általános motor + cserélhető adatcsomagok** (pl. kontinensek országai és fővárosai).
Részletek: `doc/requirements.md`.

## Parancsok

```bash
npm install                 # 2 pinned devDependency: esbuild, polygon-clipping
npm test                    # node:test, minden tesztnek zöldnek kell lennie
npm run build               # build:packs + build:site -> dist/index.html
npm run build:packs         # tools/pack-configs/*.js -> data/packs/*.json (+ geo validáció)
npm run build:site          # egyetlen önálló HTML: dist/index.html
npm run watch               # site újraépítése src/ vagy data/packs/ változásakor
npm run fetch-sources       # Natural Earth letöltés + kivágás data/sources/-ba (csak új/frissített forrásnál)
npm run preview             # feliratos ellenőrző SVG: dist/preview-<id>.svg
node tools/build-pack.js hu-megyek --report   # legközelebbi jelölőpárok távolsága
```

Fejlesztés közben a `dist/index.html` közvetlenül megnyitható böngészőben (file://). Ott a localStorage
blokkolva lehet, ilyenkor a haladás csak az adott látogatásig él (memória fallback). Valós teszthez:
`cd dist && python3 -m http.server`.

## Felépítés

```
CLAUDE.md, README.md, package.json
doc/                  követelmények, architektúra, döntések (ADR), fejlesztési irányelvek, új csomag útmutató
src/engine/           tiszta logika, DOM nélkül: session (állapotgép), leitner, choices, hit-test, pack-schema, store
src/ui/               vékony DOM réteg: app (vezérlő), *-view (renderelés), map-model (tiszta view-model), map-view (SVG)
src/ui/strings.js     MINDEN felhasználói szöveg itt (magyar)
src/ui/styles.css     design tokenek (világos: kockás füzet, sötét: iskolai tábla)
src/packs/index.js    a beépített csomagok listája
tools/                build idejű pipeline (Node): geo/, pack-builder, validate-pack, build-*, fetch-sources, preview-pack
tools/pack-configs/   csomagonként egy deklaratív config (EZ a tartalom forrása)
data/sources/         a forrásadatok csomagra vágott, verziózott kivonata
data/packs/           GENERÁLT csomag JSON-ok (kézzel ne szerkeszd)
data/raw/             letöltött nyers adat (gitignore)
test/                 engine/, geo/, ui/ unit tesztek + packs.test.js + site.test.js
dist/                 build kimenet (gitignore)
```

## Szabályok

- **Rétegek**: `src/engine` nem érhet el DOM-ot, `window`-t, `localStorage`-ot. Függőséget injektálunk (storage, rng).
- **Adatvezérelt**: új tartalom = új config a `tools/pack-configs/`-ban, nem új kód. Kódot csak új képességhez írj.
- **Generált fájlok**: `data/packs/*.json`-t csak `npm run build:packs` írja. A `test/packs.test.js` ellenőrzi, hogy szinkronban van.
- **Szövegek**: UI szöveg csak `src/ui/strings.js`-be, csomag-specifikus szöveg a configba. Kódazonosítók angolul, UI magyarul.
- **Egyfájlos kimenet**: `dist/index.html` önálló, külső script nélkül, 1 MB alatt. Külső erőforrás csak Google Fonts.
- **Kommentstílus**: fájl elején 1-2 soros összefoglaló, blokkok fölött 1 soros komment, egyébként a kód beszéljen.
- **Tesztelhetőség**: új logika tiszta függvényként, unit teszttel. Véletlen csak injektált, seedelt `rng`-vel.
- **Függőségek**: pontos verzió, legalább 14 napos kiadás. Új függőség csak ADR-rel (`doc/decisions.md`).
- **Döntések**: architekturális változásnál új ADR bejegyzés a `doc/decisions.md` végére.
- **Akadálymentesség**: billentyűzet, látható fókusz, `prefers-reduced-motion`, világos/sötét téma, min. 44 px érintési cél.

## Kész akkor, ha

1. `npm test` zöld, és az új logikához van teszt.
2. `npm run build` hiba nélkül lefut, a geo validáció tiszta.
3. Térképet érintő változásnál megnézted a `npm run preview` képet és a UI-t mobil (390 px) és desktop szélességen.
4. Az érintett doksi frissítve (követelmény, ADR, útmutató).

## Gyakori feladatok - hol kezdd

- Új térkép/csomag: `doc/adding-a-pack.md`.
- Új tanulási mód: `src/engine/session.js` (állapotgép) + `MODES` a `pack-schema.js`-ben + prompt a configok `kinds` részében + `quiz-view.js` + `strings.js`.
- Ismétlési algoritmus: `src/engine/leitner.js` (az interfész maradjon: `recordAnswer`, `pickNext`, `masteredCount`).
- Kinézet: tokenek a `styles.css` elején, mindkét témában.
