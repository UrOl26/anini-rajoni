import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// Served from GitHub Pages at https://urol26.github.io/anini-rajoni/
export default defineConfig({
  base: '/anini-rajoni/',
  plugins: [preact()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        ocrTest: 'ocr-test/index.html',
      },
    },
  },
});
