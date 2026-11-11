// Tiny hash router: #/, #/r/<id>, #/r/<id>/new, #/l/<id>, #/l/<id>/edit, #/l/<id>/scan, #/settings
import { useEffect, useState } from 'preact/hooks';

const parse = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export function useRoute() {
  const [parts, setParts] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setParts(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parts;
}

/** Go to a path like '/r/abc'. `replace` keeps the history short. */
export function navigate(path, { replace = false } = {}) {
  const hash = `#${path}`;
  if (replace) location.replace(hash);
  else location.hash = hash;
}

export const paths = {
  home: () => '/',
  route: (id) => `/r/${id}`,
  newLocation: (routeId) => `/r/${routeId}/new`,
  location: (id) => `/l/${id}`,
  editLayout: (id) => `/l/${id}/edit`,
  scan: (id) => `/l/${id}/scan`,
  settings: () => '/settings',
};
