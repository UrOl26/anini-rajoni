// Sheets for one mailbox: editing its names, and "learning while delivering" (5.3, 5.5).
import { useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { MAX_NAMES_PER_MAILBOX } from '../lib/names.js';
import { Sheet, Icon, toast } from './ui.jsx';

/** Edit, delete or add the names of one mailbox. */
export function NamesSheet({ title, names, onSave, onCancel }) {
  const [draft, setDraft] = useState(names.length ? [...names] : ['']);
  const set = (i, v) => setDraft(draft.map((n, j) => (j === i ? v : n)));
  const add = () => {
    if (draft.length >= MAX_NAMES_PER_MAILBOX) return toast(sl.maxNames);
    setDraft([...draft, '']);
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-secondary" type="button" onClick={onCancel}>
            {sl.cancel}
          </button>
          <button class="btn btn-primary" type="button" onClick={() => onSave(draft.map((n) => n.trim()).filter(Boolean))}>
            {sl.save}
          </button>
        </div>
      </div>
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
          <button class="btn btn-primary" type="button" onClick={() => onSave([name])}>
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
          <button class="btn btn-secondary" type="button" onClick={onCancel}>
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
          <button class="btn btn-primary" type="button" onClick={() => onSave([...names, name])}>
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
        <button class="btn btn-secondary" type="button" onClick={onCancel}>
          {sl.cancel}
        </button>
      </div>
    </Sheet>
  );
}
