# Architekturális döntések (ADR napló)

Formátum: kontextus, döntés, következmény. Új döntés a fájl végére kerül, a régit nem írjuk át,
hanem egy új bejegyzés "felülírja" (hivatkozással).

---

## ADR-001: Vanilla JavaScript, UI framework nélkül

- **Kontextus**: kis app (2 képernyő), egyfájlos kimenet, agentek és emberek is szerkesztik.
- **Döntés**: ES modulok, saját minimális DOM helper (`src/ui/dom.js`), teljes képernyő újrarajzolás állapotváltáskor.
- **Következmény**: nincs framework frissítési teher, kis bundle. Ha a képernyők száma 5 fölé nő, vagy
  részleges frissítés kell a teljesítmény miatt, újra kell értékelni (pl. Preact).

## ADR-002: Vetítés build időben, a futásidő csak pixelt lát

- **Kontextus**: a geometria (vetítés, összevonás, egyszerűsítés) drága és hibalehetőséges.
- **Döntés**: a pipeline előre vetített SVG path-t és pixelkoordinátás jelölőket ír a pack-be.
- **Következmény**: az app egyszerű és gyors, a geo hibák build közben bukkannak elő. Ára: a pack egy
  vetítéshez kötött; más vetítéshez újra kell építeni.

## ADR-003: Natural Earth forrás, verziózott kivonattal

- **Kontextus**: közkincs, ismert, GitHubról elérhető; a nyers fájlok 13-40 MB-osak.
- **Döntés**: a `fetch-sources.js` letölti a nyers fájlt (`data/raw/`, gitignore), és csak a csomaghoz szükséges
  feature-öket és mezőket menti `data/sources/`-ba, ~1 m-es kerekítéssel.
- **Következmény**: a build offline és reprodukálható. Forrásfrissítés tudatos lépés (`npm run fetch-sources`).

## ADR-004: Régió-összevonás explicit `parts` listával, polygon-clipping könyvtárral

- **Kontextus**: a Natural Earth admin-1 adatban a megyei jogú városok külön egységek (43 egység).
- **Döntés**: a config régiónként felsorolja az összevonandó egységeket; az uniót a `polygon-clipping` végzi.
- **Következmény**: átlátható, ellenőrizhető leképezés. A teszt elkapja, ha egy egység hiányzik vagy rossz helyre kerül.
  Kontinens csomagnál a `parts` automatikusan generálható (lásd `adding-a-pack.md`).

## ADR-005: Jelölők helye: polylabel és populated places

- **Kontextus**: a súlypont tagolt alakzatnál a területen kívül eshet; a település helyét nem akarjuk becsülni.
- **Döntés**: terület-jelölő = a legnagyobb poligon "legbelső pontja" (pole of inaccessibility, lyukakat kerülve);
  település = Natural Earth populated places koordináta.
- **Következmény**: a jelölők vizuálisan középen vannak, és a validáció bizonyítja, hogy a helyükön vannak.

## ADR-006: Leitner-dobozos ismétlés

- **Kontextus**: kevés elem (19-50), rövid tanulási alkalmak, mobil.
- **Döntés**: 0-5 dobozok; jó válasz +1, rossz válasz vissza az 1-esbe; választási súly 2^(5 - doboz);
  "megy" = legalább 3-as doboz. Közvetlen ismétlés kizárva.
- **Következmény**: egyszerű, magyarázható, tesztelhető. Időalapú ütemezés (SM-2) a `leitner.js` interfésze mögé cserélhető.

## ADR-007: Haladás módonként, paklik között közösen

- **Kontextus**: ugyanaz az elem több pakliban is szerepel (pl. vegyes pakli).
- **Döntés**: tárolási kulcs `<packId>:<mode>`, a haladás elemenként.
- **Következmény**: a vegyes pakli látja a külön paklikban szerzett tudást. A módok külön tudást mérnek.

## ADR-008: Egyetlen önálló HTML (esbuild IIFE + inline)

- **Kontextus**: linkkel nyitható, telepítés nélküli használat; a hoszting nem enged külső scriptet.
- **Döntés**: esbuild bundle (`format: iife`), a CSS és a JS a sablonba ágyazva; a pack JSON importként kerül be.
- **Következmény**: bárhol fut (file://, statikus hoszting). A `site.test.js` ellenőrzi, hogy nincs külső script.

## ADR-009: Tesztkeret: node:test, minimális függőség

- **Kontextus**: fenntarthatóság, kevés karbantartandó eszköz.
- **Döntés**: beépített `node:test` és `assert`; csak két dev-függőség (`esbuild`, `polygon-clipping`), pontos verzióval.
  A geo segédfüggvények (vetítés, egyszerűsítés, polylabel, pont-poligon) saját, tesztelt kódok.
- **Következmény**: `npm test` gyors és stabil. Ha a vetítések száma nő, a `d3-geo` bevezetése mérlegelendő.

## ADR-010: Koppintás értelmezése a cél típusán belül, képernyő-pixel sugárral

- **Kontextus**: vegyes pakliban egy megyeközép és a székhely közel eshet (Baranya és Pécs kb. 15 px).
- **Döntés**: "Keresd" módban csak a kérdezett típusú jelölők közül keresünk legközelebbit, 30 képernyő-pixelen belül;
  a távolabbi koppintás nem számít válasznak. A távolság-validáció ezért típusonként fut.
- **Következmény**: nincs véletlen rossz válasz a másik jelölőtípus miatt; a prompt úgyis megnevezi a típust.

## ADR-011: Méretezés képernyő-pixelben, `ResizeObserver`-rel

- **Kontextus**: ugyanaz a térkép 360 px-es telefonon és 1200 px-es monitoron is olvasható legyen.
- **Döntés**: a jelölők, feliratok, a tollkarika méretét képernyő-pixelben adjuk meg, átméretezéskor újraszámoljuk;
  a körvonal `non-scaling-stroke`. A felirat oldalt vált, ha kilógna a térképről.
- **Következmény**: egységes kinézet minden méretben, kevés CSS trükk.

## ADR-012: Tárolás injektálva, memória fallbackkel

- **Kontextus**: a localStorage blokkolt lehet (file://, privát mód, beágyazás).
- **Döntés**: a `progress-store.js` injektált Storage-ot kap, sosem dob kivételt; a `main.js` memória-tárolóra vált, ha kell.
- **Következmény**: az app mindig működik; legrosszabb esetben a haladás csak a látogatásig él.

## ADR-013: Vizuális irány: kockás füzet és iskolai tábla

- **Kontextus**: a vaktérkép iskolai munkalap; a dizájn ebből a világból vegye a nyelvét.
- **Döntés**: világos téma = kockás füzetlap, golyóstoll-kék és tanári piros; sötét téma = zöld tábla krétaszínekkel.
  Betűk: Lexend (UI), Caveat (kézírásos válasz és feliratok). Egyetlen animáció: a piros tollkarika megrajzolása.
- **Következmény**: felismerhető, nyugodt felület; a színek CSS tokenekben, mindkét témára definiálva.
