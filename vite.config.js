import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from GitHub Pages at https://urol26.github.io/anini-rajoni/
export default defineConfig({
  base: '/anini-rajoni/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Anini Rajoni',
        short_name: 'Anini Rajoni',
        description: 'Kje je čigav nabiralnik.',
        lang: 'sl',
        start_url: '/anini-rajoni/',
        scope: '/anini-rajoni/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5F6F8',
        theme_color: '#00022D',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}'],
        globIgnores: ['scan-test/**', 'assets/scanTest-*'],
        navigateFallback: '/anini-rajoni/index.html',
        navigateFallbackDenylist: [/scan-test/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        scanTest: 'scan-test/index.html',
      },
    },
  },
});
