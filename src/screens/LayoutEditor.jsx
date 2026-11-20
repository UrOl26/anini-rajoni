// Build or edit a mailbox layout (5.2). Editing mode: no back button, only Prekliči / Shrani.
import { useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { findLocation, saveLayout } from '../store.js';
import { NEW_LAYOUT, MIN_SIZE, MAX_SIZE, resize, namedCellsOutside, cellLabel } from '../lib/layout.js';
import { Grid } from '../components/Grid.jsx';
import { TopBar, BottomBar, Stepper, Confirm, Sheet } from '../components/ui.jsx';

export function LayoutEditor({ locationId, isNew }) {
  const loc = findLocation(locationId);
  const [draft, setDraft] = useState(() => structuredClone(loc.layout ?? NEW_LAYOUT));
  const [pending, setPending] = useState(null); // { rows, cols } waiting for confirmation
  const [disabling, setDisabling] = useState(null); // cell with names waiting for confirmation

  const requestSize = (rows, cols) => {
    if (namedCellsOutside(draft, rows, cols).length) setPending({ rows, cols });
    else setDraft(resize(draft, rows, cols));
  };

  const toggle = (cell) => {
    // Disabling a mailbox with names asks first. The names are kept, only hidden (5.2).
    if (!draft.disabled[cell.key] && draft.names[cell.key]?.length) return setDisabling(cell);
    flip(cell.key);
  };

  const flip = (key) => {
    const disabled = { ...draft.disabled };
    if (disabled[key]) delete disabled[key];
    else disabled[key] = true;
    setDraft({ ...draft, disabled });
  };

  const cancel = () =>
    navigate(isNew ? paths.route(loc.routeId) : paths.location(locationId), { replace: true });

  const save = () => {
    saveLayout(locationId, draft);
    // A new layout goes straight on to scanning the names (5.1).
    navigate(isNew ? paths.scan(locationId) : paths.location(locationId), { replace: true });
  };

  return (
    <div class="screen">
      <TopBar title={sl.editLayoutTitle} editing />
      <main class="content">
        <p style="font-weight:700;font-size:20px;margin-bottom:12px">{loc.address}</p>
        <div class="stepper-row">
          <Stepper label={sl.rows} value={draft.rows} min={MIN_SIZE} max={MAX_SIZE} onChange={(r) => requestSize(r, draft.cols)} />
          <Stepper label={sl.cols} value={draft.cols} min={MIN_SIZE} max={MAX_SIZE} onChange={(c) => requestSize(draft.rows, c)} />
        </div>
        <p style="color:var(--text-2);font-size:16px;margin-bottom:8px">{sl.editHint}</p>
        <Grid layout={draft} mode="edit" onCellTap={toggle} zoomable />
      </main>
      <BottomBar>
        <div class="row">
          <button class="btn btn-secondary" type="button" onClick={cancel}>
            {sl.cancel}
          </button>
          <button class="btn btn-primary" type="button" onClick={save}>
            {sl.save}
          </button>
        </div>
      </BottomBar>
      {disabling && (
        <Sheet onClose={() => setDisabling(null)}>
          <p class="question">{sl.confirmDisableNamed(cellLabel(disabling.r, disabling.c))}</p>
          <p class="hint">{sl.disableNote}</p>
          <div class="stack">
            <button
              class="btn btn-secondary"
              type="button"
              onClick={() => {
                flip(disabling.key);
                setDisabling(null);
              }}
            >
              {sl.disableMailbox}
            </button>
            <button class="btn btn-primary" type="button" onClick={() => setDisabling(null)}>
              {sl.cancel}
            </button>
          </div>
        </Sheet>
      )}
      {pending && (
        <Confirm
          text={sl.confirmRemoveNamed}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setDraft(resize(draft, pending.rows, pending.cols));
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
