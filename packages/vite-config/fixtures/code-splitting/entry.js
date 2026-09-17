// Statically reachable from the entry: the React runtime and the shared
// design-system surface. Everything else sits behind a dynamic import, which is
// what a code-split app looks like and what the groups have to respect.
import { createRoot } from 'react-dom/client';
import { AppShell } from '@archon-research/design-system';

// Side effects, not exports: an app entry is bundled with
// `preserveEntrySignatures: false`, so anything reachable only through an
// export of the entry is treeshaken before chunking ever sees it.
globalThis.app = {
  mount: (node) => createRoot(node).render(AppShell('app')),
  routes: {
    drawer: () => import('./drawer-route.js'),
    chart: () => import('./chart-route.js'),
    sparkline: () => import('./sparkline-route.js'),
  },
};
