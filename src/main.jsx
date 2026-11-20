import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './styles.css';
import { App } from './App.jsx';
import { loadData } from './store.js';

registerSW({ immediate: true });

// The page itself never zooms (Safari ignores user-scalable=no): only the mailbox grid zooms, by its own code.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
// Double-tap zoom is switched off in CSS (touch-action: manipulation).

loadData().then(() => render(<App />, document.getElementById('app')));
