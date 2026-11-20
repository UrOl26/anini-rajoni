// The mailbox wall of one location: family-name search, results, and the grid (5.4, 5.5).
import { useMemo, useRef, useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import { findLocation, setMailboxNames } from '../store.js';
import { activeCells, namesOf } from '../lib/layout.js';
import { matchesText } from '../lib/search.js';
import { normalizeName } from '../lib/names.js';
import { Grid } from '../components/Grid.jsx';
import { TopBar, BottomBar, Icon, toast } from '../components/ui.jsx';
import { NamesSheet, LearnSheet } from '../components/MailboxSheets.jsx';
import { LetterScanner } from '../components/LetterScanner.jsx';

const MIN_QUERY = 2;
const EXACT = { typos: false }; // a different family name is never a match (Popravki 3)

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
  const [picked, setPicked] = useState(null); // family name chosen from the suggestions: exact match only
  const [adding, setAdding] = useState(false); // choosing a mailbox for a family name that isn't here yet
  const [sheet, setSheet] = useState(null); // { type: 'names' | 'learn', cell }
  const [letter, setLetter] = useState(false);

  const cells = activeCells(layout);
  const q = query.trim();
  const searching = q.length >= MIN_QUERY;

  const matches = useMemo(() => {
    if (!searching) return [];
    if (picked) {
      const p = normalizeName(picked);
      return cells.filter((cell) => namesOf(layout, cell.key).some((name) => normalizeName(name) === p));
    }
    return cells.filter((cell) => namesOf(layout, cell.key).some((name) => matchesText(q, name, EXACT)));
  }, [q, picked, layout]);
  const matchKeys = new Set(matches.map((m) => m.key));
  const learning = searching && !matches.length;

  const wallNames = useMemo(
    () => [...new Set(cells.flatMap((c) => namesOf(layout, c.key)))],
    [layout],
  );

  const search = (text, exact = null) => {
    setQuery(text);
    setPicked(exact);
    setAdding(false);
  };

  const tapCell = (cell) => {
    if (cell.disabled) return;
    if (adding && learning) {
      const existing = namesOf(layout, cell.key);
      // An empty mailbox gets the name right away; Ana already chose to add it.
      if (!existing.length) saveNames(cell.key, [asName(q)]);
      else setSheet({ type: 'learn', cell });
      return;
    }
    setSheet({ type: 'names', cell });
  };

  const saveNames = (key, names) => {
    if (!setMailboxNames(locationId, key, names)) return toast(sl.maxNames);
    setSheet(null);
    setAdding(false);
  };

  const clear = () => {
    search('');
    inputRef.current?.focus();
  };

  /** The family name of a suggestion: the one in that mailbox that matches what was typed. */
  const suggestedName = (key) => {
    const names = namesOf(layout, key);
    return names.find((name) => matchesText(q, name, EXACT)) ?? names[0];
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
            <Icon.grid />
          </button>
        }
      />
      <main class="content">
        <div class={`search${learning ? ' not-found' : ''}`}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={sl.searchName}
            aria-label={sl.searchName}
            autoComplete="off"
            autoCorrect="off"
            spellcheck={false}
            onInput={(e) => search(e.currentTarget.value)}
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

        {searching && picked && matches.length > 0 && (
          <p class="position-line">{matches.map((m) => sl.mailbox(m.n)).join(' · ')}</p>
        )}
        {searching && !picked && matches.length > 0 && (
          <ul class="match-list">
            {matches.map((m) => {
              const name = suggestedName(m.key);
              return (
                <li key={m.key}>
                  <button type="button" onClick={() => search(name, name)}>
                    <strong>{namesOf(layout, m.key).join(', ')}</strong>
                    {sl.mailbox(m.n)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {learning && (
          <div class="not-found-note">
            <p>{sl.nameNotHere}</p>
            {adding ? (
              <p class="pick-hint">{sl.tapMailboxToAdd(asName(q))}</p>
            ) : (
              <button class="btn btn-secondary" type="button" onClick={() => setAdding(true)}>
                + {sl.addName}
              </button>
            )}
          </div>
        )}

        <Grid
          layout={layout}
          matches={matchKeys}
          picking={adding && learning}
          onCellTap={tapCell}
          zoomable
          fitKey={`${q}|${picked}|${adding}|${matches.length}`}
        />
      </main>
      <BottomBar>
        {adding && learning ? (
          <button class="btn btn-secondary" type="button" onClick={() => setAdding(false)}>
            {sl.cancel}
          </button>
        ) : (
          <button class="btn btn-primary" type="button" onClick={() => navigate(paths.scan(locationId))}>
            {sl.scanNames}
          </button>
        )}
      </BottomBar>

      {sheet?.type === 'names' && (
        <NamesSheet
          title={sl.mailbox(sheet.cell.n)}
          names={namesOf(layout, sheet.cell.key)}
          scan
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
            search(found[0], found[0]);
          }}
          onPick={(word) => {
            setLetter(false);
            search(word);
          }}
        />
      )}
    </div>
  );
}
