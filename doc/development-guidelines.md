# Fejlesztési irányelvek

Cél: a kód évek múlva is érthető, biztonságosan bővíthető és tesztelhető maradjon, akár ember, akár agent dolgozik rajta.

## Alapelvek

### DRY - egy igazságforrás mindenre
- Tartalom: a csomag configja (`tools/pack-configs/`). A pack JSON ebből generálódik, kézzel nem szerkesztjük.
- Pack szerkezet: `src/engine/pack-schema.js`, ezt használja a build, a teszt és az app is.
- Szövegek: `src/ui/strings.js` (UI), a config `kinds` része (csomag-specifikus promptok, részletek).
- Színek, méretek: CSS tokenek a `styles.css` elején; a térkép jelölőméretei a `map-view.js` `SIZE` objektumában.
- Közös segédfüggvények: távolság `src/engine/distance.js`, kerekítés `tools/geo/round.js`, százalék `src/engine/format.js`.
- Ha ugyanazt a logikát másodszor írnád le, emeld ki függvénybe abban a rétegben, ahová tartozik.

### KISS és YAGNI, de kijelölt bővítési pontokkal
- A legegyszerűbb működő megoldás, amíg a következő ismert igény mást nem kíván.
- A bővítési pontokat (vetítések táblája, `MODES`, `kinds`, `sources`) tartsd egyszerű adatszerkezetnek, ne
  absztrakt osztályhierarchiának.
- Új általánosítást csak akkor vezess be, ha legalább két konkrét felhasználása van (pl. második csomag).

### Tiszta mag, vékony héj
- `src/engine` és a `tools/geo` tiszta függvények: bemenet -> kimenet, mellékhatás nélkül, a bemenetet nem módosítják.
- Mellékhatás (DOM, tárolás, fájl IO, hálózat) csak a héjban: `src/ui/app.js`, `src/ui/*-view.js`, `src/ui/map-view.js`,
  `tools/*.js` CLI-k, `tools/pack-io.js`.
- A héj nem dönt: ha egy `if` azt dönti el, mi történjen (továbblépés, mi látszik), az tiszta függvény az engine-ben
  vagy a `map-model.js`-ben, és a héj csak alkalmazza (pl. `autoAdvance`, `keyCommand`).
- A view-k előtt tiszta view-model áll (`map-model.js`), így a megjelenítési döntések is tesztelhetők.

### Egy felelősség modulonként
- Egy fájl egy témát old meg; 200 sor fölött gondold át a bontást.
- Függvények lehetőleg 40 sor alatt; ha egy blokk fölé kommentet írnál, az gyakran egy függvénynév.
  A gyárfüggvényekre (`createApp`, `createMapView`) is vonatkozik: a részlépések modulszintű függvények.

### Függőség-injektálás
- A véletlen (`rng`), a tárolás (`storage`) és az időzítő (`timers`) paraméterként érkezik. Így a teszt determinisztikus (seedelt rng,
  memória-tároló).

### Adatvezérelt bővítés
- Új térkép = új config + egy sor a `src/packs/index.js`-ben. Ha ehhez kódot kell módosítani, az új képesség,
  és ADR-t kér.

### Validálj a határokon
- Build: hangosan bukjon el (séma, geo-ellenőrzés, hiányzó forrás-egység).
- Futásidő: kecsesen degradálódjon (hibás pack kimarad, tárolási hiba nem állítja meg az appot).

## Kódstílus

- Kódazonosítók angolul, felhasználói szöveg magyarul.
- Fájl elején 1-2 soros összefoglaló komment; blokkok fölött 1 soros komment csak ott, ahol a "miért" nem nyilvánvaló.
- Nincsenek mágikus számok: nevesített konstans a fájl tetején (`TAP_RADIUS_PX`, `MAX_BOX`).
- Immutábilis állapotkezelés az engine-ben (`{ ...state, ... }`).
- `const` alapból, korai visszatérés a mély beágyazás helyett.
- Kerüld az okos egysorosokat, ha egy kezdőnek nehéz olvasni.

## Tesztelés

- Minden engine és geo modulnak van unit tesztje (`test/engine`, `test/geo`), a hibaágaknak is (negatív teszt).
- UI: `test/ui` happy-dom-on (ADR-015). A view-modell és a billentyűtérkép tiszta tesztet kap, a teljes app
  (`createApp`) viselkedéstesztet: kattintás, billentyű, fókusz, időzítés.
- CLI eszközök: a logika exportált függvény (`buildChecked`, `extractSubset`, `renderPreview`), a `main` csak IO;
  legalább egy CLI-t a teszt ténylegesen elindít (`test/tools/cli.test.js`), mert az indítás is elromolhat.
- Közös tesztadat: `test/fixtures/` (mini forrás + config, mini futásidejű pack); DOM: `test/helpers/dom-env.js`.
- Minden csomagra fut a `test/packs.test.js`: felépül, átmegy a geo validáción, és a commitolt JSON naprakész.
- A `test/site.test.js` a kimenet szerződését védi (önálló fájl, méret, engedélyezett hostok).
- Hibajavítás előtt írj egy elbukó tesztet, ami a hibát reprodukálja; fölé `// Regression: ...` komment kerül.
- UI változásnál ezen felül kézi ellenőrzés 390 px és 1280 px szélességen, világos és sötét témában
  (a Playwright e2e a backlogban van).

## Függőségek

- Futásidejű függőség nincs; dev-függőség csak indokolt esetben, ADR-rel.
- Pontos verzió (`"esbuild": "0.28.2"`, nem `^`), és legalább 14 napos kiadás (ellátási lánc kockázat).
- A `package-lock.json` verziózott.

## Teljesítmény és méret

- `dist/index.html` < 1 MB, egy pack JSON < 200 KB (a `--report` és a build kiírja a méretet).
- Egyszerűsítési tolerancia a configban (`simplifyTolerance`, pixelben); 0,6 px felett a határ már szögletesedik.

## Akadálymentesség

- Minden interakció elérhető billentyűzettel, látható fókusszal.
- Érintési célok legalább 44 px magasak.
- Animáció csak `prefers-reduced-motion` tiszteletben tartásával.
- Újrarajzolás után a fókusz a helyén marad: új vezérlő `data-key`-t kap, a fázis fő vezérlője `data-autofocus`-t.
- Csoportos választás (pakli, mód) natív rádiógombbal, így a nyilak és a felolvasó szerepek maguktól működnek.
- Szín sosem az egyetlen jelzés: a visszajelzés szövegben is megjelenik.

## Munkafolyamat

1. Olvasd el a `CLAUDE.md`-t és az érintett doksit.
2. Kis, önálló lépések; minden lépés után `npm test`, zöld teszt után commit (git, `main` ág).
3. Térkép vagy pipeline változásnál: `npm run build:packs`, `npm run preview`, a kép átnézése.
4. Commit üzenet: `terület: mit és miért` (pl. `engine: choice distractors from same kind only`).
5. Architekturális változás: új ADR a `doc/decisions.md` végére.
