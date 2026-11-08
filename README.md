# Anini Rajoni

PWA for a postwoman: a map of each mailbox wall with the family names on it, so finding the right mailbox takes seconds.

Live: https://urol26.github.io/anini-rajoni/

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

Text reading uses [Tesseract.js](https://github.com/naptha/tesseract.js) on the device. `scripts/copy-ocr-assets.mjs` copies its worker, WebAssembly core and Slovenian language data into `public/ocr/`, so they are served by the app itself and work offline.

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Pages

- `/` – app (in progress)
- `/ocr-test/` – test page for live name reading (speed and accuracy)
