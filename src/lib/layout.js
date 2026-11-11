// Helpers for a mailbox layout (NAVODILA 5.2, 5.3).

export const MIN_SIZE = 1;
export const MAX_SIZE = 20;
export const NEW_LAYOUT = { rows: 1, cols: 10, disabled: {}, names: {} };

export const cellKey = (r, c) => `${r}-${c}`;

/**
 * Active mailboxes in scan order (top left, row by row, left to right),
 * each with its number (1, 2, 3 …). Disabled cells are skipped.
 */
export function activeCells(layout) {
  const out = [];
  if (!layout) return out;
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const key = cellKey(r, c);
      if (!layout.disabled[key]) out.push({ r, c, key, n: out.length + 1 });
    }
  }
  return out;
}

/** Map from cell key to mailbox number, for active cells only. */
export function numberMap(layout) {
  return new Map(activeCells(layout).map((cell) => [cell.key, cell.n]));
}

/** Names of a cell (hidden while the cell is disabled, but kept). */
export const namesOf = (layout, key) => (layout?.disabled[key] ? [] : layout?.names[key] ?? []);

/** Keys of cells outside rows × cols that have names. */
export function namedCellsOutside(layout, rows, cols) {
  return Object.keys(layout.names).filter((key) => {
    const [r, c] = key.split('-').map(Number);
    return (r >= rows || c >= cols) && layout.names[key]?.length;
  });
}

/** Resizes a layout, dropping disabled marks and names outside the new size. */
export function resize(layout, rows, cols) {
  const keep = (obj) =>
    Object.fromEntries(
      Object.entries(obj).filter(([key]) => {
        const [r, c] = key.split('-').map(Number);
        return r < rows && c < cols;
      }),
    );
  return { ...layout, rows, cols, disabled: keep(layout.disabled), names: keep(layout.names) };
}
