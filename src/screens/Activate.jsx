// Activating the scanner: read the QR code with the API key inside the app,
// so the key is stored in the app's own storage (on the iPhone a home-screen app
// does not share storage with Safari).
import { useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { setApiKey } from '../lib/cloudReader.js';
import { parsePayload, verifyKey } from '../lib/activation.js';
import { CameraView, useReadLoop } from '../components/Camera.jsx';
import { toast } from '../components/ui.jsx';

const loadJsQR = () => import('jsqr').then((m) => m.default);

/** Back to where Ana came from (a scanner, settings or the landing screen). */
function leave() {
  if (history.length > 1) history.back();
  else navigate(paths.home(), { replace: true });
}

export function Activate() {
  const cam = useRef(null);
  const rejected = useRef(''); // a code already found invalid is not checked again
  const [status, setStatus] = useState(sl.activateHint);
  const [running, setRunning] = useState(true);

  useReadLoop(
    running,
    async (alive) => {
      const canvas = cam.current?.grab({ margin: 0.5, maxWidth: 800 });
      if (!canvas) return true;
      const jsQR = await loadJsQR();
      const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (!code?.data || code.data === rejected.current) return true;

      const found = parsePayload(code.data);
      if (!found) {
        setStatus(sl.notActivationCode);
        return true;
      }

      setStatus(sl.checkingCode);
      const check = await verifyKey(found.key);
      if (!alive()) return false;
      if (check === 'invalid') {
        rejected.current = code.data;
        setStatus(sl.codeNotValid);
        return true;
      }
      setApiKey(found.key, found.name);
      toast(
        check === 'ok'
          ? found.name
            ? sl.activatedFor(found.name)
            : sl.activated
          : sl.activatedUnchecked,
      );
      setRunning(false);
      leave();
      return false;
    },
    250,
  );

  return (
    <div class="fullcam">
      <CameraView
        shape="qr"
        status={status}
        onReady={(api) => (cam.current = api)}
        onError={() => {
          setStatus(sl.cameraFailed);
          setRunning(false);
        }}
      />
      <div class="panel">
        <button class="btn btn-secondary" type="button" onClick={leave}>
          {sl.cancel}
        </button>
      </div>
    </div>
  );
}
