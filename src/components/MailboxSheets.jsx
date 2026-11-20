// Sheets for one mailbox: editing its names, and "learning while delivering" (5.3, 5.5).
import { useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { MAX_NAMES_PER_MAILBOX, normalizeName } from '../lib/names.js';
import { readNames, canvasToJpegBase64, getApiKey } from '../lib/cloudReader.js';
import { signature, sameView } from '../lib/camera.js';
import { Sheet, Icon, toast } from './ui.jsx';
import { CameraView, useReadLoop, scanBlocker, readerErrorMessage } from './Camera.jsx';
import { ScanBlocked } from './ScanBlocked.jsx';

/** Full-screen camera that reads the family names on one label, then closes. */
function LabelScanner({ onFound, onClose }) {
  const blocked = scanBlocker();
  const cam = useRef(null);
  const last = useRef(null);
  const [status, setStatus] = useState(sl.scanOneHint);
  const [running, setRunning] = useState(!blocked);

  useReadLoop(running, async (alive) => {
    const canvas = cam.current?.grab();
    if (!canvas) return true;
    const sig = signature(canvas);
    if (sameView(sig, last.current)) return true; // nothing new to read
    try {
      setStatus(sl.reading);
      const { names } = await readNames(canvasToJpegBase64(canvas), getApiKey());
      if (!alive()) return false;
      last.current = sig;
      if (names.length) {
        onFound(names);
        return false;
      }
      setStatus(sl.noName);
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
          shape="label"
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

/**
 * Edit, delete or add the names of one mailbox.
 * addNew: also start with an empty row for a new name (manual entry in the scanner).
 * scan: show "Skeniraj priimek" – read a label with the camera and add the names as new rows.
 */
export function NamesSheet({ title, names, onSave, onCancel, addNew = false, scan = false }) {
  const [scanning, setScanning] = useState(false);
  const [draft, setDraft] = useState(() => {
    if (!names.length) return [''];
    if (addNew && names.length < MAX_NAMES_PER_MAILBOX) return [...names, ''];
    return [...names];
  });
  const set = (i, v) => setDraft(draft.map((n, j) => (j === i ? v : n)));
  const add = () => {
    if (draft.length >= MAX_NAMES_PER_MAILBOX) return toast(sl.maxNames);
    setDraft([...draft, '']);
  };
  const addScanned = (read) => {
    setScanning(false);
    const out = draft.filter((n) => n.trim());
    const seen = new Set(out.map(normalizeName));
    for (const n of read) {
      if (seen.has(normalizeName(n))) continue;
      if (out.length >= MAX_NAMES_PER_MAILBOX) {
        toast(sl.maxNames);
        break;
      }
      out.push(n);
      seen.add(normalizeName(n));
    }
    setDraft(out.length ? out : ['']);
  };
  return (
    <Sheet onClose={onCancel}>
      <p class="question">{title}</p>
      {draft.map((n, i) => (
        <div class="name-row" key={i}>
          <input
            class="input"
            value={n}
            placeholder={sl.familyNamePlaceholder}
            aria-label={sl.familyName}
            autoComplete="off"
            autoFocus={i === draft.length - 1 && !n}
            onInput={(e) => set(i, e.currentTarget.value)}
          />
          <button
            class="icon-btn"
            type="button"
            aria-label={sl.deleteName(n || sl.familyName)}
            onClick={() => setDraft(draft.filter((_, j) => j !== i))}
          >
            <Icon.x />
          </button>
        </div>
      ))}
      <div class="stack">
        <button class="btn btn-secondary" type="button" onClick={add}>
          + {sl.addName}
        </button>
        {scan && (
          <button class="btn btn-secondary" type="button" onClick={() => setScanning(true)}>
            <Icon.camera /> {sl.scanOneName}
          </button>
        )}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-secondary" type="button" onClick={onCancel}>
            {sl.cancel}
          </button>
          <button class="btn btn-primary" type="button" onClick={() => onSave(draft.map((n) => n.trim()).filter(Boolean))}>
            {sl.save}
          </button>
        </div>
      </div>
      {scanning && <LabelScanner onFound={addScanned} onClose={() => setScanning(false)} />}
    </Sheet>
  );
}

/**
 * Adds a searched-for name to the mailbox Ana tapped (5.5).
 * Calls onSave(newNames) or onCancel().
 */
export function LearnSheet({ name, n, names, onSave, onCancel }) {
  const [replacing, setReplacing] = useState(false);
  const full = names.length >= MAX_NAMES_PER_MAILBOX;

  if (!names.length) {
    return (
      <Sheet onClose={onCancel}>
        <p class="question">{sl.learnAddEmpty(name, n)}</p>
        <div class="stack">
          <button class="btn btn-primary" type="button" onClick={() => onSave([name])}>
            {sl.yes}
          </button>
          <button class="btn btn-secondary" type="button" onClick={onCancel}>
            {sl.no}
          </button>
        </div>
      </Sheet>
    );
  }

  if (replacing) {
    return (
      <Sheet onClose={onCancel}>
        <p class="question">{sl.replaceWhich(name)}</p>
        <div class="stack">
          <button class="btn btn-secondary" type="button" onClick={() => onSave([name])}>
            {sl.allNames}
          </button>
          {names.map((old, i) => (
            <button
              key={old + i}
              class="btn btn-secondary"
              type="button"
              onClick={() => onSave(names.map((x, j) => (j === i ? name : x)))}
            >
              {old}
            </button>
          ))}
          <button class="btn btn-primary" type="button" onClick={onCancel}>
            {sl.cancel}
          </button>
        </div>
      </Sheet>
    );
  }

  const one = names.length === 1;
  return (
    <Sheet onClose={onCancel}>
      <p class="question">
        {one ? sl.learnHasOne(n, names[0]) : sl.learnHasMany(n, names.join(', '))}
      </p>
      {full && <p class="hint">{sl.maxNames}</p>}
      <div class="stack">
        {!full && (
          <button class="btn btn-secondary" type="button" onClick={() => onSave([...names, name])}>
            {one ? sl.addToExistingOne : sl.addToExistingMany}
          </button>
        )}
        {one ? (
          <button class="btn btn-secondary" type="button" onClick={() => onSave([name])}>
            {sl.replaceExistingOne}
          </button>
        ) : (
          <button class="btn btn-secondary" type="button" onClick={() => setReplacing(true)}>
            {sl.replaceMany}
          </button>
        )}
        <button class="btn btn-primary" type="button" onClick={onCancel}>
          {sl.cancel}
        </button>
      </div>
    </Sheet>
  );
}
