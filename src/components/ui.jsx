// Small shared building blocks (DESIGN.md "Core components").
import { useEffect, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';

// ---------- Icons ----------
const svg = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {children}
  </svg>
);
export const Icon = {
  gear: () =>
    svg(
      <>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>,
    ),
  camera: () =>
    svg(
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>,
    ),
  x: () => svg(<path d="M18 6 6 18M6 6l12 12" />),
  handle: () => svg(<path d="M4 8h16M4 12h16M4 16h16" />),
  reorder: () => svg(<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />),
  edit: () => svg(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />),
  torch: () => svg(<path d="M18 6 6 6l2 5v9h8v-9zM6 6V2h12v4M12 13v3" />),
};

// ---------- Bars ----------
export function TopBar({ title, onBack, right, editing }) {
  return (
    <header class={`topbar${editing ? ' editing' : ''}`}>
      {onBack && (
        <button class="back" type="button" onClick={onBack}>
          ‹ {sl.back}
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

export const BottomBar = ({ children }) => <footer class="bottombar">{children}</footer>;

// ---------- Bottom sheet ----------
export function Sheet({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div class="backdrop" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true">
        {children}
      </div>
    </>
  );
}

/** Confirmation: question, danger button on top, Prekliči at the bottom. */
export function Confirm({ text, confirmLabel = sl.delete, danger = true, onConfirm, onCancel }) {
  return (
    <Sheet onClose={onCancel}>
      <p class="question">{text}</p>
      <div class="stack">
        <button class={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button class="btn btn-secondary" type="button" onClick={onCancel}>
          {sl.cancel}
        </button>
      </div>
    </Sheet>
  );
}

/** Sheet with one text/number input and Shrani / Prekliči. */
export function InputSheet({ label, initial = '', placeholder, inputMode, validate, onSave, onCancel, extra }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const submit = (e) => {
    e?.preventDefault();
    const err = validate?.(value.trim());
    if (err) return setError(err);
    onSave(value.trim());
  };
  return (
    <Sheet onClose={onCancel}>
      <form onSubmit={submit}>
        <div class="field">
          <label for="sheet-input">{label}</label>
          <input
            id="sheet-input"
            class="input"
            value={value}
            placeholder={placeholder}
            inputMode={inputMode}
            autoComplete="off"
            autoFocus
            onInput={(e) => {
              setValue(e.currentTarget.value);
              setError('');
            }}
          />
          {error && <p class="error">{error}</p>}
        </div>
        {extra}
        <div class="row" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-secondary" type="button" onClick={onCancel}>
            {sl.cancel}
          </button>
          <button class="btn btn-primary" type="submit">
            {sl.save}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

// ---------- Toast ----------
let showToastFn = () => {};
export const toast = (text) => showToastFn(text);

export function ToastHost() {
  const [text, setText] = useState('');
  useEffect(() => {
    let timer;
    showToastFn = (t) => {
      setText(t);
      clearTimeout(timer);
      timer = setTimeout(() => setText(''), 3000);
    };
    return () => clearTimeout(timer);
  }, []);
  return text ? (
    <div class="toast" role="status">
      {text}
    </div>
  ) : null;
}

// ---------- Stepper ----------
export function Stepper({ label, value, min, max, onChange }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commitDraft = () => {
    const n = parseInt(draft, 10);
    if (Number.isNaN(n)) return setDraft(String(value));
    const clamped = Math.min(max, Math.max(min, n));
    // Show the current value until the change is accepted (it may need confirming).
    setDraft(String(value));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <div class="stepper">
      <label>{label}</label>
      <div class="controls">
        <button type="button" aria-label={`${sl.removeOne}: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          aria-label={label}
          onInput={(e) => setDraft(e.currentTarget.value.replace(/\D/g, ''))}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <button type="button" aria-label={`${sl.addOne}: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
