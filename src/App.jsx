import { useRoute, navigate, paths } from './router.js';
import { ToastHost } from './components/ui.jsx';
import { Home } from './screens/Home.jsx';
import { RouteScreen } from './screens/RouteScreen.jsx';
import { AddLocation } from './screens/AddLocation.jsx';
import { LayoutScreen } from './screens/LayoutScreen.jsx';
import { LayoutEditor } from './screens/LayoutEditor.jsx';
import { Scanner } from './screens/Scanner.jsx';
import { Settings } from './screens/Settings.jsx';
import { findLocation, findRoute, useData } from './store.js';

function Screen() {
  useData(); // re-render on data changes
  const [a, id, sub] = useRoute();

  if (a === 'settings') return <Settings />;

  if (a === 'r' && findRoute(id)) {
    if (sub === 'new') return <AddLocation routeId={id} />;
    return <RouteScreen routeId={id} />;
  }

  if (a === 'l' && findLocation(id)) {
    const loc = findLocation(id);
    if (sub === 'edit' || !loc.layout) return <LayoutEditor locationId={id} isNew={!loc.layout} />;
    if (sub === 'scan') return <Scanner locationId={id} />;
    return <LayoutScreen locationId={id} />;
  }

  if (a) {
    // Unknown or deleted item: back to the start.
    queueMicrotask(() => navigate(paths.home(), { replace: true }));
    return null;
  }
  return <Home />;
}

export function App() {
  return (
    <>
      <Screen />
      <ToastHost />
    </>
  );
}
