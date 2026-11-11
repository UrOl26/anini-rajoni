// App data, kept in memory and saved to IndexedDB on every change.
// Shape:
// {
//   version: 1,
//   routes: [{ id, number }],                       // in display order
//   locations: [{ id, routeId, address, layout }],  // in display order
//   lastBackupAt: ISO string | null,
// }
// layout = null (not made yet) or { rows, cols, disabled: { 'r-c': true }, names: { 'r-c': [..] } }
import { get, set } from 'idb-keyval';
import { useEffect, useState } from 'preact/hooks';
import { MAX_NAMES_PER_MAILBOX, normalizeName } from './lib/names.js';

const KEY = 'anini-data';
const empty = () => ({ version: 1, routes: [], locations: [], lastBackupAt: null });

let data = empty();
const listeners = new Set();

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export async function loadData() {
  try {
    const saved = await get(KEY);
    if (saved && Array.isArray(saved.routes)) data = { ...empty(), ...saved };
  } catch (err) {
    console.error('Could not load data', err);
  }
  // Ask the browser to keep our storage, so it isn't cleared when space runs low.
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
  emit();
}

function commit(next) {
  data = next;
  emit();
  set(KEY, data).catch((err) => console.error('Could not save data', err));
}

function emit() {
  for (const fn of listeners) fn(data);
}

export const getData = () => data;

/** Re-renders the component whenever the data changes. */
export function useData() {
  const [state, setState] = useState(data);
  useEffect(() => {
    listeners.add(setState);
    setState(data);
    return () => listeners.delete(setState);
  }, []);
  return state;
}

// --- Routes -------------------------------------------------------------------
export const findRoute = (id) => data.routes.find((r) => r.id === id);

export function routeNumberTaken(number, exceptId) {
  return data.routes.some((r) => String(r.number) === String(number) && r.id !== exceptId);
}

export function addRoute(number) {
  const route = { id: uid(), number: String(number).trim() };
  commit({ ...data, routes: [...data.routes, route] });
  return route.id;
}

export function renameRoute(id, number) {
  commit({
    ...data,
    routes: data.routes.map((r) => (r.id === id ? { ...r, number: String(number).trim() } : r)),
  });
}

export function deleteRoute(id) {
  commit({
    ...data,
    routes: data.routes.filter((r) => r.id !== id),
    locations: data.locations.filter((l) => l.routeId !== id),
  });
}

export function reorderRoutes(ids) {
  const byId = new Map(data.routes.map((r) => [r.id, r]));
  commit({ ...data, routes: ids.map((id) => byId.get(id)).filter(Boolean) });
}

// --- Locations ---------------------------------------------------------------
export const findLocation = (id) => data.locations.find((l) => l.id === id);
export const routeLocations = (routeId) => data.locations.filter((l) => l.routeId === routeId);

export function addLocation(routeId, address) {
  const loc = { id: uid(), routeId, address: address.trim(), layout: null };
  commit({ ...data, locations: [...data.locations, loc] });
  return loc.id;
}

export function renameLocation(id, address) {
  updateLocation(id, (l) => ({ ...l, address: address.trim() }));
}

export function deleteLocation(id) {
  commit({ ...data, locations: data.locations.filter((l) => l.id !== id) });
}

/** Reorders the locations of one route, keeping other routes' locations in place. */
export function reorderLocations(routeId, ids) {
  const byId = new Map(data.locations.map((l) => [l.id, l]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  let i = 0;
  commit({
    ...data,
    locations: data.locations.map((l) => (l.routeId === routeId ? ordered[i++] : l)),
  });
}

function updateLocation(id, fn) {
  commit({ ...data, locations: data.locations.map((l) => (l.id === id ? fn(l) : l)) });
}

// --- Layout and names ---------------------------------------------------------
export function saveLayout(locationId, layout) {
  updateLocation(locationId, (l) => ({ ...l, layout }));
}

/** Sets all names of one mailbox (cell key 'r-c'). Returns false if over the limit. */
export function setMailboxNames(locationId, key, names) {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length > MAX_NAMES_PER_MAILBOX) return false;
  updateLocation(locationId, (l) => {
    const nextNames = { ...l.layout.names };
    if (clean.length) nextNames[key] = clean;
    else delete nextNames[key];
    return { ...l, layout: { ...l.layout, names: nextNames } };
  });
  return true;
}

// --- Backup -----------------------------------------------------------------
export function exportJson() {
  return JSON.stringify({ app: 'anini-rajoni', exportedAt: new Date().toISOString(), data }, null, 1);
}

export function markBackup() {
  commit({ ...data, lastBackupAt: new Date().toISOString() });
}

/** Reads a backup/import file. Throws if it isn't valid. */
export function parseImport(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed?.data ?? parsed;
  if (!incoming || !Array.isArray(incoming.routes) || !Array.isArray(incoming.locations)) {
    throw new Error('Invalid backup file');
  }
  return incoming;
}

/** Replaces everything with imported data. */
export function importReplace(incoming) {
  commit({ ...empty(), ...incoming, lastBackupAt: data.lastBackupAt });
}

const sameAddress = (a, b) => normalizeName(a) === normalizeName(b);

/**
 * Adds imported data to what is already here (e.g. a list of addresses or a
 * mailbox wall prepared from a photo). Routes are matched by number, locations
 * by route + address. An existing layout is never overwritten; an imported
 * layout fills a location that has none yet.
 * Returns { routes, locations, layouts } = how many were added.
 */
export function importMerge(incoming) {
  const routes = [...data.routes];
  const locations = [...data.locations];
  const added = { routes: 0, locations: 0, layouts: 0 };
  const routeIdMap = new Map();

  for (const r of incoming.routes) {
    const number = String(r.number).trim();
    let existing = routes.find((x) => String(x.number) === number);
    if (!existing) {
      existing = { id: uid(), number };
      routes.push(existing);
      added.routes++;
    }
    routeIdMap.set(r.id, existing.id);
  }

  for (const l of incoming.locations) {
    const routeId = routeIdMap.get(l.routeId);
    if (!routeId || !l.address) continue;
    const i = locations.findIndex((x) => x.routeId === routeId && sameAddress(x.address, l.address));
    if (i === -1) {
      locations.push({ id: uid(), routeId, address: String(l.address).trim(), layout: l.layout ?? null });
      added.locations++;
      if (l.layout) added.layouts++;
    } else if (!locations[i].layout && l.layout) {
      locations[i] = { ...locations[i], layout: l.layout };
      added.layouts++;
    }
  }

  commit({ ...data, routes, locations });
  return added;
}
