// Makes the activation QR code on this device. Nothing is sent anywhere or saved,
// except one free check that the key works (the same request the app makes).
import QRCode from 'qrcode';
import { buildPayload, looksLikeKey, verifyKey } from '../src/lib/activation.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const result = $('result');
const nameInput = $('name');
const keyInput = $('key');
const error = $('error');
const check = $('check');
const canvas = $('qr');

let shownAt = 0;

function showError(text) {
  error.textContent = text;
  error.hidden = !text;
}

async function show() {
  const key = keyInput.value.trim();
  const name = nameInput.value.trim();
  if (!key) return showError('Vpiši API ključ.');
  if (!looksLikeKey(key)) return showError('To ni API ključ. Začne se s sk-ant-.');
  showError('');

  const size = Math.min(window.innerWidth - 64, 420);
  await QRCode.toCanvas(canvas, buildPayload(key, name), {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  $('forWhom').textContent = name ? `Za: ${name}` : 'Koda za aktivacijo';
  form.hidden = true;
  result.hidden = false;

  const thisShow = ++shownAt;
  check.className = 'check';
  check.textContent = 'Preverjam ključ …';
  const state = await verifyKey(key);
  if (thisShow !== shownAt) return;
  if (state === 'ok') {
    check.className = 'check ok';
    check.textContent = '✓ Ključ deluje.';
  } else if (state === 'invalid') {
    check.className = 'check bad';
    check.textContent = 'Ključ ne deluje (preklican ali napačen). Naredi novega v Claude Console.';
  } else {
    check.textContent = 'Ključa ni bilo mogoče preveriti (ni interneta?). Koda vseeno deluje.';
  }
}

function clearAll() {
  shownAt++;
  keyInput.value = '';
  nameInput.value = '';
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.height = 0;
  result.hidden = true;
  form.hidden = false;
  showError('');
}

$('show').addEventListener('click', show);
keyInput.addEventListener('keydown', (e) => e.key === 'Enter' && show());
keyInput.addEventListener('input', () => showError(''));
$('close').addEventListener('click', clearAll);
// Leaving the page or switching away for good wipes everything.
window.addEventListener('pagehide', clearAll);
