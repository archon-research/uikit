import { describe, expect, it } from 'vitest';

import { designSystemComponentManifest } from './component-manifest.js';
import * as api from './index.js';

// PascalCase value exports that are intentionally NOT catalogued as standalone
// components: the theme provider and the SurfaceMessage slot parts (the
// composite `SurfaceMessage` is listed instead). Anything else PascalCase must
// appear in the manifest so the inventory never silently omits a component.
const NOT_CATALOGUED = new Set([
  'ThemeProvider',
  'SurfaceMessageRoot',
  'SurfaceMessageTitle',
  'SurfaceMessageBody',
  'SurfaceMessageActions',
]);

const isComponentName = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

const manifestNames: string[] = designSystemComponentManifest.map(
  (e) => e.exportName,
);
const manifestNameSet = new Set(manifestNames);
const componentExports = Object.keys(api).filter(isComponentName);

describe('component manifest stays in sync with the public API', () => {
  it('catalogues every public component export', () => {
    const missing = componentExports.filter(
      (name) => !manifestNameSet.has(name) && !NOT_CATALOGUED.has(name),
    );
    expect(
      missing,
      `Component export(s) missing from component-manifest.ts (add them, or to NOT_CATALOGUED if intentional): ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('has no phantom entries (every manifest export exists on the package)', () => {
    const phantom = manifestNames.filter((name) => !(name in api));
    expect(
      phantom,
      `Manifest lists export(s) the package no longer provides: ${phantom.join(', ')}`,
    ).toEqual([]);
  });

  it('has no duplicate exportNames', () => {
    expect(manifestNames.length).toBe(manifestNameSet.size);
  });
});
