import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './styles.css';
import { App } from './App.jsx';
import { loadData } from './store.js';

registerSW({ immediate: true });

loadData().then(() => render(<App />, document.getElementById('app')));
