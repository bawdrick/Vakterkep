# Követelmények

## Cél

Földrajzi nevek (megyék, megyeszékhelyek, később országok, fővárosok) megtanulása **vaktérképen**, tanulókártyás,
ismétléses módszerrel, elsősorban telefonon.

## Funkcionális követelmények

| ID | Követelmény | Állapot |
|----|-------------|---------|
| F1 | A térképen csak a külső körvonal látszik (országhatár). Vízrajz, domborzat, Balaton nincs. | kész |
| F2 | Jelölők: karika = terület közepe (megye), pont = település (székhely). | kész |
| F3 | Paklik: Megyék, Megyeszékhelyek, Vegyes. A paklik a csomag configjából jönnek. | kész |
| F4 | Kártya mód: megjelölt hely, felidézés, megfordítás, önértékelés (Tudtam / Nem tudtam). | kész |
| F5 | Válassz mód: 4 lehetőség, a rossz válaszok a földrajzi szomszédok közül jönnek. | kész |
| F6 | Keresd mód: név alapján bökés a térképen, a cél típusú jelölők közül a legközelebbi számít. | kész |
| F7 | Visszajelzés: helyes válasz zölden, rossz pirossal, mindkettő felirattal a térképen, plusz kiegészítő info (székhely / megye). | kész |
| F8 | Ismétlés: Leitner-dobozok, a hibázott kártyák gyakrabban jönnek. | kész |
| F9 | Haladás mentése a böngészőben, módonként; az azonos elemek haladása a paklik között közös. | kész |
| F10 | Kezdőképernyőn a térkép a pakli haladását mutatja (még nem, tanulod, megy). | kész |
| F11 | Opcionális belső határ súgó (megyehatárok), alapból kikapcsolva. | kész |
| F12 | Haladás törlése kétlépéses megerősítéssel. | kész |
| F13 | Pest megye / Budapest különlegesség jelzése a kártyán. | kész |

## Nem-funkcionális követelmények

- **Platform**: mobil-első web, desktopon kétoszlopos elrendezés. Telepítés nélkül, linkkel nyitható.
- **Önállóság**: egyetlen HTML fájl, futásidőben nincs hálózati igény (a betűtípus kivételével, fallbackkel).
- **Méret**: `dist/index.html` < 1 MB, csomag JSON < 200 KB.
- **Pontosság** (build közben ellenőrizve): terület-jelölő a saját területén belül; település a saját területe
  külső határán belül (enklávé megengedett, pl. Budapest Pest megyében); minden jelölő az országhatáron belül;
  azonos típusú jelölők között minimális távolság (`minPointSpacing`).
- **Forrás**: közkincs adat (Natural Earth), reprodukálható pipeline, a forrás kivonata verziózva.
- **Akadálymentesség**: billentyűzet, látható fókusz, csökkentett mozgás tisztelete, világos és sötét téma.
- **Karbantarthatóság**: tiszta engine réteg unit tesztekkel, adatvezérelt tartalom, dokumentált döntések.

## Továbbfejlesztési irány (backlog, javasolt sorrendben)

1. **Kontinens csomagok** (Európa országai és fővárosai stb.): automatikus `regions` generálás admin-0 adatból,
   `lambert-azimuthal` vetítés. Lásd `adding-a-pack.md`.
2. **Nagyítás és mozgatás** (pinch zoom, pan): kis országok miatt a kontinens csomagokhoz szükséges.
3. **Opcionális országhatár réteg** kontinensekhez (a súgó réteg általánosítása).
4. **Csomagválasztó UI**, ha egynél több csomag van a registryben.
5. **Párosítás mód**: megye -> székhely (térkép nélkül vagy kiemelt területtel).
6. **Statisztika nézet**: leggyakrabban elrontott elemek, időbeli fejlődés.
7. **PWA**: telepíthető, offline cache, saját ikon.
8. **E2E tesztek** Playwrighttal (jelenleg unit tesztek, happy-dom UI tesztek és kézi böngészős ellenőrzés).
9. **Topológia-megőrző egyszerűsítés** (közös határszakaszok egyszer), ha a súgó réteg mérete számít.
10. **i18n**: `strings.js` nyelvenként, csomagonkénti `lang`.
