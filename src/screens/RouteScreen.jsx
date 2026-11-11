// List of locations in one route (5.1).
import { useState } from 'preact/hooks';
import { sl } from '../i18n/sl.js';
import { navigate, paths } from '../router.js';
import {
  findRoute,
  findLocation,
  routeLocations,
  renameLocation,
  deleteLocation,
  reorderLocations,
} from '../store.js';
import { activeCells } from '../lib/layout.js';
import { CardList } from '../components/CardList.jsx';
import { TopBar, BottomBar, Sheet, Confirm, InputSheet, Icon } from '../components/ui.jsx';

export function RouteScreen({ routeId }) {
  const route = findRoute(routeId);
  const locations = routeLocations(routeId);
  const [reorder, setReorder] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [dialog, setDialog] = useState(null);

  const cards = (ids) =>
    ids.map((id) => {
      const l = findLocation(id);
      return {
        id,
        title: l.address,
        detail: l.layout ? sl.mailboxesCount(activeCells(l.layout).length) : sl.noLayout,
      };
    });

  const closeAll = () => {
    setDialog(null);
    setMenuFor(null);
  };

  if (reorder) {
    return (
      <div class="screen">
        <TopBar title={sl.reorderTitle} editing />
        <main class="content">
          <CardList items={cards(reorder)} reordering onReorder={setReorder} />
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
                reorderLocations(routeId, reorder);
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
        title={sl.route(route.number)}
        onBack={() => navigate(paths.home())}
        right={
          locations.length > 1 && (
            <button
              class="icon-btn"
              type="button"
              aria-label={sl.manageList}
              title={sl.manageList}
              onClick={() => setReorder(locations.map((l) => l.id))}
            >
              <Icon.reorder />
            </button>
          )
        }
      />
      <main class="content">
        {locations.length ? (
          <CardList
            items={cards(locations.map((l) => l.id))}
            onOpen={(id) => navigate(paths.location(id))}
            onLongPress={setMenuFor}
          />
        ) : (
          <p class="empty-note">{sl.noLocations}</p>
        )}
      </main>
      <BottomBar>
        <button class="btn btn-primary" type="button" onClick={() => navigate(paths.newLocation(routeId))}>
          {sl.addLocation}
        </button>
      </BottomBar>

      {menuFor && !dialog && (
        <Sheet onClose={() => setMenuFor(null)}>
          <p class="question">{findLocation(menuFor)?.address}</p>
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
      {dialog === 'rename' && menuFor && (
        <InputSheet
          label={sl.address}
          initial={findLocation(menuFor)?.address ?? ''}
          placeholder={sl.addressPlaceholder}
          validate={(v) => (v ? '' : sl.addressMissing)}
          onCancel={closeAll}
          onSave={(v) => {
            renameLocation(menuFor, v);
            closeAll();
          }}
        />
      )}
      {dialog === 'delete' && menuFor && (
        <Confirm
          text={sl.confirmDeleteLocation}
          onCancel={closeAll}
          onConfirm={() => {
            deleteLocation(menuFor);
            closeAll();
          }}
        />
      )}
    </div>
  );
}
