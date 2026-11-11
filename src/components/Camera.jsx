// Live camera view with a reading frame, plus a loop that reads frames one at a time.
import { useEffect, useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { openCamera, closeCamera, torchSupported, setTorch, cropFrame, sleep } from '../lib/camera.js';
import { getApiKey, CloudReaderError } from '../lib/cloudReader.js';
import { Icon } from './ui.jsx';

/**
 * Camera with a frame. `shape`: 'label' | 'envelope' | 'sign'.
 * `onReady(api)` gives { grab(): canvas|null }.
 */
export function CameraView({ shape = 'label', chip, chipOk, status, onReady, onError }) {
  const boxRef = useRef();
  const videoRef = useRef();
  const frameRef = useRef();
  const [stream, setStream] = useState(null);
  const [torch, setTorchOn] = useState(false);

  useEffect(() => {
    let s;
    let cancelled = false;
    openCamera(videoRef.current)
      .then((st) => {
        if (cancelled) return closeCamera(st);
        s = st;
        setStream(st);
        onReady?.({
          grab: () => cropFrame(videoRef.current, boxRef.current, frameRef.current),
        });
      })
      .catch((err) => {
        console.error(err);
        onError?.(err);
      });
    return () => {
      cancelled = true;
      closeCamera(s, videoRef.current);
    };
  }, []);

  return (
    <div class="camera" ref={boxRef}>
      <video ref={videoRef} playsInline muted autoPlay />
      <div class={`frame ${shape}`} ref={frameRef}>
        <i />
        <i />
        <i />
        <i />
      </div>
      {status && <p class="status">{status}</p>}
      {chip && <div class={`chip${chipOk ? ' ok' : ''}`}>{chip}</div>}
      {torchSupported(stream) && (
        <button
          class="icon-btn torch"
          type="button"
          aria-label={torch ? sl.torchOff : sl.torchOn}
          aria-pressed={torch}
          onClick={async () => setTorchOn(await setTorch(stream, !torch))}
        >
          <Icon.torch />
        </button>
      )}
    </div>
  );
}

/** Why scanning can't start right now, or '' if it can. */
export function scanBlocker() {
  if (!getApiKey()) return 'key';
  if (navigator.onLine === false) return 'offline';
  return '';
}

/** Turns a reader error into a status message. Returns { text, fatal }. */
export function readerErrorMessage(err) {
  if (err instanceof CloudReaderError) {
    if (err.code === 'auth') return { text: sl.errAuth, fatal: true };
    if (err.code === 'network') return { text: sl.needInternet, fatal: false };
    if (err.code === 'busy') return { text: sl.errBusy, fatal: false };
  }
  return { text: sl.errOther, fatal: false };
}

/**
 * Runs `step()` again and again, one at a time, at most once per `minInterval` ms,
 * while `enabled` is true. `step` returns false to stop the loop.
 */
export function useReadLoop(enabled, step, minInterval = 1200) {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      while (alive) {
        const t0 = performance.now();
        let go = true;
        try {
          go = (await stepRef.current(() => alive)) !== false;
        } catch (err) {
          console.error(err);
        }
        if (!go) break;
        const wait = minInterval - (performance.now() - t0);
        await sleep(Math.max(100, wait));
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, minInterval]);
}
