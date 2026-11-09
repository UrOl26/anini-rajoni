// Cloud scan test page: sends the label under the frame to Claude Haiku and
// shows the family names it reads, with time and cost per read. No images are saved.
import { sl, fmt } from './sl.js';
import {
  readNames,
  canvasToJpegBase64,
  getApiKey,
  setApiKey,
  CloudReaderError,
} from '../src/lib/cloudReader.js';
import { normalizeName } from '../src/lib/names.js';

const $ = (id) => document.getElementById(id);

const MIN_INTERVAL_MS = 1200; // at most one request per 1,2 s
const MAX_WIDTH = 1024; // px sent to the cloud
const MARGIN = 0.15; // extra area around the frame, for context
const SAME_FRAME_DIFF = 8; // mean grey difference below which the view "hasn't changed"

const state = {
  stream: null,
  running: false,
  times: [],
  cost: 0,
  saved: [],
  lastSavedNorm: '',
  lastThumb: null,
  lastHadNames: false,
  torchSupported: null,
  torchOn: false,
  abort: null,
};

// --- Static text -----------------------------------------------------------
document.title = sl.title;
for (const [id, key] of [
  ['title', 'title'],
  ['keyTitle', 'keyTitle'],
  ['keyHint', 'keyHint'],
  ['keySave', 'keySave'],
  ['keyDelete', 'keyDelete'],
  ['keySaved', 'keySaved'],
  ['lblLast', 'lastRead'],
  ['lblAvg', 'average'],
  ['lblCount', 'reads'],
  ['lblCost', 'cost'],
  ['savedTitle', 'savedTitle'],
  ['savedHint', 'savedHint'],
  ['copy', 'copy'],
  ['clear', 'clear'],
  ['startStop', 'start'],
  ['torch', 'torchOn'],
]) {
  $(id).textContent = sl[key];
}
$('keyInput').placeholder = sl.keyPlaceholder;

const setStatus = (text) => ($('status').textContent = text);

let toastTimer;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3000);
}

const usd = (n) => `${fmt(n, 4)} $`;

function deviceLine() {
  const ua = navigator.userAgent.match(/\(([^)]+)\)/)?.[1] ?? navigator.userAgent;
  const s = state.stream?.getVideoTracks()[0]?.getSettings?.();
  const parts = [`${sl.device}: ${ua}`];
  if (s?.width) parts.push(`${sl.camera}: ${s.width} × ${s.height}`);
  if (state.torchSupported !== null) parts.push(`Svetilka: ${state.torchSupported ? 'da' : 'ni podprta'}`);
  return parts.join(' · ');
}
const updateDevice = () => ($('device').textContent = deviceLine());

// --- API key -----------------------------------------------------------------
function renderKey() {
  const has = Boolean(getApiKey());
  $('keyForm').hidden = has;
  $('keyStored').hidden = !has;
  $('startStop').disabled = !has;
  setStatus(has ? sl.ready : sl.keyMissing);
}
$('keySave').addEventListener('click', () => {
  const key = $('keyInput').value.trim();
  if (!key) return;
  setApiKey(key);
  $('keyInput').value = '';
  renderKey();
});
$('keyDelete').addEventListener('click', () => {
  if (state.running) stop();
  setApiKey('');
  renderKey();
});

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
  const caps = state.stream.getVideoTracks()[0].getCapabilities?.() ?? {};
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

$('torch').addEventListener('click', async () => {
  const track = state.stream?.getVideoTracks()[0];
  if (!track) return;
  state.torchOn = !state.torchOn;
  try {
    await track.applyConstraints({ advanced: [{ torch: state.torchOn }] });
  } catch {
    state.torchOn = false;
  }
  $('torch').textContent = state.torchOn ? sl.torchOff : sl.torchOn;
});

// --- Frame capture -------------------------------------------------------------
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const thumb = document.createElement('canvas');
thumb.width = 32;
thumb.height = 10;
const tctx = thumb.getContext('2d', { willReadFrequently: true });

/** Crops the frame area (plus a margin) from the video into `canvas`. */
function grabFrame() {
  const video = $('video');
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return false;

  const box = $('camera').getBoundingClientRect();
  const frame = $('frame').getBoundingClientRect();
  const scale = Math.max(box.width / vw, box.height / vh);
  const offX = (box.width - vw * scale) / 2;
  const offY = (box.height - vh * scale) / 2;

  let sx = (frame.left - box.left - offX) / scale;
  let sy = (frame.top - box.top - offY) / scale;
  let sw = frame.width / scale;
  let sh = frame.height / scale;
  sx -= sw * MARGIN;
  sy -= sh * MARGIN;
  sw *= 1 + 2 * MARGIN;
  sh *= 1 + 2 * MARGIN;
  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(vw - sx, sw);
  sh = Math.min(vh - sy, sh);

  const outW = Math.round(Math.min(MAX_WIDTH, sw));
  const outH = Math.round((sh / sw) * outW);
  canvas.width = outW;
  canvas.height = outH;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
  return true;
}

/** Small grey thumbnail, to notice when the view hasn't changed. */
function frameSignature() {
  tctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  const d = tctx.getImageData(0, 0, thumb.width, thumb.height).data;
  const out = new Uint8Array(thumb.width * thumb.height);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    out[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  }
  return out;
}
function sameView(a, b) {
  if (!a || !b) return false;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length < SAME_FRAME_DIFF;
}

// --- Reading loop -------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loop() {
  while (state.running) {
    const started = performance.now();
    if (!grabFrame()) {
      await sleep(100);
      continue;
    }
    const sig = frameSignature();
    // Don't pay to read the same label again while the phone is held still.
    if (state.lastHadNames && sameView(sig, state.lastThumb)) {
      await sleep(300);
      continue;
    }

    state.abort = new AbortController();
    try {
      setStatus(sl.reading);
      const result = await readNames(canvasToJpegBase64(canvas), getApiKey(), {
        signal: state.abort.signal,
      });
      if (!state.running) break;
      state.lastThumb = sig;
      handleResult(result);
    } catch (err) {
      if (err.name === 'AbortError') break;
      console.error(err);
      if (err instanceof CloudReaderError && err.code === 'auth') {
        stop();
        setStatus(sl.errAuth);
        return;
      }
      const msg =
        err instanceof CloudReaderError
          ? { network: sl.errNetwork, busy: sl.errBusy }[err.code] ?? sl.errOther
          : sl.errOther;
      setStatus(msg);
      await sleep(2000);
    }

    const wait = MIN_INTERVAL_MS - (performance.now() - started);
    if (wait > 0) await sleep(wait);
  }
}

function handleResult({ names, ms, costUsd }) {
  state.times.push(ms);
  state.cost += costUsd;
  const avg = state.times.reduce((a, b) => a + b, 0) / state.times.length;

  const text = $('text');
  text.textContent = names.length ? names.join(' / ') : sl.noName;
  text.classList.toggle('empty', !names.length);
  $('last').textContent = `${fmt(ms, 0)} ms`;
  $('avg').textContent = `${fmt(avg, 0)} ms`;
  $('count').textContent = String(state.times.length);
  $('cost').textContent = usd(state.cost);

  state.lastHadNames = names.length > 0;
  if (!names.length) return;

  // One good read is enough: save it right away, unless it's the same label again.
  const norm = names.map(normalizeName).join('|');
  if (norm === state.lastSavedNorm) return;
  state.lastSavedNorm = norm;
  state.saved.push({ names, ms });
  renderSaved();
  showChip(names.join(' / '));
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
    small.textContent = `(${fmt(item.ms, 0)} ms)`;
    li.append(small);
    list.append(li);
  }
}

// --- Controls -----------------------------------------------------------------
async function start() {
  if (!getApiKey()) {
    setStatus(sl.keyMissing);
    return;
  }
  try {
    if (!state.stream) await startCamera();
  } catch (err) {
    console.error(err);
    setStatus(sl.cameraFailed);
    return;
  }
  state.running = true;
  state.lastHadNames = false;
  state.lastThumb = null;
  $('startStop').textContent = sl.stop;
  setStatus(sl.reading);
  loop().catch((err) => {
    console.error(err);
    stop();
  });
}

function stop() {
  state.running = false;
  state.abort?.abort();
  stopCamera();
  $('startStop').textContent = sl.start;
  setStatus(sl.paused);
}

$('startStop').addEventListener('click', () => (state.running ? stop() : start()));

$('clear').addEventListener('click', () => {
  state.times = [];
  state.cost = 0;
  state.saved = [];
  state.lastSavedNorm = '';
  renderSaved();
  $('text').textContent = '–';
  $('text').classList.remove('empty');
  for (const id of ['last', 'avg', 'cost']) $(id).textContent = '–';
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
    `${sl.reads}: ${state.times.length} · ${sl.average}: ${fmt(avg, 0)} ms · ${sl.cost}: ${usd(state.cost)}`,
    `${sl.savedTitle}:`,
    ...state.saved.map((s, i) => `${i + 1}. ${s.names.join(' / ')} (${fmt(s.ms, 0)} ms)`),
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    toast(sl.copied);
  } catch (err) {
    console.error(err);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running) stop();
});

renderKey();
updateDevice();
