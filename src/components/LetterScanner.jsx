// Skeniraj pismo (5.4): read the recipient on an envelope and match it to this wall.
import { useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { readLetter, canvasToJpegBase64, getApiKey } from '../lib/cloudReader.js';
import { signature, sameView } from '../lib/camera.js';
import { CameraView, useReadLoop, scanBlocker, readerErrorMessage } from './Camera.jsx';
import { ScanBlocked } from './ScanBlocked.jsx';

export function LetterScanner({ wallNames, onMatch, onPick, onManual, onClose }) {
  const blocked = scanBlocker();
  const cam = useRef(null);
  const last = useRef(null);
  const [status, setStatus] = useState(sl.scanLetterHint);
  const [running, setRunning] = useState(!blocked);
  const [words, setWords] = useState(null);

  useReadLoop(running, async (alive) => {
    const canvas = cam.current?.grab();
    if (!canvas) return true;
    const sig = signature(canvas);
    if (sameView(sig, last.current)) return true;
    try {
      setStatus(sl.reading);
      const { matches, words: read } = await readLetter(
        canvasToJpegBase64(canvas),
        getApiKey(),
        wallNames,
      );
      if (!alive()) return false;
      last.current = sig;
      if (matches.length) {
        onMatch(matches);
        return false;
      }
      if (read.length) {
        // Not on this wall yet: let Ana pick the family name (5.5).
        setWords(read);
        setRunning(false);
        return false;
      }
      setStatus(sl.scanLetterHint);
    } catch (err) {
      const { text, fatal } = readerErrorMessage(err);
      setStatus(text);
      if (fatal) {
        setRunning(false);
        return false;
      }
    }
    return true;
  });

  return (
    <div class="fullcam">
      {!blocked && !words && (
        <CameraView
          shape="envelope"
          status={status}
          onReady={(api) => (cam.current = api)}
          onError={() => {
            setStatus(sl.cameraFailed);
            setRunning(false);
          }}
        />
      )}
      <div class="panel" style={words ? 'flex:1;max-height:none' : ''}>
        {blocked && <ScanBlocked reason={blocked} />}
        {words && (
          <>
            <p class="question" style="font-size:22px;font-weight:700;margin-bottom:12px">
              {sl.pickFamilyName}
            </p>
            <div class="word-grid">
              {words.map((w) => (
                <button key={w} class="btn btn-secondary" type="button" onClick={() => onPick(w)}>
                  {w}
                </button>
              ))}
            </div>
          </>
        )}
        <div class="stack" style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary" type="button" onClick={onManual}>
            {sl.enterManually}
          </button>
          <button class="btn btn-secondary" type="button" onClick={onClose}>
            {sl.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
