// The mailbox grid: a simple drawing of the wall (5.2, DESIGN.md "The mailbox grid").
// Columns are numbered, rows lettered, like a chessboard: mailbox "5C".
// With `zoomable`, the grid starts scaled to fit the screen and can be zoomed with two fingers or + / −.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { cellKey, cellLabel, rowLetter, namesOf } from '../lib/layout.js';
import { Icon } from './ui.jsx';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Full size (scale 1) – the largest the cells can be.
const CELL_W = 88;
const CELL_H = 122;
const GAP = 4;
const GUIDE_W = 24;
const GUIDE_H = 20;
const MIN_GUIDE_W = 14;
const MIN_GUIDE_H = 14;
const WRAP_PAD_X = 32; // 16 px on each side
const ZOOM_BTNS_W = 64; // room on the right for + / −, so they don't cover mailboxes when fitted
const WRAP_PAD_Y = 20; // 4 px top + 16 px bottom
const ZOOM_STEP = 1.3;
// Below these sizes the names, then the labels, no longer fit.
const NAMES_MIN_SCALE = 0.8;
const LABEL_MIN_W = 26;

// Screen height without the keyboard. While the keyboard is open the window is shorter,
// so the tallest height ever seen at the current width is used. Kept per width, so turning
// the phone sideways and back finds the full upright height again.
const tallest = new Map();
function screenHeight() {
  const w = window.innerWidth;
  const h = Math.max(tallest.get(w) ?? 0, window.innerHeight);
  tallest.set(w, h);
  return h;
}

/** Pixel sizes of the grid at scale s. */
function sizes(s) {
  return {
    w: CELL_W * s,
    h: CELL_H * s,
    gap: Math.max(1, GAP * s),
    gw: Math.max(MIN_GUIDE_W, GUIDE_W * s),
    gh: Math.max(MIN_GUIDE_H, GUIDE_H * s),
  };
}

/** Largest scale (≤ 1) at which the whole grid fits into availW × availH. */
function fitScale(rows, cols, availW, availH) {
  let s = 1;
  // A few rounds, because the guides and gaps have a minimum size.
  for (let i = 0; i < 4; i++) {
    const z = sizes(s);
    const sw = (availW - z.gw - z.gap * cols) / (CELL_W * cols);
    const sh = (availH - z.gh - z.gap * rows) / (CELL_H * rows);
    s = Math.min(1, sw, sh);
  }
  return Math.max(0.05, s);
}

/**
 * mode: 'view' | 'edit' | 'scan'
 * current: key of the highlighted mailbox (scanning)
 * matches: Set of matching keys (search) – others fade
 * picking: true while choosing a mailbox for a new family name – active cells get the "pick" look
 * justSaved: key that shows the green check
 * centerKey: when it changes, that cell slides to the middle
 * zoomable: fit to screen + pinch / + − zoom
 * fitKey: whenever it changes, the grid is fitted to the screen again
 */
export function Grid({
  layout,
  mode = 'view',
  current,
  matches,
  picking = false,
  justSaved,
  centerKey,
  onCellTap,
  zoomable = false,
  fitKey,
  class: extra = '',
}) {
  const wrapRef = useRef();
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [wrapH, setWrapH] = useState(null);
  const pendingScroll = useRef(null); // keeps the pinch point in place after a zoom
  const pinch = useRef(null);
  const searching = matches && matches.size > 0;

  // ---- Fit to screen ----
  const fit = () => {
    const wrap = wrapRef.current;
    if (!zoomable || !wrap) return;
    // Position on the page (not on the screen), so an open keyboard that scrolls the page doesn't matter.
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const bar = document.querySelector('.bottombar')?.offsetHeight ?? 0;
    const h = Math.max(160, screenHeight() - top - bar - 8);
    const availW = wrap.clientWidth - WRAP_PAD_X - ZOOM_BTNS_W;
    const s = fitScale(layout.rows, layout.cols, availW, h - WRAP_PAD_Y);
    setWrapH(h);
    setMinScale(s);
    setScale(s);
    wrap.scrollTo(0, 0);
  };

  useLayoutEffect(fit, [zoomable, fitKey, layout.rows, layout.cols]);

  // Refit after the phone is turned, once the new size has settled.
  useEffect(() => {
    if (!zoomable) return;
    // Only a change of width (turning the phone) refits – the keyboard changes just the height.
    let timer;
    let lastW = window.innerWidth;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        fitRef.current();
      }, 300);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [zoomable]);

  // ---- Zoom ----
  const zoomTo = (next, focusX, focusY) => {
    const wrap = wrapRef.current;
    const s = Math.min(1, Math.max(minScale, next));
    if (!wrap || s === scale) return;
    // Keep the point under the fingers (or the middle) where it is.
    const fx = focusX ?? wrap.clientWidth / 2;
    const fy = focusY ?? wrap.clientHeight / 2;
    const ratio = s / scale;
    pendingScroll.current = {
      left: (wrap.scrollLeft + fx) * ratio - fx,
      top: (wrap.scrollTop + fy) * ratio - fy,
    };
    setScale(s);
  };

  // Handlers set up once read the current values through these refs.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const zoomRef = useRef(zoomTo);
  zoomRef.current = zoomTo;
  const fitRef = useRef(fit);
  fitRef.current = fit;

  useLayoutEffect(() => {
    const p = pendingScroll.current;
    if (p && wrapRef.current) {
      wrapRef.current.scrollLeft = p.left;
      wrapRef.current.scrollTop = p.top;
    }
    pendingScroll.current = null;
  }, [scale]);

  // Two-finger pinch. Listeners are added by hand so touchmove can stop the page from zooming.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!zoomable || !wrap) return;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t) => {
      const r = wrap.getBoundingClientRect();
      return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top };
    };
    const start = (e) => {
      if (e.touches.length === 2) pinch.current = { d: dist(e.touches), s: scaleRef.current };
    };
    const move = (e) => {
      if (e.touches.length !== 2 || !pinch.current) return;
      e.preventDefault();
      const m = mid(e.touches);
      zoomRef.current(pinch.current.s * (dist(e.touches) / pinch.current.d), m.x, m.y);
    };
    const end = (e) => {
      if (e.touches.length < 2) pinch.current = null;
    };
    const stopGesture = (e) => e.preventDefault(); // Safari's own page zoom
    wrap.addEventListener('touchstart', start, { passive: true });
    wrap.addEventListener('touchmove', move, { passive: false });
    wrap.addEventListener('touchend', end, { passive: true });
    wrap.addEventListener('touchcancel', end, { passive: true });
    wrap.addEventListener('gesturestart', stopGesture);
    return () => {
      wrap.removeEventListener('touchstart', start);
      wrap.removeEventListener('touchmove', move);
      wrap.removeEventListener('touchend', end);
      wrap.removeEventListener('touchcancel', end);
      wrap.removeEventListener('gesturestart', stopGesture);
    };
  }, [zoomable]);

  // ---- Slide the current mailbox / match into view ----
  useEffect(() => {
    if (!centerKey || !wrapRef.current) return;
    const el = wrapRef.current.querySelector(`[data-key="${centerKey}"]`);
    el?.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: reducedMotion() ? 'auto' : 'smooth',
    });
  }, [centerKey, layout]);

  // ---- Cells ----
  const s = zoomable ? scale : 1;
  const z = sizes(s);
  const level = s >= NAMES_MIN_SCALE ? 'z-full' : z.w >= LABEL_MIN_W ? 'z-label' : 'z-empty';
  const labelPx = Math.max(11, Math.min(18, 18 * s * 1.25));

  const cells = [];
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
        {rowLetter(r)}
      </span>,
    );
    for (let c = 0; c < layout.cols; c++) {
      const key = cellKey(r, c);
      const disabled = Boolean(layout.disabled[key]);
      const n = cellLabel(r, c);
      const names = namesOf(layout, key);
      const cls = ['cell'];
      if (disabled) cls.push('disabled');
      else if (names.length) cls.push('named');
      if (key === current) cls.push('current');
      if (searching && matches.has(key)) cls.push('match');
      else if (searching) cls.push('faded');
      if (picking && !disabled) cls.push('pick');
      if (key === justSaved) cls.push('just-saved');

      const label = disabled ? sl.notInUse : [sl.mailbox(n), ...names].join(', ');
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
          {!disabled && level !== 'z-empty' && <span class="num">{n}</span>}
          {!disabled &&
            level === 'z-full' &&
            names.map((name, i) => (
              <span key={i} class="name">
                {name}
              </span>
            ))}
        </button>,
      );
    }
  }

  const gridStyle = [
    `--cell-w: ${z.w}px`,
    `--cell-h: ${z.h}px`,
    `--label-px: ${labelPx}px`,
    `--name-px: ${Math.max(12, 15 * s)}px`,
    `gap: ${z.gap}px`,
    `grid-template-columns: ${z.gw}px repeat(${layout.cols}, var(--cell-w))`,
    `grid-template-rows: ${z.gh}px repeat(${layout.rows}, var(--cell-h))`,
  ].join(';');

  const grid = (
    <div
      class={`grid-wrap ${zoomable ? 'zoomable' : ''} ${extra}`}
      ref={wrapRef}
      style={zoomable && wrapH ? `height:${wrapH}px` : ''}
    >
      <div class={`grid ${mode} ${level}`} style={gridStyle}>
        {cells}
      </div>
    </div>
  );

  if (!zoomable) return grid;
  return (
    <div class="grid-zoom">
      {grid}
      <div class="zoom-btns">
        <button
          class="icon-btn"
          type="button"
          aria-label={sl.zoomIn}
          disabled={scale >= 1}
          onClick={() => zoomTo(scale * ZOOM_STEP)}
        >
          <Icon.plus />
        </button>
        <button
          class="icon-btn"
          type="button"
          aria-label={sl.zoomOut}
          disabled={scale <= minScale}
          onClick={() => zoomTo(scale / ZOOM_STEP)}
        >
          <Icon.minus />
        </button>
      </div>
    </div>
  );
}
