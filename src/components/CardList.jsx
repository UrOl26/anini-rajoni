// List of cards with tap, long press (500 ms) and drag-to-reorder (5.1).
import { useRef, useState } from 'preact/hooks';
import { Icon } from './ui.jsx';
import { sl } from '../i18n/sl.js';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;
const GAP = 12;

function Card({ item, onOpen, onLongPress }) {
  const [pressing, setPressing] = useState(false);
  const st = useRef({});

  const start = (e) => {
    if (e.button && e.button !== 0) return;
    st.current = { x: e.clientX, y: e.clientY, fired: false };
    setPressing(true);
    st.current.timer = setTimeout(() => {
      st.current.fired = true;
      setPressing(false);
      onLongPress?.(item.id);
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    clearTimeout(st.current.timer);
    setPressing(false);
  };
  const move = (e) => {
    if (
      Math.abs(e.clientX - st.current.x) > MOVE_CANCEL_PX ||
      Math.abs(e.clientY - st.current.y) > MOVE_CANCEL_PX
    )
      cancel();
  };
  const click = () => {
    if (st.current.fired) return;
    onOpen?.(item.id);
  };

  return (
    <button
      class={`card${pressing ? ' pressing' : ''}`}
      type="button"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={click}
    >
      <div class="body">
        <div class="title">{item.title}</div>
        {item.detail && <div class="detail">{item.detail}</div>}
      </div>
      <span class="chev" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

/** Reorder mode: drag ≡ to move a card; others make room. */
function ReorderList({ items, onChange }) {
  const listRef = useRef();
  const [drag, setDrag] = useState(null); // { id, offset }
  const st = useRef(null);

  const heights = () =>
    [...listRef.current.children].map((li) => li.getBoundingClientRect().height + GAP);

  const down = (e, id) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    st.current = { id, startY: e.clientY, heights: heights() };
    setDrag({ id, offset: 0 });
  };

  const move = (e) => {
    const s = st.current;
    if (!s) return;
    let offset = e.clientY - s.startY;
    let order = items.map((i) => i.id);
    let idx = order.indexOf(s.id);
    // Move the card past a neighbour once it is more than half way over it.
    while (idx < order.length - 1 && offset > s.heights[idx + 1] / 2) {
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      [s.heights[idx], s.heights[idx + 1]] = [s.heights[idx + 1], s.heights[idx]];
      s.startY += s.heights[idx];
      offset -= s.heights[idx];
      idx++;
    }
    while (idx > 0 && offset < -s.heights[idx - 1] / 2) {
      [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
      [s.heights[idx], s.heights[idx - 1]] = [s.heights[idx - 1], s.heights[idx]];
      s.startY -= s.heights[idx];
      offset += s.heights[idx];
      idx--;
    }
    if (order.join() !== items.map((i) => i.id).join()) onChange(order);
    setDrag({ id: s.id, offset });
  };

  const up = () => {
    st.current = null;
    setDrag(null);
  };

  return (
    <ul class="cards" ref={listRef}>
      {items.map((item) => {
        const lifted = drag?.id === item.id;
        return (
          <li key={item.id} style={lifted ? `transform: translateY(${drag.offset}px); position: relative; z-index: 5` : ''}>
            <div class={`card${lifted ? ' lifted' : ''}`}>
              <div class="body">
                <div class="title">{item.title}</div>
                {item.detail && <div class="detail">{item.detail}</div>}
              </div>
              <span
                class="handle"
                role="button"
                aria-label={sl.dragHandle}
                onPointerDown={(e) => down(e, item.id)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              >
                <Icon.handle />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CardList({ items, onOpen, onLongPress, reordering, onReorder }) {
  if (reordering) return <ReorderList items={items} onChange={onReorder} />;
  return (
    <ul class="cards">
      {items.map((item) => (
        <li key={item.id}>
          <Card item={item} onOpen={onOpen} onLongPress={onLongPress} />
        </li>
      ))}
    </ul>
  );
}
