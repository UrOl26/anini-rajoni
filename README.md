# Anini Rajoni

PWA for a postwoman: a map of each mailbox wall with the family names on it, so finding the right mailbox takes seconds. Interface in Slovenian.

Live: https://urol26.github.io/anini-rajoni/

Specs live in the claude.ai project "PWA Anini Rajoni" (`NAVODILA.md`, `DESIGN.md`, `DECISIONS.md`).

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Structure

- `src/i18n/sl.js` – all interface text (Slovenian)
- `src/store.js` – data in memory + IndexedDB, backup export/import
- `src/lib/` – layout helpers, forgiving search, camera, Claude API reader
- `src/screens/` – Home, RouteScreen, AddLocation, LayoutScreen, LayoutEditor, Scanner, Settings
- `src/components/` – shared UI (cards, grid, sheets, camera)
- `scan-test/` – standalone test page for cloud name reading
- `icons-src/` – SVG sources for the app icons in `public/icons/`

Reading text (names, letters, addresses) uses Claude Haiku via the Claude API, called from the phone. The API key is entered in *Nastavitve* and stored only in that browser's localStorage.

## Import / backup file format

*Nastavitve → Uvozi* accepts this JSON. *Dodaj k obstoječim* merges it: routes are matched by `number`, locations by route + address (ignoring case and č/š/ž); an imported layout only fills a location that has none.

```json
{
  "app": "anini-rajoni",
  "data": {
    "routes": [{ "id": "r1", "number": "3" }],
    "locations": [
      {
        "id": "l1",
        "routeId": "r1",
        "address": "Celovška cesta 12, vhod A",
        "layout": {
          "rows": 3,
          "cols": 4,
          "disabled": { "0-1": true },
          "names": { "0-0": ["Novak"], "0-2": ["Kranjc", "Horvat"] }
        }
      }
    ]
  }
}
```

Cell keys are `"row-col"`, counted from 0 at the top left. `layout` may be `null` (no layout yet). Ids only need to be unique within the file.
