// The mailbox wall of one location: name search, results, and the grid (5.4, 5.5).
import { useMemo, useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { findLocation, setMailboxNames } from '../store.js';
import { activeCells, namesOf } from '../lib/layout.js';
import { matchesText } from '../lib/search.js';
import { Grid } from '../components/Grid.jsx';
import { TopBar, BottomBar, Icon, toast } from '../components/ui.jsx';
import { NamesSheet, LearnSheet } from '../components/MailboxSheets.jsx';
import { LetterScanner } from '../components/LetterScanner.jsx';

const MIN_QUERY = 2;

/** "zupan" → "Zupan"; keeps text that already has capitals. */
const asName = (text) => {
  const t = text.trim().replace(/\s+/g, ' ');
  return t === t.toLowerCase() ? t.replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : t;
};

export function LayoutScreen({ locationId }) {
  const loc = findLocation(locationId);
  const layout = loc.layout;
  const inputRef = useRef();
  const [query, setQuery] = useState('');
  const [focusKey, setFocusKey] = useState(null);
  const [sheet, setSheet] = useState(null); // { type: 'names' | 'learn', cell }
  const [letter, setLetter] = useState(false);

  const cells = activeCells(layout);
  const q = query.trim();
  const searching = q.length >= MIN_QUERY;

  const matches = useMemo(() => {
    if (!searching) return [];
    return cells.filter((cell) => namesOf(layout, cell.key).some((name) => matchesText(q, name)));
  }, [q, layout]);
  const matchKeys = new Set(matches.map((m) => m.key));
  const centerKey = focusKey && matchKeys.has(focusKey) ? focusKey : matches[0]?.key;
  const learning = searching && !matches.length;

  const wallNames = useMemo(
    () => [...new Set(cells.flatMap((c) => namesOf(layout, c.key)))],
    [layout],
  );

  const tapCell = (cell) => {
    if (cell.disabled) return;
    setSheet({ type: learning ? 'learn' : 'names', cell });
  };

  const saveNames = (key, names) => {
    if (!setMailboxNames(locationId, key, names)) return toast(sl.maxNames);
    setSheet(null);
  };

  const clear = () => {
    setQuery('');
    setFocusKey(null);
    inputRef.current?.focus();
  };

  return (
    <div class="screen">
      <TopBar
        title={loc.address}
        onBack={() => navigate(paths.route(loc.routeId))}
        right={
          <button
            class="icon-btn"
            type="button"
            aria-label={sl.editLayout}
            title={sl.editLayout}
            onClick={() => navigate(paths.editLayout(locationId))}
          >
            <Icon.edit />
          </button>
        }
      />
      <main class="content">
        <div class="search">
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={sl.searchName}
            aria-label={sl.searchName}
            autoComplete="off"
            autoCorrect="off"
            spellcheck={false}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setFocusKey(null);
            }}
          />
          {query && (
            <button class="icon-btn" type="button" aria-label={sl.clearSearch} onClick={clear}>
              <Icon.x />
            </button>
          )}
          <button class="icon-btn" type="button" aria-label={sl.scanLetter} onClick={() => setLetter(true)}>
            <Icon.camera />
          </button>
        </div>

        {searching && matches.length === 1 && (
          <p class="position-line">{sl.position(matches[0].n, matches[0].r + 1, matches[0].c + 1)}</p>
        )}
        {searching && matches.length > 1 && (
          <ul class="match-list">
            {matches.map((m) => (
              <li key={m.key}>
                <button type="button" onClick={() => setFocusKey(m.key)}>
                  <strong>{namesOf(layout, m.key).join(', ')}</strong>
                  {sl.position(m.n, m.r + 1, m.c + 1)}
                </button>
              </li>
            ))}
          </ul>
        )}
        {learning && (
          <p class="no-results">
            <strong>{sl.noResults}</strong>
            <span>{sl.tapMailboxToAdd(asName(q))}</span>
          </p>
        )}

        <Grid
          layout={layout}
          matches={matchKeys}
          centerKey={centerKey}
          onCellTap={tapCell}
        />
      </main>
      <BottomBar>
        <button class="btn btn-primary" type="button" onClick={() => navigate(paths.scan(locationId))}>
          {sl.scanNames}
        </button>
      </BottomBar>

      {sheet?.type === 'names' && (
        <NamesSheet
          title={sl.position(sheet.cell.n, sheet.cell.r + 1, sheet.cell.c + 1)}
          names={namesOf(layout, sheet.cell.key)}
          onCancel={() => setSheet(null)}
          onSave={(names) => saveNames(sheet.cell.key, names)}
        />
      )}
      {sheet?.type === 'learn' && (
        <LearnSheet
          name={asName(q)}
          n={sheet.cell.n}
          names={namesOf(layout, sheet.cell.key)}
          onCancel={() => setSheet(null)}
          onSave={(names) => saveNames(sheet.cell.key, names)}
        />
      )}
      {letter && (
        <LetterScanner
          wallNames={wallNames}
          onClose={() => setLetter(false)}
          onManual={() => {
            setLetter(false);
            clear();
          }}
          onMatch={(found) => {
            setLetter(false);
            setQuery(found[0]);
            setFocusKey(null);
          }}
          onPick={(word) => {
            setLetter(false);
            setQuery(word);
            setFocusKey(null);
          }}
        />
      )}
    </div>
  );
}
