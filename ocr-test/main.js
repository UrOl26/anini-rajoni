// OCR test page: reads names live from the camera with Tesseract.js, fully on the
// device, and measures how long each read takes. No images are saved.
import { createWorker, OEM, PSM } from 'tesseract.js';
import { sl, fmt } from './sl.js';
import { splitNames, normalizeName, NAME_CHAR_WHITELIST } from '../src/lib/names.js';

const $ = (id) => document.getElementById(id);
const base = new URL(import.meta.env.BASE_URL, location.origin).href;

const MIN_CONFIDENCE = 60; // a read must be at least this sure to count
const CROP_MIN_WIDTH = 600; // px; small crops are scaled up for better reading
const CROP_MAX_WIDTH = 1000; // px; large crops are scaled down for speed

const state = {
  worker: null,
  stream: null,
  running: false,
  pendingMode: PSM.SINGLE_LINE,
  mode: null,
  times: [],
  lastNorm: '',
  lastSavedNorm: '',
  saved: [],
  modelLoadMs: 0,
  torchSupported: null,
  torchOn: false,
};

// --- Static text -----------------------------------------------------------
document.title = sl.title;
$('title').textContent = sl.title;
$('lblConfidence').textContent = sl.confidence;
$('lblLast').textContent = sl.lastRead;
$('lblAvg').textContent = sl.average;
$('lblCount').textContent = sl.reads;
$('modeLine').textContent = sl.modeLine;
$('modeBlock').textContent = sl.modeBlock;
$('savedTitle').textContent = sl.savedTitle;
$('savedHint').textContent = sl.savedHint;
$('copy').textContent = sl.copy;
$('clear').textContent = sl.clear;
$('startStop').textContent = sl.start;
$('torch').textContent = sl.torchOn;

const setStatus = (text) => ($('status').textContent = text);

let toastTimer;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3000);
}

function deviceLine() {
  const ua = navigator.userAgent.match(/\(([^)]+)\)/)?.[1] ?? navigator.userAgent;
  const track = state.stream?.getVideoTracks()[0];
  const s = track?.getSettings?.();
  const parts = [`${sl.device}: ${ua}`];
  if (s?.width) parts.push(`${sl.camera}: ${s.width} × ${s.height}`);
  if (state.modelLoadMs) parts.push(`${sl.modelLoad}: ${fmt(state.modelLoadMs / 1000)} s`);
  if (state.torchSupported !== null) parts.push(`Svetilka: ${state.torchSupported ? 'da' : 'ni podprta'}`);
  return parts.join(' · ');
}
const updateDevice = () => ($('device').textContent = deviceLine());

// --- Text reader -------------------------------------------------------------
async function loadReader() {
  setStatus(sl.loading);
  const t0 = performance.now();
  try {
    state.worker = await createWorker('slv', OEM.LSTM_ONLY, {
      workerPath: base + 'ocr/worker.min.js',
      corePath: base + 'ocr/core',
      langPath: base + 'ocr/lang',
      workerBlobURL: false,
    });
    await state.worker.setParameters({
      tessedit_char_whitelist: NAME_CHAR_WHITELIST,
      preserve_interword_spaces: '1',
    });
    state.modelLoadMs = performance.now() - t0;
    setStatus(sl.ready(fmt(state.modelLoadMs / 1000)));
    $('startStop').disabled = false;
    updateDevice();
  } catch (err) {
    console.error(err);
    setStatus(sl.loadFailed);
  }
}

// --- Camera -----------------------------------------------------------------
async function startCamera() {
  setStatus(sl.cameraStarting);
  state.stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });
  const video = $('video');
  video.srcObject = state.stream;
  await video.play();

  const track = state.stream.getVideoTracks()[0];
  const caps = track.getCapabilities?.() ?? {};
  state.torchSupported = Boolean(caps.torch);
  $('torch').hidden = !state.torchSupported;
  updateDevice();
}

function stopCamera() {
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
  state.torchOn = false;
  $('torch').textContent = sl.torchOn;
  $('video').srcObject = null;
}

async function toggleTorch() {
  const track = state.stream?.getVideoTracks()[0];
  if (!track) return;
  state.torchOn = !state.torchOn;
  try {
    await track.applyConstraints({ advanced: [{ torch: state.torchOn }] });
  } catch {
    state.torchOn = false;
  }
  $('torch').textContent = state.torchOn ? sl.torchOff : sl.torchOn;
}

// Crops the part of the video under the on-screen frame into a grey canvas.
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

function grabFrame() {
  const video = $('video');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const box = $('camera').getBoundingClientRect();
  const frame = $('frame').getBoundingClientRect();

  // The video uses object-fit: cover, so work out how it maps to the screen.
  const scale = Math.max(box.width / vw, box.height / vh);
  const offX = (box.width - vw * scale) / 2;
  const offY = (box.height - vh * scale) / 2;

  const sx = Math.max(0, (frame.left - box.left - offX) / scale);
  const sy = Math.max(0, (frame.top - box.top - offY) / scale);
  const sw = Math.min(vw - sx, frame.width / scale);
  const sh = Math.min(vh - sy, frame.height / scale);

  const outW = Math.round(Math.min(CROP_MAX_WIDTH, Math.max(CROP_MIN_WIDTH, sw)));
  const outH = Math.round((sh / sw) * outW);
  canvas.width = outW;
  canvas.height = outH;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

  // Greyscale; Tesseract does its own black-and-white step after this.
  const img = ctx.getImageData(0, 0, outW, outH);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// --- Reading loop -------------------------------------------------------------
async function loop() {
  while (state.running) {
    if (state.mode !== state.pendingMode) {
      state.mode = state.pendingMode;
      await state.worker.setParameters({ tessedit_pageseg_mode: state.mode });
    }
    const img = grabFrame();
    if (!img) {
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }
    const t0 = performance.now();
    const { data } = await state.worker.recognize(img);
    const ms = performance.now() - t0;
    if (!state.running) break;
    handleResult(data.text.trim(), Math.round(data.confidence), ms);
  }
}

function handleResult(text, confidence, ms) {
  state.times.push(ms);
  const avg = state.times.reduce((a, b) => a + b, 0) / state.times.length;

  $('text').textContent = text || '–';
  $('confidence').textContent = text ? `${confidence} %` : '–';
  $('last').textContent = `${fmt(ms, 0)} ms`;
  $('avg').textContent = `${fmt(avg, 0)} ms`;
  $('count').textContent = String(state.times.length);

  const names = text && confidence >= MIN_CONFIDENCE ? splitNames(text) : [];
  const norm = names.map(normalizeName).join('|');
  if (!norm) {
    state.lastNorm = '';
    return;
  }

  // Same text twice in a row = confident enough to save (simulates auto-save).
  if (norm === state.lastNorm && norm !== state.lastSavedNorm) {
    state.lastSavedNorm = norm;
    state.saved.push({ names, confidence, ms });
    renderSaved();
    showChip(names.join(' / '));
  }
  state.lastNorm = norm;
}

let chipTimer;
function showChip(text) {
  const chip = $('chip');
  chip.textContent = text;
  chip.hidden = false;
  clearTimeout(chipTimer);
  chipTimer = setTimeout(() => (chip.hidden = true), 1000);
}

function renderSaved() {
  const list = $('savedList');
  list.innerHTML = '';
  for (const item of state.saved) {
    const li = document.createElement('li');
    li.textContent = item.names.join(' / ') + ' ';
    const small = document.createElement('small');
    small.textContent = `(${item.confidence} %, ${fmt(item.ms, 0)} ms)`;
    li.append(small);
    list.append(li);
  }
}

// --- Controls -----------------------------------------------------------------
async function start() {
  try {
    if (!state.stream) await startCamera();
  } catch (err) {
    console.error(err);
    setStatus(sl.cameraFailed);
    return;
  }
  state.running = true;
  $('startStop').textContent = sl.stop;
  setStatus(sl.reading);
  loop().catch((err) => {
    console.error(err);
    stop();
  });
}

function stop() {
  state.running = false;
  stopCamera();
  $('startStop').textContent = sl.start;
  setStatus(sl.paused);
}

$('startStop').addEventListener('click', () => (state.running ? stop() : start()));
$('torch').addEventListener('click', toggleTorch);

function setMode(mode) {
  state.pendingMode = mode;
  $('modeLine').classList.toggle('active', mode === PSM.SINGLE_LINE);
  $('modeBlock').classList.toggle('active', mode === PSM.SINGLE_BLOCK);
}
$('modeLine').addEventListener('click', () => setMode(PSM.SINGLE_LINE));
$('modeBlock').addEventListener('click', () => setMode(PSM.SINGLE_BLOCK));

$('clear').addEventListener('click', () => {
  state.times = [];
  state.saved = [];
  state.lastNorm = '';
  state.lastSavedNorm = '';
  renderSaved();
  $('text').textContent = '–';
  for (const id of ['confidence', 'last', 'avg']) $(id).textContent = '–';
  $('count').textContent = '0';
  toast(sl.cleared);
});

$('copy').addEventListener('click', async () => {
  const avg = state.times.length
    ? state.times.reduce((a, b) => a + b, 0) / state.times.length
    : 0;
  const lines = [
    sl.title,
    deviceLine(),
    state.pendingMode === PSM.SINGLE_LINE ? sl.modeLine : sl.modeBlock,
    `${sl.reads}: ${state.times.length} · ${sl.average}: ${fmt(avg, 0)} ms`,
    `${sl.savedTitle}:`,
    ...state.saved.map((s, i) => `${i + 1}. ${s.names.join(' / ')} (${s.confidence} %, ${fmt(s.ms, 0)} ms)`),
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    toast(sl.copied);
  } catch (err) {
    console.error(err);
  }
});

// Pause when the app goes to the background, to save battery.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running) stop();
});

loadReader();
