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
- `/scan-test/` – test page for cloud name reading with Claude Haiku (`src/lib/cloudReader.js`). The API key is entered on the phone and kept in localStorage only.
- `/ocr-test/` – test page for on-device name reading with Tesseract.js (rejected: can't read handwriting or engraved metal)
