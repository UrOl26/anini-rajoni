// Camera helpers: live view, cropping the area under the on-screen frame,
// and noticing when the view hasn't changed. Nothing is ever saved.

export async function openCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function closeCamera(stream, video) {
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}

export function torchSupported(stream) {
  const track = stream?.getVideoTracks()[0];
  return Boolean(track?.getCapabilities?.().torch);
}

export async function setTorch(stream, on) {
  const track = stream?.getVideoTracks()[0];
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: on }] });
    return on;
  } catch {
    return false;
  }
}

/**
 * Crops the part of the video under `frameEl` (plus a margin) into a canvas,
 * at most `maxWidth` px wide. Returns null while the video isn't ready.
 */
export function cropFrame(video, boxEl, frameEl, { margin = 0.15, maxWidth = 1024 } = {}) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const box = boxEl.getBoundingClientRect();
  const frame = frameEl.getBoundingClientRect();

  // The video uses object-fit: cover.
  const scale = Math.max(box.width / vw, box.height / vh);
  const offX = (box.width - vw * scale) / 2;
  const offY = (box.height - vh * scale) / 2;

  let sw = (frame.width / scale) * (1 + 2 * margin);
  let sh = (frame.height / scale) * (1 + 2 * margin);
  let sx = Math.max(0, (frame.left - box.left - offX) / scale - (frame.width / scale) * margin);
  let sy = Math.max(0, (frame.top - box.top - offY) / scale - (frame.height / scale) * margin);
  sw = Math.min(vw - sx, sw);
  sh = Math.min(vh - sy, sh);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(Math.min(maxWidth, sw));
  canvas.height = Math.round((sh / sw) * canvas.width);
  canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const thumb = typeof document !== 'undefined' ? document.createElement('canvas') : null;

/** A tiny grey thumbnail of the canvas, to compare views cheaply. */
export function signature(canvas) {
  thumb.width = 32;
  thumb.height = 12;
  const ctx = thumb.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  const d = ctx.getImageData(0, 0, thumb.width, thumb.height).data;
  const out = new Uint8Array(thumb.width * thumb.height);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    out[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
  }
  return out;
}

/** True if two signatures show (almost) the same view. */
export function sameView(a, b, threshold = 8) {
  if (!a || !b) return false;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length < threshold;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
