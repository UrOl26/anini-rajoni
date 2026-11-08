// Copies the Tesseract.js worker, WebAssembly core and Slovenian language data
// into public/ocr/, so the app serves them itself and text reading works offline.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'public', 'ocr');
const nm = join(root, 'node_modules');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'core'), { recursive: true });
mkdirSync(join(out, 'lang'), { recursive: true });

cpSync(join(nm, 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js'));

// Tesseract picks the build that fits the phone (SIMD / relaxed SIMD), so ship all.
const coreDir = join(nm, 'tesseract.js-core');
for (const file of readdirSync(coreDir).filter((f) => f.endsWith('.wasm.js'))) {
  cpSync(join(coreDir, file), join(out, 'core', file));
}

// "best_int" is the smaller, faster integer version of the LSTM model.
cpSync(
  join(nm, '@tesseract.js-data', 'slv', '4.0.0_best_int', 'slv.traineddata.gz'),
  join(out, 'lang', 'slv.traineddata.gz'),
);

console.log('OCR assets copied to public/ocr/');
