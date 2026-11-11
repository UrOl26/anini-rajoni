// Skeniraj imena (5.3): read the label of each mailbox in order and save it automatically.
import { useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { findLocation, setMailboxNames } from '../store.js';
import { activeCells, namesOf } from '../lib/layout.js';
import { normalizeName, MAX_NAMES_PER_MAILBOX } from '../lib/names.js';
import { readNames, canvasToJpegBase64, getApiKey } from '../lib/cloudReader.js';
import { signature, sameView } from '../lib/camera.js';
import { Grid } from '../components/Grid.jsx';
import { TopBar, BottomBar, InputSheet, toast } from '../components/ui.jsx';
import { CameraView, useReadLoop, scanBlocker, readerErrorMessage } from '../components/Camera.jsx';
import { ScanBlocked } from '../components/ScanBlocked.jsx';

const SAVED_CHECK_MS = 600;
const CHIP_MS = 1000;

const normList = (names) => names.map(normalizeName).sort().join('|');

/** Adds new names to existing ones, without duplicates, at most 5. */
function merge(existing, read) {
  const out = [...existing];
  const seen = new Set(existing.map(normalizeName));
  let overflow = false;
  for (const n of read) {
    if (seen.has(normalizeName(n))) continue;
    if (out.length >= MAX_NAMES_PER_MAILBOX) {
      overflow = true;
      break;
    }
    out.push(n);
    seen.add(normalizeName(n));
  }
  return { names: out, overflow };
}

export function Scanner({ locationId }) {
  const loc = findLocation(locationId);
  const layout = loc.layout;
  const cells = activeCells(layout);
  const blocked = scanBlocker();

  // Start at the first mailbox that has no name yet.
  const [idx, setIdx] = useState(() => {
    const i = cells.findIndex((c) => !namesOf(layout, c.key).length);
    return i === -1 ? 0 : i;
  });
  const [previous, setPrevious] = useState(null); // { idx, returnTo } while adding to the previous mailbox
  const [status, setStatus] = useState('');
  const [chip, setChip] = useState(null);
  const [justSaved, setJustSaved] = useState(null);
  const [manual, setManual] = useState(false);
  const [done, setDone] = useState(cells.length === 0);
  const [fatal, setFatal] = useState(false);

  const cam = useRef(null);
  const lastSig = useRef(null);
  const lastSaved = useRef(''); // normalized names of the last saved label

  const targetIdx = previous ? previous.idx : idx;
  const target = cells[targetIdx];

  const flash = (key, names) => {
    setJustSaved(key);
    setTimeout(() => setJustSaved((k) => (k === key ? null : k)), SAVED_CHECK_MS);
    setChip(names.join(' / '));
    setTimeout(() => setChip(null), CHIP_MS);
  };

  const advanceFrom = (i) => {
    if (i + 1 >= cells.length) {
      setDone(true);
      return;
    }
    setIdx(i + 1);
  };

  /** Saves names to the target mailbox and moves on. */
  const saveToTarget = (read) => {
    const current = findLocation(locationId).layout;
    const existing = namesOf(current, target.key);
    const { names, overflow } = merge(existing, read);
    if (overflow) toast(sl.maxNames);
    setMailboxNames(locationId, target.key, names);
    lastSaved.current = normList(read);
    flash(target.key, read);
    if (previous) {
      setIdx(previous.returnTo);
      setPrevious(null);
    } else {
      advanceFrom(idx);
    }
  };

  const running = !blocked && !done && !manual && !fatal && Boolean(target);

  useReadLoop(running, async (alive) => {
    const canvas = cam.current?.grab();
    if (!canvas) return true;
    const sig = signature(canvas);
    // Same view as last time: nothing new to read (and nothing to pay for).
    if (sameView(sig, lastSig.current)) return true;
    try {
      setStatus(sl.reading);
      const { names } = await readNames(canvasToJpegBase64(canvas), getApiKey());
      if (!alive()) return false;
      lastSig.current = sig;
      if (!names.length) {
        setStatus(sl.noName);
        return true;
      }
      // The label just saved is probably still in view: don't save it to the next mailbox too.
      if (normList(names) === lastSaved.current) {
        setStatus('');
        return true;
      }
      setStatus('');
      saveToTarget(names);
    } catch (err) {
      const { text, fatal: stop } = readerErrorMessage(err);
      setStatus(text);
      if (stop) {
        setFatal(true);
        return false;
      }
    }
    return true;
  });

  const skip = () => {
    setPrevious(null);
    const data = findLocation(locationId).layout;
    const next = cells.findIndex((c, i) => i > idx && !namesOf(data, c.key).length);
    if (next === -1) setDone(true);
    else setIdx(next);
    lastSaved.current = '';
  };

  const addToPrevious = () => {
    if (idx === 0) return;
    setPrevious({ idx: idx - 1, returnTo: idx });
    lastSaved.current = '';
    lastSig.current = null;
  };

  const info = done
    ? sl.allScanned
    : previous
      ? sl.scanningPrevious(cells[previous.idx].n)
      : target
        ? sl.pointAt(target.n)
        : '';

  return (
    <div class="screen scanner">
      <TopBar title={sl.scanNames} onBack={() => navigate(paths.location(locationId))} />
      {!done && !blocked && (
        <CameraView
          shape="label"
          status={status}
          chip={chip}
          chipOk
          onReady={(api) => (cam.current = api)}
          onError={() => {
            setStatus(sl.cameraFailed);
            setFatal(true);
          }}
        />
      )}
      <div style="padding-bottom: calc(190px + var(--safe-bottom))">
        {blocked && !done && (
          <div style="padding:16px 16px 0">
            <ScanBlocked reason={blocked} />
          </div>
        )}
        <p class="scan-info">{info}</p>
        <Grid
          layout={findLocation(locationId).layout}
          mode="scan"
          current={done ? null : target?.key}
          justSaved={justSaved}
          centerKey={done ? null : target?.key}
          onCellTap={(cell) => {
            if (cell.disabled) return;
            setPrevious(null);
            setDone(false);
            setIdx(cells.findIndex((c) => c.key === cell.key));
            lastSaved.current = '';
            lastSig.current = null;
          }}
        />
      </div>
      <BottomBar>
        {done ? (
          <button class="btn btn-primary" type="button" onClick={() => navigate(paths.location(locationId))}>
            {sl.done}
          </button>
        ) : (
          <>
            {idx > 0 && !previous && (
              <button class="btn btn-text" type="button" onClick={addToPrevious}>
                {sl.addToPrevious}
              </button>
            )}
            <div class="row">
              <button class="btn btn-secondary" type="button" onClick={skip}>
                {sl.skip}
              </button>
              <button class="btn btn-secondary" type="button" onClick={() => setManual(true)}>
                {sl.enterManually}
              </button>
            </div>
          </>
        )}
      </BottomBar>
      {manual && target && (
        <InputSheet
          label={`${sl.familyName} · ${sl.mailbox(target.n)}`}
          placeholder={sl.familyNamePlaceholder}
          validate={(v) => (v ? '' : sl.familyName)}
          onCancel={() => setManual(false)}
          onSave={(v) => {
            setManual(false);
            saveToTarget([v]);
            lastSaved.current = '';
          }}
        />
      )}
    </div>
  );
}
