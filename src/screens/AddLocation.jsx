// Add a location: type the address or scan it (5.1).
import { useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { addLocation, findRoute } from '../store.js';
import { readAddress, canvasToJpegBase64, getApiKey } from '../lib/cloudReader.js';
import { signature, sameView } from '../lib/camera.js';
import { TopBar, BottomBar, Icon } from '../components/ui.jsx';
import { CameraView, useReadLoop, scanBlocker, readerErrorMessage } from '../components/Camera.jsx';
import { ScanBlocked } from '../components/ScanBlocked.jsx';

function AddressScanner({ onFound, onClose }) {
  const blocked = scanBlocker();
  const cam = useRef(null);
  const last = useRef(null);
  const [status, setStatus] = useState(sl.scanAddressHint);
  const [running, setRunning] = useState(!blocked);

  useReadLoop(running, async (alive) => {
    const canvas = cam.current?.grab();
    if (!canvas) return true;
    const sig = signature(canvas);
    if (sameView(sig, last.current)) return true; // nothing new to read
    try {
      setStatus(sl.reading);
      const address = await readAddress(canvasToJpegBase64(canvas), getApiKey());
      if (!alive()) return false;
      last.current = sig;
      if (address) {
        onFound(address);
        return false;
      }
      setStatus(sl.addressNotFound);
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
      {!blocked && (
        <CameraView
          shape="sign"
          status={status}
          onReady={(api) => (cam.current = api)}
          onError={() => {
            setStatus(sl.cameraFailed);
            setRunning(false);
          }}
        />
      )}
      <div class="panel">
        {blocked && <ScanBlocked reason={blocked} />}
        <button class="btn btn-secondary" type="button" onClick={onClose}>
          {sl.cancel}
        </button>
      </div>
    </div>
  );
}

export function AddLocation({ routeId }) {
  const route = findRoute(routeId);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const save = (e) => {
    e?.preventDefault();
    const value = address.trim();
    if (!value) return setError(sl.addressMissing);
    const id = addLocation(routeId, value);
    navigate(paths.editLayout(id), { replace: true });
  };

  return (
    <div class="screen">
      <TopBar title={sl.addLocation} onBack={() => navigate(paths.route(routeId))} />
      <form class="content" onSubmit={save}>
        <p style="color:var(--text-2);font-size:16px;margin-bottom:12px">{sl.route(route.number)}</p>
        <div class="field">
          <label for="address">{sl.address}</label>
          <input
            id="address"
            class="input"
            value={address}
            placeholder={sl.addressPlaceholder}
            autoComplete="off"
            onInput={(e) => {
              setAddress(e.currentTarget.value);
              setError('');
            }}
          />
          {error && <p class="error">{error}</p>}
        </div>
        <button class="btn btn-secondary" type="button" onClick={() => setScanning(true)}>
          <Icon.camera /> {sl.scan}
        </button>
      </form>
      <BottomBar>
        <button class="btn btn-primary" type="button" onClick={save}>
          {sl.save}
        </button>
      </BottomBar>
      {scanning && (
        <AddressScanner
          onClose={() => setScanning(false)}
          onFound={(a) => {
            setAddress(a);
            setError('');
            setScanning(false);
          }}
        />
      )}
    </div>
  );
}
