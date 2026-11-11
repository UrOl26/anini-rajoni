// The mailbox grid: a simple drawing of the wall (5.2, DESIGN.md "The mailbox grid").
import { useEffect, useRef } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { cellKey, numberMap, namesOf } from '../lib/layout.js';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * mode: 'view' | 'edit' | 'scan'
 * current: key of the highlighted mailbox (scanning)
 * matches: Set of matching keys (search) – others fade
 * justSaved: key that shows the green check
 * centerKey: when it changes, that cell slides to the middle
 */
export function Grid({ layout, mode = 'view', current, matches, justSaved, centerKey, onCellTap, class: extra = '' }) {
  const wrapRef = useRef();
  const numbers = numberMap(layout);
  const searching = matches && matches.size > 0;

  useEffect(() => {
    if (!centerKey || !wrapRef.current) return;
    const el = wrapRef.current.querySelector(`[data-key="${centerKey}"]`);
    el?.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  }, [centerKey, layout]);

  const cells = [];
  // Column guides
  cells.push(<span key="corner" />);
  for (let c = 0; c < layout.cols; c++) {
    cells.push(
      <span key={`gc${c}`} class="guide">
        {c + 1}
      </span>,
    );
  }
  for (let r = 0; r < layout.rows; r++) {
    cells.push(
      <span key={`gr${r}`} class="guide">
        {r + 1}
      </span>,
    );
    for (let c = 0; c < layout.cols; c++) {
      const key = cellKey(r, c);
      const disabled = Boolean(layout.disabled[key]);
      const n = numbers.get(key);
      const names = namesOf(layout, key);
      const cls = ['cell'];
      if (disabled) cls.push('disabled');
      else if (names.length) cls.push('named');
      if (key === current) cls.push('current');
      if (searching && matches.has(key)) cls.push('match');
      else if (searching) cls.push('faded');
      if (key === justSaved) cls.push('just-saved');

      const label = disabled
        ? sl.notInUse
        : [sl.position(n, r + 1, c + 1), ...names].join(', ');
      cells.push(
        <button
          key={key}
          data-key={key}
          type="button"
          class={cls.join(' ')}
          aria-label={label}
          aria-pressed={mode === 'edit' ? disabled : undefined}
          onClick={() => onCellTap?.({ r, c, key, n, disabled })}
        >
          {!disabled && <span class="num">{n}</span>}
          {!disabled && names[0] && <span class="name">{names[0]}</span>}
          {!disabled && names.length > 1 && <span class="more">+{names.length - 1}</span>}
        </button>,
      );
    }
  }

  return (
    <div class={`grid-wrap ${extra}`} ref={wrapRef}>
      <div
        class={`grid ${mode}`}
        style={`grid-template-columns: 24px repeat(${layout.cols}, 72px); grid-template-rows: 20px repeat(${layout.rows}, 64px);`}
      >
        {cells}
      </div>
    </div>
  );
}
