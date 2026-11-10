# Vaktérkép

Vaktérképes tanulókártya web app. A térképen csak a határ látszik, a karikák területek közepét
(pl. megyéket), a pontok településeket (pl. megyeszékhelyeket) jelölnek. Három mód: Kártya, Válassz, Keresd. Alapból csak a kérdezett jelölő látszik, kapcsolóval mind.
Ismétlés Leitner-dobozokkal, haladás a böngészőben mentve.

Első csomag: Magyarország 19 megyéje és megyeszékhelye. Új térkép (pl. kontinensek) egy új config fájllal adható hozzá.

**Kipróbálás:** https://bawdrick.github.io/Vakterkep/ (a `main` ág minden commitja után automatikusan frissül).

## Gyors indulás

```bash
npm install
npm test
npm run build        # -> dist/index.html (egyetlen önálló fájl, linkkel vagy fájlként nyitható)
```

## Dokumentáció

- `CLAUDE.md` - rövid útmutató agenteknek (és embereknek)
- `doc/requirements.md` - követelmények és backlog
- `doc/architecture.md` - felépítés, adatfolyam, pack séma
- `doc/decisions.md` - architekturális döntések (ADR)
- `doc/development-guidelines.md` - fejlesztési irányelvek
- `doc/adding-a-pack.md` - új térképcsomag hozzáadása

## Adatforrás

Natural Earth (közkincs), https://www.naturalearthdata.com
