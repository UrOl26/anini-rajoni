// Landing screen: address search and the list of routes (5.1).
import { useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import {
  useData,
  addRoute,
  renameRoute,
  deleteRoute,
  reorderRoutes,
  routeNumberTaken,
  findRoute,
} from '../store.js';
import { activeCells } from '../lib/layout.js';
import { getApiKey, needsActivation } from '../lib/cloudReader.js';
import { matchesText, addressBase } from '../lib/search.js';
import { AddressScanner } from './AddLocation.jsx';
import { CardList } from '../components/CardList.jsx';
import { TopBar, BottomBar, Sheet, Confirm, InputSheet, Icon } from '../components/ui.jsx';

const BACKUP_REMINDER_DAYS = 14;

export function Home() {
  const data = useData();
  const [query, setQuery] = useState('');
  const [reorder, setReorder] = useState(null); // array of ids while reordering
  const [menuFor, setMenuFor] = useState(null);
  const [dialog, setDialog] = useState(null); // 'add' | 'rename' | 'delete'
  const [scanning, setScanning] = useState(false);

  /** A scanned address: open its location straight away, or show what was read in the search. */
  const onScannedAddress = (address) => {
    setScanning(false);
    const base = addressBase(address);
    const exact = data.locations.filter((l) => findRoute(l.routeId) && addressBase(l.address) === base);
    if (exact.length === 1) navigate(paths.location(exact[0].id));
    else setQuery(exact.length > 1 ? base : address);
  };

  const routeCards = (ids) =>
    ids.map((id) => {
      const r = findRoute(id);
      const count = data.locations.filter((l) => l.routeId === id).length;
      return { id, title: sl.route(r.number), detail: sl.locationsCount(count) };
    });

  const validateNumber = (exceptId) => (value) => {
    if (!value) return sl.routeNumberMissing;
    if (routeNumberTaken(value, exceptId)) return sl.routeExists;
    return '';
  };

  // Backup reminder
  let reminder = '';
  if (data.routes.length) {
    if (!data.lastBackupAt) reminder = sl.noBackupYet;
    else {
      const days = Math.floor((Date.now() - new Date(data.lastBackupAt)) / 86_400_000);
      if (days >= BACKUP_REMINDER_DAYS) reminder = sl.lastBackupDaysAgo(days);
    }
  }

  const q = query.trim();
  const results = q
    ? data.locations
        .map((l) => ({ l, r: findRoute(l.routeId) }))
        .filter(({ l, r }) => r && matchesText(q, l.address))
    : [];

  if (reorder) {
    return (
      <div class="screen">
        <TopBar title={sl.reorderTitle} editing />
        <main class="content">
          <CardList items={routeCards(reorder)} reordering onReorder={setReorder} />
        </main>
        <BottomBar>
          <div class="row">
            <button class="btn btn-secondary" type="button" onClick={() => setReorder(null)}>
              {sl.cancel}
            </button>
            <button
              class="btn btn-primary"
              type="button"
              onClick={() => {
                reorderRoutes(reorder);
                setReorder(null);
              }}
            >
              {sl.save}
            </button>
          </div>
        </BottomBar>
      </div>
    );
  }

  return (
    <div class="screen">
      <TopBar
        title={sl.appName}
        right={
          <button class="icon-btn" type="button" aria-label={sl.settings} onClick={() => navigate(paths.settings())}>
            <Icon.gear />
          </button>
        }
      />
      <main class="content">
        <div class="search">
          <input
            type="search"
            value={query}
            placeholder={sl.searchAddress}
            aria-label={sl.searchAddress}
            autoComplete="off"
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          {query && (
            <button class="icon-btn" type="button" aria-label={sl.clearSearch} onClick={() => setQuery('')}>
              <Icon.x />
            </button>
          )}
          <button class="icon-btn" type="button" aria-label={sl.scanAddress} onClick={() => setScanning(true)}>
            <Icon.camera />
          </button>
        </div>

        {q ? (
          results.length ? (
            <CardList
              items={results.map(({ l, r }) => ({
                id: l.id,
                title: `${l.address} · ${sl.route(r.number)}`,
                detail: l.layout ? sl.mailboxesCount(activeCells(l.layout).length) : sl.noLayout,
              }))}
              onOpen={(id) => navigate(paths.location(id))}
            />
          ) : (
            <p class="empty-note">{sl.noResults}</p>
          )
        ) : (
          <>
            {needsActivation() && (
              <button class="banner activate" type="button" onClick={() => navigate(paths.activate())}>
                <Icon.camera />
                <div>
                  <strong>{sl.activateScanner}</strong>
                  <span>{getApiKey() ? sl.reactivateBannerHint : sl.activateBannerHint}</span>
                </div>
              </button>
            )}
            {reminder && (
              <button class="banner" type="button" onClick={() => navigate(paths.settings())}>
                {reminder}
              </button>
            )}
            <div class="section-head">
              <h2>{sl.routes}</h2>
              {data.routes.length > 1 && (
                <button
                  class="icon-btn"
                  type="button"
                  aria-label={sl.manageList}
                  title={sl.manageList}
                  onClick={() => setReorder(data.routes.map((r) => r.id))}
                >
                  <Icon.reorder />
                </button>
              )}
            </div>
            {data.routes.length ? (
              <CardList
                items={routeCards(data.routes.map((r) => r.id))}
                onOpen={(id) => navigate(paths.route(id))}
                onLongPress={setMenuFor}
              />
            ) : (
              <p class="empty-note">{sl.noRoutes}</p>
            )}
          </>
        )}
      </main>

      <BottomBar>
        <button class="btn btn-primary" type="button" onClick={() => setDialog('add')}>
          {sl.addRoute}
        </button>
      </BottomBar>

      {scanning && <AddressScanner onClose={() => setScanning(false)} onFound={onScannedAddress} />}

      {menuFor && !dialog && (
        <Sheet onClose={() => setMenuFor(null)}>
          <p class="question">{sl.route(findRoute(menuFor)?.number)}</p>
          <div class="stack">
            <button class="btn btn-secondary" type="button" onClick={() => setDialog('rename')}>
              {sl.rename}
            </button>
            <button class="btn btn-secondary" type="button" onClick={() => setDialog('delete')}>
              {sl.delete}
            </button>
          </div>
        </Sheet>
      )}

      {dialog === 'add' && (
        <InputSheet
          label={sl.routeNumber}
          inputMode="numeric"
          validate={validateNumber(null)}
          onCancel={() => setDialog(null)}
          onSave={(n) => {
            addRoute(n);
            setDialog(null);
          }}
        />
      )}
      {dialog === 'rename' && menuFor && (
        <InputSheet
          label={sl.routeNumber}
          inputMode="numeric"
          initial={findRoute(menuFor)?.number ?? ''}
          validate={validateNumber(menuFor)}
          onCancel={() => {
            setDialog(null);
            setMenuFor(null);
          }}
          onSave={(n) => {
            renameRoute(menuFor, n);
            setDialog(null);
            setMenuFor(null);
          }}
        />
      )}
      {dialog === 'delete' && menuFor && (
        <Confirm
          text={sl.confirmDeleteRoute}
          onCancel={() => {
            setDialog(null);
            setMenuFor(null);
          }}
          onConfirm={() => {
            deleteRoute(menuFor);
            setDialog(null);
            setMenuFor(null);
          }}
        />
      )}
    </div>
  );
}
